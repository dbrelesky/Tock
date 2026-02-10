# Tock

A split-flap clock inspired by Solari departure boards. Pure HTML, CSS, and JavaScript — no build step, no dependencies.

## Features

- **Primary clock** — Large NYC display with hours, minutes, and optional seconds in 12-hour format
- **Secondary clocks** — Configurable world clocks stacked below (defaults: Nashville, Los Angeles, Auckland, Tel Aviv)
- **Split-flap animation** — CSS 3D transforms with gravity-driven hinge physics: ease-in fall, overshoot, bounce settle
- **Power-on rattle** — On load, digits cycle through rapid random characters before bouncing into place with staggered timing per clock
- **Day-of-week badge** — Appears on secondary clocks when their date differs from NYC
- **Pulsing colons** — Subtle opacity pulse on colon separators
- **Admin panel** — Gear icon opens a settings overlay to toggle seconds display, add/remove cities, and select from common IANA timezones
- **Persistence** — City list and seconds preference saved to localStorage
- **Sound** — Synthesized mechanical clack via Web Audio API on each flap flip

## Getting Started

No install required. Serve the files with any static server:

```bash
python3 -m http.server 3000
```

Open [http://localhost:3000](http://localhost:3000).

Or just open `index.html` directly in a browser.

## Project Structure

```
index.html       — Page shell, admin panel markup
styles.css       — Dark theme, flap cell geometry, animations, admin UI
flap.js          — Clock logic, flip engine, rattle cascade, admin wiring
tests/           — Browser-based test suites (98 tests)
  flap-tests.html
  clock-tests.html
  cascade-tests.html
  secondary-tests.html
  admin-tests.html
```

## Running Tests

Serve the project and open any test file in a browser:

```bash
python3 -m http.server 3000
# then visit http://localhost:3000/tests/flap-tests.html (etc.)
```

## How It Works

Each digit is a **four-layer flap cell**:

1. **Top static** — reveals the new character behind the falling flap
2. **Bottom static** — shows the old character until the new flap lands
3. **Top flap** — hinged at its bottom edge, falls away via `rotateX(0 → -90deg)`
4. **Bottom flap** — hinged at its top edge, swings into place via `rotateX(90deg → 0)` with overshoot and bounce

A single `setInterval(1000)` tick loop drives all clocks. Each tick diffs the previous digits against current time and only flips cells that changed.

## License

MIT
