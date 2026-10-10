import { useRef } from 'react'
import { gsap, MOTION, MOTION_QUERIES, SplitText, useGSAP } from '@/lib/gsap'

/** Set to e.g. '/assets/images/portrait.jpg' once the portrait is supplied. */
const PORTRAIT_SRC: string | null = null

const STORY_COPY =
  'I build in the dark — literally, my terminal’s always black — chasing the exact red that looks right and the exact line of code that doesn’t break at 2 AM. Design is instinct before it’s theory. Gaming is where I learned patience actually pays off, one boss fight at a time. Everything else is just me trying to make that same feeling — of something finally clicking — on a screen you didn’t build.'

/**
 * Portrait + story copy beneath the star stage. Reveals start as soon as each
 * element enters the viewport, so it rises through the GradualBlur band at the
 * bottom edge (Story.tsx) — blurred at the edge, sharpening as it scrolls up.
 * Like every other reveal they reverse as the content leaves and replay on return.
 */

/** Reverse on leave (either way), replay on return — the shared reveal behaviour. */
const toggle = { end: 'bottom 6%', toggleActions: 'play reverse play reverse' }
export function StoryContent() {
  const rootRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION_QUERIES.motionOk, () => {
        gsap.fromTo(
          '[data-story-portrait]',
          { clipPath: 'inset(100% 0% 0% 0%)' },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            duration: 1.6,
            ease: MOTION.ease.inOut,
            scrollTrigger: { trigger: '[data-story-portrait]', start: 'top 98%', ...toggle },
          },
        )

        SplitText.create('[data-story-copy]', {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          onSplit: (split) =>
            gsap.from(split.lines, {
              yPercent: 100,
              duration: MOTION.duration.reveal,
              ease: MOTION.ease.out,
              stagger: 0.07,
              scrollTrigger: { trigger: '[data-story-copy]', start: 'top 96%', ...toggle },
            }),
        })

        gsap.from('[data-story-label]', {
          autoAlpha: 0,
          y: 10,
          duration: MOTION.duration.slow,
          stagger: 0.1,
          scrollTrigger: { trigger: '[data-story-copy]', start: 'top 98%', ...toggle },
        })
      })
    },
    { scope: rootRef },
  )

  return (
    <div
      ref={rootRef}
      data-story-content
      className="grid grid-cols-1 gap-y-16 px-(--frame-gutter) pt-[14svh] pb-[14svh] md:grid-cols-12 md:items-center md:gap-x-6"
    >
      <figure className="pr-[7%] pt-[6%] md:col-span-5 lg:col-span-4 lg:col-start-2">
        {/* Outlined container with the photo layer offset so it breaks the frame up and right. */}
        <div className="relative aspect-4/5 w-full border border-line">
          <div data-story-portrait className="absolute inset-0 translate-x-[7%] -translate-y-[6%] overflow-hidden">
            {PORTRAIT_SRC ? (
              <img src={PORTRAIT_SRC} alt="Portrait of Maneesh Khandavalli" className="h-full w-full object-cover" />
            ) : (
              <div className="label flex h-full items-center justify-center bg-surface text-muted">Portrait</div>
            )}
          </div>
        </div>
        <figcaption data-story-label className="label mt-5 text-muted">
          Maneesh Khandavalli
        </figcaption>
      </figure>

      <div className="md:col-span-6 md:col-start-7 lg:col-span-5 lg:col-start-7">
        <p data-story-label className="label mb-6 text-accent-light">
          The story
        </p>
        <p data-story-copy className="text-[clamp(1.25rem,1.85vw,1.875rem)] leading-[1.42]">
          {STORY_COPY}
        </p>
      </div>
    </div>
  )
}
