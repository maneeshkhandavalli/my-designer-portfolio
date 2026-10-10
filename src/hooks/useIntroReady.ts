import { useSyncExternalStore } from 'react'
import { isIntroOpen, isIntroReady, subscribeIntro } from '@/lib/intro'

/** True once the Loader has handed over to the page. */
export function useIntroReady(): boolean {
  return useSyncExternalStore(subscribeIntro, isIntroReady, isIntroReady)
}

/** True once the Loader has started uncovering the page. */
export function useIntroOpen(): boolean {
  return useSyncExternalStore(subscribeIntro, isIntroOpen, isIntroOpen)
}
