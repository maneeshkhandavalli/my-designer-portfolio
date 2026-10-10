/**
 * Glyph-ink measurement for display type. Old English swashes, ascenders and
 * descenders make CSS boxes a poor guide to where the visible letters are, so
 * optical alignment measures the real ink with canvas TextMetrics.
 */
export type InkBox = { left: number; right: number; top: number; bottom: number }

let ctx: CanvasRenderingContext2D | null = null

/**
 * Visible ink box (viewport px) of single-line text in `text`, given where its
 * untransformed text origin is: `x` = start of the text, `lineTop` = top of its line box.
 */
export function measureLineInk(text: HTMLElement, x: number, lineTop: number): InkBox | null {
  ctx ??= document.createElement('canvas').getContext('2d')
  if (!ctx) return null
  const style = getComputedStyle(text)
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
  const m = ctx.measureText(text.textContent ?? '')
  const lineHeight = parseFloat(style.lineHeight)
  const baseline = lineTop + (lineHeight - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent
  return {
    left: x - m.actualBoundingBoxLeft,
    right: x + m.actualBoundingBoxRight,
    top: baseline - m.actualBoundingBoxAscent,
    bottom: baseline + m.actualBoundingBoxDescent,
  }
}

export function unionInk(boxes: InkBox[]): InkBox {
  return boxes.reduce<InkBox>(
    (acc, b) => ({
      left: Math.min(acc.left, b.left),
      right: Math.max(acc.right, b.right),
      top: Math.min(acc.top, b.top),
      bottom: Math.max(acc.bottom, b.bottom),
    }),
    { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity },
  )
}
