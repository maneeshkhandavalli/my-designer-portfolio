/**
 * Navbar / frame tone, written to :root:
 *   data-chrome  'light' → ink navbar + frame line (over the white Hero); 'dark' → white
 *   data-matte   'on' → the frame's black matte (hides content outside the frame)
 *
 * The page sets its tone (Story's transition, from scroll progress); the shell
 * can force dark (Loader still up, menu open — both black screens).
 */
let page = { dark: false, matte: false }
let forced = true

function apply() {
  const root = document.documentElement
  const chrome = forced || page.dark ? 'dark' : 'light'
  const matte = forced || page.matte ? 'on' : 'off'
  if (root.dataset.chrome !== chrome) root.dataset.chrome = chrome
  if (root.dataset.matte !== matte) root.dataset.matte = matte
}

export function setPageTone(dark: boolean, matte: boolean) {
  page = { dark, matte }
  apply()
}

export function setChromeForced(on: boolean) {
  forced = on
  apply()
}
