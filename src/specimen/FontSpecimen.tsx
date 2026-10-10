import { useEffect, useState } from 'react'

/**
 * Temporary specimen: the current display face (Old English Text MT) next to the two
 * Nemora prototype files. The prototypes use Noto Serif outlines with Nemora metadata —
 * they show sizing, hierarchy and integration, not the final custom Nemora letterforms.
 */

type Face = {
  id: string
  label: string
  family: string
  /** Tailwind font utility (tokens in styles/typography.css). */
  className: string
  note: string
}

const FACES: Face[] = [
  { id: 'current', label: 'Old English Text MT', family: 'Old English Text MT', className: 'font-display', note: 'Current site display face' },
  { id: 'display', label: 'Nemora Display', family: 'Nemora Display', className: 'font-nemora-display', note: 'Prototype · display role' },
  { id: 'text', label: 'Nemora Text', family: 'Nemora Text', className: 'font-nemora-text', note: 'Prototype · supporting-heading role' },
]

const SAMPLES = [
  'MANEESH KHANDAVALLI',
  "WHAT'S THE STORY?",
  'About Me',
  'Projects',
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'abcdefghijklmnopqrstuvwxyz',
  '0123456789',
]

type Status = 'loading' | 'loaded' | 'missing'
type Metrics = { cap: number; x: number; width: number }

/** Cap height, x-height (ink, from canvas TextMetrics) and set width, per 100px of type. */
function measure(family: string): Metrics {
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return { cap: 0, x: 0, width: 0 }
  ctx.font = `100px "${family}"`
  return {
    cap: ctx.measureText('H').actualBoundingBoxAscent,
    x: ctx.measureText('x').actualBoundingBoxAscent,
    width: ctx.measureText('MANEESH KHANDAVALLI').width,
  }
}

function useFaces() {
  const [status, setStatus] = useState<Record<string, Status>>({})
  const [metrics, setMetrics] = useState<Record<string, Metrics>>({})

  useEffect(() => {
    let cancelled = false
    void Promise.all(
      FACES.map(async (face) => {
        const loaded = await document.fonts.load(`100px "${face.family}"`).catch(() => [])
        return [face.id, loaded.length > 0 ? 'loaded' : 'missing'] as const
      }),
    ).then((entries) => {
      if (cancelled) return
      setStatus(Object.fromEntries(entries))
      setMetrics(Object.fromEntries(FACES.map((face) => [face.id, measure(face.family)])))
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { status, metrics }
}

export function FontSpecimen() {
  const [size, setSize] = useState(72)
  const [light, setLight] = useState(false)
  const { status, metrics } = useFaces()

  const surface = light ? 'bg-canvas text-ink' : 'bg-background text-foreground'
  const quiet = light ? 'text-panel-muted' : 'text-muted'
  const rule = light ? 'border-ink/15' : 'border-line'

  return (
    <div className={`min-h-svh ${surface} px-[clamp(1rem,4vw,4rem)] py-12 transition-colors`}>
      <header className={`mb-12 border-b ${rule} pb-8`}>
        <p className={`label ${quiet}`}>Font specimen · temporary · dev only</p>
        <h1 className="mt-3 font-body text-[clamp(2rem,4vw,3.5rem)] leading-tight font-normal">Nemora prototype comparison</h1>
        <p className="mt-4 max-w-[62ch] text-body-lg">
          The two Nemora files are an <strong>integration prototype</strong>: their outlines are Noto Serif with
          Nemora metadata, <em>not</em> the final custom Nemora glyphs (distinctive A, smoother gothic details,
          spacing and kerning are still to be drawn). Use this page to compare proportions, readability and
          hierarchy against the current Old English Text MT headings.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {FACES.map((face) => {
            const m = metrics[face.id]
            const state = status[face.id] ?? 'loading'
            return (
              <div key={face.id} className={`border ${rule} p-4`}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-body text-lg">{face.label}</span>
                  <span className={`label ${state === 'missing' ? 'text-accent' : quiet}`}>{state}</span>
                </div>
                <p className={`label mt-1 ${quiet}`}>{face.note}</p>
                {m && state === 'loaded' && (
                  <dl className={`label mt-3 grid grid-cols-3 gap-2 ${quiet}`}>
                    <div>
                      <dt>Cap height</dt>
                      <dd className="mt-1 text-sm tracking-normal normal-case">{m.cap.toFixed(1)}</dd>
                    </div>
                    <div>
                      <dt>x-height</dt>
                      <dd className="mt-1 text-sm tracking-normal normal-case">
                        {m.x.toFixed(1)} ({((m.x / m.cap) * 100).toFixed(0)}%)
                      </dd>
                    </div>
                    <div>
                      <dt>Name width</dt>
                      <dd className="mt-1 text-sm tracking-normal normal-case">{m.width.toFixed(0)}</dd>
                    </div>
                  </dl>
                )}
              </div>
            )
          })}
        </div>
        <p className={`label mt-3 ${quiet}`}>Metrics: px per 100px of type; name width = “MANEESH KHANDAVALLI”.</p>

        <div className="mt-8 flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-3">
            <span className="label">Size</span>
            <input
              type="range"
              min={24}
              max={160}
              value={size}
              onChange={(event) => setSize(Number(event.target.value))}
              className="w-56 accent-accent"
            />
            <span className="label w-12 tabular-nums">{size}px</span>
          </label>
          <button
            type="button"
            onClick={() => setLight((on) => !on)}
            className={`label border ${rule} px-4 py-2 transition-colors hover:border-accent`}
          >
            {light ? 'Dark (Story / page black)' : 'Light (Hero canvas)'}
          </button>
        </div>
      </header>

      <main className="space-y-14">
        {SAMPLES.map((sample) => (
          <section key={sample} aria-label={sample}>
            <p className={`label mb-4 ${quiet}`}>{sample}</p>
            <div className="space-y-2">
              {FACES.map((face) => (
                <div key={face.id} className={`grid items-end gap-x-6 gap-y-1 border-b ${rule} pb-2 md:grid-cols-[11rem_1fr]`}>
                  <span className={`label ${quiet} md:pb-[0.4em]`}>{face.label}</span>
                  <div
                    className={`${face.className} leading-[1.25] font-normal break-words [font-synthesis:none]`}
                    style={{ fontSize: size }}
                  >
                    {sample}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* The two real headings, as the site sets them (case, size, leading), with each face. */}
        <section aria-label="At site scale">
          <p className={`label mb-2 ${quiet}`}>At site scale — Hero name (text-hero) and Story title (text-display-2xl)</p>
          <p className={`mb-6 max-w-[70ch] text-sm ${quiet}`}>
            Same sizes and leading as the live headings, for judging proportion in context. The site itself is
            unchanged.
          </p>
          <div className="space-y-10">
            {FACES.map((face) => (
              <div key={face.id} className={`border-t ${rule} pt-4`}>
                <p className={`label mb-3 ${quiet}`}>{face.label}</p>
                <div className={`${face.className} text-hero md:text-hero-lg [font-synthesis:none]`}>
                  <span className="block">Maneesh</span>
                  <span className="block">Khandavalli</span>
                </div>
                <div className={`${face.className} mt-8 text-center text-display-2xl lowercase [font-synthesis:none]`}>
                  <span className="block">what’s the</span>
                  <span className="block">story?</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
