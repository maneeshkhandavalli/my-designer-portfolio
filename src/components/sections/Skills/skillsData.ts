/**
 * Skills content. Nothing here is a rating or a claim of years — only what the record
 * supports:
 *  - Groups marked 'résumé' come from ManeeshKhandavalli-resume.pdf (Skills), in its
 *    wording; Netlify and UI/UX design are listed there too.
 *  - Creative development is backed by this site's own code: GSAP + ScrollTrigger and
 *    Lenis (every section), Three.js via React Three Fiber on WebGL (the Story star,
 *    effects/CrystalStar), SVG filters and the interactive effects (effects/FluidCursor).
 */

export type Skill = {
  name: string
  /** Optional small print: where it shows, or which parts. */
  note?: string
}

export type SkillGroup = {
  title: string
  source: 'résumé' | 'this site'
  skills: readonly Skill[]
}

export const SKILL_GROUPS: readonly SkillGroup[] = [
  {
    title: 'Languages',
    source: 'résumé',
    skills: [{ name: 'JavaScript' }, { name: 'TypeScript' }, { name: 'HTML' }, { name: 'CSS' }, { name: 'SQL' }],
  },
  {
    title: 'Frontend',
    source: 'résumé',
    skills: [{ name: 'React' }, { name: 'Vite' }, { name: 'Tailwind CSS' }, { name: 'Responsive web design' }],
  },
  {
    title: 'Backend & data',
    source: 'résumé',
    skills: [
      { name: 'Node.js' },
      { name: 'Express' },
      { name: 'Supabase', note: 'Auth, Realtime' },
      { name: 'PostgreSQL' },
      { name: 'REST APIs' },
    ],
  },
  {
    title: 'AI',
    source: 'résumé',
    skills: [{ name: 'LLM API integration' }, { name: 'Prompt design' }],
  },
  {
    title: 'Creative development',
    source: 'this site',
    skills: [
      { name: 'GSAP & ScrollTrigger' },
      { name: 'Lenis' },
      { name: 'Three.js / React Three Fiber', note: 'The Story star' },
      { name: 'WebGL' },
      { name: 'SVG filter effects', note: 'The fluid cursor' },
      { name: 'Interactive visual effects' },
    ],
  },
  {
    title: 'Tools & design',
    source: 'résumé',
    skills: [{ name: 'Git' }, { name: 'GitHub' }, { name: 'Netlify' }, { name: 'Figma' }, { name: 'UI/UX design' }],
  },
]
