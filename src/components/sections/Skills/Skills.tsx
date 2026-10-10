import { useRef, useState } from 'react'
import { Section } from '@/components/layout/Section'
import { useReveal } from '@/hooks/useReveal'
import { gsap, MOTION, MOTION_QUERIES, ScrollTrigger, SplitText, useGSAP } from '@/lib/gsap'
import { SKILL_GROUPS } from './skillsData'

const pad = (n: number) => String(n).padStart(2, '0')
const ENTRIES = SKILL_GROUPS.reduce((sum, group) => sum + group.skills.length, 0)

/**
 * 06 — Skills: an index, not a grid.
 *
 *   left   (desktop: CSS-sticky under the nav; sized by viewport height so it always fits
 *          a short laptop screen) the title, a crimson rule, one line on
 *          what counts, the totals, and a contents list that follows the reader —
 *          the group in view is set in warm white with a crimson tick
 *   right  the six groups: number, lowercase display title, where it comes from, then
 *          the entries as a two-column table of hairline rows (number.item, name, note)
 * On phones: stacked, no sticky, no contents list.
 *
 * Motion: the groups use the shared reveals (lib/reveal) — in, reversed on leave,
 * replayed on return. The sticky column is revealed on the *section's* bounds instead:
 * reveals measure their own element, and a stuck element would "leave" while still on
 * screen. Reduced motion: nothing hidden; the contents marker still follows (a colour
 * change, no movement). No pin, no blur, no canvas.
 */
export function Skills() {
  const rootRef = useRef<HTMLElement>(null)
  const asideRef = useRef<HTMLDivElement>(null)
  const groupRefs = useRef<(HTMLLIElement | null)[]>([])
  const [active, setActive] = useState(0)
  useReveal(rootRef)

  useGSAP(
    () => {
      const root = rootRef.current
      const aside = asideRef.current
      if (!root || !aside) return

      // Contents marker: the group crossing the middle of the viewport.
      groupRefs.current.forEach((group, index) => {
        if (!group) return
        ScrollTrigger.create({
          trigger: group,
          start: 'top 55%',
          end: 'bottom 55%',
          onToggle: ({ isActive }) => {
            if (isActive) setActive(index)
          },
        })
      })

      const mm = gsap.matchMedia()
      mm.add(MOTION_QUERIES.motionOk, () => {
        const scrollTrigger = { trigger: root, start: 'top 75%', end: 'bottom 25%', toggleActions: 'play reverse play reverse' }
        aside.querySelectorAll<HTMLElement>('[data-skills-lines]').forEach((element, index) => {
          SplitText.create(element, {
            type: 'lines',
            mask: 'lines',
            autoSplit: true,
            onSplit: (split) =>
              gsap.from(split.lines, {
                yPercent: 105,
                duration: MOTION.duration.reveal,
                ease: MOTION.ease.out,
                stagger: 0.08,
                delay: index * 0.2,
                scrollTrigger,
              }),
          })
        })
        gsap.from(aside.querySelector('[data-skills-rule]'), {
          scaleX: 0,
          transformOrigin: 'left center',
          duration: MOTION.duration.reveal,
          ease: MOTION.ease.inOut,
          delay: 0.15,
          scrollTrigger,
        })
        gsap.from(aside.querySelectorAll('[data-skills-fade]'), {
          autoAlpha: 0,
          duration: MOTION.duration.slow,
          ease: 'power2.out',
          stagger: 0.06,
          delay: 0.35,
          scrollTrigger,
        })
      })
    },
    { scope: rootRef },
  )

  return (
    <Section
      ref={rootRef}
      id="skills"
      aria-labelledby="skills-heading"
      className="px-(--frame-gutter) pt-[18svh] pb-[14svh]"
    >
      <div className="label mb-10 flex justify-between gap-6 text-muted">
        <span data-reveal="fade">06 — Skills</span>
        <span data-reveal="fade" data-reveal-delay="0.15">
          The index
        </span>
      </div>

      <div className="grid grid-cols-1 gap-y-[10svh] md:grid-cols-12 md:gap-x-6">
        {/* Left: title, totals, contents — sticky on desktop. */}
        <div ref={asideRef} className="md:sticky md:top-(--nav-clearance) md:col-span-5 md:self-start">
          <h2
            id="skills-heading"
            data-skills-lines
            className="text-[clamp(4.5rem,min(12.5vw,21svh),15rem)] leading-[0.85] lowercase"
          >
            skills
          </h2>
          <div aria-hidden="true" data-skills-rule className="mt-8 h-px bg-accent md:mt-[3.5svh]" />
          <p data-skills-lines className="mt-8 max-w-[30ch] text-[clamp(1.25rem,min(1.9vw,3.6svh),2rem)] leading-[1.2] md:mt-[3.5svh]">
            What I build with. Every entry is on my résumé or in the code behind this site.
          </p>
          <p data-skills-fade className="label mt-6 text-muted md:mt-[2.5svh]">
            {pad(SKILL_GROUPS.length)} groups · {ENTRIES} entries
          </p>

          <ol aria-hidden="true" className="mt-[5svh] hidden border-t border-line md:block">
            {SKILL_GROUPS.map((group, index) => {
              const current = index === active
              return (
                <li
                  key={group.title}
                  data-skills-fade
                  className="relative flex items-baseline gap-4 border-b border-line py-[min(0.625rem,1.1svh)]"
                >
                  <span
                    className={`label w-6 transition-colors duration-500 motion-reduce:transition-none ${current ? 'text-accent' : 'text-muted'}`}
                  >
                    {pad(index + 1)}
                  </span>
                  <span
                    className={`text-[clamp(0.95rem,1.05vw,1.1rem)] transition-colors duration-500 motion-reduce:transition-none ${current ? 'text-foreground' : 'text-muted'}`}
                  >
                    {group.title}
                  </span>
                  <span
                    className={`absolute -bottom-px left-0 h-px w-full origin-left bg-accent transition-transform duration-700 ease-out-expo motion-reduce:transition-none ${current ? 'scale-x-100' : 'scale-x-0'}`}
                  />
                </li>
              )
            })}
          </ol>
        </div>

        {/* Right: the groups. */}
        <ol className="md:col-span-7 md:col-start-6">
          {SKILL_GROUPS.map((group, index) => {
            const number = pad(index + 1)
            return (
              <li
                key={group.title}
                ref={(el) => {
                  groupRefs.current[index] = el
                }}
                className="pb-[9svh] last:pb-0"
              >
                <div aria-hidden="true" data-reveal="rule" className="h-px bg-line" />
                <div className="mt-6 grid grid-cols-[auto_1fr] items-baseline gap-x-5 gap-y-3 md:grid-cols-[auto_1fr_auto]">
                  <span data-reveal="fade" className="label text-accent">
                    {number}
                  </span>
                  <h3
                    data-reveal="lines"
                    data-reveal-delay="0.1"
                    className="text-[clamp(2.5rem,5.2vw,6.5rem)] leading-[0.9] lowercase"
                  >
                    {group.title}
                  </h3>
                  <span data-reveal="fade" data-reveal-delay="0.25" className="label col-start-2 text-muted md:col-start-3">
                    From {group.source === 'résumé' ? 'the résumé' : 'this site'}
                  </span>
                </div>

                <ul className="mt-8 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                  {group.skills.map((skill, item) => (
                    <li
                      key={skill.name}
                      data-reveal="rise"
                      data-reveal-delay={String(0.15 + item * 0.05)}
                      className="grid grid-cols-[2.75rem_1fr] items-baseline gap-x-3 border-t border-line py-3.5"
                    >
                      <span className="label text-muted">
                        {number}.{item + 1}
                      </span>
                      <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <span className="text-[clamp(1.2rem,1.6vw,1.8rem)] leading-[1.15]">{skill.name}</span>
                        {skill.note && <span className="label text-muted">{skill.note}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
        </ol>
      </div>
    </Section>
  )
}
