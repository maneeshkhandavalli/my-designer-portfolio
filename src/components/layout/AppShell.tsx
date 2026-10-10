import { useCallback, useState, type ReactNode } from 'react'
import { FluidCursor } from '@/components/effects/FluidCursor/FluidCursor'
import { MenuOverlay } from '@/components/navigation/MenuOverlay'
import { SiteNav } from '@/components/navigation/SiteNav'
import { useChromeTone } from '@/hooks/useChromeTone'
import { useFluidCursorHeld } from '@/lib/fluidHold'
import { Footer } from './Footer'
import { Frame } from './Frame'
import { Loader } from './Loader'

type AppShellProps = {
  children: ReactNode
}

/** Page chrome shared by every section: skip link, frame, loader, navigation, menu, main landmark, footer, fluid cursor field. */
export function AppShell({ children }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const toggleMenu = useCallback(() => setMenuOpen((open) => !open), [])
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  useChromeTone(menuOpen)
  // A contained fluid experiment (My Creations) holds the page-wide field while the pointer is on it.
  const fluidHeld = useFluidCursorHeld()

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-(--frame-gutter) focus:left-(--frame-gutter) focus:z-60 focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
      >
        Skip to content
      </a>
      <Frame />
      <Loader />
      <SiteNav menuOpen={menuOpen} onMenuToggle={toggleMenu} />
      <MenuOverlay open={menuOpen} onClose={closeMenu} />
      <main id="main-content" tabIndex={-1} inert={menuOpen} className="outline-none">
        {children}
      </main>
      <Footer inert={menuOpen} />
      <FluidCursor paused={menuOpen || fluidHeld} />
    </>
  )
}
