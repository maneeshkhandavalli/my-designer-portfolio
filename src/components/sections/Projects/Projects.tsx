import { useRef } from 'react'
import { Section } from '@/components/layout/Section'
import { RollText } from '@/components/navigation/RollText'
import { gsap, useGSAP } from '@/lib/gsap'
import { createReveals } from '@/lib/reveal'
import { PROJECTS, type Project } from './projectData'

/** Horizontal showcase only with room for it and motion allowed (matches the `md:motion-safe:` classes). */
const HORIZONTAL = '(min-width: 48rem) and (prefers-reduced-motion: no-preference)'
/** Stacked layout (phones) with motion allowed: the same reveals, triggered by the page scroll. */
const STACKED = '(max-width: 47.99rem) and (prefers-reduced-motion: no-preference)'
/** Vertical scroll per pixel of horizontal travel — above 1 slows the pass so it reads as deliberate. */
const PACE = 1.25

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * 03 — Featured Work. A horizontal showcase: the section pins and vertical scroll
 * drives the track sideways — intro, then one editorial spread per project — and
 * releases. Scrubbed, so it works both ways.
 *
 * A spread: the preview, uncovered left → right as it slides in, beside the title in
 * the display face, a crimson hairline, the meta line, what was built, and the stack.
 * Reveals (lib/reveal) follow the track: they play as a spread enters, reverse as it
 * leaves, and replay on the way back. The intro reveals on the vertical approach.
 * Phones and reduced motion: the track stacks vertically, scrolling normally
 * (phones keep the reveals; reduced motion shows everything as is).
 * Content lives in ./projectData.ts.
 */
export function Projects() {
  const rootRef = useRef<HTMLElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const introRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(HORIZONTAL, () => {
        const pin = pinRef.current
        const track = trackRef.current
        if (!pin || !track || !introRef.current) return
        const travel = () => Math.max(0, track.offsetWidth - pin.clientWidth)

        const slide = gsap.to(track, {
          x: () => -travel(),
          ease: 'none',
          scrollTrigger: {
            trigger: pin,
            start: 'top top',
            end: () => `+=${travel() * PACE}`,
            pin: true,
            scrub: true,
            invalidateOnRefresh: true,
          },
        })

        createReveals(introRef.current)
        track.querySelectorAll('[data-spread]').forEach((spread) => createReveals(spread, { containerAnimation: slide }))
      })

      mm.add(STACKED, () => {
        if (rootRef.current) createReveals(rootRef.current)
      })
    },
    { scope: rootRef },
  )

  return (
    <Section ref={rootRef} id="work" aria-labelledby="work-heading" className="py-[12svh] md:motion-safe:py-0">
      <div ref={pinRef} className="md:motion-safe:flex md:motion-safe:h-svh md:motion-safe:items-center md:motion-safe:overflow-hidden">
        <div
          ref={trackRef}
          className="flex flex-col gap-y-[14svh] px-(--frame-gutter) md:motion-safe:w-max md:motion-safe:flex-row md:motion-safe:items-center md:motion-safe:gap-x-[9vw] md:motion-safe:pt-(--nav-clearance) md:motion-safe:pb-(--frame-gutter)"
        >
          <header ref={introRef} className="flex shrink-0 flex-col gap-6 md:motion-safe:w-[34vw]">
            <span data-reveal="fade" className="label text-muted">
              03 — Featured Work
            </span>
            <h2
              id="work-heading"
              data-reveal="lines"
              className="text-[clamp(3.5rem,14vw,16rem)] leading-[0.85] lowercase md:motion-safe:text-[clamp(3.5rem,7.6vw,9.5rem)]"
            >
              featured work
            </h2>
            <span data-reveal="fade" data-reveal-delay="0.2" className="label text-muted">
              Selected projects ({pad(PROJECTS.length)})
            </span>
          </header>

          {PROJECTS.map((project, index) => (
            <ProjectSpread key={project.title} project={project} number={pad(index + 1)} />
          ))}
        </div>
      </div>
    </Section>
  )
}

function ProjectSpread({ project, number }: { project: Project; number: string }) {
  const headingId = `project-${number}`
  const { title, description, tags, meta, credit, highlights, href, image } = project

  return (
    <article
      data-spread
      aria-labelledby={headingId}
      className="grid w-full shrink-0 grid-cols-1 gap-y-8 md:motion-safe:w-[min(88vw,172svh)] md:motion-safe:grid-cols-12 md:motion-safe:items-end md:motion-safe:gap-x-[2.5vw]"
    >
      <figure className="md:motion-safe:col-span-7">
        <div className="label mb-4 flex items-baseline justify-between gap-6">
          <span data-reveal="fade" className="text-muted">
            {number}
          </span>
          {credit && (
            <span data-reveal="fade" data-reveal-delay="0.3" className="text-right text-accent">
              {credit}
            </span>
          )}
        </div>

        <div data-reveal="clip-x" className="relative aspect-[16/10] overflow-hidden bg-surface">
          {image ? (
            <img
              data-reveal-zoom
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              loading="lazy"
              decoding="async"
              // Anchored top-left: screenshots keep their navigation edge; any crop falls on the right.
              className="h-full w-full object-cover object-[0%_0%]"
            />
          ) : (
            // No screenshot yet — add `image` in ./projectData.ts to replace this. A deliberate
            // typographic panel (the name in the display face, in the hairline grey) rather than
            // an empty box; decorative, so hidden from assistive tech (the h3 carries the name).
            <div aria-hidden="true" className="relative flex h-full w-full items-center justify-center border border-line bg-background">
              <span data-reveal-zoom className="font-display text-[clamp(3rem,9vw,11rem)] leading-none text-line">
                {title}
              </span>
              <span className="label absolute bottom-[6%] left-[5%] text-muted">Screens coming soon</span>
            </div>
          )}
        </div>

        <figcaption data-reveal="fade" data-reveal-delay="0.4" className="label mt-4 text-muted">
          {title}
          {image ? ` — ${image.caption}` : ''}
        </figcaption>
      </figure>

      <div className="md:motion-safe:col-span-5 md:motion-safe:pb-[2.6rem]">
        <h3
          id={headingId}
          data-reveal="lines"
          data-reveal-delay="0.15"
          className="font-display text-[clamp(3.25rem,6.2vw,7.5rem)] leading-[0.95] font-normal"
        >
          {title}
        </h3>
        <div aria-hidden="true" data-reveal="rule" data-reveal-delay="0.3" className="mt-6 h-px w-full bg-accent" />
        <p data-reveal="rise" data-reveal-delay="0.35" className="label mt-4 text-muted">
          {meta.join(' · ')}
        </p>

        <p
          data-reveal="lines"
          data-reveal-delay="0.4"
          className="mt-6 max-w-[46ch] text-[clamp(1rem,min(1.15vw,2.1svh),1.2rem)] leading-[1.5]"
        >
          {description}
        </p>

        <ul className="mt-6 max-w-[46ch] space-y-2 text-[clamp(0.9rem,min(1vw,1.85svh),1.05rem)] leading-[1.45] text-muted">
          {highlights.map((line, index) => (
            <li key={line} data-reveal="rise" data-reveal-delay={String(0.5 + index * 0.08)} className="flex gap-3">
              <span aria-hidden="true" className="text-accent">
                —
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <div className="mt-7 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-4">
          <p data-reveal="rise" data-reveal-delay="0.7" className="label text-muted">
            {tags.join(' · ')}
          </p>
          {href && (
            <a
              data-reveal="rise"
              data-reveal-delay="0.75"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="nav-text group text-foreground"
            >
              <RollText>Live site ↗</RollText>
            </a>
          )}
        </div>
      </div>
    </article>
  )
}
