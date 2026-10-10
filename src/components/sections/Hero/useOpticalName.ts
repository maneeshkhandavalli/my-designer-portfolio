import { useLayoutEffect, type RefObject } from 'react'
import { measureLineInk, unionInk, type InkBox } from '@/lib/ink'

/**
 * Optical alignment for the Old English name. CSS boxes don't describe
 * blackletter well (big swashes, overhangs), so this measures each line's real
 * glyph ink with canvas TextMetrics and then:
 *  1. shifts lines so their visible ink starts at the same x (same left edge),
 *  2. shifts the whole block so the visible ink is centred in `stage`.
 * The block is placed with `left`/`top` (layout, never touched by GSAP — GSAP
 * folds a CSS `translate` into its own transform on elements it animates, and the
 * scroll exit animates this block). Per-line shifts use `translate` on the masks,
 * which GSAP doesn't animate. Lines are `[data-name-mask]` elements wrapping a
 * single text element.
 */
export function useOpticalName(stageRef: RefObject<HTMLElement | null>, nameRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const stage = stageRef.current
    const name = nameRef.current
    if (!stage || !name) return

    const masks = [...name.querySelectorAll<HTMLElement>('[data-name-mask]')]

    const apply = () => {
      // Measure the untransformed layout (the scroll exit may have moved the name).
      const transform = name.style.transform
      name.style.transform = 'none'
      name.style.left = '0px'
      name.style.top = '0px'
      masks.forEach((mask) => (mask.style.translate = ''))
      try {
        measureAndPlace()
      } finally {
        name.style.transform = transform
      }
    }

    const measureAndPlace = () => {
      const lines = masks.flatMap((mask) => {
        // Untransformed text origin: the mask's content box (GSAP may be moving the text).
        const box = mask.getBoundingClientRect()
        const maskStyle = getComputedStyle(mask)
        const x = box.left + parseFloat(maskStyle.paddingLeft)
        const lineTop = box.top + parseFloat(maskStyle.paddingTop)
        const ink = measureLineInk(mask.firstElementChild as HTMLElement, x, lineTop)
        return ink ? [ink] : []
      })
      if (lines.length !== masks.length || lines.length === 0) return

      // 1. Common visible left edge.
      const edge = Math.min(...lines.map((line) => line.left))
      const shifts = lines.map((line) => edge - line.left)
      masks.forEach((mask, i) => (mask.style.translate = `${shifts[i]}px 0`))

      // 2. Centre the union of visible ink in the stage.
      const ink = unionInk(lines.map((line, i): InkBox => ({ ...line, left: line.left + shifts[i]!, right: line.right + shifts[i]! })))
      const s = stage.getBoundingClientRect()
      const dx = s.left + s.width / 2 - (ink.left + ink.right) / 2
      const dy = s.top + s.height / 2 - (ink.top + ink.bottom) / 2
      name.style.left = `${dx}px`
      name.style.top = `${dy}px`
    }

    apply()
    void document.fonts.ready.then(apply)
    const observer = new ResizeObserver(apply)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [stageRef, nameRef])
}
