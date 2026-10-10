import { useEffect, useRef, useState } from 'react'
import { Section } from '@/components/layout/Section'
import { RollText } from '@/components/navigation/RollText'
import { useReveal } from '@/hooks/useReveal'
import { setPageTone } from '@/lib/chromeTone'
import { ScrollTrigger, useGSAP } from '@/lib/gsap'

const EMAIL = 'maneeshkhandavalliwork@gmail.com'

const PROFILES = [
  { name: 'GitHub', handle: 'github.com/maneeshkhandavalli', href: 'https://github.com/maneeshkhandavalli' },
  { name: 'LinkedIn', handle: 'linkedin.com/in/maneesh-khandavalli', href: 'https://linkedin.com/in/maneesh-khandavalli' },
] as const

type CopyState = 'idle' | 'copied' | 'failed'

/**
 * 07 — Contact: the closing invitation, on the warm-white canvas the page opened on
 * (the Hero) — light → dark → light. Continues into the Footer on the same ground.
 *
 *   intro    label row; "let's talk." in the display face, its second word set in
 *            from the right; a crimson rule
 *   reach    one line of invitation on the left; the address itself as the large
 *            element on the right (mailto) with a copy control, then the two
 *            profiles as hairline rows
 *
 * Chrome: while this section is under the navbar the page tone is light (ink navbar
 * and frame line, no black matte) — the same state as over the Hero. Story sets the
 * tone above; this takes over from the top of this section to the end of the page.
 * Motion: the shared reveals (lib/reveal); "talk." settles in from the right with the
 * scroll — the closing movement (clipped at the section's sides, so it never widens the
 * page) — and the profiles enter as one group. The Footer stays
 * still, so its links are there at once. Reduced motion: all at once.
 */
export function Contact() {
  const rootRef = useRef<HTMLElement>(null)
  const [copy, setCopy] = useState<CopyState>('idle')
  useReveal(rootRef)

  useGSAP(
    () => {
      ScrollTrigger.create({
        trigger: rootRef.current,
        start: 'top 6%',
        end: 'max',
        // Light from here down; leaving upwards hands back to the dark page. (Reaching the
        // very bottom counts as "leaving" an end of 'max' — the tone stays light then.)
        // On refresh only claim the tone when here: above, Story's trigger has just set it.
        onEnter: () => setPageTone(false, false),
        onEnterBack: () => setPageTone(false, false),
        onLeaveBack: () => setPageTone(true, true),
        onRefresh: ({ progress }) => {
          if (progress > 0) setPageTone(false, false)
        },
      })
    },
    { scope: rootRef },
  )

  useEffect(() => {
    if (copy === 'idle') return
    const reset = window.setTimeout(() => setCopy('idle'), 2400)
    return () => window.clearTimeout(reset)
  }, [copy])

  const copyEmail = () => {
    navigator.clipboard
      .writeText(EMAIL)
      .then(() => setCopy('copied'))
      .catch(() => setCopy('failed'))
  }

  return (
    <Section
      ref={rootRef}
      id="contact"
      aria-labelledby="contact-heading"
      className="overflow-x-clip bg-canvas px-(--frame-gutter) pt-[20svh] pb-[16svh] text-ink"
    >
      <div className="label flex justify-between gap-6 text-panel-muted">
        <span data-reveal="fade">07 — Contact</span>
        <span data-reveal="fade" data-reveal-delay="0.15">
          Get in touch
        </span>
      </div>

      {/* Each word splits on its own: a re-split (fonts, resize) rebuilds only the inside
          of its span, so the span "talk." keeps its settle. */}
      <h2 id="contact-heading" className="mt-10 text-[clamp(4rem,16vw,19rem)] leading-[0.82] lowercase">
        <span data-reveal="lines" className="block">
          let’s
        </span>
        <span data-reveal="lines" data-reveal-delay="0.12" data-settle-x="7" className="block pl-[18%] md:pl-[34%]">
          talk.
        </span>
      </h2>
      <div aria-hidden="true" data-reveal="rule" data-reveal-delay="0.2" className="mt-12 h-px bg-accent" />

      <div className="mt-[10svh] grid grid-cols-1 gap-y-14 md:grid-cols-12 md:gap-x-6">
        <p
          data-reveal="lines"
          data-reveal-delay="0.2"
          className="max-w-[24ch] text-[clamp(1.375rem,2.2vw,2.25rem)] leading-[1.2] md:col-span-4"
        >
          Have a project, a role or an idea worth building? Write to me.
        </p>

        <div className="md:col-span-8">
          <p data-reveal="fade" className="label text-panel-muted">
            Email
          </p>
          <a
            data-reveal="rise"
            data-reveal-delay="0.1"
            href={`mailto:${EMAIL}`}
            className="group relative mt-3 block w-fit max-w-full text-[clamp(1.4rem,6.4vw,2.75rem)] leading-[1.1] [overflow-wrap:anywhere] md:text-[clamp(2rem,4.3vw,6.25rem)]"
          >
            {EMAIL}
            <span aria-hidden="true" className="absolute -bottom-1 left-0 h-px w-full bg-ink/25" />
            <span
              aria-hidden="true"
              className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-accent transition-transform duration-700 ease-out-expo group-hover:scale-x-100 group-focus-visible:scale-x-100 motion-reduce:transition-none"
            />
          </a>
          <div data-reveal="fade" data-reveal-delay="0.25" className="mt-6 flex items-center gap-4">
            <button
              type="button"
              onClick={copyEmail}
              className="nav-text group cursor-pointer text-ink transition-colors duration-300 hover:text-accent focus-visible:text-accent"
            >
              <RollText>Copy address</RollText>
            </button>
            <span role="status" className="label text-panel-muted">
              {copy === 'copied' ? 'Copied' : copy === 'failed' ? 'Couldn’t copy — select it above' : ''}
            </span>
          </div>

          <ul aria-label="Profiles" data-reveal="group" data-reveal-delay="0.1" className="mt-[8svh] border-t border-ink/15">
            {PROFILES.map((profile, index) => (
              <li key={profile.name}>
                <a
                  href={profile.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group grid grid-cols-[2.25rem_1fr_auto] items-baseline gap-x-4 border-b border-ink/15 py-5 md:py-6"
                >
                  <span className="label text-panel-muted">{String(index + 1).padStart(2, '0')}</span>
                  <span className="min-w-0">
                    <span className="block text-[clamp(1.5rem,2.6vw,3rem)] leading-none transition-colors duration-300 group-hover:text-accent group-focus-visible:text-accent">
                      {profile.name}
                    </span>
                    <span className="label mt-2 block text-panel-muted [overflow-wrap:anywhere]">{profile.handle}</span>
                  </span>
                  <span className="nav-text text-ink transition-colors duration-300 group-hover:text-accent group-focus-visible:text-accent">
                    <RollText>Open ↗</RollText>
                    <span className="sr-only"> (opens in a new tab)</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  )
}
