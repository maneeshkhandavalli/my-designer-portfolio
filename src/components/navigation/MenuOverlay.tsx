import { useLenis } from 'lenis/react'
import { useEffect, useRef, type MouseEvent } from 'react'
import { useScrollToSection } from '@/hooks/useScrollToSection'
import { gsap, MOTION, useGSAP } from '@/lib/gsap'
import { NAV_LINKS, type SectionId } from '@/lib/sections'
import { MENU_ID } from './SiteNav'

type MenuOverlayProps = {
  open: boolean
  onClose: () => void
}

const YEAR = new Date().getFullYear()

/**
 * Full-screen editorial menu inside the frame: WORK / ABOUT / SKILLS / CONTACT
 * set very large, revealed with a clip wipe and a staggered rise.
 * Interim stand-in for the React Bits StaggeredMenu.
 * Placeholder for the React Bits StaggeredMenu — keep the id, open/close contract,
 * Escape handling, scroll lock and focus behaviour when replacing the visuals.
 */
export function MenuOverlay({ open, onClose }: MenuOverlayProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const timeline = useRef<gsap.core.Timeline>(null)
  const lenis = useLenis()
  const scrollToSection = useScrollToSection()

  useGSAP(
    () => {
      timeline.current = gsap
        .timeline({ paused: true, onReverseComplete: () => gsap.set(rootRef.current, { autoAlpha: 0 }) })
        .fromTo(
          rootRef.current,
          { clipPath: 'inset(0% 0% 100% 0%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: MOTION.ease.inOut },
        )
        .from('[data-menu-item]', { yPercent: 110, duration: 1.1, stagger: 0.07 }, '-=0.35')
        .from('[data-menu-meta]', { autoAlpha: 0, duration: 0.6 }, '-=0.8')
    },
    { scope: rootRef },
  )

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const tl = timeline.current
    if (open) {
      lenis?.stop()
      if (reduced) tl?.progress(1)
      else tl?.timeScale(1).play()
      // Visible before focusing — the timeline's first frame only renders on the next tick.
      gsap.set(rootRef.current, { autoAlpha: 1 })
      rootRef.current?.querySelector<HTMLElement>('a')?.focus({ preventScroll: true })
    } else {
      lenis?.start()
      if (reduced || tl?.progress() === 0) {
        tl?.progress(0)
        gsap.set(rootRef.current, { autoAlpha: 0 })
      } else tl?.timeScale(1.6).reverse()
    }
  }, [open, lenis])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const handleNavigate = (event: MouseEvent<HTMLAnchorElement>, id: SectionId) => {
    event.preventDefault()
    onClose()
    // Wait for the close to commit (scroll unlocked, page no longer inert) before moving.
    requestAnimationFrame(() => scrollToSection(id))
  }

  return (
    <div
      ref={rootRef}
      id={MENU_ID}
      inert={!open}
      className="invisible fixed inset-(--frame-inset) z-40 flex flex-col justify-between bg-background px-[calc(var(--frame-gutter)-var(--frame-inset))] pt-[calc(var(--nav-clearance)-var(--frame-inset))] pb-[calc(var(--frame-gutter)-var(--frame-inset))] opacity-0"
    >
      <nav aria-label="Menu" className="flex flex-1 items-center">
        {/* Poster scale: height-led on desktop (all four always fit), width-led on phones. */}
        <ol className="flex flex-col gap-y-[0.05em] text-[min(24vw,19.5svh)] leading-[0.85]">
          {NAV_LINKS.map(({ id, label }, index) => (
            <li key={id} className="-my-[0.06em] overflow-hidden py-[0.06em]">
              <a
                href={`#${id}`}
                onClick={(event) => handleNavigate(event, id)}
                data-menu-item
                className="group flex items-start gap-[0.3em] uppercase transition-colors duration-300 hover:text-accent focus-visible:text-accent"
              >
                <span className="nav-text mt-[0.55em] text-muted transition-colors duration-300 group-hover:text-accent group-focus-visible:text-accent">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="block transition-transform duration-500 ease-out-expo group-hover:translate-x-[0.12em] group-focus-visible:translate-x-[0.12em]">
                  {label}
                </span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="label flex justify-between gap-6 text-muted">
        <span data-menu-meta>Midnight Labs</span>
        <span data-menu-meta>Maneesh Khandavalli © {YEAR}</span>
      </div>
    </div>
  )
}
