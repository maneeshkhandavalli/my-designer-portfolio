"""
Compile sources/NemoraProto.ufo into build/NemoraProto-Regular.otf (CFF) and .woff2,
then check the result.

Checks
  - every Phase 1 glyph is present, mapped, non-empty, with a positive advance
  - outlines stay inside the vertical metrics (cap/x-height + overshoot, descender)
  - no overlapping contours survive compilation; all outer contours wind the same way
  - the name table carries no inherited third-party metadata
  - provenance: no outline matches Old English Text MT (if installed) or the old
    Noto-based prototypes in src/specimen/fonts — Nemora must be original drawing

Usage (from the repository root):
  nemora/.venv/Scripts/python nemora/tools/build.py
"""

from __future__ import annotations

import hashlib
import sys
from pathlib import Path

import pathops
import ufo2ft
import ufoLib2
from fontTools.pens.areaPen import AreaPen
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
UFO_PATH = ROOT / 'sources' / 'NemoraProto.ufo'
BUILD = ROOT / 'build'
PHASE1 = 'NnAaMmRrSsg'
FOREIGN = ('Noto', 'Google', 'Monotype', 'Old English')
REFERENCES = [
    Path('C:/Windows/Fonts/OLDENGL.TTF'),
    ROOT.parent / 'src' / 'specimen' / 'fonts' / 'Nemora-Display.ttf',
    ROOT.parent / 'src' / 'specimen' / 'fonts' / 'Nemora-Text.ttf',
]


def fingerprint(font: TTFont, glyph_name: str) -> str:
    glyphs = font.getGlyphSet()
    pen = DecomposingRecordingPen(glyphs)
    glyphs[glyph_name].draw(pen)
    return hashlib.sha1(repr(pen.value).encode()).hexdigest()


def glyph_area(glyphs, name: str) -> float:
    pen = AreaPen(glyphs)
    glyphs[name].draw(pen)
    return pen.value


def check(font: TTFont, ufo: ufoLib2.Font) -> list[str]:
    problems: list[str] = []
    cmap = font.getBestCmap()
    glyphs = font.getGlyphSet()
    info = ufo.info
    top_lc = info.xHeight + 40
    top_uc = info.capHeight + 40
    bottom = info.descender - 40
    signs = set()
    for ch in PHASE1:
        name = cmap.get(ord(ch))
        if name is None:
            problems.append(f'{ch}: not in the character map')
            continue
        bounds = glyphs[name]
        pen = DecomposingRecordingPen(glyphs)
        bounds.draw(pen)
        if not pen.value:
            problems.append(f'{ch}: empty outline')
            continue
        if font['hmtx'][name][0] <= 0:
            problems.append(f'{ch}: no advance width')
        path = pathops.Path()
        bounds.draw(path.getPen(glyphSet=glyphs))
        x0, y0, x1, y1 = path.bounds
        limit = top_uc if ch.isupper() else top_lc
        if y1 > limit or y0 < bottom or (ch not in 'g' and y0 < -40):
            problems.append(f'{ch}: outline outside the metrics ({y0:.0f}..{y1:.0f})')
        area = glyph_area(glyphs, name)
        signs.add(area > 0)
        simplified = pathops.Path()
        bounds.draw(simplified.getPen(glyphSet=glyphs))
        simplified.simplify(fix_winding=True, clockwise=False)
        if abs(abs(simplified.area) - abs(area)) > 1:
            problems.append(f'{ch}: overlapping contours remain')
    if len(signs) > 1:
        problems.append('outer contours do not all wind the same way')
    for record in font['name'].names:
        text = record.toUnicode()
        if any(word in text for word in FOREIGN):
            problems.append(f'name {record.nameID} carries third-party text: {text[:60]!r}')
    return problems


def provenance(font: TTFont) -> list[str]:
    lines: list[str] = []
    ours = {ch: fingerprint(font, font.getBestCmap()[ord(ch)]) for ch in PHASE1}
    for ref_path in REFERENCES:
        if not ref_path.exists():
            lines.append(f'  - {ref_path.name}: not available, skipped')
            continue
        ref = TTFont(ref_path)
        ref_cmap = ref.getBestCmap()
        same = [ch for ch in PHASE1 if ord(ch) in ref_cmap and fingerprint(ref, ref_cmap[ord(ch)]) == ours[ch]]
        lines.append(f'  - {ref_path.name}: {len(same)} identical outlines' + (f' ({"".join(same)})' if same else ''))
        if same:
            raise SystemExit(f'Provenance check failed: outlines identical to {ref_path.name}: {"".join(same)}')
    return lines


def main() -> None:
    ufo = ufoLib2.Font.open(UFO_PATH)
    BUILD.mkdir(exist_ok=True)
    otf = ufo2ft.compileOTF(
        ufo,
        removeOverlaps=True,
        overlapsBackend='pathops',
        optimizeCFF=ufo2ft.CFFOptimization.SUBROUTINIZE,
    )
    stem = ufo.info.postscriptFontName or 'NemoraProto-Regular'
    otf_path = BUILD / f'{stem}.otf'
    otf.save(otf_path)

    font = TTFont(otf_path)
    font.flavor = 'woff2'
    woff2_path = BUILD / f'{stem}.woff2'
    font.save(woff2_path)

    compiled = TTFont(woff2_path)  # re-read the web file: what browsers get
    problems = check(compiled, ufo)
    print(f'Built {otf_path.relative_to(ROOT.parent)} ({otf_path.stat().st_size / 1024:.1f} kB)')
    print(f'      {woff2_path.relative_to(ROOT.parent)} ({woff2_path.stat().st_size / 1024:.1f} kB)')
    print(f'  glyphs: {len(compiled.getGlyphOrder())} ({", ".join(compiled.getGlyphOrder())})')
    print('  provenance (outline fingerprints):')
    for line in provenance(compiled):
        print(line)
    if problems:
        print('  CHECKS FAILED:')
        for p in problems:
            print('   -', p)
        sys.exit(1)
    print('  checks: all passed')


if __name__ == '__main__':
    main()
