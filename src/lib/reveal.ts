/**
 * Shared scroll reveals — one motion language for every section.
 *
 * Mark elements with `data-reveal="<kind>"` and call `createReveals(scope)` inside a
 * GSAP context (useGSAP / gsap.matchMedia — see hooks/useReveal). Each element reveals
 * as it enters, reverses as it leaves, and plays again on the way back
 * (toggleActions "play reverse play reverse"), in both scroll directions.
 *
 *   lines   masked lines rise into place (SplitText; re-splits on resize)
 *   rise    fades in while rising a short distance
 *   fade    fades in
 *   clip-x  uncovers left → right (clip-path); a [data-reveal-zoom] child settles from a slight scale
 *   clip-y  uncovers bottom → top, same zoom option
 *   rule    a hairline draws from its left end
 *   group   one trigger for a list: its children (or its [data-reveal-item]s) rise in
 *           a short stagger — instead of one trigger per row
 *
 * Optional `data-reveal-delay="0.15"` (s) staggers elements that enter together.
 *
 * Settle (scroll-linked, scrubbed — it follows the scroll both ways): an element with
 * `data-settle-y="8"` (svh) or `data-settle-x="6"` (vw) starts that far off and comes to
 * rest as its parent rises from the bottom edge to 35% of the viewport. For the few
 * headings that carry a section boundary — used sparingly. Its parent is the trigger,
 * so the moving element never shifts its own (or its reveal's) trigger.
 * Inside a horizontally scrolling track pass its tween as `containerAnimation`: the
 * triggers then follow the track (left/right edges) instead of the page.
 * Callers gate this on prefers-reduced-motion: with reduced motion nothing is hidden.
 *
 * Cost: transforms, opacity and clip-path only — no filters (blur on moving layers is
 * expensive on integrated graphics).
 */
import { gsap, MOTION, SplitText } from '@/lib/gsap'

export type RevealOptions = {
  /** The tween of a pinned horizontal track, when the scope lives inside one. */
  containerAnimation?: gsap.core.Tween
  /**
   * The pinned element, when the scope lives inside one but its reveals follow the page
   * scroll (e.g. an intro inside a pinned track). Lets ScrollTrigger measure positions
   * correctly when it refreshes while the page is scrolled past the pin (a reload that
   * restores the scroll position, a resize further down): without it they come out
   * shifted by the pin's length and the reveals stay hidden on the way back up.
   */
  pinnedContainer?: Element
}

const VERTICAL = { start: 'top 90%', end: 'bottom 6%' }
const HORIZONTAL = { start: 'left 94%', end: 'right 6%' }

export function createReveals(scope: Element, { containerAnimation, pinnedContainer }: RevealOptions = {}) {
  const track = containerAnimation?.targets()[0] as Element | undefined
  const trackX = track ? Number(gsap.getProperty(track, 'x')) || 0 : 0

  scope.querySelectorAll<HTMLElement>('[data-reveal]').forEach((element) => {
    const delay = Number(element.dataset.revealDelay ?? 0) || 0
    // In a track, an element already in view while the track is at rest (its left edge,
    // minus the track's current offset, inside the reveal line) would start "entered" and
    // never play: it reveals on the vertical approach instead, like the section's intro —
    // and leaves when the pin releases (a page-scroll "leave" would fire mid-pin, while the
    // pinned element is still on screen; by the release it has slid off to the left).
    const inViewAtRest = track !== undefined && element.getBoundingClientRect().left - trackX < innerWidth * 0.94
    const followTrack = containerAnimation !== undefined && !inViewAtRest
    const pinEnd = containerAnimation?.scrollTrigger
    const range = followTrack ? HORIZONTAL : pinEnd ? { start: VERTICAL.start, end: () => pinEnd.end } : VERTICAL
    // Page-scroll reveals inside the track's pin (in view at rest) are measured against it.
    const pinned = followTrack ? undefined : (pinnedContainer ?? (pinEnd?.pin as Element | undefined))
    const scrollTrigger = {
      trigger: element,
      containerAnimation: followTrack ? containerAnimation : undefined,
      pinnedContainer: pinned,
      ...range,
      toggleActions: 'play reverse play reverse',
    }
    const zoom = element.querySelector('[data-reveal-zoom]')

    switch (element.dataset.reveal) {
      case 'lines':
        SplitText.create(element, {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          // Returned, so a re-split (resize, font swap) rebuilds the reveal on the new lines.
          onSplit: (split) =>
            gsap.from(split.lines, {
              yPercent: 105,
              duration: MOTION.duration.reveal,
              ease: MOTION.ease.out,
              stagger: 0.08,
              delay,
              scrollTrigger,
            }),
        })
        break

      case 'rise':
        gsap.from(element, { autoAlpha: 0, y: 24, duration: MOTION.duration.slow, ease: MOTION.ease.out, delay, scrollTrigger })
        break

      case 'fade':
        gsap.from(element, { autoAlpha: 0, duration: MOTION.duration.slow, ease: 'power2.out', delay, scrollTrigger })
        break

      case 'clip-x':
      case 'clip-y': {
        const hidden = element.dataset.reveal === 'clip-x' ? 'inset(0% 100% 0% 0%)' : 'inset(100% 0% 0% 0%)'
        const tl = gsap.timeline({ delay, scrollTrigger })
        tl.fromTo(
          element,
          { clipPath: hidden },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: MOTION.duration.reveal, ease: MOTION.ease.inOut },
          0,
        )
        if (zoom) tl.from(zoom, { scale: 1.12, duration: MOTION.duration.reveal * 1.4, ease: MOTION.ease.out }, 0)
        break
      }

      case 'group': {
        const marked = element.querySelectorAll('[data-reveal-item]')
        const items = marked.length > 0 ? marked : element.children
        gsap.from(items, {
          autoAlpha: 0,
          y: 24,
          duration: MOTION.duration.slow,
          ease: MOTION.ease.out,
          stagger: 0.07,
          delay,
          scrollTrigger,
        })
        break
      }

      case 'rule':
        gsap.from(element, {
          scaleX: 0,
          transformOrigin: 'left center',
          duration: MOTION.duration.reveal,
          ease: MOTION.ease.inOut,
          delay,
          scrollTrigger,
        })
        break
    }
  })

  // Settle: scrubbed arrivals (page scroll only — none sit inside a horizontal track).
  if (containerAnimation) return
  scope.querySelectorAll<HTMLElement>('[data-settle-x], [data-settle-y]').forEach((element) => {
    const x = Number(element.dataset.settleX ?? 0) || 0
    const y = Number(element.dataset.settleY ?? 0) || 0
    gsap.fromTo(
      element,
      { x: () => (x * innerWidth) / 100, y: () => (y * innerHeight) / 100 },
      {
        x: 0,
        y: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: element.parentElement ?? element,
          start: 'top bottom',
          end: 'top 35%',
          scrub: true,
          invalidateOnRefresh: true,
        },
      },
    )
  })
}
