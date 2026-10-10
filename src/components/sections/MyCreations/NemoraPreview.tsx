/**
 * Nemora, forthcoming: a typographic placeholder, not a specimen. The name is set in
 * Imbue (the site's body face) and says so — the Nemora prototype files are Noto Serif
 * outlines and are deliberately not used here.
 */
export function NemoraPreview() {
  return (
    <div className="@container absolute inset-0 flex flex-col justify-between p-[5%]">
      <div className="label flex justify-between gap-6 text-muted">
        <span>Typeface</span>
        <span className="text-accent-light">In development</span>
      </div>

      <div>
        <p aria-hidden="true" className="text-[21cqw] leading-[0.9] font-extralight tracking-[-0.03em] text-muted">
          Nemora
        </p>
        <div aria-hidden="true" className="mt-[3cqw] grid grid-cols-2 border-t border-line pt-3">
          <span className="label text-muted">Display</span>
          <span className="label text-muted">Text</span>
        </div>
      </div>

      <p className="label text-muted">Set here in Imbue — the Nemora letterforms are still being drawn</p>
    </div>
  )
}
