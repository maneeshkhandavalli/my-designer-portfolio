import { lazy, Suspense, useRef, useState } from 'react'
import type { StarMotion } from '@/components/effects/CrystalStar/CrystalStar'
import GradualBlur from '@/components/effects/GradualBlur/GradualBlur'
import { Section } from '@/components/layout/Section'
import { useInView } from '@/hooks/useInView'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { setPageTone } from '@/lib/chromeTone'
import { gsap, MOTION_QUERIES, ScrollTrigger, useGSAP } from '@/lib/gsap'
import { StoryContent } from './StoryContent'
import { useCenteredTitle } from './useCenteredTitle'

const CrystalStar = lazy(() => import('@/components/effects/CrystalStar/CrystalStar'))

/** Pinned scroll distance of the Hero → Story transition, in viewport heights (Hero exit included). */
const TRANSITION_PIN = 2.2
/** Transition progress at which the navbar/frame turn white, and the frame matte comes on (page black). */
const CHROME_DARK_AT = 0.36
const MATTE_AT = 0.72
/** Where in-page navigation to Story lands: the finished composition. */
const ANCHOR_AT = 0.95
/** Transition progress from which the WebGL star renders — just before it fades in (0.7). */
const STAR_LIVE_AT = 0.66

/**
 * 02 — Story / About. One central axis: the red star is centred on the stage,
 * and "what's the" / "story?" are centred over it (layout-centred, ink-corrected).
 *
 * Arrival is the Hero → Story transition: a full-viewport stage that sits *under*
 * the Hero (pulled up by one viewport) and is pinned from the first pixel of
 * scroll. Its background is the Hero's warm white, so the transparent Hero slides
 * away over it while one scrubbed timeline runs:
 *   0.00–0.34  a warm dome rises from the bottom edge (orange ring, red core) — the Hero leaves
 *   0.30–0.44  it spreads past the edges — orange fills the viewport
 *   0.44–0.60  red deepens: the dome's red core rises until it fills the viewport
 *   0.58–0.72  black takes over
 *   0.70–0.92  the star (restrained scale + opacity), then the heading (from blur)
 *   0.92–1.00  hold — the pin releases on the finished black composition
 * Scrubbed (no timers), so scrolling up reverses it. The star drifts slightly as
 * it leaves. Portrait + copy follow on black; then the Statement marquee.
 * Reduced motion: no overlap, no pin, no glow — the stage is simply black.
 */
export function Story() {
  const rootRef = useRef<HTMLElement>(null)
  const transitionRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const [blurActive, setBlurActive] = useState(false)
  // The stage sits under the Hero from the start, so "in view" alone would keep the (still
  // invisible) star rendering every frame there: it also has to have been revealed.
  const [starShown, setStarShown] = useState(false)
  const starMotion = useRef<StarMotion>({ scale: 1, spin: 0, lift: 0 })
  const reducedMotion = usePrefersReducedMotion()
  const stageInView = useInView(stageRef, '25% 0px')

  useCenteredTitle(stageRef, titleRef)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      mm.add(MOTION_QUERIES.motionOk, () => {
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: transitionRef.current,
            start: 'top top',
            end: () => `+=${window.innerHeight * TRANSITION_PIN}`,
            pin: true,
            scrub: true,
            invalidateOnRefresh: true,
            // Created after StoryContent's triggers (children mount first): refresh the pin first.
            refreshPriority: 1,
            onUpdate: ({ progress }) => {
              setPageTone(progress >= CHROME_DARK_AT, progress >= MATTE_AT)
              setStarShown(progress >= STAR_LIVE_AT)
            },
            onRefresh: ({ progress }) => {
              setPageTone(progress >= CHROME_DARK_AT, progress >= MATTE_AT)
              setStarShown(progress >= STAR_LIVE_AT)
            },
          },
        })

        // Background: warm dome rises → spreads → its red core floods → black.
        tl.fromTo(
          '[data-transition-glow]',
          { scaleX: 0.85, scaleY: 0.08, autoAlpha: 0 },
          { scaleX: 1, scaleY: 1, autoAlpha: 1, duration: 0.34, ease: 'sine.out' },
          0,
        )
          .to('[data-transition-glow]', { scaleX: 1.6, scaleY: 2.2, duration: 0.14, ease: 'power1.inOut' }, 0.3)
          // Red deepens: the dome's red core rises until it fills the viewport.
          .to('[data-transition-glow]', { scaleX: 3.4, scaleY: 5.5, duration: 0.16, ease: 'power1.inOut' }, 0.44)
          .fromTo('[data-transition-black]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.14, ease: 'power1.in' }, 0.58)
          // The base turns black with it — no warm white left under the black (no edge seam).
          .fromTo('[data-transition-base]', { backgroundColor: '#f3f1ec' }, { backgroundColor: '#050505', duration: 0.14 }, 0.58)
          // Once black, the glow is off entirely (its edge can't bleed through as a hairline).
          .set('[data-transition-glow]', { autoAlpha: 0 }, 0.73)

        // Story composition: hidden until the page is black.
        tl.fromTo('[data-story-star]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12, ease: 'power1.out' }, 0.7)
          .fromTo(
            starMotion.current,
            { scale: 0.86, spin: -0.12, lift: 0 },
            { scale: 1, spin: 0, lift: 0, duration: 0.18, ease: 'power2.out' },
            0.7,
          )
          .fromTo(
            '[data-story-line]',
            { filter: 'blur(24px)', autoAlpha: 0, yPercent: 14, scale: 1.05 },
            { filter: 'blur(0px)', autoAlpha: 1, yPercent: 0, scale: 1, duration: 0.12, stagger: 0.05, ease: 'power2.out' },
            0.75,
          )
          .fromTo('[data-story-meta]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.05 }, 0.88)
          // Hold the finished composition for the rest of the pin.
          .set({}, {}, 1)

        // Leaving (after the pin): slow drift so the star never feels parked.
        gsap.fromTo(
          starMotion.current,
          { spin: 0, scale: 1, lift: 0 },
          {
            spin: 0.24,
            scale: 1.05,
            lift: 0.08,
            ease: 'none',
            immediateRender: false,
            scrollTrigger: { trigger: '[data-story-content]', start: 'top bottom', end: 'top top', scrub: true },
          },
        )

        // React Bits GradualBlur band on the bottom edge, only while the portrait +
        // copy travel up through it (blurred at the edge → sharp as they rise).
        // Mounted on demand, never hidden-while-mounted: Chromium leaves masked
        // backdrop-filter layers that mount while invisible un-rendered.
        ScrollTrigger.create({
          trigger: '[data-story-content]',
          start: 'top bottom',
          end: 'bottom 75%',
          onToggle: ({ isActive }) => setBlurActive(isActive),
        })
      })

      mm.add(MOTION_QUERIES.reducedMotion, () => {
        // No transition: the stage is black, the composition simply there.
        gsap.set('[data-transition-black]', { autoAlpha: 1 })
        gsap.set('[data-transition-base]', { backgroundColor: '#050505' })
        ScrollTrigger.create({
          trigger: transitionRef.current,
          start: 'top 10%',
          end: 'max',
          onToggle: ({ isActive }) => setPageTone(isActive, isActive),
          onRefresh: ({ isActive }) => setPageTone(isActive, isActive),
        })
      })
    },
    { scope: rootRef },
  )

  return (
    // Pulled up under the Hero (motion only), so the transition stage pins from the first scroll.
    <Section ref={rootRef} id="story" aria-labelledby="story-heading" className="motion-safe:-mt-[100svh]">
      {/* In-page navigation lands here: the end of the transition (useScrollToSection). */}
      <span
        aria-hidden="true"
        data-section-anchor
        className="pointer-events-none absolute left-0 h-px w-px motion-reduce:top-0!"
        style={{ top: `${TRANSITION_PIN * ANCHOR_AT * 100}svh` }}
      />

      {/* Transition stage: full viewport, pinned while its background turns from the Hero's
          warm white to black; the Story composition (stage) sits centred inside it. */}
      <div ref={transitionRef} className="relative flex h-svh items-center">
        <div aria-hidden="true" data-transition-base className="pointer-events-none absolute inset-0 overflow-hidden bg-canvas">
          <div
            data-transition-glow
            className="transition-glow invisible absolute inset-x-[-50%] bottom-0 h-full origin-bottom will-change-transform"
          />
          <div data-transition-black className="invisible absolute inset-0 bg-background" />
        </div>

        <div
          ref={stageRef}
          className="relative flex min-h-[min(100svh,135vw)] w-full items-center justify-center overflow-x-clip"
        >
          {/* Layering: background → star (z-0) → title (z-10) → metadata (z-20).
              Star and title share one centre: the stage centre. */}
          <div
            aria-hidden="true"
            data-story-star
            className="pointer-events-none absolute top-1/2 left-1/2 z-0 aspect-square h-[min(118svh,150vw)] -translate-x-1/2 -translate-y-1/2"
          >
            <Suspense fallback={null}>
              <CrystalStar
                motion={starMotion}
                active={stageInView && (reducedMotion || starShown)}
                reducedMotion={reducedMotion}
              />
            </Suspense>
          </div>

          {/* One centred column; useCenteredTitle adds only the optical (ink) correction. */}
          <h2
            ref={titleRef}
            id="story-heading"
            className="relative z-10 flex w-full flex-col items-center text-center text-display-2xl whitespace-nowrap lowercase"
          >
            <span data-ink-line className="block">
              <span data-story-line className="block will-change-[filter,transform]">
                what’s the
              </span>
            </span>
            <span data-ink-line className="block">
              <span data-story-line className="block will-change-[filter,transform]">
                story?
              </span>
            </span>
          </h2>

          <div className="label absolute inset-x-(--frame-gutter) top-[12%] z-20 flex justify-between text-muted">
            <span data-story-meta>02 — About</span>
            <span data-story-meta className="hidden md:inline">What’s the story?</span>
          </div>
        </div>
      </div>

      <StoryContent />

      {blurActive && !reducedMotion && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-[calc(var(--frame-inset)+var(--frame-width))] bottom-[calc(var(--frame-inset)+var(--frame-width))] z-30 h-[18svh]"
        >
          <GradualBlur position="bottom" height="100%" strength={1.25} divCount={6} curve="bezier" zIndex={1} />
        </div>
      )}
    </Section>
  )
}
