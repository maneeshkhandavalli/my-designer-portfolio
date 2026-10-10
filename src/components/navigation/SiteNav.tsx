import { useLenis } from 'lenis/react'
import { useEffect, useRef, type MouseEvent } from 'react'
import { useIntroReady } from '@/hooks/useIntroReady'
import { useScrollToSection } from '@/hooks/useScrollToSection'
import { gsap, MOTION, MOTION_QUERIES, useGSAP } from '@/lib/gsap'
import { INTRO_HANDOFF } from '@/lib/intro'
import type { SectionId } from '@/lib/sections'
import { RollText } from './RollText'
import { StarMark } from './StarMark'

export const MENU_ID = 'site-menu'

type SiteNavProps = {
  menuOpen: boolean
  onMenuToggle: () => void
}

/**
 * Top navigation inside the frame — exactly three things:
 * LEFT the six-point star (logo, back to top);
 * RIGHT "Midnight Labs" + the hamburger (menu control, no "Menu" text).
 * Section links live only in the full-screen menu. Hides while scrolling down.
 * Ink over the light Hero, white over the dark page (`text-chrome`, see lib/chromeTone.ts).
 */
export function SiteNav({ menuOpen, onMenuToggle }: SiteNavProps) {
  const headerRef = useRef<HTMLElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const scrollToSection = useScrollToSection()
  const introReady = useIntroReady()

  // Enters with the Hero construction, once the Loader hands over.
  useGSAP(
    () => {
      if (!introReady) return
      const mm = gsap.matchMedia()
      mm.add(MOTION_QUERIES.motionOk, () => {
        gsap.from('[data-nav-item]', {
          yPercent: 110,
          duration: MOTION.duration.reveal,
          ease: MOTION.ease.out,
          stagger: 0.08,
          delay: INTRO_HANDOFF + 0.2,
        })
      })
    },
    { scope: headerRef, dependencies: [introReady] },
  )

  useLenis(
    (lenis) => {
      const header = headerRef.current
      if (!header) return
      const hidden = !menuOpen && lenis.direction === 1 && lenis.scroll > window.innerHeight * 0.4
      header.dataset.hidden = String(hidden)
    },
    [menuOpen],
  )

  // Return focus to the trigger when the menu closes from inside itself (Escape, close button).
  const wasOpen = useRef(menuOpen)
  useEffect(() => {
    const active = document.activeElement
    if (wasOpen.current && !menuOpen && (!active || active === document.body || active.closest(`#${MENU_ID}`))) {
      triggerRef.current?.focus()
    }
    wasOpen.current = menuOpen
  }, [menuOpen])

  const handleClick = (event: MouseEvent<HTMLAnchorElement>, id: SectionId) => {
    event.preventDefault()
    scrollToSection(id)
  }

  return (
    <header
      ref={headerRef}
      data-hidden="false"
      className="fixed inset-x-0 top-0 z-45 px-(--frame-gutter) pt-(--nav-top) transition-[opacity,translate] duration-500 ease-out-expo data-[hidden=true]:not-focus-within:pointer-events-none data-[hidden=true]:not-focus-within:-translate-y-2 data-[hidden=true]:not-focus-within:opacity-0"
    >
      <nav aria-label="Primary" className="flex items-center justify-between gap-8">
        <a
          href="#hero"
          onClick={(event) => handleClick(event, 'hero')}
          className="group -m-2 block p-2 text-chrome transition-colors duration-500"
          aria-label="Midnight Labs — back to top"
        >
          <span className="block overflow-hidden">
            <span data-nav-item className="block">
              {/* data-star-home: the StarCursor's dock — it lifts this star off and lands back on it. */}
              <StarMark data-star-home className="h-[clamp(1.875rem,2.7vw,2.625rem)] w-auto transition-transform duration-700 ease-out-expo group-hover:rotate-60" />
            </span>
          </span>
        </a>

        <div className="flex items-center gap-[clamp(1.25rem,2.2vw,2.25rem)]">
          <a
            href="#midnight-labs"
            onClick={(event) => handleClick(event, 'midnight-labs')}
            className="nav-text group text-chrome transition-colors duration-500"
          >
            <RollText>Midnight Labs</RollText>
          </a>

          <button
            ref={triggerRef}
            type="button"
            onClick={onMenuToggle}
            aria-expanded={menuOpen}
            aria-controls={MENU_ID}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="group -m-3 flex cursor-pointer items-center p-3 text-chrome transition-colors duration-500"
          >
            <span className="block overflow-hidden">
              <span data-nav-item aria-hidden="true" className="relative block h-[clamp(1.125rem,1.4vw,1.375rem)] w-[clamp(2.25rem,2.9vw,2.875rem)]">
                <span
                  className={`absolute top-1/2 left-0 -mt-px h-[2px] w-full bg-current transition-transform duration-500 ease-out-expo ${
                    menuOpen ? 'rotate-45' : '-translate-y-[0.3rem]'
                  }`}
                />
                <span
                  className={`absolute top-1/2 left-0 -mt-px h-[2px] w-full bg-current transition-transform duration-500 ease-out-expo ${
                    menuOpen ? '-rotate-45' : 'translate-y-[0.3rem]'
                  }`}
                />
              </span>
            </span>
          </button>
        </div>
      </nav>
    </header>
  )
}
