"""
Generate proof/index.html — the Nemora design proof.

  Glyphs     every glyph drawn from the UFO's own outlines (not from a font file), on
             its metric lines: descender, baseline, x-height, cap height, ascender,
             overshoot, sidebearings. Toggle the pen skeletons (the strokes each
             glyph was constructed from) and the outline points (on-curve squares,
             off-curve handles) to review construction and editability.
  Pairs      capital and lowercase side by side (N n, A a, M m, R r, S s, g).
  Specimen   words set in the COMPILED font (build/NemoraProto-Regular.woff2), with a
             live check that the browser really renders it (not a fallback).

Usage (from the repository root):
  nemora/.venv/Scripts/python nemora/tools/proof.py
  nemora/.venv/Scripts/python -m http.server 8765 -d nemora   # then open http://localhost:8765/proof/
"""

from __future__ import annotations

import html
import json
from pathlib import Path

import ufoLib2
from fontTools.pens.svgPathPen import SVGPathPen

ROOT = Path(__file__).resolve().parent.parent
UFO_PATH = ROOT / 'sources' / 'NemoraProto.ufo'
OUT = ROOT / 'proof' / 'index.html'
PAIRS = [('N', 'n'), ('A', 'a'), ('M', 'm'), ('R', 'r'), ('S', 's'), (None, 'g')]
WORDS = ['Anagrams', 'Samsara', 'Ragnar', 'grammar', 'Manna', 'Mars', 'nmnmn', 'NAMRS', 'snags']


def glyph_svg(font: ufoLib2.Font, name: str) -> dict:
    glyph = font[name]
    pen = SVGPathPen(font)
    glyph.draw(pen)
    points = []
    for contour in glyph.contours:
        for p in contour.points:
            points.append([p.x, p.y, 1 if p.type else 0])
    return {
        'name': name,
        'width': glyph.width,
        'd': pen.getCommands(),
        'points': points,
        'skeleton': list(glyph.lib.get('com.nemora.skeleton', [])),
        'note': glyph.lib.get('com.nemora.note', ''),
        'status': glyph.lib.get('com.nemora.status', ''),
    }


def main() -> None:
    font = ufoLib2.Font.open(UFO_PATH)
    info = font.info
    data = {
        'metrics': {
            'upm': info.unitsPerEm,
            'xHeight': info.xHeight,
            'capHeight': info.capHeight,
            'ascender': info.ascender,
            'descender': info.descender,
            'overshoot': 12,
        },
        'glyphs': {name: glyph_svg(font, name) for name in font.keys() if name != 'space'},
        'pairs': PAIRS,
        'words': WORDS,
        'family': f'{info.familyName} {info.versionMajor}.{info.versionMinor:03d}',
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(TEMPLATE.replace('__DATA__', json.dumps(data)).replace('__TITLE__', html.escape(data['family'])),
                   encoding='utf-8')
    print(f'Wrote {OUT.relative_to(ROOT.parent)}')


TEMPLATE = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Nemora proof</title>
<style>
  @font-face {
    font-family: 'Nemora Proto Build';
    src: url('../build/NemoraProto-Regular.woff2') format('woff2');
    font-display: block;
  }
  :root {
    --paper: #f3f1ec; --ink: #0b0a09; --muted: #5d5953; --line: #d6d2c9;
    --accent: #c72020; --guide: #3d7bd9; --hint: #9a958c;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--paper); color: var(--ink);
         font: 15px/1.5 ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif; }
  main { max-width: 1200px; margin: 0 auto; padding: 32px 16px 80px; }
  header { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px 24px; align-items: end;
           border-bottom: 1px solid var(--line); padding-bottom: 16px; }
  h1 { font-size: 22px; margin: 0; font-weight: 600; }
  h2 { font-size: 13px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted);
       margin: 40px 0 12px; font-weight: 600; }
  .banner { background: var(--ink); color: var(--paper); padding: 10px 14px; margin: 16px 0 0; font-size: 13px; }
  .banner b { color: #ff8a8a; }
  .controls { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 13px; }
  .controls label { display: inline-flex; gap: 6px; align-items: center; cursor: pointer; }
  .legend { font-size: 12px; color: var(--muted); }
  .legend span { white-space: nowrap; margin-right: 12px; }
  .pairs { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 520px), 1fr)); gap: 16px; }
  .pair { background: #fff; border: 1px solid var(--line); padding: 8px; }
  .pair .row { display: flex; gap: 4px; align-items: stretch; overflow-x: auto; }
  .cell { flex: 0 0 auto; }
  .cell svg { display: block; width: 100%; height: auto; }
  .cell p { margin: 4px 2px 0; font-size: 12px; color: var(--muted); min-height: 3.2em; }
  .cell .gname { color: var(--ink); font-weight: 600; margin-right: 6px; }
  svg .metric { stroke: var(--line); stroke-width: 2; }
  svg .metric.base { stroke: var(--hint); }
  svg .over { stroke: var(--line); stroke-width: 2; stroke-dasharray: 8 8; }
  svg .side { stroke: var(--guide); stroke-opacity: .35; stroke-width: 2; }
  svg .ink { fill: var(--ink); }
  svg .skel { fill: none; stroke: var(--accent); stroke-width: 4; stroke-dasharray: 14 8; }
  svg .on { fill: #fff; stroke: var(--guide); stroke-width: 3; }
  svg .off { fill: var(--guide); }
  .hide-skel .skel, .hide-pts .on, .hide-pts .off { display: none; }
  .outline .ink { fill: none; stroke: var(--ink); stroke-width: 3; }
  .strip { background: #fff; border: 1px solid var(--line); padding: 12px; overflow-x: auto; }
  .strip svg { display: block; height: 140px; width: auto; }
  .specimen { background: #fff; border: 1px solid var(--line); padding: 16px; }
  .specimen .line { font-family: 'Nemora Proto Build', monospace; line-height: 1.15; overflow-wrap: anywhere; }
  .specimen .s1 { font-size: clamp(48px, 9vw, 120px); }
  .specimen .s2 { font-size: clamp(28px, 5vw, 56px); }
  .specimen .s3 { font-size: 22px; }
  .dark { background: #050505; color: #f5f5f2; }
  #status { font-size: 13px; padding: 8px 12px; margin-bottom: 12px; border-left: 3px solid var(--hint); background: var(--paper); }
  #status.ok { border-color: #2c8a4b; } #status.bad { border-color: var(--accent); }
  footer { margin-top: 40px; font-size: 12px; color: var(--muted); }
</style>
</head>
<body>
<main>
  <header>
    <div>
      <h1>Nemora — design proof</h1>
      <div class="legend" id="fam"></div>
    </div>
    <div class="controls">
      <label><input type="checkbox" id="t-skel" checked /> Pen skeletons</label>
      <label><input type="checkbox" id="t-pts" /> Outline points</label>
      <label><input type="checkbox" id="t-outline" /> Outline only</label>
    </div>
  </header>
  <p class="banner"><b>PROTOTYPE — Phase 1.</b> Eleven original glyphs constructed from the rules in SPEC.md
    to establish the system. Not a usable or finished typeface; every outline still needs a designer's hand.</p>

  <h2>Capital and lowercase pairs — from the UFO outlines</h2>
  <div class="legend">
    <span>— descender / baseline / x-height / cap height / ascender</span>
    <span>- - overshoot</span><span style="color:var(--guide)">| sidebearings</span>
    <span style="color:var(--accent)">- - pen skeleton</span>
  </div>
  <div class="pairs" id="pairs"></div>

  <h2>Rhythm — glyphs set from the UFO outlines with their own advance widths</h2>
  <div class="strip" id="strip"></div>

  <h2>Specimen — set in the compiled font (build/NemoraProto-Regular.woff2)</h2>
  <div id="status">Checking the compiled font…</div>
  <div class="specimen" id="specimen"></div>
  <div class="specimen dark" id="specimen-dark" style="margin-top:8px"></div>

  <footer>Generated by nemora/tools/proof.py from sources/NemoraProto.ufo. Rebuild the font with tools/build.py
    before reading the specimen.</footer>
</main>
<script>
const DATA = __DATA__;
const M = DATA.metrics;
const TOP = M.ascender + 70, BOTTOM = M.descender - 50, PAD = 40;
// Every glyph drawn at one scale (the em's full height in px), so pairs compare truthfully.
const GLYPH_PX = Math.min(300, Math.round(window.innerWidth * 0.42));
document.getElementById('fam').textContent =
  `${DATA.family} · ${M.upm} UPM · x-height ${M.xHeight} · cap height ${M.capHeight} · ascender ${M.ascender} · descender ${M.descender}`;

function guides(width) {
  const rows = [[M.descender, 'metric'], [0, 'metric base'], [M.xHeight, 'metric'], [M.capHeight, 'metric'], [M.ascender, 'metric'],
    [M.xHeight + M.overshoot, 'over'], [M.capHeight + M.overshoot, 'over'], [-M.overshoot, 'over']];
  return rows.map(([y, c]) => `<line class="${c}" x1="${-PAD}" x2="${width + PAD}" y1="${y}" y2="${y}"/>`).join('') +
    `<line class="side" x1="0" x2="0" y1="${BOTTOM}" y2="${TOP}"/><line class="side" x1="${width}" x2="${width}" y1="${BOTTOM}" y2="${TOP}"/>`;
}

function glyphSVG(g) {
  const w = g.width;
  const pts = g.points.map(([x, y, on]) => on
    ? `<rect class="on" x="${x - 6}" y="${y - 6}" width="12" height="12"/>`
    : `<circle class="off" cx="${x}" cy="${y}" r="5"/>`).join('');
  const skel = g.skeleton.map(d => `<path class="skel" d="${d}"/>`).join('');
  return `<svg viewBox="${-PAD} ${-TOP} ${w + 2 * PAD} ${TOP - BOTTOM}" role="img" aria-label="Glyph ${g.name}">
    <g transform="scale(1,-1)">${guides(w)}<path class="ink" d="${g.d}"/>${skel}${pts}</g></svg>`;
}

const pairs = document.getElementById('pairs');
for (const [uc, lc] of DATA.pairs) {
  const cells = [uc, lc].filter(Boolean).map(n => DATA.glyphs[n]).filter(Boolean).map(g =>
    `<div class="cell" style="width:${(GLYPH_PX * (g.width + 2 * PAD) / (TOP - BOTTOM)).toFixed(0)}px">${glyphSVG(g)}<p><span class="gname">${g.name}</span>${g.note}</p></div>`).join('');
  pairs.insertAdjacentHTML('beforeend', `<div class="pair"><div class="row">${cells}</div></div>`);
}

function stripSVG(text) {
  let x = 0, parts = '';
  for (const ch of text) {
    const g = DATA.glyphs[ch];
    if (!g) { x += 240; continue; }
    parts += `<path class="ink" transform="translate(${x},0)" d="${g.d}"/>`;
    x += g.width;
  }
  return `<svg viewBox="-20 ${-(M.ascender + 20)} ${x + 40} ${M.ascender - M.descender + 40}" role="img" aria-label="${text}">
    <g transform="scale(1,-1)"><line class="metric base" x1="-20" x2="${x + 20}" y1="0" y2="0"/>${parts}</g></svg>`;
}
document.getElementById('strip').innerHTML = ['Anagrams Samsara', 'nmnmnmn mmm nnn', 'NAMRS Ragnar'].map(stripSVG).join('');

for (const id of ['specimen', 'specimen-dark']) {
  document.getElementById(id).innerHTML =
    `<div class="line s1">Anagrams</div><div class="line s2">Samsara · Ragnar · grammar</div>
     <div class="line s3">${DATA.words.join(' ')}</div>`;
}

(async () => {
  const el = document.getElementById('status');
  try {
    await document.fonts.load('80px "Nemora Proto Build"', 'Anagrams');
    const loaded = [...document.fonts].some(f => f.family.replace(/"/g, '') === 'Nemora Proto Build' && f.status === 'loaded');
    const c = document.createElement('canvas').getContext('2d');
    const width = font => { c.font = font; return c.measureText('Anagrams Samsara').width; };
    const real = width('80px "Nemora Proto Build", monospace'), fallback = width('80px monospace');
    if (loaded && Math.abs(real - fallback) > 1) {
      el.className = 'ok';
      el.textContent = `Compiled font loaded and rendering (set width ${real.toFixed(0)}px vs ${fallback.toFixed(0)}px in the fallback). Only N n A a M m R r S s g exist — anything else falls back.`;
    } else {
      throw new Error('font did not load');
    }
  } catch (e) {
    el.className = 'bad';
    el.textContent = 'The compiled font is not loading — run nemora/tools/build.py, and serve this folder over http (see README).';
  }
})();

const root = document.documentElement;
const toggle = (id, cls, invert) => {
  const box = document.getElementById(id);
  const apply = () => root.classList.toggle(cls, invert ? !box.checked : box.checked);
  box.addEventListener('change', apply); apply();
};
toggle('t-skel', 'hide-skel', true);
toggle('t-pts', 'hide-pts', true);
toggle('t-outline', 'outline', false);
</script>
</body>
</html>
"""


if __name__ == '__main__':
    main()
