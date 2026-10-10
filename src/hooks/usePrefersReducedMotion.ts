import { useMediaQuery } from './useMediaQuery'

/** True when the user has asked the OS to minimise motion. */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}
