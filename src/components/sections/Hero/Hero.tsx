import { useRef } from 'react'
import { Section } from '@/components/layout/Section'
import { useIntroReady } from '@/hooks/useIntroReady'
import { gsap, MOTION, MOTION_QUERIES, SplitText, useGSAP } from '@/lib/gsap'
import { INTRO_HANDOFF } from '@/lib/intro'
import { useOpticalName } from './useOpticalName'

const YEAR = new Date().getFullYear()

/**
 * 01 — Hero. Light mode: the name, huge, in deep black Old English directly on
 * the warm-white canvas (no card). The canvas is Story's transition stage, pinned
 * underneath from the first pixel of scroll — the Hero is transparent and slides
 * away over it while the glow rises (reduced motion: the Hero has its own canvas). Both words
 * share a visible left edge and the visible ink is centred in the name stage
 * (see useOpticalName). Introduction beneath.
 *
 * Entrance (as the Loader's curtain lifts): "Maneesh" then "Khandavalli" rise
 * from their masks; the introduction and metadata settle. Then it is static.
 * Scroll: the name drifts up as the Hero leaves.
 */
export function Hero() {
  const rootRef = useRef<HTMLElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLHeadingElement>(null)
  const introReady = useIntroReady()

  useOpticalName(panelRef, nameRef)

  // Scroll exit — scrubbed to the hero leaving the viewport.
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION_QUERIES.motionOk, () => {
        gsap
          .timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: rootRef.current,
              start: 'top top',
              end: 'bottom top',
              scrub: true,
              invalidateOnRefresh: true,
            },
          })
          .to('[data-hero-name]', { y: () => -window.innerHeight * 0.14, duration: 1 }, 0)
          .to('[data-hero-support]', { y: () => -window.innerHeight * 0.05, autoAlpha: 0, duration: 0.45 }, 0)
      })
    },
    { scope: rootRef },
  )

  // Entrance — starts when the Loader hands over (the Loader covers everything until then).
  useGSAP(
    () => {
      if (!introReady) return
      const mm = gsap.matchMedia()
      mm.add(MOTION_QUERIES.motionOk, () => {
        const tl = gsap.timeline({ delay: INTRO_HANDOFF })

        // 1. The name, one word after the other.
        tl.addLabel('name', 0)
          .from('[data-hero-line]', { yPercent: 108, duration: 1.3, ease: MOTION.ease.out, stagger: 0.14 }, 'name')
          .from('[data-hero-panel-meta]', { autoAlpha: 0, duration: 0.8, stagger: 0.08 }, 'name+=0.5')
          // 3. Metadata settles last.
          .from('[data-hero-meta]', { autoAlpha: 0, y: 8, duration: 0.8 }, 'name+=1.05')

        // 2. Introduction lines follow the name.
        const introAt = INTRO_HANDOFF + (tl.labels.name ?? 0) + 0.65
        SplitText.create('[data-hero-intro]', {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          onSplit: (split) =>
            gsap.from(split.lines, {
              yPercent: 105,
              duration: MOTION.duration.reveal,
              ease: MOTION.ease.out,
              stagger: 0.08,
              delay: introAt,
            }),
        })
      })
    },
    { scope: rootRef, dependencies: [introReady] },
  )

  return (
    <Section
      ref={rootRef}
      id="hero"
      aria-labelledby="hero-heading"
      className="z-10 flex min-h-svh flex-col px-(--frame-gutter) motion-reduce:bg-canvas pt-(--nav-clearance) pb-(--frame-gutter) text-ink"
    >
      <div className="relative min-h-[20rem] flex-1">
        <div ref={panelRef} className="absolute inset-0 text-ink">
          <div className="label absolute inset-x-[clamp(1rem,2.5vw,2.5rem)] top-[clamp(1rem,2vw,1.75rem)] flex justify-between gap-6 text-panel-muted">
            <span data-hero-panel-meta>01 — Introduction</span>
            <span data-hero-panel-meta>Portfolio © {YEAR}</span>
          </div>

          {/* Positioned by useOpticalName: shared visible left edge, visible ink centred. */}
          <h1
            ref={nameRef}
            id="hero-heading"
            data-hero-name
            className="absolute top-0 left-0 whitespace-nowrap text-hero md:text-hero-lg"
          >
            <span data-name-mask className="-mx-[0.2em] -my-[0.12em] block overflow-hidden px-[0.2em] py-[0.12em]">
              <span data-hero-line className="block">
                Maneesh
              </span>
            </span>
            <span data-name-mask className="-mx-[0.2em] -my-[0.12em] block overflow-hidden px-[0.2em] py-[0.12em]">
              <span data-hero-line className="block">
                Khandavalli
              </span>
            </span>
          </h1>
        </div>
      </div>

      <div
        data-hero-support
        className="grid grid-cols-1 gap-y-6 pt-6 md:grid-cols-12 md:items-end md:gap-x-6 md:pt-8"
      >
        <p
          data-hero-intro
          className="text-[clamp(1.5rem,2.45vw,2.625rem)] leading-[1.15] md:col-span-9 lg:col-span-8"
        >
          <span className="md:block">I’m a computer science student who</span>{' '}
          <span className="md:block">designs and builds digital experiences.</span>
        </p>
        <span data-hero-meta className="label text-panel-muted md:col-span-3 md:col-start-10 md:text-right">
          Scroll
        </span>
      </div>
    </Section>
  )
}
