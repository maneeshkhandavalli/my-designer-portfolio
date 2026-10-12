import type { MouseEvent } from 'react'
import { StarMark } from '@/components/navigation/StarMark'
import { useScrollToSection } from '@/hooks/useScrollToSection'

const YEAR = new Date().getFullYear()
/** The supplied star (public/assets/images/main-star.png, 683×788) — the source of the site's crimson. */
const STAR = { src: '/assets/images/main-star.png', width: 683, height: 788 }

type FooterProps = {
  inert?: boolean
}

/**
 * The page's last line, on the Contact section's warm-white ground: the star and the
 * copyright, the Midnight Labs credit (linked to its section — the only verified
 * Midnight Labs destination there is), and the supplied crimson star alone as Back to top
 * (named for assistive tech; it turns a sixth of a turn and grows a touch on hover / focus;
 * motionless with reduced motion, where the focus ring alone marks it). Both links travel
 * through Lenis like the navbar's (useScrollToSection: smooth, instant with reduced motion,
 * focus moved, hash updated). The cursor layers above are pointer-events: none, so they
 * never take the click.
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

        <a href="#hero" onClick={(event) => go(event, 'hero')} className="group -m-2 block w-fit p-2">
          <span className="sr-only">Back to top</span>
          <img
            src={STAR.src}
            width={STAR.width}
            height={STAR.height}
            alt=""
            draggable={false}
            decoding="async"
            className="h-[clamp(1.5rem,1.6vw,2rem)] w-auto select-none motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out-expo motion-safe:group-hover:scale-110 motion-safe:group-hover:-rotate-60 motion-safe:group-focus-visible:scale-110 motion-safe:group-focus-visible:-rotate-60"
          />
        </a>
      </div>
    </footer>
  )
}
