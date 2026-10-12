/**
 * My Creations content. Each entry's claims are checked against the work itself:
 *  - Fluid Surface: components/effects/FluidCursor (FluidCursor.tsx + fluidField.ts) —
 *    a CPU stable-fluids solver on a 16px grid; site-wide its flow becomes a displacement
 *    map for an SVG filter applied with backdrop-filter (Chromium, fine pointer, motion
 *    allowed). It is not WebGL.
 *  - Nemora: the custom typeface in progress. The prototype files (src/specimen/fonts)
 *    are renamed Noto Serif outlines, so nothing here shows or names them as the
 *    finished face.
 *
 * To add a creation: append an entry here and register its preview in PREVIEWS
 * (MyCreations.tsx). The index, numbering and switching need no other change.
 */

export type CreationPreview = 'fluid' | 'nemora'

export type Creation = {
  id: string
  title: string
  kind: string
  status: string
  /** Shown as live (warm white) or forthcoming (muted) in the index. */
  forthcoming?: boolean
  summary: string
  /** How it works / what it is, one short paragraph per point. */
  notes: readonly string[]
  /** Small print under the notes (scope, support, honesty). */
  aside?: string
  stack?: readonly string[]
  preview: CreationPreview
}

export const CREATIONS: readonly Creation[] = [
  {
    id: 'fluid-surface',
    title: 'Fluid Surface',
    kind: 'Interaction experiment',
    status: 'Live on this site',
    summary:
      'The cursor effect on this site. There is no cursor object: the page is the surface, and moving the pointer stirs it.',
    notes: [
      'A small fluid simulation — advection, pressure projection, vorticity confinement — runs on the CPU over a 16 px grid, and only while something is moving.',
      'Across the site, the flow becomes a displacement map for an SVG filter applied with backdrop-filter, so the live page bends with it, with a slight red and blue offset at the edges.',
      'In this panel the same solver is drawn directly: each mark leans and stretches with the flow beneath it.',
    ],
    aside:
      'The page-wide effect runs in Chromium-based browsers with a mouse, and switches off for touch and reduced motion. The panel works with touch too.',
    stack: ['TypeScript', 'Canvas 2D', 'SVG filters', 'GSAP ticker'],
    preview: 'fluid',
  },
  {
    id: 'nemora',
    title: 'Nemora',
    kind: 'Typeface',
    status: 'In development',
    forthcoming: true,
    summary: 'A custom typeface being drawn for this portfolio, planned in two roles: Display and Text.',
    notes: [
      'Display — for headings at poster scale.',
      'Text — for supporting headings.',
    ],
    aside: 'Not shown yet: the letterforms are still being drawn. Until then the site’s headings stay in Old English Text MT.',
    preview: 'nemora',
  },
]
