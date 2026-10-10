import { useRef, useState, type ComponentType, type KeyboardEvent } from 'react'
import { Section } from '@/components/layout/Section'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useReveal } from '@/hooks/useReveal'
import { setPageTone } from '@/lib/chromeTone'
import { gsap, MOTION, ScrollTrigger, useGSAP } from '@/lib/gsap'
import { FluidSurfacePreview } from './FluidSurfacePreview'
import { NemoraPreview } from './NemoraPreview'
import { CREATIONS, type CreationPreview } from './myCreationsData'

const pad = (n: number) => String(n).padStart(2, '0')

/** One preview per kind of creation; a new creation registers its preview here. */
const PREVIEWS: Record<CreationPreview, ComponentType> = {
  fluid: FluidSurfacePreview,
  nemora: NemoraPreview,
}

/**
 * 05 — My Creations: the lab. Experiments made for this site.
 *
 *   intro    the title in the display face, a crimson rule, one line of Imbue
 *   index    a numbered list on the left (tabs); the active entry is marked by a
 *            crimson hairline drawn under it
 *   preview  the large framed stage on the right — the live experiment, or a
 *            placeholder for what is forthcoming
 *   details  what it is and how it works, under the index
 * On phones: index, preview, details, stacked.
 *
 * Ground: the warm-white canvas — the light studio between the dark Midnight Labs and
 * Skills — with the stage kept black, a dark screen the experiments run in (they are
 * made for a dark surface). Chrome: light (ink navbar and frame, no matte) while this
 * section is under the navbar, like the Hero and Contact.
 *
 * Scroll: the shared reveals (lib/reveal) — in on enter, reversed on leave, replayed
 * on return. Switching: the stage and details fade out together, then the stage is
 * uncovered left → right and the details rise back. Reduced motion: instant swaps,
 * nothing hidden. The only interactive effect lives inside the Fluid Surface stage.
 * Content: ./myCreationsData.ts.
 */
export function MyCreations() {
  const rootRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const detailRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const pending = useRef<string | null>(null)
  const reducedMotion = usePrefersReducedMotion()
  useReveal(rootRef)

  // Light chrome while the section is under the navbar; the dark page either side of it.
  // On refresh only claim the tone when here (Story's or Contact's trigger owns it elsewhere).
  useGSAP(
    () => {
      ScrollTrigger.create({
        trigger: rootRef.current,
        start: 'top 6%',
        end: 'bottom 6%',
        onToggle: ({ isActive }) => setPageTone(!isActive, !isActive),
        onRefresh: ({ isActive }) => {
          if (isActive) setPageTone(false, false)
        },
      })
    },
    { scope: rootRef },
  )

  const firstId = CREATIONS[0]?.id ?? ''
  // `selected` follows the index at once; `shown` swaps once the old content has faded.
  const [selected, setSelected] = useState(firstId)
  const [shown, setShown] = useState({ id: firstId, swap: 0 })
  const creation = CREATIONS.find((entry) => entry.id === shown.id) ?? CREATIONS[0]
  const Preview = creation ? PREVIEWS[creation.preview] : null

  const select = (id: string) => {
    if (id === selected) return
    setSelected(id)
    const targets = [stageRef.current, detailRef.current]
    if (reducedMotion) {
      setShown((view) => ({ id, swap: view.swap + 1 }))
      return
    }
    pending.current = id
    gsap.to(targets, {
      autoAlpha: 0,
      duration: MOTION.duration.fast,
      ease: 'power2.in',
      overwrite: true,
      onComplete: () => {
        const next = pending.current
        pending.current = null
        if (next) setShown((view) => ({ id: next, swap: view.swap + 1 }))
      },
    })
  }

  // The incoming entry: uncover the stage, raise the details.
  useGSAP(
    () => {
      const stage = stageRef.current
      const detail = detailRef.current
      if (shown.swap === 0 || !stage || !detail) return
      if (reducedMotion) {
        gsap.set([stage, detail], { autoAlpha: 1, y: 0, clearProps: 'clipPath' })
        return
      }
      gsap.fromTo(
        stage,
        { autoAlpha: 1, clipPath: 'inset(0% 100% 0% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: MOTION.duration.reveal * 0.75, ease: MOTION.ease.inOut },
      )
      gsap.fromTo(
        detail,
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: MOTION.duration.slow * 0.8, ease: MOTION.ease.out, delay: 0.15 },
      )
    },
    { dependencies: [shown.swap], scope: rootRef },
  )

  // Tabs: arrows move along the index, Home / End jump to its ends.
  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const last = CREATIONS.length - 1
    const keys: Record<string, number> = {
      ArrowDown: index === last ? 0 : index + 1,
      ArrowRight: index === last ? 0 : index + 1,
      ArrowUp: index === 0 ? last : index - 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }
    const next = keys[event.key]
    const entry = next === undefined ? undefined : CREATIONS[next]
    if (next === undefined || !entry) return
    event.preventDefault()
    tabRefs.current[next]?.focus()
    select(entry.id)
  }

  return (
    <Section
      ref={rootRef}
      id="creations"
      aria-labelledby="creations-heading"
      className="bg-canvas px-(--frame-gutter) pt-[18svh] pb-[14svh] text-ink"
    >
      {/* Intro */}
      <header className="grid grid-cols-1 gap-y-10 md:grid-cols-12 md:gap-x-6">
        <div className="label flex justify-between gap-6 text-panel-muted md:col-span-12">
          <span data-reveal="fade">05 — My Creations</span>
          <span data-reveal="fade" data-reveal-delay="0.15">
            The lab
          </span>
        </div>

        <h2
          id="creations-heading"
          data-reveal="lines"
          className="text-[clamp(2.5rem,12.5vw,15rem)] leading-[0.85] lowercase md:col-span-12"
        >
          my creations
        </h2>
        <div aria-hidden="true" data-reveal="rule" data-reveal-delay="0.2" className="h-px bg-accent md:col-span-12" />

        <p
          data-reveal="lines"
          data-reveal-delay="0.2"
          className="text-[clamp(1.375rem,2.2vw,2.25rem)] leading-[1.2] md:col-span-6 md:col-start-7"
        >
          Experiments made while building this site — kept here, and added to as they grow.
        </p>
      </header>

      <div className="mt-[14svh] grid grid-cols-1 gap-y-10 md:grid-cols-12 md:grid-rows-[auto_1fr] md:gap-x-6 md:gap-y-0">
        {/* Index */}
        <div className="md:col-span-4 md:row-start-1">
          <p data-reveal="fade" className="label mb-4 text-panel-muted">
            Index ({pad(CREATIONS.length)})
          </p>
          <div role="tablist" aria-label="Creations" aria-orientation="vertical" className="border-t border-ink/15">
            {CREATIONS.map((entry, index) => {
              const active = entry.id === selected
              return (
                <button
                  key={entry.id}
                  ref={(el) => {
                    tabRefs.current[index] = el
                  }}
                  type="button"
                  role="tab"
                  id={`creation-tab-${entry.id}`}
                  aria-selected={active}
                  aria-controls="creation-details"
                  tabIndex={active ? 0 : -1}
                  onClick={() => select(entry.id)}
                  onKeyDown={(event) => onKeyDown(event, index)}
                  data-reveal="rise"
                  data-reveal-delay={String(0.1 + index * 0.08)}
                  className="group relative grid w-full grid-cols-[2.25rem_1fr] items-baseline gap-x-4 border-b border-ink/15 py-6 text-left"
                >
                  <span className={`label transition-colors duration-500 ${active ? 'text-accent' : 'text-panel-muted'}`}>
                    {pad(index + 1)}
                  </span>
                  <span>
                    <span
                      className={`block font-display text-[clamp(2rem,3.2vw,3.75rem)] leading-[0.95] font-normal [font-synthesis:none] transition-colors duration-500 ${
                        active ? 'text-ink' : 'text-panel-muted group-hover:text-ink group-focus-visible:text-ink'
                      }`}
                    >
                      {entry.title}
                    </span>
                    <span className="label mt-3 flex flex-wrap gap-x-4 gap-y-1 text-panel-muted">
                      <span>{entry.kind}</span>
                      <span className={entry.forthcoming ? 'text-panel-muted' : 'text-ink'}>{entry.status}</span>
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`absolute -bottom-px left-0 h-px w-full origin-left bg-accent transition-transform duration-700 ease-out-expo motion-reduce:transition-none ${
                      active ? 'scale-x-100' : 'scale-x-0'
                    }`}
                  />
                </button>
              )
            })}
          </div>
        </div>

        {/* Preview */}
        <div className="md:col-span-8 md:col-start-5 md:row-span-2 md:row-start-1">
          <div
            data-reveal="clip-x"
            data-reveal-delay="0.15"
            className="relative aspect-[4/5] overflow-hidden border border-line bg-background text-foreground sm:aspect-[4/3] md:aspect-[3/2]"
          >
            <div ref={stageRef} className="absolute inset-0">
              {Preview && <Preview key={shown.id} />}
            </div>
          </div>
        </div>

        {/* Details */}
        <div data-reveal="rise" data-reveal-delay="0.25" className="md:col-span-4 md:row-start-2 md:self-start md:pt-12">
          <div
            ref={detailRef}
            id="creation-details"
            role="tabpanel"
            aria-labelledby={creation ? `creation-tab-${creation.id}` : undefined}
          >
            {creation && (
              <>
                <p className="text-[clamp(1.1875rem,1.45vw,1.875rem)] leading-[1.3]">{creation.summary}</p>
                <ol className="mt-8 space-y-4 border-t border-ink/15 pt-6">
                  {creation.notes.map((note, index) => (
                    <li key={note} className="grid grid-cols-[2.25rem_1fr] gap-x-4">
                      <span className="label pt-[0.35em] text-panel-muted">{pad(index + 1)}</span>
                      <span className="text-support text-panel-muted">{note}</span>
                    </li>
                  ))}
                </ol>
                {creation.aside && (
                  <p className="mt-6 max-w-[48ch] text-detail text-panel-muted">{creation.aside}</p>
                )}
                {creation.stack && <p className="label mt-6 text-panel-muted">{creation.stack.join(' · ')}</p>}
              </>
            )}
          </div>
        </div>
      </div>
    </Section>
  )
}
