import type { MouseEvent } from 'react'
import { RollText } from '@/components/navigation/RollText'
import { StarMark } from '@/components/navigation/StarMark'
import { useScrollToSection } from '@/hooks/useScrollToSection'

const YEAR = new Date().getFullYear()

type FooterProps = {
  inert?: boolean
}

/**
 * The page's last line, on the Contact section's warm-white ground: the star and the
 * copyright, the Midnight Labs credit (linked to its section — the only verified
 * Midnight Labs destination there is), and the star again as Back to top. Both links
 * travel through Lenis like the navbar's (useScrollToSection: smooth, instant with
 * reduced motion, focus moved, hash updated).
 */
export function Footer({ inert }: FooterProps) {
  const scrollToSection = useScrollToSection()

  const go = (event: MouseEvent<HTMLAnchorElement>, id: 'hero' | 'midnight-labs') => {
    event.preventDefault()
    scrollToSection(id)
  }

  return (
    <footer inert={inert} className="bg-canvas px-(--frame-gutter) pb-(--frame-gutter) text-ink">
      <div className="label flex flex-col gap-6 border-t border-ink/15 pt-8 pb-2 md:flex-row md:items-center md:justify-between">
        <p className="flex items-center gap-3">
          <StarMark className="h-4 w-auto text-accent" />
          <span>© {YEAR} Maneesh Khandavalli</span>
        </p>

        <p className="text-panel-muted">
          Designed &amp; built by Maneesh ·{' '}
          <a
            href="#midnight-labs"
            onClick={(event) => go(event, 'midnight-labs')}
            className="text-ink underline decoration-ink/25 underline-offset-4 transition-colors duration-300 hover:text-accent hover:decoration-accent focus-visible:text-accent"
          >
            Midnight Labs
          </a>
        </p>

        <a
          href="#hero"
          onClick={(event) => go(event, 'hero')}
          className="group flex w-fit items-center gap-3 text-ink transition-colors duration-300 hover:text-accent focus-visible:text-accent"
        >
          <RollText>Back to top</RollText>
          <StarMark className="h-4 w-auto transition-transform duration-700 ease-out-expo group-hover:-rotate-60 group-focus-visible:-rotate-60 motion-reduce:transition-none" />
        </a>
      </div>
    </footer>
  )
}
