"use strict";

// ── Core flip animation (proven in V1, now per-cell) ──

function triggerFlip(cellEl, oldChar, newChar) {
  if (cellEl.dataset.flipping === "true") return;
  cellEl.dataset.flipping = "true";

  const topStatic = cellEl.querySelector(".top-static span");
  const bottomStatic = cellEl.querySelector(".bottom-static span");
  const topFlap = cellEl.querySelector(".top-flap span");
  const bottomFlap = cellEl.querySelector(".bottom-flap span");
  const bottomFlapEl = cellEl.querySelector(".bottom-flap");

  topStatic.textContent = newChar;
  topFlap.textContent = oldChar;
  bottomFlap.textContent = newChar;

  cellEl.classList.add("flipping");

  bottomFlapEl.addEventListener("animationend", function onEnd() {
    bottomFlapEl.removeEventListener("animationend", onEnd);

    bottomStatic.textContent = newChar;
    cellEl.classList.remove("flipping");

    cellEl.querySelector(".top-flap").style.transform = "";
    bottomFlapEl.style.transform = "";

    topFlap.textContent = newChar;

    delete cellEl.dataset.flipping;
  });
}

// ── Time utilities ──

function getTimeForZone(timeZone) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: timeZone,
  });

  const parts = {};
  for (const { type, value } of formatter.formatToParts(now)) {
    parts[type] = value;
  }

  const h = parts.hour;   // "01"–"12"
  const m = parts.minute;  // "00"–"59"
  const s = parts.second;  // "00"–"59"
  const period = parts.dayPeriod || parts.dayperiod || "AM";

  // Replace leading zero on hour with space for 12-hour display
  const h10 = h[0] === "0" ? "\u2007" : h[0]; // figure space for alignment
  const h1 = h[1];

  return {
    digits: [h10, h1, m[0], m[1], s[0], s[1]],
    period: period.toUpperCase(),
  };
}

function diffDigits(prevDigits, currentDigits) {
  if (!prevDigits) {
    return currentDigits.map((_, i) => i);
  }
  const changed = [];
  for (let i = 0; i < currentDigits.length; i++) {
    if (prevDigits[i] !== currentDigits[i]) {
      changed.push(i);
    }
  }
  return changed;
}

// ── Clock assembly ──

function createFlapCell() {
  const cell = document.createElement("div");
  cell.className = "flap-cell";
  cell.innerHTML =
    '<div class="half top-static"><span>\u2013</span></div>' +
    '<div class="half bottom-static"><span>\u2013</span></div>' +
    '<div class="flap top-flap"><span>\u2013</span></div>' +
    '<div class="flap bottom-flap"><span>\u2013</span></div>';
  return cell;
}

function renderClock(clockEl, showSeconds) {
  const digitsContainer = clockEl.querySelector(".clock-digits");
  digitsContainer.innerHTML = "";

  const cells = [];

  // H10, H1
  for (let i = 0; i < 2; i++) {
    const cell = createFlapCell();
    digitsContainer.appendChild(cell);
    cells.push(cell);
  }

  // Colon
  const colon1 = document.createElement("div");
  colon1.className = "colon-separator";
  colon1.textContent = ":";
  digitsContainer.appendChild(colon1);

  // M10, M1
  for (let i = 0; i < 2; i++) {
    const cell = createFlapCell();
    digitsContainer.appendChild(cell);
    cells.push(cell);
  }

  if (showSeconds) {
    // Colon
    const colon2 = document.createElement("div");
    colon2.className = "colon-separator";
    colon2.textContent = ":";
    digitsContainer.appendChild(colon2);

    // S10, S1
    for (let i = 0; i < 2; i++) {
      const cell = createFlapCell();
      digitsContainer.appendChild(cell);
      cells.push(cell);
    }
  }

  // AM/PM label
  const periodEl = document.createElement("div");
  periodEl.className = "period-label";
  digitsContainer.appendChild(periodEl);

  return { cells, periodEl };
}

function setAllDigits(cells, digits) {
  for (let i = 0; i < cells.length; i++) {
    const char = digits[i] || "\u2013";
    cells[i].querySelector(".top-static span").textContent = char;
    cells[i].querySelector(".bottom-static span").textContent = char;
    cells[i].querySelector(".top-flap span").textContent = char;
    cells[i].querySelector(".bottom-flap span").textContent = char;
  }
}

function startTickLoop(cells, periodEl, timeZone, showSeconds) {
  let prevDigits = null;

  function tick() {
    const time = getTimeForZone(timeZone);
    const digits = showSeconds ? time.digits : time.digits.slice(0, 4);

    if (!prevDigits) {
      // First tick: set all digits instantly (no animation)
      setAllDigits(cells, digits);
      periodEl.textContent = time.period;
    } else {
      const changed = diffDigits(prevDigits, digits);
      for (const i of changed) {
        triggerFlip(cells[i], prevDigits[i], digits[i]);
      }
      if (periodEl.textContent !== time.period) {
        periodEl.textContent = time.period;
      }
    }

    prevDigits = digits;
  }

  tick();
  setInterval(tick, 1000);
}

// ── Settings ──

function loadSettings() {
  const stored = localStorage.getItem("tock-showSeconds");
  return stored === null ? true : stored === "true";
}

// ── Init (only runs on index.html, not test pages) ──

function init() {
  const clockEl = document.getElementById("clock");
  if (!clockEl) return;

  const showSeconds = loadSettings();
  const { cells, periodEl } = renderClock(clockEl, showSeconds);
  startTickLoop(cells, periodEl, "America/New_York", showSeconds);
}

init();
