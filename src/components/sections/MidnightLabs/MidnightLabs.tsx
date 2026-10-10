import { useRef } from 'react'
import { Section } from '@/components/layout/Section'
import { RollText } from '@/components/navigation/RollText'
import { useReveal } from '@/hooks/useReveal'
import { AGENCY, AGENCY_WORK, CLIENT_WORK, type AgencyPiece, type ClientWork } from './midnightLabsData'

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * 04 — Midnight Labs: the agency, then the work it delivers.
 *
 *   intro      the section title in the display face, a crimson rule, the agency's real
 *              wordmark (framed, as supplied), its own description and services
 *   the agency the website (real screenshot, original colours) large on the left, the
 *              dashboard offset lower on the right (typographic panel until screens exist)
 *   selected   a numbered editorial index of client work — Vyuha, Varahi, the WhatsApp
 *   work       bot — each with its real visual (or its flow set as type) and only
 *              verified links
 *   exit       the agency's own line, then a full-width hairline that draws across:
 *              the hand-over to the next section (My Creations)
 *
 * Motion: the shared reveals (lib/reveal) — in on enter, reversed on leave, replayed on
 * return; lists and client rows enter as one staggered group each, and the title settles
 * up into place as the section arrives from Featured Work. Reduced motion: all as is. No pin, no blur, no
 * loops — transforms, opacity and clip-path only. Content: ./midnightLabsData.ts.
 */
export function MidnightLabs() {
  const rootRef = useRef<HTMLElement>(null)
  useReveal(rootRef)

  return (
    <Section
      ref={rootRef}
      id="midnight-labs"
      aria-labelledby="midnight-labs-heading"
      className="px-(--frame-gutter) pt-[18svh] pb-[14svh]"
    >
      {/* Intro */}
      <header className="grid grid-cols-1 gap-y-10 md:grid-cols-12 md:gap-x-6">
        <div className="label flex justify-between gap-6 text-muted md:col-span-12">
          <span data-reveal="fade">04 — Midnight Labs</span>
          <span data-reveal="fade" data-reveal-delay="0.15">
            The agency
          </span>
        </div>

        <h2
          id="midnight-labs-heading"
          data-reveal="lines"
          data-settle-y="9"
          className="text-[clamp(2.5rem,12.5vw,15rem)] leading-[0.85] lowercase md:col-span-11"
        >
          midnight labs
        </h2>
        <div aria-hidden="true" data-reveal="rule" data-reveal-delay="0.2" className="h-px bg-accent md:col-span-12" />

        <figure className="md:col-span-4 md:mt-4">
          <div data-reveal="clip-x" data-reveal-delay="0.25" className="border border-line px-[9%] py-[13%]">
            <img
              src={AGENCY.wordmark.src}
              width={AGENCY.wordmark.width}
              height={AGENCY.wordmark.height}
              alt="Midnight Labs"
              className="h-auto w-full"
            />
          </div>
          <figcaption data-reveal="fade" data-reveal-delay="0.4" className="label mt-3 text-muted">
            Wordmark
          </figcaption>
        </figure>

        <div className="md:col-span-6 md:col-start-7 md:mt-4">
          <p data-reveal="lines" data-reveal-delay="0.2" className="text-[clamp(1.375rem,2.2vw,2.25rem)] leading-[1.2]">
            {AGENCY.description}
          </p>
          <p
            data-reveal="lines"
            data-reveal-delay="0.35"
            className="mt-6 max-w-[46ch] text-support text-muted"
          >
            {AGENCY.built}
          </p>
          <ul
            aria-label="Services"
            data-reveal="group"
            data-reveal-delay="0.45"
            className="label mt-8 flex flex-wrap gap-x-5 gap-y-2 text-muted"
          >
            {AGENCY.services.map((service) => (
              <li key={service}>{service}</li>
            ))}
          </ul>
        </div>
      </header>

      {/* The agency: its own website and dashboard. */}
      <div className="mt-[16svh] grid grid-cols-1 gap-y-16 md:grid-cols-12 md:gap-x-6">
        {AGENCY_WORK.map((piece, index) => (
          <AgencyPanel
            key={piece.title}
            piece={piece}
            number={pad(index + 1)}
            className={index === 0 ? 'md:col-span-8' : 'md:col-span-4 md:mt-[24svh]'}
          />
        ))}
      </div>

      {/* Selected work the agency delivered. */}
      <div className="mt-[18svh]">
        <div className="grid grid-cols-1 items-end gap-y-4 md:grid-cols-12 md:gap-x-6">
          <h3 data-reveal="lines" className="text-[clamp(2.5rem,6vw,7rem)] leading-[0.9] lowercase md:col-span-7">
            selected work
          </h3>
          <p data-reveal="fade" data-reveal-delay="0.2" className="label text-muted md:col-span-5 md:text-right">
            Delivered by Midnight Labs ({pad(CLIENT_WORK.length)})
          </p>
        </div>
        <ol className="mt-10 border-t border-line">
          {CLIENT_WORK.map((work, index) => (
            <ClientRow key={work.name} work={work} number={pad(index + 1)} />
          ))}
        </ol>
      </div>

      {/* Exit: the agency's own line, then the hairline that hands over to the next section. */}
      <figure className="mt-[20svh] grid grid-cols-1 md:grid-cols-12 md:gap-x-6">
        <blockquote
          data-reveal="lines"
          className="text-[clamp(1.75rem,3.4vw,3.75rem)] leading-[1.12] md:col-span-9"
        >
          “{AGENCY.tagline}”
        </blockquote>
        <figcaption data-reveal="fade" data-reveal-delay="0.3" className="label mt-6 text-muted md:col-span-12">
          — Midnight Labs, from its homepage
        </figcaption>
      </figure>
      <div aria-hidden="true" data-reveal="rule" className="mt-[12svh] h-px bg-line" />
    </Section>
  )
}

function AgencyPanel({ piece, number, className }: { piece: AgencyPiece; number: string; className: string }) {
  const { title, description, stack, image, parts } = piece

  return (
    <figure className={className}>
      <div data-reveal="group" className="label mb-4 flex items-baseline gap-4 text-muted">
        <span>{number}</span>
        <span className="text-foreground">
          {title}
        </span>
      </div>

      {image ? (
        // Shown in its original colours (no tint): it is the agency's own site. The frame takes
        // the image's own ratio, so nothing is cropped.
        <div
          data-reveal="clip-x"
          className="relative overflow-hidden border border-line bg-surface"
          style={{ aspectRatio: `${image.width} / ${image.height}` }}
        >
          <img
            data-reveal-zoom
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-[0%_0%]"
          />
        </div>
      ) : (
        // No screenshot yet: the product's real parts, set as type — not a fake screen.
        <div
          data-reveal="clip-y"
          className="relative flex aspect-[16/10] flex-col justify-between border border-line bg-background p-[7%] md:aspect-[4/3]"
        >
          <ul className="space-y-3">
            {parts?.map((part, index) => (
              <li
                key={part}
                className="flex items-baseline justify-between gap-4 border-b border-line pb-3 text-[clamp(1.125rem,1.6vw,1.6rem)] leading-tight"
              >
                <span>{part}</span>
                <span className="label text-muted">{pad(index + 1)}</span>
              </li>
            ))}
          </ul>
          <span className="label text-muted">Screens coming soon</span>
        </div>
      )}

      <figcaption className="mt-5 grid gap-y-3">
        <p data-reveal="lines" data-reveal-delay="0.2" className="max-w-[52ch] text-support">
          {description}
        </p>
        <p data-reveal="rise" data-reveal-delay="0.3" className="label text-muted">
          {stack.join(' · ')}
        </p>
      </figcaption>
    </figure>
  )
}

function ClientRow({ work, number }: { work: ClientWork; number: string }) {
  const { name, kind, description, stack, href, visual } = work

  return (
    // One trigger per row: its four columns rise in together, in a short stagger.
    <li
      data-reveal="group"
      className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-5 border-b border-line py-8 md:grid-cols-12 md:items-center md:gap-x-6 md:py-10"
    >
      <span className="label text-muted md:col-span-1">
        {number}
      </span>
      <div className="md:col-span-4">
        <h4
          className="font-display text-[clamp(2rem,3.6vw,4.25rem)] leading-[0.95] font-normal [font-synthesis:none]"
        >
          {name}
        </h4>
        <p className="label mt-3 text-accent-light">
          {kind}
        </p>
      </div>

      <div className="col-span-2 md:col-span-4">
        <p className="max-w-[44ch] text-support text-muted">
          {description}
        </p>
        {stack && (
          <p className="label mt-4 text-muted">
            {stack.join(' · ')}
          </p>
        )}
      </div>

      <div className="col-span-2 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 md:col-span-3 md:items-center">
        <ClientVisual visual={visual} />
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="nav-text group shrink-0 text-foreground"
          >
            <RollText>Visit ↗</RollText>
          </a>
        ) : (
          <span aria-hidden="true" />
        )}
      </div>
    </li>
  )
}

function ClientVisual({ visual }: { visual: ClientWork['visual'] }) {
  return (
    <div
      className="relative aspect-square w-[min(9.5rem,34vw)] shrink-0 overflow-hidden border border-line bg-surface"
    >
      {visual.type === 'image' ? (
        <img
          src={visual.src}
          alt={visual.alt}
          width={visual.width}
          height={visual.height}
          loading="lazy"
          decoding="async"
          className={`h-full w-full ${visual.fit === 'cover' ? 'object-cover' : 'object-contain'}`}
        />
      ) : (
        // No visual asset exists: the bot's real flow, set as type.
        <ol aria-label="How it works" className="label flex h-full flex-col justify-center gap-2 bg-background px-[12%] text-foreground">
          {visual.steps.map((step, index) => (
            <li key={step} className="flex items-baseline gap-2">
              {index > 0 && (
                <span aria-hidden="true" className="text-accent">
                  →
                </span>
              )}
              <span>{step}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
