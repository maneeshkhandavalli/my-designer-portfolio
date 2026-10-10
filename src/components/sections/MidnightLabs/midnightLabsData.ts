/**
 * Midnight Labs content. Nothing here is invented — every line is sourced:
 *  - Agency description and services: the agency's own WhatsApp bot configuration
 *    (whatsapp-chat-bot/README.md: AGENCY_DESCRIPTION, AGENCY_SERVICES).
 *  - Tagline: the Midnight Labs website hero ("AI systems for founders…"), as captured
 *    in midnight-labs-website/.codex-home.png.
 *  - Website + dashboard: résumé (ManeeshKhandavalli-resume.pdf) and
 *    midnight-labs-website/README.md (admin + client dashboards, clients, projects),
 *    stack from its package.json.
 *  - Vyuha India: its own index.html meta description; link from its index.html
 *    (canonical https://vyuhaindia.com, verified live).
 *  - Varahi Healthy Bowls: its page titles ("Wellness in Every Bite").
 *  - WhatsApp AI bot: whatsapp-chat-bot/README.md.
 * Assets (public/assets/images/midnight-labs/) are copied unchanged from those projects;
 * the website image (midnight-labs.png) is the homepage design exported from Figma.
 * No live link exists for Midnight Labs, Varahi or the bot in the source material, so
 * none is shown. No dashboard screenshot exists yet: a typographic panel stands in.
 */

export const AGENCY = {
  description: 'A digital agency that helps clients with websites, automation, AI agents and launch systems.',
  built: 'Its identity, website and the dashboard that runs it — designed and built end to end by Maneesh.',
  services: ['Websites', 'Landing pages', 'WhatsApp automation', 'AI chatbots', 'Launch funnels', 'Custom software'],
  tagline: 'AI systems for founders who want operations to feel lighter, faster, and sharper.',
  wordmark: { src: '/assets/images/midnight-labs/wordmark.svg', width: 234, height: 34 },
} as const

export type AgencyPiece = {
  title: string
  description: string
  stack: readonly string[]
  /** A real screenshot, shown in its original colours; omitted → typographic panel. */
  image?: { src: string; alt: string; width: number; height: number }
  /** What the panel lists when there is no screenshot yet (real parts of the product). */
  parts?: readonly string[]
}

export const AGENCY_WORK: readonly AgencyPiece[] = [
  {
    title: 'The website',
    description: 'The agency’s public site, from visual identity to deployment.',
    stack: ['React', 'Vite', 'GSAP', 'three.js'],
    image: {
      src: '/assets/images/midnight-labs/midnight-labs.png',
      alt: 'The Midnight Labs homepage design: the name in tall red capitals above two hands drawn in dotted white lines reaching toward each other, with the line “We design digital experiences that are as functional as they are beautiful.”',
      width: 1452,
      height: 968,
    },
  },
  {
    title: 'The dashboard',
    description: 'The system behind the site: admin and client dashboards for clients, projects and day-to-day operations.',
    stack: ['React', 'Supabase', 'Express'],
    parts: ['Admin dashboard', 'Clients', 'Projects', 'Client portal'],
  },
]

export type ClientWork = {
  name: string
  kind: string
  description: string
  stack?: readonly string[]
  /** Verified live link from the project's own source; omitted when none exists. */
  href?: string
  visual:
    | { type: 'image'; src: string; alt: string; width: number; height: number; fit: 'cover' | 'contain' }
    /** No visual asset exists: the piece's real flow, set as type. */
    | { type: 'flow'; steps: readonly string[] }
}

export const CLIENT_WORK: readonly ClientWork[] = [
  {
    name: 'Vyuha India',
    kind: 'Agency website',
    description: 'The site for a Hyderabad studio building custom websites, web apps, SaaS products and AI-powered tools.',
    href: 'https://vyuhaindia.com',
    visual: {
      type: 'image',
      src: '/assets/images/midnight-labs/vyuha-logo.png',
      alt: 'The Vyuha logo: a green V mark above the word VYUHA and the line “Strategy before software”.',
      width: 1254,
      height: 1254,
      fit: 'cover',
    },
  },
  {
    name: 'Varahi Healthy Bowls',
    kind: 'Brand site',
    description: 'A site for a healthy-bowl food brand — “Wellness in Every Bite”.',
    visual: {
      type: 'image',
      src: '/assets/images/midnight-labs/varahi-bowl-art.svg',
      alt: 'Varahi’s hand-drawn style illustration of a fresh bowl surrounded by fruit, vegetables, nuts and greens.',
      width: 1200,
      height: 780,
      fit: 'cover',
    },
  },
  {
    name: 'WhatsApp AI bot',
    kind: 'AI automation',
    description: 'A WhatsApp assistant on Meta’s official Cloud API: incoming messages go to Gemini, and the reply goes back on WhatsApp.',
    stack: ['Flask', 'Gemini', 'WhatsApp Cloud API'],
    visual: { type: 'flow', steps: ['Message', 'Gemini', 'Reply'] },
  },
]
