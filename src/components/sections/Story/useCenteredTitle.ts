import { useLayoutEffect, type RefObject } from 'react'
import { measureLineInk, unionInk } from '@/lib/ink'

/**
 * Optical centring for the Story title on the stage's single axis.
 * The layout already centres both lines (flex column, align-items: center);
 * this only corrects for Old English ink, which isn't centred in its CSS box:
 *  - each line is nudged so its *visible* ink is centred on the axis,
 *  - the title block is nudged so the visible ink's centre sits on the stage
 *    centre — the same point the star is centred on.
 * Corrections go on `[data-ink-line]` wrappers and the title itself via CSS
 * `translate`; GSAP only animates the inner `[data-story-line]` spans.
 */
export function useCenteredTitle(stageRef: RefObject<HTMLElement | null>, titleRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const stage = stageRef.current
    const title = titleRef.current
    if (!stage || !title) return
    const wrappers = [...title.querySelectorAll<HTMLElement>('[data-ink-line]')]

    const apply = () => {
      title.style.translate = ''
      wrappers.forEach((wrapper) => (wrapper.style.translate = ''))

      const s = stage.getBoundingClientRect()
      const axis = s.left + s.width / 2

      const lines = wrappers.flatMap((wrapper) => {
        const box = wrapper.getBoundingClientRect()
        const ink = measureLineInk(wrapper.firstElementChild as HTMLElement, box.left, box.top)
        if (!ink) return []
        const dx = axis - (ink.left + ink.right) / 2
        wrapper.style.translate = `${dx}px 0`
        return [{ ...ink, left: ink.left + dx, right: ink.right + dx }]
      })
      if (lines.length === 0) return

      const ink = unionInk(lines)
      const dy = s.top + s.height / 2 - (ink.top + ink.bottom) / 2
      title.style.translate = `0 ${dy}px`
    }

    apply()
    void document.fonts.ready.then(apply)
    const observer = new ResizeObserver(apply)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [stageRef, titleRef])
}
