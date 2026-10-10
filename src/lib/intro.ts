/**
 * Page-load handshake. The Loader calls `markIntroReady()` while it still covers
 * the page; the navigation and Hero start their entrance from that signal, so
 * loader → Hero entrance runs as one continuous sequence.
 * `markIntroOpen()` follows the moment the Loader starts uncovering the page:
 * from then on the frame/navbar tone follows the page (hooks/useChromeTone).
 * With reduced motion the Loader only holds briefly and nothing animates.
 */
let ready = false
let open = false
const listeners = new Set<() => void>()

const notify = () => listeners.forEach((listener) => listener())

export function markIntroReady() {
  if (ready) return
  ready = true
  notify()
}

export function markIntroOpen() {
  if (open) return
  ready = true
  open = true
  notify()
}

export function isIntroReady() {
  return ready
}

export function isIntroOpen() {
  return open
}

export function subscribeIntro(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Seconds after `markIntroReady()` at which the Hero entrance starts: the moment the
 * Loader's lifting curtain clears the centre of the viewport (Loader derives its timing from it).
 */
export const INTRO_HANDOFF = 1.3
