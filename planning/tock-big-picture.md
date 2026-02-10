# Tock — Big Picture

**Selected shape:** A (Split-Flap Clock App — Configurable Cities, Pure CSS/JS)

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

## Shape

### Fit Check (R × A)

| Req | Requirement | Status | A |
|-----|-------------|--------|---|
| R0 | NYC time displayed prominently as the primary clock | Core goal | ✅ |
| R1 | Secondary clocks for configurable cities visible below primary (default: Nashville, Los Angeles, Auckland, Tel Aviv) | Core goal | ✅ |
| R2 | All clocks update in real-time — stay current to the second | Must-have | ✅ |
| R3 | Dark theme throughout | Must-have | ✅ |
| R4 | Split-flap / flip-board animation aesthetic (airport terminal style) | Must-have | ✅ |
| R5 | Flip animation uses physically accurate motion: gravity-driven hinge, acceleration, overshoot, snap settle | Must-have | ✅ |
| R6 | Seconds display on primary clock can be toggled off via admin area | Must-have | ✅ |
| R7 | Admin area is hidden from the main clock view — does not disrupt the display | Must-have | ✅ |
| R8 | Fast to load — minimal dependencies, quick to first render | Must-have | ✅ |
| R9 | Can add new city/timezone from admin area | Must-have | ✅ |
| R10 | Can remove a city/timezone from admin area | Must-have | ✅ |
| R11 | City list persists across page reloads (localStorage) | Must-have | ✅ |
| R12 | No more than ~6 secondary locations expected at a time | Nice-to-have | ✅ |
| R13 | 12-hour format with AM/PM indicator | Must-have | ✅ |
| R14 | Day-of-week shown for cities where the date differs from NYC (e.g., Auckland showing "TUE") | Must-have | ✅ |
| R15 | City labels displayed in ALL CAPS | Must-have | ✅ |
| R16 | Power-on cascade animation on page load/refresh — flaps flip into place as if the board is starting up | Must-have | ✅ |
| R17 | AM/PM label color gradient — hour-based warm/cool tones per location. Daytime (6–17): gold→amber→rust. Nighttime (18–5): blue→navy→indigo. | Must-have | ✅ |

### Parts

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **A1** | **Flap digit** — four-layer DOM per character. Top flap rotates `0° → -90°` with `ease-in` (gravity). Bottom flap rotates `90° → 0°` via multi-stage keyframes: overshoot -3°, bounce-back 1.5°, settle. `perspective: 300–500px`, `backface-visibility: hidden`. Hinge gap + cast shadow. ~300ms duration. | |
| **A2** | **Clock assembly** — groups flap digits into `HH : MM (: SS)` in 12-hour format. AM/PM indicator as smaller flap pair. `Intl.DateTimeFormat` with `hour12: true`. Only flips digits that changed. | |
| **A3** | **Primary NYC display** — large clock assembly (`America/New_York`), "NEW YORK" label in ALL CAPS. | |
| **A4** | **Secondary clocks row** — smaller assemblies from dynamic city list. ALL CAPS labels. Day-of-week badge when date differs from NYC. Defaults: Nashville, LA, Auckland, Tel Aviv. Reads from localStorage. | |
| **A5** | **Tick loop** — single `setInterval(1000)` drives all assemblies. Diffs digits, triggers flaps on change only. | |
| **A6** | **Dark shell** — dark background, terminal font, centered layout. Responsive stacking on narrow screens. | |
| **A7** | **Admin panel** — hidden drawer via gear icon. Seconds toggle, city list with remove, add-city input with timezone selector. Persists to localStorage. | |
| **A8** | **Power-on cascade** — on load, all digits flip from blank to current values with staggered 30–80ms delays. Primary first, then secondary. |
| **A9** | **Period color gradient** — `PERIOD_COLORS[0..23]` maps each hour to a hex color. `getHour24ForZone(tz)` + `applyPeriodColor(periodEl, tz)` sets inline color on AM/PM labels. Warm tones for day (6–17), cool tones for night (18–5). | |

### Breadboard

```mermaid
flowchart TB
    subgraph P1["P1: Clock Display"]
        subgraph primaryClock["primary-clock"]
            U3["U3: city label NEW YORK"]
            U1["U1: time digits HH:MM:SS"]
            U4["U4: colon separators"]
            U2["U2: AM/PM"]
        end

        subgraph secondaryClock["secondary-clock (×N)"]
            U7["U7: city label ALL CAPS"]
            U8["U8: day-of-week badge"]
            U5["U5: time digits HH:MM"]
            U6["U6: AM/PM"]
        end

        U9["U9: admin trigger"]

        N1["N1: init()"]
        N2["N2: loadSettings()"]
        N3["N3: renderClocks()"]
        N7["N7: powerOnCascade()"]
        N8["N8: startTickLoop()"]
        N9["N9: setInterval(1000)"]
        N4["N4: getTimeForZone(tz)"]
        N5["N5: diffDigits()"]
        N6["N6: triggerFlip()"]
        N10["N10: getDayOffset()"]
        N11["N11: prevDigits"]
    end

    subgraph P2["P2: Admin Panel"]
        U10["U10: seconds toggle"]
        U11["U11: city list"]
        U12["U12: remove city btn"]
        U13["U13: city name input"]
        U14["U14: timezone selector"]
        U15["U15: add city btn"]
        U16["U16: close btn"]

        N12["N12: toggleSeconds()"]
        N13["N13: removeCity()"]
        N14["N14: addCity()"]
    end

    subgraph stores["DATA STORES"]
        S1["S1: localStorage:cityList"]
        S2["S2: localStorage:showSeconds"]
    end

    %% Init flow
    N1 --> N2
    N1 --> N3
    N1 --> N7
    N1 --> N8
    N2 -.-> S1
    N2 -.-> S2

    %% Render flow
    N3 --> U1
    N3 --> U2
    N3 --> U3
    N3 --> U4
    N3 --> U5
    N3 --> U6
    N3 --> U7

    %% Power-on
    N7 --> N6

    %% Tick flow
    N8 --> N9
    N9 --> N4
    N9 --> N10
    N4 -.-> N5
    N11 -.-> N5
    N5 --> N6
    N6 --> U1
    N6 --> U5
    N10 -.-> U8

    %% Navigation
    U9 --> P2
    U16 --> P1

    %% Admin actions
    U10 --> N12
    U12 --> N13
    U15 --> N14
    N12 --> S2
    N12 --> N3
    N13 --> S1
    N13 --> N3
    N14 --> S1
    N14 --> N3
    S1 -.-> U11

    classDef ui fill:#ffb6c1,stroke:#d87093,color:#000
    classDef nonui fill:#d3d3d3,stroke:#808080,color:#000
    classDef store fill:#e6e6fa,stroke:#9370db,color:#000

    class U1,U2,U3,U4,U5,U6,U7,U8,U9,U10,U11,U12,U13,U14,U15,U16 ui
    class N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N11,N12,N13,N14 nonui
    class S1,S2 store
```

**Legend:**
- **Pink nodes (U)** = UI affordances (things users see/interact with)
- **Grey nodes (N)** = Code affordances (methods, stores, timers)
- **Lavender nodes (S)** = Data stores (localStorage)
- **Solid lines** = Wires Out (calls, triggers, writes)
- **Dashed lines** = Returns To (reads, return values)

---

## Slices

### Sliced Breadboard

```mermaid
flowchart TB
    subgraph slice1["V1: FLAP DIGIT PROOF"]
        N6_v1["N6: triggerFlip()"]
    end

    subgraph slice2["V2: PRIMARY NYC CLOCK"]
        subgraph primaryClock_v2["primary-clock"]
            U3_v2["U3: city label NEW YORK"]
            U1_v2["U1: time digits HH:MM:SS"]
            U4_v2["U4: colon separators"]
            U2_v2["U2: AM/PM"]
        end
        N1_v2["N1: init()"]
        N2_v2["N2: loadSettings()"]
        N3_v2["N3: renderClocks()"]
        N8_v2["N8: startTickLoop()"]
        N9_v2["N9: setInterval(1000)"]
        N4_v2["N4: getTimeForZone()"]
        N5_v2["N5: diffDigits()"]
        N11_v2["N11: prevDigits"]
    end

    subgraph slice3["V3: POWER-ON CASCADE"]
        N7_v3["N7: powerOnCascade()"]
    end

    subgraph slice4["V4: SECONDARY CLOCKS"]
        subgraph secondaryClock_v4["secondary-clock (×N)"]
            U7_v4["U7: city label ALL CAPS"]
            U8_v4["U8: day-of-week badge"]
            U5_v4["U5: time digits HH:MM"]
            U6_v4["U6: AM/PM"]
        end
        N10_v4["N10: getDayOffset()"]
    end

    subgraph slice5["V5: ADMIN PANEL"]
        U9_v5["U9: admin trigger"]
        U10_v5["U10: seconds toggle"]
        U11_v5["U11: city list"]
        U12_v5["U12: remove city btn"]
        U13_v5["U13: city name input"]
        U14_v5["U14: timezone selector"]
        U15_v5["U15: add city btn"]
        U16_v5["U16: close btn"]
        N12_v5["N12: toggleSeconds()"]
        N13_v5["N13: removeCity()"]
        N14_v5["N14: addCity()"]
        S1_v5["S1: localStorage:cityList"]
        S2_v5["S2: localStorage:showSeconds"]
    end

    %% Cross-slice wiring
    N1_v2 --> N2_v2
    N1_v2 --> N3_v2
    N1_v2 --> N8_v2
    N1_v2 --> N7_v3
    N3_v2 --> U1_v2
    N3_v2 --> U2_v2
    N3_v2 --> U3_v2
    N3_v2 --> U5_v4
    N3_v2 --> U7_v4
    N8_v2 --> N9_v2
    N9_v2 --> N4_v2
    N9_v2 --> N10_v4
    N4_v2 -.-> N5_v2
    N11_v2 -.-> N5_v2
    N5_v2 --> N6_v1
    N6_v1 --> U1_v2
    N6_v1 --> U5_v4
    N7_v3 --> N6_v1
    N10_v4 -.-> U8_v4
    U9_v5 --> U10_v5
    U10_v5 --> N12_v5
    U12_v5 --> N13_v5
    U15_v5 --> N14_v5
    N12_v5 --> S2_v5
    N12_v5 --> N3_v2
    N13_v5 --> S1_v5
    N13_v5 --> N3_v2
    N14_v5 --> S1_v5
    N14_v5 --> N3_v2
    S1_v5 -.-> U11_v5
    N2_v2 -.-> S1_v5
    N2_v2 -.-> S2_v5

    %% Force slice ordering
    slice1 ~~~ slice2
    slice2 ~~~ slice3
    slice3 ~~~ slice4
    slice4 ~~~ slice5

    %% Slice styling
    style slice1 fill:#e8f5e9,stroke:#4caf50,stroke-width:2px
    style slice2 fill:#e3f2fd,stroke:#2196f3,stroke-width:2px
    style slice3 fill:#fff3e0,stroke:#ff9800,stroke-width:2px
    style slice4 fill:#f3e5f5,stroke:#9c27b0,stroke-width:2px
    style slice5 fill:#fff8e1,stroke:#ffc107,stroke-width:2px

    style primaryClock_v2 fill:transparent,stroke:#888,stroke-width:1px
    style secondaryClock_v4 fill:transparent,stroke:#888,stroke-width:1px

    classDef ui fill:#ffb6c1,stroke:#d87093,color:#000
    classDef nonui fill:#d3d3d3,stroke:#808080,color:#000
    classDef store fill:#e6e6fa,stroke:#9370db,color:#000

    class U1_v2,U2_v2,U3_v2,U4_v2,U5_v4,U6_v4,U7_v4,U8_v4,U9_v5,U10_v5,U11_v5,U12_v5,U13_v5,U14_v5,U15_v5,U16_v5 ui
    class N1_v2,N2_v2,N3_v2,N4_v2,N5_v2,N6_v1,N7_v3,N8_v2,N9_v2,N10_v4,N11_v2,N12_v5,N13_v5,N14_v5 nonui
    class S1_v5,S2_v5 store
```

### Slices Grid

|  |  |  |
|:--|:--|:--|
| **V1: FLAP DIGIT PROOF**<br>✅ DONE<br><br>• Four-layer DOM structure<br>• CSS 3D `@keyframes` with physics<br>• Gravity ease-in, overshoot, bounce settle<br>• Hinge gap + cast shadow<br><br>*Demo: Single digit flips with Solari-accurate physics* | **V2: PRIMARY NYC CLOCK**<br>✅ DONE<br><br>• Clock assembly HH:MM:SS<br>• 12h format + AM/PM flaps<br>• `Intl.DateTimeFormat` tick loop<br>• Diff digits, flip only changes<br><br>*Demo: NYC clock shows real time, digits flip each second* | **V3: POWER-ON CASCADE**<br>✅ DONE<br><br>• Digits start blank on load<br>• Staggered flip 30–80ms offsets<br>• Left-to-right, primary first<br>• • &nbsp;<br><br>*Demo: Refresh — digits rattle into place like a board powering on* |
| **V4: SECONDARY CLOCKS**<br>✅ DONE<br><br>• 4 smaller clock assemblies<br>• ALL CAPS city labels<br>• Day-of-week badge (date differs from NYC)<br>• Hardcoded default cities<br><br>*Demo: NYC large + 4 cities below, Auckland shows "TUE"* | **V5: ADMIN PANEL**<br>✅ DONE<br><br>• Hidden gear-icon drawer<br>• Seconds toggle for primary clock<br>• Add/remove cities<br>• localStorage persistence<br><br>*Demo: Toggle seconds, add London, remove Nashville, refresh — persists* | **V6: PERIOD COLOR GRADIENT**<br>✅ DONE<br><br>• 24-hour color mapping array<br>• Daytime: gold→amber→rust<br>• Nighttime: blue→navy→indigo<br>• Per-location based on local hour<br><br>*Demo: NYC warm amber PM, Auckland cool lavender AM — visible simultaneously* |
