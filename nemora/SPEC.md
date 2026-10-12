# Nemora — design specification (Phase 1)

**Status: prototype.** Eleven glyphs — `N n A a M m R r S s g` — constructed to establish
the system. They compile into a valid test font, but Nemora is **not** a finished or usable
typeface. Every outline still needs a designer's hand (see § 7).

## Intent

Blackletter drama, made calmer and contemporary: the structure and pen logic of Old
English / textura, with smoother curves, softened terminals and no ornamental excess.
Old English Text MT is a *visual* reference only — no outline is traced, imported or
derived from it or from any other font. `tools/build.py` enforces this on every build
by checking that no glyph is identical to Old English Text MT or the old Noto-based prototypes.

Character in one line: **a broad nib held at one angle, cut cleanly, with the corners softened.**

## 1 · Vertical metrics (1000 units per em)

| Line | Value | Notes |
|---|---|---|
| Ascender | 760 | for b d h k l (Phase 2) |
| Cap height | 700 | |
| x-height | 500 | 0.71 of the cap height: large, as blackletter needs to stay readable |
| Baseline | 0 | |
| Descender | −230 | g; p q y in Phase 2 |
| Overshoot | 12 | pointed and round forms pass each line by up to 12 |

These are stored in the UFO's font info, with guidelines at the overshoot lines.

## 2 · The pen

Every stroke is a centreline swept by a **broad nib held at 30°**. Thick and thin follow
from direction alone — nothing is drawn thick or thin by hand:

| | Nib width | Vertical stroke | Horizontal stroke | Stroke along the nib |
|---|---|---|---|---|
| Lowercase | 104 | **90** (stem) | 52 | hairline |
| Capitals | 124 | **107** (blade) | 62 | hairline |

- **Minimum hairline: 18.** A second, thin nib at right angles to the first keeps every
  hairline at least 18 units, so nothing breaks at small sizes.
- **Terminals are the nib's own cut** (a straight edge at 30°), softened: the acute corner
  of a cut is rounded by 0.24 × nib width (≈ 25 lowercase, 30 capitals), the obtuse corner
  by 0.05 × nib width. This is the main difference from Old English, where cuts end
  in sharp diamonds.
- **Strokes never twist.** Where a curve turns through the nib angle, it narrows to a
  true hairline at that point, which is how a real pen behaves (the tooling splits the
  stroke there automatically).

## 3 · Shared rules (the system the alphabet grows from)

1. **The minim**: the lowercase stem. A straight vertical pull, 90 wide, from x-height to
   baseline. Its two nib cuts make it **rotationally symmetric**: the head rises to a soft
   point at upper right, the foot to one at lower left. No foot serif, no diamond.
2. **The shoulder** (`arch()`): leaves a stem *from inside its body*, travelling just steeper
   than the nib so it emerges as a hairline. It crests 55 % of the way to the next stem,
   with its top edge exactly on the x-height or cap line, then turns down into that stem,
   thickening as it turns across the nib. This leaves a **notch** between the left stem's
   head and the shoulder: the signature of the lowercase. Shared by n m r a and,
   at capital scale, N M R.
3. **The blade**: the capital's main stem. One pull 107 wide, bowed gently outward on
   the left (≈ 20 units), cut by the nib top and bottom.
4. **The sweep**: the capital shoulder. The same shoulder rule at capital scale, running
   into a right stem.
5. **The foot**: a capital's last stroke ends in a short turn to the right (reaching 84
   units), cut by the nib. This is the only "flourish" allowed: **nothing extends more than
   ~0.09 em beyond a letter's body.** No swashes, no hooks, no doubled strokes.
6. **The echo hairline**: Nemora's identifying mark. Every capital carries **exactly one**
   free-standing vertical hairline (20 wide, round-ended) in the counter beside its main
   stroke. It reduces Old English's ornate internal hairlines to a single, quiet line.
7. **Spacing**:
   - Lowercase sidebearing beside a minim: 38.
   - Counter between minims: 128, about 1.4 × stem, wider than textura's for readability.
   - Capital right sidebearing after the foot: 162, measured from the stem's centreline.

   Spacing is provisional, and there is no kerning yet.

## 4 · Proportion summary

| | n | m | a | g | r | s | N | A | M | R | S |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Advance | 384 | 602 | 338 | 338 | 299 | 250 | 558 | 532 | 778 | 574 | 400 |

## 5 · The glyphs

**n**: two minims joined by one shoulder. Defines the rhythm: stem, counter, stem, all at
the same widths. Distinctive: the notch where the shoulder leaves the left stem below its head.

**m**: exactly n plus one shoulder and one minim. Its counters and shoulders are identical
to n's, by construction.

**r**: the minim and the n-shoulder cut short. After the crest it drops into a **flag**:
a heavy, softened nib cut, with no hook.

**a**: double-storey. The right side is a minim. The **roof** starts free at the left with a
near-vertical departure, so the nib lays down a weighty head, then follows the shoulder
rule into the minim's head. The **bowl** hangs on the minim: a hairline top (along the
nib), a short heavy left side, and a base that rises back into the stem.

**g**: the a-bowl closed at x-height on a minim that continues **below the baseline** and
turns back left in a short tail ending in a soft cut. It has a single storey and no lower
loop. The tail stays within the letter's width.

**s**: one continuous pull: a soft top terminal, a top arm, a **spine across the nib** (the
only heavy diagonal), a bottom arm, and a soft bottom terminal.

**N**: blade plus one sweep into a right stem that ends in the foot. The echo hairline
stands in the counter beside the blade. Relation: the capital n.

**M**: the N built twice: blade, two sweeps of the same rule, a middle stem ending
plainly on the baseline, and the foot at the end. The echo hairline sits in the first counter.

**A**: an **asymmetric gothic A**. The apex is the right blade's head. The left leg is one
bowed sweep from the apex to a soft foot, swelling as it turns across the nib. A
hairline crossbar joins them, and the echo hairline stands above it.

**R**: blade plus the sweep closed back into the blade as a **bowl**. Its return narrows to a
hairline where it passes the nib angle. Then a heavy diagonal leg ends in the shared foot.
The echo hairline sits inside the bowl.

**S**: the s pull at capital scale, with more contrast. The echo hairline stands in the
upper counter.

## 6 · Relationships to keep as the alphabet grows

- **From n:** h (minim with an ascender), u (n rotated), i (minim plus a dot made as
  a nib cut).
- **From a's bowl:** d and q.
- **From g's tail:** j and y.
- **From the a roof and bowls:** o, e, c, built from the same facets.
- **Capitals:** each takes one blade or sweep plus one echo hairline. Anything wider than
  M needs a reason.

## 7 · Known issues in the Phase 1 outlines (for the designer's pass)

- **Shoulder departure:** where the shoulder leaves the stem (n m r N M R), the merge
  leaves a small knot at large sizes. It needs hand smoothing.
- **Echo hairline:** at 20 units it nearly disappears below ~30 px. Decide: 24–28 units,
  or drop it in a future text cut.
- **Capital lean:** the blade's bow gives the capitals a slight forward lean. Confirm it's
  wanted, or straighten the blade.
- **a and g bowls:** a's bowl top crosses its counter as a straight hairline, and g's
  bowl pinches at the top left (where the stroke passes the nib angle). Both may want curving.
- **Point structure:** the merge adds a few extra points at joins. Clean these up in the
  editor before Phase 2.
- **Spacing and kerning:** spacing is provisional and there is no kerning. Capitals beside
  lowercase (R a, N a) need kerning pairs.
