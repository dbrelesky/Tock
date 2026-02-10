# A1 Spike: Split-Flap Flip Physics

## Context

Shape A has a flagged unknown on A1 — the flap digit animation. We described *what* we want (gravity-driven hinge, acceleration, overshoot, damped snap settle) but haven't validated *how* to implement it. A single CSS `cubic-bezier` can only model a single curve — it can't express "accelerate, overshoot, bounce back." We need to determine the concrete animation mechanism.

## Goal

Identify the exact technique (CSS keyframes, JS-driven, or hybrid) and concrete implementation pattern for the split-flap animation that replicates physically accurate flap behavior.

## Questions

| # | Question |
|---|----------|
| **A1-Q1** | How does a real split-flap (Solari board) flap physically move? What's the motion profile — pure gravity fall, or does it overshoot and bounce? |
| **A1-Q2** | What is the DOM structure needed for a single flap digit? How many layers, what are they, how do they stack? |
| **A1-Q3** | Can CSS `@keyframes` alone model the full motion (fall + overshoot + settle), or is JS-driven animation (rAF / Web Animations API) required? |
| **A1-Q4** | What `transform-origin`, `perspective`, and `rotateX` values produce a convincing top-hinged flap? |
| **A1-Q5** | How is flap thickness/edge shadow rendered to sell the physical card illusion? |
| **A1-Q6** | What easing curve or keyframe percentages produce the gravity-accelerate-overshoot-settle motion? |

## Acceptance

Spike is complete when we can describe the concrete DOM structure, CSS properties, and animation technique (with specific keyframe values or easing parameters) needed to implement a physically convincing split-flap digit animation.

---

## Findings

### A1-Q1: Real physical motion profile

A split-flap card is hinged at the top of the display window. A stepper motor carries the flap up and over, then releases it. Gravity pulls it forward and down through ~180°. The motion is **asymmetric**: slow start (0–90°, fighting gravity's angular component), fast finish (90–180°, gravity accelerates the fall). At the end, the flap strikes the backstop (the stack of previous flaps) — producing the characteristic "clack." There is a **very small, heavily damped bounce** — 1–2 tiny oscillations, not a springy rebound. More like a stiff card hitting a hard stop.

### A1-Q2: DOM structure (four-layer architecture)

Every CSS split-flap uses **four layers** per character cell:

1. **Top static** — always visible behind the flaps, shows top half of the NEW character
2. **Bottom static** — shows bottom half of the OLD character (then swapped to new after animation)
3. **Top flap** (animated) — shows top half of OLD character, rotates `0° → -90°` and disappears (`backface-visibility: hidden`)
4. **Bottom flap** (animated) — shows bottom half of NEW character, rotates `90° → 0°` (falls into place)

A thin dark line between the halves simulates the hinge gap.

### A1-Q3: CSS @keyframes vs JS

**CSS `@keyframes` is sufficient** for the individual flap rotation including overshoot and settle. A single `cubic-bezier` cannot do overshoot (bezier is monotonic in time), but multi-stage keyframes can. JS is useful for **orchestration** (cycling through intermediate characters, staggering columns) but not needed for the rotation itself. CSS animations run on the compositor thread = better perf.

### A1-Q4: transform-origin, perspective, rotateX

```
Container:  perspective: 300–500px (on parent, not on flap)
Top flap:   transform-origin: 50% 100%  (hinge at bottom edge of top half)
            rotates: 0deg → -90deg
Bottom flap: transform-origin: 50% 0%   (hinge at top edge of bottom half)
             rotates: 90deg → 0deg
Both flaps: backface-visibility: hidden
```

### A1-Q5: Flap thickness / edge shadow

- **Hinge gap**: 2px dark line via `::after` pseudo-element on the cell
- **Cast shadow**: During flip, animate a semi-transparent overlay on the bottom-static layer (shadow appears as top flap falls, fades as bottom flap lands)
- **Lighting shift**: Animate the flap background from lighter to slightly darker during rotation to simulate angle-relative lighting
- **Edge highlight**: Optional 1px `box-shadow` on flap edges

### A1-Q6: Concrete keyframe values

**Top flap** (falling away): `ease-in` / `cubic-bezier(0.42, 0, 1, 1)`, duration 300ms

**Bottom flap** (landing with overshoot):
```css
@keyframes flip-bottom {
  0%   { transform: rotateX(90deg);  }   /* hidden, folded up */
  70%  { transform: rotateX(-3deg);  }   /* overshoot past flat */
  85%  { transform: rotateX(1.5deg); }   /* tiny bounce back */
  100% { transform: rotateX(0deg);   }   /* settle flat */
}
```
- Duration: 300ms, starts at 40–50% delay after top flap begins
- `ease-out` overall, with the keyframe percentages encoding the settle

**Timing summary:**

| Parameter | Value |
|-----------|-------|
| Total flip duration | 250–400ms |
| Top flap easing | `ease-in` (gravity: slow start, fast end) |
| Bottom flap easing | multi-stage keyframes (fast arrival, overshoot, settle) |
| Bottom flap delay | 40–50% of total duration |
| Overshoot | -2° to -5° past flat |
| Bounce-back | 1°–2° |
| Inter-character stagger | 20–50ms |

---

## Conclusion

**A1 is resolved.** The mechanism is: multi-stage CSS `@keyframes` with the four-layer DOM architecture. Top flap uses `ease-in` to model gravity acceleration. Bottom flap uses explicit keyframe percentages to model overshoot (-3°) and single bounce-back (1.5°). No JS needed for the rotation itself — CSS compositor handles it. JS orchestrates the tick loop and character updates.
