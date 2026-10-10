import { useRef } from 'react'
import { VelocityMarquee } from '@/components/effects/VelocityMarquee/VelocityMarquee'
import { Section } from '@/components/layout/Section'
import { StarMark } from '@/components/navigation/StarMark'
import { useReveal } from '@/hooks/useReveal'

const WORDS = ['UI', 'UX', 'Stunning'] as const

/**
 * UI * UX * Stunning — not a full section: a compact marquee band that closes
 * the Story/About experience and hands over to Featured Work.
 * Set on a crimson band — the page's one solid crimson moment, after the Story's red
 * transition and before the dark Featured Work: ivory words, the "*" separators are the
 * six-point star mark in near-black ink.
 * Entrance: the words rise into the band from its lower edge (shared clip reveal,
 * reversed on leave, replayed on return); the loop itself is unchanged.
 */
export function Statement() {
  const rootRef = useRef<HTMLElement>(null)
  useReveal(rootRef)

  return (
    <Section
      ref={rootRef}
      id="statement"
      aria-labelledby="statement-heading"
      className="bg-accent py-[clamp(1.25rem,2.5vw,2.5rem)] text-foreground"
    >
      <h2 id="statement-heading" className="sr-only">
        UI * UX * Stunning
      </h2>
      <div data-reveal="clip-y">
        <VelocityMarquee>
          {WORDS.map((word) => (
            <span
              key={word}
              className="flex items-center font-display text-[clamp(4rem,11vw,12rem)] leading-[1.05] whitespace-nowrap"
            >
              <span className="px-[0.28em]">{word}</span>
              <StarMark className="h-[0.42em] w-auto text-ink" />
            </span>
          ))}
        </VelocityMarquee>
      </div>
    </Section>
  )
}
