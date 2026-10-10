/**
 * Six-point star silhouette — source of truth: public/assets/images/main-star.png.
 *
 * Measured from the PNG alpha channel (683×788): a regular six-point star with
 * all tips on one circle (R = 394px, tips at 90° ± k·60°) and all inner notches
 * on another (r = 0.382·R, at 0° ± k·60°) — 99.7% pixel IoU against the PNG.
 * Every render (WebGL star, SVG nav mark) is generated from this outline so it
 * stays consistent with the supplied asset.
 */
export const STAR_POINTS = 6
export const STAR_INNER_RATIO = 0.382
/** Width / height of the star's bounding box (683 / 788). */
export const STAR_ASPECT = Math.cos(Math.PI / 6)

export type Point = readonly [x: number, y: number]

/**
 * 12 outline vertices (tip, notch, tip, …) counter-clockwise from the top tip,
 * centred on the origin, y-up, outer radius `radius`.
 */
export function starOutline(radius = 1): Point[] {
  const points: Point[] = []
  const step = Math.PI / STAR_POINTS

  for (let i = 0; i < STAR_POINTS * 2; i++) {
    const r = i % 2 === 0 ? radius : radius * STAR_INNER_RATIO
    const angle = Math.PI / 2 + i * step
    points.push([r * Math.cos(angle), r * Math.sin(angle)])
  }

  return points
}

/** SVG path for a viewBox of "-1 -1 2 2" (y-down, so the outline is flipped). */
export const STAR_SVG_PATH = `${starOutline()
  .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(4)} ${(-y).toFixed(4)}`)
  .join(' ')} Z`
