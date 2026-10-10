/**
 * Single source of truth for the one-page section order, anchor ids and nav labels.
 * App.tsx renders sections in this order; navigation reads labels from here.
 */
export const SECTIONS = [
  { id: 'hero', label: 'Home' },
  { id: 'story', label: 'Story' },
  { id: 'statement', label: 'UI * UX * Stunning' },
  { id: 'work', label: 'Featured Work' },
  { id: 'midnight-labs', label: 'Midnight Labs' },
  { id: 'creations', label: 'My Creations' },
  { id: 'skills', label: 'Skills' },
  { id: 'contact', label: 'Contact' },
] as const

export type SectionId = (typeof SECTIONS)[number]['id']

type NavLink = { id: SectionId; label: string }

/** Links in the full-screen menu (design order, not page order). */
export const NAV_LINKS: readonly NavLink[] = [
  { id: 'work', label: 'Work' },
  { id: 'story', label: 'About' },
  { id: 'midnight-labs', label: 'Midnight Labs' },
  { id: 'creations', label: 'My Creations' },
  { id: 'skills', label: 'Skills' },
  { id: 'contact', label: 'Contact' },
]
