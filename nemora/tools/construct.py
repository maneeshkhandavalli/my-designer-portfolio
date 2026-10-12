"""
Seed Nemora's Phase 1 prototype glyphs into sources/NemoraProto.ufo.

PROTOTYPE CONSTRUCTION — every outline here is an original construction from the
rules in SPEC.md; no outline is traced, imported or derived from another font.

How a glyph is made
  Each glyph is a list of pen strokes. A stroke is a centreline (lines and cubic
  curves) swept by a broad nib held at a fixed angle — the way a calligrapher's
  pen makes blackletter. Because the nib is a straight edge, the stroke's two
  sides are exact translated copies of the centreline, so the outline keeps the
  same clean Bézier points as the skeleton: thick and thin follow from the stroke's
  direction alone (thick across the nib, hairline along it). A second, thin nib at
  right angles sets the minimum hairline. Stroke ends are the nib's own angled cut,
  softened: acute corners rounded generously, obtuse ones barely (SPEC.md § 2).
  The strokes of a glyph are merged into clean outer/inner contours (skia-pathops)
  and written to the UFO, with the skeleton kept in the glyph's lib for the proof.

Editing
  The UFO is the source of truth once a glyph is touched by hand (Fontra, FontForge,
  Glyphs, RoboFont ...). This script never overwrites a glyph whose outline differs
  from what it last wrote, unless --force is given. Use it to re-seed untouched
  glyphs after changing a rule below, or to add glyphs in the same system.

Usage (from the repository root):
  nemora/.venv/Scripts/python nemora/tools/construct.py            # seed / re-seed
  nemora/.venv/Scripts/python nemora/tools/construct.py --force    # overwrite edits too
"""

from __future__ import annotations

import argparse
import hashlib
import math
from dataclasses import dataclass
from pathlib import Path

import pathops
import ufoLib2
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.roundingPen import RoundingPen

ROOT = Path(__file__).resolve().parent.parent
UFO_PATH = ROOT / 'sources' / 'NemoraProto.ufo'

# ---------------------------------------------------------------------------------
# Vertical metrics (units per em 1000) — SPEC.md § 1
# ---------------------------------------------------------------------------------
UPM = 1000
X_HEIGHT = 500
CAP_HEIGHT = 700
ASCENDER = 760
DESCENDER = -230
OVERSHOOT = 12

Point = tuple[float, float]


@dataclass(frozen=True)
class Nib:
    """A broad nib: `width` long, held at `angle` degrees; `hairline` is the minimum stroke."""

    width: float
    angle: float = 30.0
    hairline: float = 18.0

    def vector(self) -> Point:
        a = math.radians(self.angle)
        return (self.width / 2 * math.cos(a), self.width / 2 * math.sin(a))

    def hair_vector(self) -> Point:
        a = math.radians(self.angle + 90)
        return (self.hairline / 2 * math.cos(a), self.hairline / 2 * math.sin(a))


# Lowercase nib: vertical stems 90 wide (104 · cos 30°), horizontals 52 (104 · sin 30°).
LC = Nib(104)
# Capital nib: vertical stems 107, horizontals 62 — capitals sit heavier than the lowercase.
UC = Nib(124)

# Terminal softening (SPEC.md § 2): radius as a fraction of the nib width.
SOFT_ACUTE = 0.24
SOFT_OBTUSE = 0.05
KAPPA = 0.55  # handle length for a rounded corner, as a fraction of its radius


# ---------------------------------------------------------------------------------
# Geometry helpers
# ---------------------------------------------------------------------------------
def add(p: Point, q: Point) -> Point:
    return (p[0] + q[0], p[1] + q[1])


def sub(p: Point, q: Point) -> Point:
    return (p[0] - q[0], p[1] - q[1])


def mul(p: Point, k: float) -> Point:
    return (p[0] * k, p[1] * k)


def cross(p: Point, q: Point) -> float:
    return p[0] * q[1] - p[1] * q[0]


def norm(p: Point) -> Point:
    length = math.hypot(*p) or 1.0
    return (p[0] / length, p[1] / length)


def lerp(p: Point, q: Point, t: float) -> Point:
    return (p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t)


Segment = tuple[Point, ...]  # (p0, p1) line, or (p0, c1, c2, p1) cubic


def split_cubic(seg: Segment, t: float) -> tuple[Segment, Segment]:
    p0, c1, c2, p1 = seg
    a, b, c = lerp(p0, c1, t), lerp(c1, c2, t), lerp(c2, p1, t)
    d, e = lerp(a, b, t), lerp(b, c, t)
    f = lerp(d, e, t)
    return (p0, a, d, f), (f, e, c, p1)


def tangent_crossings(seg: Segment, v: Point) -> list[float]:
    """Parameters where the cubic's direction is parallel to the nib (where a sweep would twist)."""
    if len(seg) == 2:
        return []
    p0, c1, c2, p1 = seg
    x0, x1, x2 = cross(sub(c1, p0), v), cross(sub(c2, c1), v), cross(sub(p1, c2), v)
    a, b, c = x0 - 2 * x1 + x2, 2 * (x1 - x0), x0
    roots: list[float] = []
    if abs(a) < 1e-9:
        if abs(b) > 1e-9:
            roots = [-c / b]
    else:
        disc = b * b - 4 * a * c
        if disc >= 0:
            r = math.sqrt(disc)
            roots = [(-b - r) / (2 * a), (-b + r) / (2 * a)]
    return sorted(t for t in roots if 1e-4 < t < 1 - 1e-4)


def seg_direction_sign(seg: Segment, v: Point) -> float:
    """Which side of the nib the segment travels (sampled mid-segment)."""
    if len(seg) == 2:
        d = sub(seg[1], seg[0])
    else:
        a, b = split_cubic(seg, 0.5)
        d = sub(b[1], a[2])
    return math.copysign(1.0, cross(d, v)) if abs(cross(d, v)) > 1e-6 else 0.0


# ---------------------------------------------------------------------------------
# Strokes
# ---------------------------------------------------------------------------------
class Stroke:
    """A pen stroke: a centreline built with .line() / .curve(), swept by a nib."""

    def __init__(self, start: Point, nib: Nib = LC, soft: bool = True):
        self.start = start
        self.segments: list[Segment] = []
        self.nib = nib
        self.soft = soft
        self._pen = start

    def line(self, p: Point) -> 'Stroke':
        self.segments.append((self._pen, p))
        self._pen = p
        return self

    def curve(self, c1: Point, c2: Point, p: Point) -> 'Stroke':
        self.segments.append((self._pen, c1, c2, p))
        self._pen = p
        return self

    def skeleton_svg(self) -> str:
        d = [f'M{self.start[0]:.0f} {self.start[1]:.0f}']
        for seg in self.segments:
            pts = seg[1:]
            d.append(('L' if len(seg) == 2 else 'C') + ' '.join(f'{x:.0f} {y:.0f}' for x, y in pts))
        return ' '.join(d)


def _runs(segments: list[Segment], v: Point) -> list[list[Segment]]:
    """Split the centreline wherever its direction passes the nib's, into twist-free runs."""
    pieces: list[Segment] = []
    for seg in segments:
        ts = tangent_crossings(seg, v)
        rest, last_t = seg, 0.0
        for t in ts:
            local = (t - last_t) / (1 - last_t)
            head, rest = split_cubic(rest, local)
            pieces.append(head)
            last_t = t
        pieces.append(rest)
    runs: list[list[Segment]] = []
    sign = 0.0
    for piece in pieces:
        s = seg_direction_sign(piece, v)
        if runs and (s == 0 or s == sign or sign == 0):
            runs[-1].append(piece)
            sign = sign or s
        else:
            runs.append([piece])
            sign = s
    return runs


def _translate(seg: Segment, d: Point) -> Segment:
    return tuple(add(p, d) for p in seg)


def _reverse(seg: Segment) -> Segment:
    return tuple(reversed(seg))


def _sweep(run: list[Segment], v: Point) -> list[Segment]:
    """Closed outline of a nib (segment from -v to +v) swept along a twist-free run."""
    neg = (-v[0], -v[1])
    forward = [_translate(s, v) for s in run]
    back = [_reverse(_translate(s, neg)) for s in reversed(run)]
    end, start = run[-1][-1], run[0][0]
    cap_end = (add(end, v), add(end, neg))
    cap_start = (add(start, neg), add(start, v))
    return forward + [cap_end] + back + [cap_start]


def _round_corner(contour: list[Segment], i: int, radius: float) -> list[Segment]:
    """Round the corner between contour[i-1] and contour[i] (a cubic fillet)."""
    prev, nxt = contour[i - 1], contour[i]
    v = nxt[0]
    d_in = norm(sub(v, prev[-2]))
    d_out = norm(sub(nxt[1], v))
    len_in = math.hypot(*sub(v, prev[0])) if len(prev) == 2 else radius * 3
    len_out = math.hypot(*sub(nxt[-1], v)) if len(nxt) == 2 else radius * 3
    r = min(radius, len_in * 0.45, len_out * 0.45)
    if r < 1:
        return contour
    p1, p2 = sub(v, mul(d_in, r)), add(v, mul(d_out, r))
    shift_in, shift_out = sub(p1, v), sub(p2, v)
    if len(prev) == 2:
        prev = (prev[0], p1)
    else:
        prev = (prev[0], prev[1], add(prev[2], shift_in), p1)
    if len(nxt) == 2:
        nxt = (p2, nxt[1])
    else:
        nxt = (p2, add(nxt[1], shift_out), nxt[2], nxt[3])
    fillet = (p1, add(p1, mul(d_in, KAPPA * r)), sub(p2, mul(d_out, KAPPA * r)), p2)
    out = list(contour)
    out[i - 1], out[i] = prev, nxt
    out.insert(i, fillet)
    return out


def _interior_angle(contour: list[Segment], i: int) -> float:
    prev, nxt = contour[i - 1], contour[i]
    v = nxt[0]
    a, b = norm(sub(prev[-2], v)), norm(sub(nxt[1], v))
    return math.degrees(math.acos(max(-1.0, min(1.0, a[0] * b[0] + a[1] * b[1]))))


def _soften_caps(contour: list[Segment], cap_indices: list[int], nib: Nib) -> list[Segment]:
    """Soften the corners at both ends of each cap (the nib's cut), acute ones the most."""
    corners: list[int] = []
    for ci in cap_indices:
        corners += [ci, ci + 1]
    # Process from the highest index so earlier indices stay valid while fillets are inserted.
    for i in sorted({c % len(contour) for c in corners}, reverse=True):
        angle = _interior_angle(contour, i)
        radius = nib.width * (SOFT_ACUTE if angle < 90 else SOFT_OBTUSE)
        contour = _round_corner(contour, i, radius)
    return contour


def _trimmed(segments: list[Segment], trim: float) -> list[Segment]:
    """The centreline shortened by `trim` units at each end (keeps the hairline pen inside the caps)."""
    total = sum(math.hypot(*sub(s[-1], s[0])) for s in segments)
    if total <= 3 * trim:
        return []
    out = list(segments)
    first, last = out[0], out[-1]
    t0 = trim / max(math.hypot(*sub(first[-1], first[0])), 1e-6)
    t1 = trim / max(math.hypot(*sub(last[-1], last[0])), 1e-6)
    if len(first) == 2:
        out[0] = (lerp(first[0], first[1], min(t0, 0.5)), first[1])
    else:
        out[0] = split_cubic(first, min(t0, 0.5))[1]
    last = out[-1]
    if len(last) == 2:
        out[-1] = (last[0], lerp(last[0], last[1], 1 - min(t1, 0.5)))
    else:
        out[-1] = split_cubic(last, 1 - min(t1, 0.5))[0]
    return out


def stroke_contours(stroke: Stroke) -> list[list[Segment]]:
    """All contours a stroke contributes: the broad nib's runs and the hairline nib's."""
    contours: list[list[Segment]] = []
    v = stroke.nib.vector()
    runs = _runs(stroke.segments, v)
    for index, run in enumerate(runs):
        contour = _sweep(run, v)
        caps: list[int] = []
        # Only the stroke's true ends are cut by the nib; split points stay sharp (they pinch to a hairline).
        if stroke.soft and index == len(runs) - 1:
            caps.append(len(run))  # cap_end sits right after the forward segments
        if stroke.soft and index == 0:
            caps.append(len(contour) - 1)  # cap_start closes the contour
        contours.append(_soften_caps(contour, caps, stroke.nib) if caps else contour)
    hair = stroke.nib.hair_vector()
    trimmed = _trimmed(stroke.segments, stroke.nib.width * 0.16)
    if trimmed:
        for run in _runs(trimmed, hair):
            contours.append(_sweep(run, hair))
    return contours


def rule(x: float, y0: float, y1: float, width: float = 20.0) -> list[Segment]:
    """The echo hairline: a free-standing vertical hairline with fully rounded ends (SPEC.md § 4)."""
    w = width / 2
    box = [(x - w, y0), (x + w, y0), (x + w, y1), (x - w, y1)]
    contour: list[Segment] = [(box[i], box[(i + 1) % 4]) for i in range(4)]
    for i in (3, 2, 1, 0):
        contour = _round_corner(contour, i, w - 0.5)
    return contour


# ---------------------------------------------------------------------------------
# Merging and writing
# ---------------------------------------------------------------------------------
def _signed_area(contour: list[Segment]) -> float:
    pts = [p for seg in contour for p in seg[:-1]]  # anchors and handles: the control polygon
    return sum(cross(pts[i], pts[(i + 1) % len(pts)]) for i in range(len(pts))) / 2


def _draw_contour(contour: list[Segment], pen) -> None:
    pen.moveTo(contour[0][0])
    for seg in contour:
        if len(seg) == 2:
            pen.lineTo(seg[1])
        else:
            pen.curveTo(seg[1], seg[2], seg[3])
    pen.closePath()


def merge(contours: list[list[Segment]]) -> pathops.Path:
    """Union of all contours (each made counter-clockwise first, so overlaps add up)."""
    path = pathops.Path()
    pen = path.getPen()
    for contour in contours:
        if _signed_area(contour) < 0:
            contour = [_reverse(seg) for seg in reversed(contour)]
        _draw_contour(contour, pen)
    path.simplify(fix_winding=True, keep_starting_points=False, clockwise=False)
    return path


@dataclass
class Design:
    name: str
    unicode: int
    advance: float
    strokes: list[Stroke]
    extras: list[list[Segment]]
    note: str


# ---------------------------------------------------------------------------------
# The Phase 1 glyphs — SPEC.md § 5. Coordinates are font units on the 1000-unit em.
# ---------------------------------------------------------------------------------
XH, CH = X_HEIGHT, CAP_HEIGHT
STEM = 90  # lowercase vertical stem (LC nib across a vertical stroke)
GAP = 128  # lowercase counter between minims
SB = 38  # lowercase sidebearing beside a minim
# Capital right sidebearing after the shared foot: the foot's reach (84) + the capital nib's
# half-width at its cut (54) + 24 of air, measured from the stem's centreline.
FOOT_CLEAR = 84 + 54 + 24


def minim(x: float, top: float = XH, bottom: float = 0) -> Stroke:
    """The lowercase stem: a straight vertical pull. Its nib cuts make it rotationally
    symmetric — head rising to a soft point at upper right, foot to one at lower left."""
    cx = x + STEM / 2
    return Stroke((cx, top - 2)).line((cx, bottom + 2))


def arch(xa: float, xb: float, top: float, nib: Nib, rise: float, start: Point | None = None) -> Stroke:
    """The shoulder rule (SPEC.md § 3), shared by n m r a N M R.

    Leaves the stem centred at xa from inside its body, travelling just steeper than the
    nib (so it emerges as a hairline), and crests 55 % of the way to xb with its top edge
    exactly on `top`. Callers continue it: down into the next stem, or out to a flag.
    `start` overrides the departure point for a free-standing roof (a)."""
    vx, vy = nib.vector()
    crest = top - vy
    p0 = start or (xa + 0.5 * vx, top - rise)
    apex = xa + (xb - xa) * 0.55
    stroke = Stroke(p0, nib)
    stroke.curve((p0[0] + 0.65 * vx, p0[1] + 0.16 * rise), (apex - 0.45 * (apex - p0[0]), crest), (apex, crest))
    return stroke


def descend(stroke: Stroke, xb: float, top: float, nib: Nib, rise: float) -> Stroke:
    """Continue an arch from its crest down into the stem centred at xb."""
    apex = stroke._pen[0]
    crest = top - nib.vector()[1]
    return stroke.curve((apex + 0.5 * (xb - apex), crest), (xb, top - 0.38 * rise), (xb, top - 0.78 * rise))


def shoulder(x: float) -> Stroke:
    """The n-shoulder between the minim at x (left edge) and the next one."""
    xa, xb = x + STEM / 2, x + STEM + GAP + STEM / 2
    return descend(arch(xa, xb, XH, LC, GAP), xb, XH, LC, GAP)


def build_designs() -> list[Design]:
    d: list[Design] = []

    # n — minim, shoulder, minim.
    d.append(Design('n', ord('n'), SB + STEM + GAP + STEM + SB,
                    [minim(SB), shoulder(SB), minim(SB + STEM + GAP)], [],
                    'Two minims joined by one shoulder; the notch between the left head and the shoulder is the lowercase signature.'))

    # m — the n rule repeated: three minims, two shoulders, same counters.
    step = STEM + GAP
    d.append(Design('m', ord('m'), SB + 3 * STEM + 2 * GAP + SB,
                    [minim(SB), shoulder(SB), minim(SB + step), shoulder(SB + step), minim(SB + 2 * step)], [],
                    'Exactly n + one more shoulder and minim: identical counters, identical shoulders.'))

    # r — the minim and the start of a shoulder, ending in a flag cut by the nib.
    r_flag = arch(SB + STEM / 2, SB + STEM + GAP + STEM / 2, XH, LC, GAP)
    r_apex = r_flag._pen[0]
    r_flag.curve((r_apex + 34, XH - 26), (r_apex + 58, XH - 42), (r_apex + 66, XH - 76))
    d.append(Design('r', ord('r'), round(r_apex + 66 + 30),
                    [minim(SB), r_flag], [],
                    'The n shoulder cut short: it ends in a flag, the nib’s own cut softened — no hook, no swash.'))

    # a — right minim; a roof that rises from a soft left terminal into its head;
    # a lower bowl whose top is a hairline and whose left side is a short thick pull.
    ax = 34
    arx = ax + 176  # right minim's left edge
    # The roof starts free, so its head is the stroke's own start: a near-vertical departure
    # lays the nib's full width down as a weighty terminal, then it joins the arch rule.
    a_apex = ax + (arx + STEM / 2 - ax) * 0.55
    a_roof = Stroke((ax + 46, XH - 150)).curve((ax + 52, XH - 92), (ax + 84, XH - 26), (a_apex, XH - 26))
    a_roof = descend(a_roof, arx + STEM / 2, XH, LC, GAP)
    a_bowl_top = Stroke((arx + 20, 296)).line((ax + 52, 236))
    a_bowl = Stroke((ax + 52, 236), soft=False).curve((ax + 40, 170), (ax + 40, 100), (ax + 48, 52)) \
        .curve((ax + 58, 6), (arx - 40, 10), (arx + 20, 46))
    d.append(Design('a', ord('a'), arx + STEM + SB,
                    [minim(arx), a_roof, a_bowl_top, a_bowl], [],
                    'Double-storey: the roof is the shoulder reversed, the bowl a faceted lozenge hung on the minim.'))

    # s — one continuous pull: top terminal, top arm, spine across the nib (thick), bottom arm.
    s_spine = Stroke((206, XH - 64)) \
        .curve((190, XH + 10), (70, XH + 20), (62, XH - 92)) \
        .curve((56, XH - 178), (208, 210), (210, 120)) \
        .curve((212, 26), (90, -26), (40, 70))
    d.append(Design('s', ord('s'), 250,
                    [s_spine], [],
                    'A single nib pull; the spine is the only heavy diagonal, both terminals are soft nib cuts.'))

    # g — an a-bowl closed at x-height on a minim that continues below the baseline
    # and returns left in a short tail (no lower loop, no swash).
    gx = 34
    grx = gx + 176
    g_bowl = Stroke((grx + 20, XH - 30), soft=False) \
        .curve((grx - 40, XH + 6), (gx + 40, XH + 10), (gx + 46, XH - 110)) \
        .curve((gx + 50, 150), (gx + 40, 70), (gx + 70, 40)) \
        .curve((gx + 110, 10), (grx - 30, 20), (grx + 20, 70))
    g_stem = Stroke((grx + 45, XH - 2)).line((grx + 45, -60)) \
        .curve((grx + 45, -170), (grx - 20, DESCENDER + 18), (gx + 70, DESCENDER + 30)) \
        .curve((gx + 40, DESCENDER + 34), (gx + 20, DESCENDER + 50), (gx + 14, DESCENDER + 74))
    d.append(Design('g', ord('g'), grx + STEM + SB,
                    [g_bowl, g_stem], [],
                    'The a-bowl, closed at x-height, on a minim that falls below the baseline and turns back in a short tail.'))

    # --- Capitals ------------------------------------------------------------------
    # The blade: the capital's main stem, a pull bowed slightly outward at the left.
    def blade(x: float, top: float = CH, bottom: float = 0) -> Stroke:
        return Stroke((x + 8, top - 24), UC).curve((x - 18, top - 230), (x - 22, bottom + 220), (x, bottom + 22))

    # N — blade; one sweep from the blade's shoulder over into the right stem, which ends in a short foot.
    def sweep(xa: float, xb: float, foot: bool) -> Stroke:
        """The capital shoulder: arch() at cap scale down into the stem at xb, which ends
        in the shared foot (a short turn to the right) or plainly on the baseline."""
        s = descend(arch(xa, xb, CH, UC, 190), xb, CH, UC, 190)
        if foot:
            return s.line((xb, 90)).curve((xb, 30), (xb + 30, 8), (xb + 84, 34))
        return s.line((xb, 22))

    nx = 96
    n_right = nx + 300
    N_sweep = sweep(nx, n_right, True)
    d.append(Design('N', ord('N'), n_right + FOOT_CLEAR,
                    [blade(nx), N_sweep],
                    [rule(nx + 118, 170, 470)],
                    'Blade + one sweep; the echo hairline stands in the counter beside the blade.'))

    # A — the apex is the right blade's head; the left leg is one bowed sweep from the apex
    # to a soft foot; a hairline crossbar; the echo hairline above it.
    ax0 = 40
    a_right = ax0 + 330
    A_leg = Stroke((a_right - 20, CH - 44), UC).curve((a_right - 140, CH - 150), (ax0 + 20, 420), (ax0 + 40, 60))
    A_blade = Stroke((a_right + 4, CH + 6), UC).line((a_right, 90)).curve((a_right, 30), (a_right + 30, 8), (a_right + 84, 34))
    A_bar = Stroke((ax0 + 70, 250), UC, soft=False).curve((ax0 + 150, 270), (a_right - 120, 300), (a_right - 10, 310))
    d.append(Design('A', ord('A'), a_right + FOOT_CLEAR,
                    [A_leg, A_blade, A_bar],
                    [rule(a_right - 70, 360, 540)],
                    'An asymmetric gothic A: the apex sits on the right blade; the left leg is the sweep.'))

    # M — blade, two sweeps, a middle stem and a right stem with the N foot.
    mx = 96
    m_mid = mx + 270
    m_right = m_mid + 250
    M_sweep1 = sweep(mx, m_mid, False)
    M_sweep2 = sweep(m_mid, m_right, True)
    d.append(Design('M', ord('M'), m_right + FOOT_CLEAR,
                    [blade(mx), M_sweep1, M_sweep2],
                    [rule(mx + 112, 170, 470)],
                    'The N built twice: blade, two sweeps of the same curve, the N foot at the end.'))

    # R — blade; a bowl that returns into the blade as a hairline; a heavy leg with the foot.
    rx = 96
    R_bowl = arch(rx, rx + 300, CH, UC, 190)
    r_apex = R_bowl._pen[0]
    R_bowl.curve((r_apex + 60, CH - 31), (rx + 300, CH - 70), (rx + 300, CH - 160)) \
        .curve((rx + 300, CH - 250), (rx + 230, 420), (rx + 90, 410))
    R_leg = Stroke((rx + 150, 410), UC).curve((rx + 230, 330), (rx + 270, 150), (rx + 300, 70)) \
        .curve((rx + 320, 24), (rx + 350, 8), (rx + 400, 34))
    d.append(Design('R', ord('R'), rx + 316 + FOOT_CLEAR,
                    [blade(rx), R_bowl, R_leg],
                    [rule(rx + 132, 470, 600)],
                    'Blade + the N sweep closed back into the blade as a bowl, then a heavy leg with the shared foot.'))

    # S — the lowercase s pull, larger and with more contrast; echo hairline in the upper counter.
    S_spine = Stroke((330, CH - 96), UC) \
        .curve((310, CH + 20), (90, CH + 30), (80, CH - 140)) \
        .curve((72, CH - 260), (320, 330), (330, 180)) \
        .curve((338, 40), (150, -40), (54, 96))
    d.append(Design('S', ord('S'), 400,
                    [S_spine],
                    [rule(196, 420, 560)],
                    'The s pull at capital scale; the echo hairline stands in the upper counter.'))

    return d


def outline_hash(glyph) -> str:
    pen = RecordingPen()
    glyph.draw(pen)
    return hashlib.sha1(repr(pen.value).encode()).hexdigest()


def setup_font() -> ufoLib2.Font:
    if UFO_PATH.exists():
        return ufoLib2.Font.open(UFO_PATH)
    font = ufoLib2.Font()
    info = font.info
    info.familyName = 'Nemora Proto'
    info.styleName = 'Regular'
    info.styleMapFamilyName = 'Nemora Proto'
    info.styleMapStyleName = 'regular'
    info.versionMajor, info.versionMinor = 0, 1
    info.unitsPerEm = UPM
    info.xHeight, info.capHeight = X_HEIGHT, CAP_HEIGHT
    info.ascender, info.descender = ASCENDER, DESCENDER
    info.copyright = 'Copyright 2026 Maneesh Khandavalli'
    info.openTypeNameDesigner = 'Maneesh Khandavalli'
    info.openTypeNameDescription = (
        'Nemora Phase 1 prototype: 11 original glyphs (N n A a M m R r S s g) for design review. '
        'Not a finished typeface.'
    )
    info.postscriptFontName = 'NemoraProto-Regular'
    info.openTypeOS2TypoAscender, info.openTypeOS2TypoDescender, info.openTypeOS2TypoLineGap = ASCENDER, DESCENDER, 200
    info.openTypeHheaAscender, info.openTypeHheaDescender, info.openTypeHheaLineGap = 900, -300, 0
    info.openTypeOS2WinAscent, info.openTypeOS2WinDescent = 900, 300
    info.guidelines = [
        {'y': X_HEIGHT + OVERSHOOT, 'name': 'x-height overshoot'},
        {'y': CAP_HEIGHT + OVERSHOOT, 'name': 'cap overshoot'},
        {'y': -OVERSHOOT, 'name': 'baseline overshoot'},
    ]
    space = font.newGlyph('space')
    space.unicodes = [0x20]
    space.width = 240
    return font


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    parser.add_argument('--force', action='store_true', help='overwrite glyphs that were edited by hand')
    args = parser.parse_args()

    UFO_PATH.parent.mkdir(parents=True, exist_ok=True)
    font = setup_font()
    order = ['N', 'n', 'A', 'a', 'M', 'm', 'R', 'r', 'S', 's', 'g']
    written, kept = [], []
    for design in build_designs():
        existing = font.get(design.name)
        if existing is not None and not args.force:
            seeded = existing.lib.get('com.nemora.seedHash')
            if seeded and seeded != outline_hash(existing):
                kept.append(design.name)
                continue
        contours: list[list[Segment]] = []
        for stroke in design.strokes:
            contours += stroke_contours(stroke)
        contours += design.extras
        merged = merge(contours)

        glyph = font.get(design.name) or font.newGlyph(design.name)
        glyph.clearContours()
        glyph.unicodes = [design.unicode]
        glyph.width = round(design.advance)
        merged.draw(RoundingPen(glyph.getPen()))  # whole font units
        glyph.lib['com.nemora.status'] = 'prototype — Phase 1 construction, not final'
        glyph.lib['com.nemora.note'] = design.note
        glyph.lib['com.nemora.skeleton'] = [s.skeleton_svg() for s in design.strokes]
        glyph.lib['com.nemora.seedHash'] = outline_hash(glyph)
        written.append(design.name)

    font.glyphOrder = ['space'] + order
    font.lib['com.nemora.phase'] = 1
    font.save(UFO_PATH, overwrite=True)
    print(f'Wrote {UFO_PATH.relative_to(ROOT.parent)}')
    print('  constructed:', ' '.join(written) or '—')
    if kept:
        print('  kept (edited by hand; --force to overwrite):', ' '.join(kept))


if __name__ == '__main__':
    main()
