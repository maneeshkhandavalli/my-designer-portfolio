type RollTextProps = {
  children: string
}

/**
 * Hover/focus text roll for navigation labels. Place inside an element with the
 * `group` class. The outer span is also the clip mask for the nav entrance
 * (`data-nav-item` is the element GSAP translates on load).
 */
export function RollText({ children }: RollTextProps) {
  return (
    <span className="block overflow-hidden">
      <span data-nav-item className="relative block">
        <span className="block transition-transform duration-500 ease-out-expo group-hover:-translate-y-full group-focus-visible:-translate-y-full">
          {children}
        </span>
        <span
          aria-hidden="true"
          className="absolute inset-0 block translate-y-full transition-transform duration-500 ease-out-expo group-hover:translate-y-0 group-focus-visible:translate-y-0"
        >
          {children}
        </span>
      </span>
    </span>
  )
}
