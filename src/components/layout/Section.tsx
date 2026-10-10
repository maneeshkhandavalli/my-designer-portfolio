import type { ComponentProps } from 'react'
import type { SectionId } from '@/lib/sections'

type SectionProps = Omit<ComponentProps<'section'>, 'id'> & {
  id: SectionId
}

/**
 * Semantic wrapper for every page section. Ids are typed against lib/sections.ts
 * so navigation anchors cannot drift. Focusable (tabIndex -1) so in-page
 * navigation can move keyboard focus to the section.
 */
export function Section({ id, className = '', children, ...props }: SectionProps) {
  return (
    <section id={id} tabIndex={-1} className={`relative outline-none ${className}`.trim()} {...props}>
      {children}
    </section>
  )
}
