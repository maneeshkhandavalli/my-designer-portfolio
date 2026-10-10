/**
 * Featured Work data. Nothing here is invented:
 *  - PeerSpace — description from peerspace/README.md, stack from its package.json;
 *    award, team and highlights from the résumé (ManeeshKhandavalli-resume.pdf).
 *    No screenshot or live link exists yet (only a logo), so it has neither.
 *  - CuraAI — carried over from the previous portfolio
 *    (Maneesh Khandavalli Portfolio/src/components/Projects/Projects.jsx) with its screenshot;
 *    highlights from the résumé.
 *
 * To add a preview: put the image in public/assets/images/projects/ and set
 * `image` (width/height = the file's pixel size, used to reserve layout space).
 */
export type Project = {
  title: string
  description: string
  tags: readonly string[]
  /** Short facts for the meta line (year, team, context), in reading order. */
  meta: readonly string[]
  /** Recognition, set in the accent colour (e.g. a placing). */
  credit?: string
  /** What was built — two or three lines at most (the spread must fit one viewport). */
  highlights: readonly string[]
  /** Live link; omitted when the project has none. */
  href?: string
  /** Preview screenshot; omitted → a quiet placeholder until one is supplied. */
  image?: { src: string; alt: string; width: number; height: number; caption: string }
}

export const PROJECTS: readonly Project[] = [
  {
    title: 'PeerSpace',
    description:
      'A college-exclusive peer learning and collaboration platform. Students search by skill, connect directly, schedule sessions, review each other, and form project teams without feed ranking.',
    tags: ['React', 'TypeScript', 'Supabase', 'Express', 'Tailwind CSS'],
    meta: ['2026', 'Team of three'],
    credit: '3rd place · Hack the Future 2026',
    highlights: [
      'Realtime one-to-one messaging with read receipts and in-app notifications on Supabase Realtime.',
      'Every community scoped to a single college with Postgres row-level security.',
      'Shipped through feature branches, a staging branch and pull requests into a protected main.',
    ],
  },
  {
    title: 'CuraAI',
    description:
      'A full-stack AI health platform built with React, Supabase, and the Claude API. Features an AI doctor, live hospital locator, and secure medical records using a premium glassmorphism design.',
    tags: ['React', 'Supabase', 'AI/ML'],
    meta: ['Hackathon project'],
    highlights: [
      'An AI assistant that gives context-aware answers by integrating a large language model into the interface.',
      'Conversational UI and prompt flow designed, and a working prototype delivered within the hackathon window.',
    ],
    href: 'https://cura-ai.lovable.app',
    image: {
      src: '/assets/images/projects/cura-ai.png',
      alt: 'CuraAI dashboard with shortcuts for AI consultation, finding hospitals and medical records, plus recent activity, reminders and the next appointment.',
      width: 2212,
      height: 1278,
      caption: 'Dashboard',
    },
  },
]
