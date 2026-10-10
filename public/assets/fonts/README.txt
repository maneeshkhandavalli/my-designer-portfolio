NEMORA FONT FAMILY — FIRST WORKING PROTOTYPE

Included:
- Nemora-Display.ttf / .woff2: display role prototype
- Nemora-Text.ttf / .woff2: supporting heading role prototype

IMPORTANT:
This is an installable prototype for testing the portfolio's font integration.
The outlines currently use the open-licensed Noto Serif source glyphs with Nemora
family metadata. They are NOT yet the final bespoke Nemora letterforms discussed
in the design process. The custom glyph drawing, distinctive A, smoother gothic
details, spacing and kerning still need a dedicated font-design pass.

Do not present this prototype as a completed original typeface. Use it to test
sizing, hierarchy and integration; replace its outlines when the custom glyphs
are approved.

Suggested CSS:
@font-face {
  font-family: 'Nemora Display';
  src: url('/assets/fonts/Nemora-Display.woff2') format('woff2');
  font-display: swap;
}
@font-face {
  font-family: 'Nemora Text';
  src: url('/assets/fonts/Nemora-Text.woff2') format('woff2');
  font-display: swap;
}
