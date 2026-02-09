# Tock — Shaping

## Source

> I want to build a simple clock web app that shows me the local time in NYC primarily. Below that clock I want several other clocks of the same style for different cities/time zones (Nashville, TN; Los Angeles, CA; Auckland, New Zealand; Tel Aviv, Israel). They should stay current on time, be quick to load and reference those time zones at a glance so I know what time it is for co-workers before I call them. I would like the theme to be dark. I would like the time to flip like an old school airport terminal board. It should have a control to turn the seconds display on the large clock off, but subtly out of the way as to not ruin the interface design. Take note in your execution of the animation detail as the board numbers flip - want to apply the proper physics to replicate the true behavior of this style system IRL.

---

## Frame

### Problem

- Need to quickly check what time it is for co-workers in multiple time zones before connecting with them
- No at-a-glance tool that shows NYC (primary) alongside Nashville, LA, Auckland, and Tel Aviv

### Outcome

- Open a page and immediately see NYC time prominently, with secondary city clocks below
- All clocks stay current in real-time
- The interface feels like a physical split-flap display — not a cartoon imitation

---

## Requirements (R)

| ID | Requirement | Status |
|----|-------------|--------|
| R0 | NYC time displayed prominently as the primary clock | Core goal |
| R1 | 🟡 Secondary clocks for configurable cities visible below primary (default: Nashville, Los Angeles, Auckland, Tel Aviv) | Core goal |
| R2 | All clocks update in real-time — stay current to the second | Must-have |
| R3 | Dark theme throughout | Must-have |
| R4 | Split-flap / flip-board animation aesthetic (airport terminal style) | Must-have |
| R5 | Flip animation uses physically accurate motion: gravity-driven hinge, acceleration, overshoot, snap settle | Must-have |
| R6 | 🟡 Seconds display on primary clock can be toggled off via admin area | Must-have |
| R7 | 🟡 Admin area is hidden from the main clock view — does not disrupt the display | Must-have |
| R8 | Fast to load — minimal dependencies, quick to first render | Must-have |
| R9 | 🟡 Can add new city/timezone from admin area | Must-have |
| R10 | 🟡 Can remove a city/timezone from admin area | Must-have |
| R11 | 🟡 City list persists across page reloads (localStorage) | Must-have |
| R12 | 🟡 No more than ~6 secondary locations expected at a time | Nice-to-have |

---

## A: Split-Flap Clock App (Configurable Cities, Pure CSS/JS)

🟡 Single HTML/CSS/JS app. No framework. Configurable city list stored in localStorage. Split-flap animation built from CSS 3D transforms with physics-tuned easing. Timezone math via `Intl.DateTimeFormat`. Hidden admin panel for managing cities and settings.

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **A1** | 🟡 **Flap digit** — four-layer DOM per character: two static halves (new char top, old char bottom) + two animated flaps. Top flap (old char top half) hinges at bottom edge (`transform-origin: 50% 100%`), rotates `0° → -90°` with `ease-in` timing (gravity acceleration). Bottom flap (new char bottom half) hinges at top edge (`transform-origin: 50% 0%`), rotates `90° → 0°` via multi-stage `@keyframes`: 70% → overshoot -3°, 85% → bounce-back 1.5°, 100% → settle at 0°. Container has `perspective: 300–500px`. Both flaps use `backface-visibility: hidden`. Hinge gap is 2px dark line. Cast shadow animates on bottom-static during flip. Duration ~300ms, bottom flap delayed 40–50%. See `spike-flip-physics.md`. | |
| **A2** | **Clock assembly** — groups flap digits into `HH : MM (: SS)`. Colon separators styled as fixed flap cards. Each assembly takes a `timeZone` string (IANA) and a `showSeconds` boolean. Uses `Intl.DateTimeFormat` with `timeZone` option to derive current h/m/s. Registers a tick callback (see A5) that updates only the digits that changed. | |
| **A3** | **Primary NYC display** — large clock assembly (`timeZone: 'America/New_York'`), city label "NEW YORK" above or below in a terminal-style font. | |
| **A4** | 🟡 **Secondary clocks row** — smaller clock assemblies in a row/grid below primary, rendered from a dynamic city list. Each shows city label + time (no seconds). Default cities: Nashville `America/Chicago`, Los Angeles `America/Los_Angeles`, Auckland `Pacific/Auckland`, Tel Aviv `Asia/Jerusalem`. List is read from localStorage on load; falls back to defaults if empty. | |
| **A5** | **Tick loop** — single `setInterval(1000)` drives all clock assemblies. Each tick, every assembly reads current time for its timezone via `Intl.DateTimeFormat`, diffs against previous digits, and triggers flap animations only on changed digits. No per-clock timers. | |
| **A6** | **Dark shell** — dark background (`#1a1a1a` or similar), minimal page chrome, monospace/terminal font (e.g., system mono or a web-safe equivalent to keep load fast). Layout: primary clock centered top, secondary clocks row centered below with even spacing. Responsive: stacks vertically on narrow screens. | |
| **A7** | 🟡 **Admin panel** — hidden drawer/overlay toggled by a subtle trigger (e.g., gear icon in corner, or tap a hidden hotspot). Contains: (1) seconds toggle for primary clock, (2) city list with remove buttons, (3) add-city input (city name + IANA timezone picker or autocomplete). Changes persist to localStorage immediately. Panel slides in/out without disrupting clock layout. | |

---

## Fit Check (R × A)

| Req | Requirement | Status | A |
|-----|-------------|--------|---|
| R0 | NYC time displayed prominently as the primary clock | Core goal | ✅ |
| R1 | 🟡 Secondary clocks for configurable cities visible below primary (default: Nashville, Los Angeles, Auckland, Tel Aviv) | Core goal | ✅ |
| R2 | All clocks update in real-time — stay current to the second | Must-have | ✅ |
| R3 | Dark theme throughout | Must-have | ✅ |
| R4 | Split-flap / flip-board animation aesthetic (airport terminal style) | Must-have | ✅ |
| R5 | Flip animation uses physically accurate motion: gravity-driven hinge, acceleration, overshoot, snap settle | Must-have | 🟡 ✅ |
| R6 | 🟡 Seconds display on primary clock can be toggled off via admin area | Must-have | ✅ |
| R7 | 🟡 Admin area is hidden from the main clock view — does not disrupt the display | Must-have | ✅ |
| R8 | Fast to load — minimal dependencies, quick to first render | Must-have | ✅ |
| R9 | 🟡 Can add new city/timezone from admin area | Must-have | ✅ |
| R10 | 🟡 Can remove a city/timezone from admin area | Must-have | ✅ |
| R11 | 🟡 City list persists across page reloads (localStorage) | Must-have | ✅ |
| R12 | 🟡 No more than ~6 secondary locations expected at a time | Nice-to-have | ✅ |

**Notes:**
- 🟡 R5 now passes: A1 spike resolved. Mechanism is multi-stage CSS `@keyframes` with gravity `ease-in` on top flap, overshoot/bounce keyframes on bottom flap. See `spike-flip-physics.md`.
- R6, R7, R9, R10 satisfied by A7 (admin panel).
- R11 satisfied by A4 reading from localStorage + A7 writing to it.
- R12 is a soft constraint — layout in A4 handles up to ~6 naturally in a row/grid.

---

## Coverage Check (A × R)

Parts as rows, requirements as columns. Shows which parts satisfy which requirements.

| Part | R0 NYC primary | R1 Config cities | R2 Real-time | R3 Dark | R4 Flip aesthetic | R5 Flip physics | R6 Seconds toggle | R7 Hidden admin | R8 Fast load | R9 Add city | R10 Remove city | R11 Persist | R12 ~6 max |
|------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| **A1** Flap digit | | | | | ✅ | ✅ | | | | | | | |
| **A2** Clock assembly | | | ✅ | | ✅ | | | | | | | | |
| **A3** Primary NYC | ✅ | | | | | | | | | | | | |
| **A4** Secondary row | | ✅ | | | | | | | | | | ✅ | ✅ |
| **A5** Tick loop | | | ✅ | | | | | | ✅ | | | | |
| **A6** Dark shell | | | | ✅ | | | | | ✅ | | | | |
| **A7** Admin panel | | | | | | | ✅ | ✅ | | ✅ | ✅ | ✅ | |
