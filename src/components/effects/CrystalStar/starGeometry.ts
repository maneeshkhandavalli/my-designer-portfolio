import { BufferGeometry, Color, Float32BufferAttribute } from 'three'
import { starOutline } from '@/lib/star'

/**
 * Top → bottom colours, after main-star.png (sampled #b63737 → #d70808), nudged
 * slightly more saturated so the star registers strongly against #050505.
 */
export const STAR_COLOR_TOP = '#c22626'
export const STAR_COLOR_BOTTOM = '#dc0a0a'

/**
 * Near-flat star: the exact six-point outline (lib/star.ts) as the rim, raised
 * to a very shallow apex front and back so tilting it catches a hint of light,
 * while it still reads as the flat graphic. Vertex colours reproduce the PNG's
 * subtle top-to-bottom shift (linear in y, so it interpolates exactly).
 *
 * Non-indexed on purpose — every triangle keeps its own flat normal.
 */
export function createStarGeometry(relief = 0.025): BufferGeometry {
  const outline = starOutline(1)
  const positions: number[] = []

  outline.forEach(([ax, ay], i) => {
    const [bx, by] = outline[(i + 1) % outline.length]!
    // Front facet (counter-clockwise seen from +z) and its mirrored back facet.
    positions.push(0, 0, relief, ax, ay, 0, bx, by, 0)
    positions.push(0, 0, -relief, bx, by, 0, ax, ay, 0)
  })

  const top = new Color(STAR_COLOR_TOP)
  const bottom = new Color(STAR_COLOR_BOTTOM)
  const mixed = new Color()
  const colors: number[] = []
  for (let i = 1; i < positions.length; i += 3) {
    mixed.lerpColors(bottom, top, (positions[i]! + 1) / 2)
    colors.push(mixed.r, mixed.g, mixed.b)
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}
