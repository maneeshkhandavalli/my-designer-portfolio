import { VelocityMarquee } from '@/components/effects/VelocityMarquee/VelocityMarquee'
import { Section } from '@/components/layout/Section'
import { StarMark } from '@/components/navigation/StarMark'

const WORDS = ['UI', 'UX', 'Stunning'] as const

/**
 * UI * UX * Stunning — not a full section: a compact marquee band that closes
 * the Story/About experience and hands over to Featured Work.
 * The "*" separators are the six-point star mark in accent red.
 */
export function Statement() {
  return (
    <Section
      id="statement"
      aria-labelledby="statement-heading"
      className="border-y border-line py-[clamp(1.25rem,2.5vw,2.5rem)]"
    >
      <h2 id="statement-heading" className="sr-only">
        UI * UX * Stunning
      </h2>
      <VelocityMarquee>
        {WORDS.map((word) => (
          <span
            key={word}
            className="flex items-center font-display text-[clamp(4rem,11vw,12rem)] leading-[1.05] whitespace-nowrap"
          >
            <span className="px-[0.28em]">{word}</span>
            <StarMark className="h-[0.42em] w-auto text-accent" />
          </span>
        ))}
      </VelocityMarquee>
    </Section>
  )
}
