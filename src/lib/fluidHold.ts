import { useSyncExternalStore } from 'react'

/**
 * Lets a contained fluid experiment (My Creations › Fluid Surface) hold the site-wide
 * fluid cursor still while the pointer is over it, so the two never stack. AppShell
 * feeds this into FluidCursor's existing `paused` prop — the cursor itself is unchanged.
 */
let held = false
const listeners = new Set<() => void>()

export function holdFluidCursor(on: boolean) {
  if (on === held) return
  held = on
  listeners.forEach((listener) => listener())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** True while a contained experiment holds the site-wide cursor. */
export function useFluidCursorHeld(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => held,
    () => false,
  )
}
