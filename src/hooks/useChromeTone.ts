import { useEffect } from 'react'
import { setChromeForced } from '@/lib/chromeTone'
import { useIntroOpen } from './useIntroReady'

/** Forces the dark chrome while a black screen covers the page: the Loader (until it starts opening), or the open menu. */
export function useChromeTone(menuOpen: boolean) {
  const introOpen = useIntroOpen()

  useEffect(() => setChromeForced(menuOpen || !introOpen), [menuOpen, introOpen])
}
