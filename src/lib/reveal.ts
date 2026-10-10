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
 *
 * Optional `data-reveal-delay="0.15"` (s) staggers elements that enter together.
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
}

const VERTICAL = { start: 'top 90%', end: 'bottom 6%' }
const HORIZONTAL = { start: 'left 94%', end: 'right 6%' }

export function createReveals(scope: Element, { containerAnimation }: RevealOptions = {}) {
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
    const scrollTrigger = {
      trigger: element,
      containerAnimation: followTrack ? containerAnimation : undefined,
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
}
