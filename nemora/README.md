# Nemora — type design workspace

Nemora is an original display typeface for the portfolio, in development. This folder
holds its sources, tools and proofs, **separate from the website**:

- Nothing here is imported by the site.
- Tailwind is told not to scan this folder (`src/styles/site.css`).
- The npm build is unchanged.

The portfolio's headings still use Old English Text MT.

> **Status: Phase 1 prototype.** Eleven original glyphs (`N n A a M m R r S s g`) built from
> the rules in [SPEC.md](SPEC.md). They compile into a valid test font,
> `Nemora Proto 0.001`, used to test the pipeline and review the design. This is **not** a
> usable or finished typeface.

## Layout

```
nemora/
├── SPEC.md                   design specification: metrics, pen, rules, glyph notes, known issues
├── README.md                 this file: workflow and status
├── requirements.txt          Python toolchain (pinned; installed into .venv only)
├── sources/
│   └── NemoraProto.ufo/      THE SOURCE: UFO 3, editable in any font editor
├── tools/
│   ├── construct.py          seeds glyphs from the SPEC rules (pen strokes → outlines)
│   ├── build.py              UFO → build/*.otf + *.woff2, with checks
│   └── proof.py              UFO → proof/index.html
├── proof/index.html          generated design proof (outlines + compiled-font specimen)
├── build/                    generated fonts (git-ignored)
└── .venv/                    local Python environment (git-ignored)
```

The previous "Nemora" files in `src/specimen/fonts/` are **not** part of this workspace. They
are renamed Noto Serif outlines, kept untouched for reference and for the dev-only comparison
page at `/font-specimen.html`.

## Setup (once)

Run from the repository root (Windows paths; on macOS or Linux use `.venv/bin/python`):

```sh
python -m venv nemora/.venv
nemora/.venv/Scripts/python -m pip install -r nemora/requirements.txt
```

The toolchain is fontTools, ufoLib2, ufo2ft and skia-pathops: the open-source stack behind
Google Fonts builds. It's all Python, with no npm packages.

## The loop

```sh
# 1. (Re)seed glyphs from the rules. Hand-edited glyphs are never overwritten without --force.
nemora/.venv/Scripts/python nemora/tools/construct.py

# 2. Draw / refine in a font editor (open nemora/sources/NemoraProto.ufo), save.

# 3. Compile and check.
nemora/.venv/Scripts/python nemora/tools/build.py

# 4. Regenerate and read the proof.
nemora/.venv/Scripts/python nemora/tools/proof.py
nemora/.venv/Scripts/python -m http.server 8765 -d nemora    # open http://localhost:8765/proof/
```

### How glyphs are made

`construct.py` writes each glyph as **pen strokes**: centrelines swept by a 30° broad nib.
Thick and thin come from stroke direction, and the nib's cut is softened at the ends. The
strokes are merged into clean Bézier contours in the UFO, and each glyph's skeleton is stored
in its `lib` so the proof can draw it. This is how the shared rules (minim, shoulder, blade,
foot, echo hairline) stay consistent: change one rule in `construct.py` and every untouched
glyph follows.

Once a glyph has been edited in an editor, **the UFO is its source of truth**.
`construct.py` detects the edit (via an outline hash in the glyph's lib) and leaves the glyph
alone unless run with `--force`.

### Editors (any UFO editor works)

| Editor | Platform | Notes |
|---|---|---|
| **Fontra Pak** | Windows, macOS | Free. Opens `.ufo` folders directly. Recommended here. |
| **FontForge** | Windows, macOS, Linux | Free. Open the `.ufo` folder; save back as UFO, not `.sfd`. |
| Glyphs / RoboFont | macOS | Commercial. Both open UFO. |

Keep compiling with `tools/build.py` whichever editor you use, so there's one build path
with the same checks.

## Route from vector glyphs to `.otf` and `.woff2`

1. **Draw**: outlines in `NemoraProto.ufo`, as cubic Béziers on the 1000-unit em (seeded
   by `construct.py`, refined in an editor).
2. **Compile**: `ufo2ft.compileOTF` builds a CFF-flavoured OpenType font. It merges
   overlapping contours (skia-pathops), subroutinises the CFF, and fills in
   `.notdef`, `OS/2`, `hhea` and `name` from the UFO's font info.
3. **Web**: fontTools re-saves the `.otf` as WOFF2 (Brotli). It's 2 kB today.
4. **Check** (automatic in `build.py`):
   - every glyph is present and non-empty;
   - outlines stay inside the metrics;
   - no overlaps remain and winding is consistent;
   - the name table has no third-party text;
   - provenance: no outline is identical to Old English Text MT or the Noto prototypes.
5. **Test in a browser**: the proof page loads `build/*.woff2` and confirms it's really
   rendering, not a fallback.
6. **Later, into the portfolio** (not now): once the alphabet is complete and approved,
   copy the `.woff2` into the site's fonts. Add it to the dev comparison page
   (`src/specimen/FontSpecimen.tsx`) as a new face first. Don't overwrite the old prototype
   files. Only then consider a display-role switch, as a separate, reviewed change.

## Status

**Done**
- An isolated workspace with a pinned Python toolchain, verified on Python 3.14 on Windows.
- An editable UFO 3 source with metrics, overshoot guidelines and font info, plus 11
  constructed glyphs and a space.
- A written system: metrics, pen, terminals, minim, shoulder, blade, sweep, foot, echo
  hairline and spacing ([SPEC.md](SPEC.md)).
- A working build to a valid `.otf` and `.woff2`, checked automatically, and confirmed
  rendering in Chrome.
- A proof page:
  - outlines on metric lines, with pen skeletons and points;
  - capital and lowercase pairs;
  - a rhythm strip;
  - a light and dark specimen in the compiled font.
- A guard against re-seeding over hand edits (tested).

**Still needs real design work**
- A designer's pass on all 11 glyphs: the known issues in SPEC.md § 7 (shoulder knots,
  echo-hairline weight, capital lean, a and g bowls), plus point clean-up.
- The rest of the alphabet: the remaining 20 lowercase and 21 capitals, figures,
  punctuation (`’ ? . & *` are used in the site's headings), and space metrics.
- Spacing, kerning, and testing at real heading sizes against the site's layouts.
- Hinting / autohinting for Windows rendering, and a full validation pass (OTS/fontbakery)
  before any production use.
- A final name, version and licence in the font info.
