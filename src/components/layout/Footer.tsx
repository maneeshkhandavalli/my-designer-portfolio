const YEAR = new Date().getFullYear()

type FooterProps = {
  inert?: boolean
}

// Placeholder — footer design is implemented in a later phase.
export function Footer({ inert }: FooterProps) {
  return (
    <footer inert={inert} className="label px-(--frame-gutter) pt-12 pb-(--frame-gutter) text-muted">
      <p>© {YEAR} Maneesh Khandavalli</p>
    </footer>
  )
}
