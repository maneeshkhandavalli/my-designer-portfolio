import type { ComponentProps } from 'react'
import { STAR_ASPECT, STAR_SVG_PATH } from '@/lib/star'

type StarMarkProps = Omit<ComponentProps<'svg'>, 'viewBox' | 'children'>

/**
 * Flat six-point star mark — the site logo. Same outline as the WebGL star,
 * measured from public/assets/images/main-star.png. Drawn in currentColor.
 */
export function StarMark(props: StarMarkProps) {
  return (
    <svg
      viewBox={`${-STAR_ASPECT} -1 ${STAR_ASPECT * 2} 2`}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d={STAR_SVG_PATH} fill="currentColor" />
    </svg>
  )
}
