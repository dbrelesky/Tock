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

// ── Power-on cascade ──

function powerOnCascade(cells, periodEl, digits, period, staggerMs) {
  periodEl.textContent = period;

  return new Promise(function (resolve) {
    cells.forEach(function (cell, i) {
      setTimeout(function () {
        triggerFlip(cell, "\u2013", digits[i]);

        // Resolve after the last cell's animation finishes
        if (i === cells.length - 1) {
          var bottomFlap = cell.querySelector(".bottom-flap");
          bottomFlap.addEventListener("animationend", function onEnd() {
            bottomFlap.removeEventListener("animationend", onEnd);
            resolve();
          });
        }
      }, i * staggerMs);
    });
  });
}

// ── Tick loop ──

function startTickLoop(cells, periodEl, timeZone, showSeconds, initialDigits) {
  var prevDigits = initialDigits || null;

  function tick() {
    var time = getTimeForZone(timeZone);
    var digits = showSeconds ? time.digits : time.digits.slice(0, 4);

    if (!prevDigits) {
      // First tick without cascade: set all digits instantly
      setAllDigits(cells, digits);
      periodEl.textContent = time.period;
    } else {
      var changed = diffDigits(prevDigits, digits);
      for (var j = 0; j < changed.length; j++) {
        triggerFlip(cells[changed[j]], prevDigits[changed[j]], digits[changed[j]]);
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

// ── Day utilities ──

function getDayForZone(timeZone) {
  var now = new Date();
  var formatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: timeZone,
  });
  return formatter.format(now).toUpperCase();
}

function getDayOffset(cityTz, referenceTz) {
  var cityDay = getDayForZone(cityTz);
  var refDay = getDayForZone(referenceTz);
  return cityDay !== refDay ? cityDay : null;
}

// ── Secondary clocks config ──

var DEFAULT_CITIES = [
  { name: "NASHVILLE", tz: "America/Chicago" },
  { name: "LOS ANGELES", tz: "America/Los_Angeles" },
  { name: "AUCKLAND", tz: "Pacific/Auckland" },
  { name: "TEL AVIV", tz: "Asia/Jerusalem" },
];

// ── Settings ──

function loadSettings() {
  var stored = localStorage.getItem("tock-showSeconds");
  return stored === null ? true : stored === "true";
}

// ── Render secondary clock DOM ──

function renderSecondaryClock(container, city) {
  var clockEl = document.createElement("div");
  clockEl.className = "clock secondary";

  // City label row: label + day badge
  var labelRow = document.createElement("div");
  labelRow.className = "city-label-row";

  var label = document.createElement("span");
  label.className = "city-label";
  label.textContent = city.name;
  labelRow.appendChild(label);

  var dayBadge = document.createElement("span");
  dayBadge.className = "day-badge";
  dayBadge.style.display = "none";
  labelRow.appendChild(dayBadge);

  clockEl.appendChild(labelRow);

  var digitsContainer = document.createElement("div");
  digitsContainer.className = "clock-digits";
  clockEl.appendChild(digitsContainer);

  container.appendChild(clockEl);

  var result = renderClock(clockEl, false);
  return {
    cells: result.cells,
    periodEl: result.periodEl,
    dayBadgeEl: dayBadge,
    tz: city.tz,
    clockEl: clockEl,
  };
}

// ── Init (only runs on index.html, not test pages) ──

async function init() {
  var clockEl = document.getElementById("clock");
  if (!clockEl) return;

  var showSeconds = loadSettings();
  var primaryResult = renderClock(clockEl, showSeconds);
  var primaryCells = primaryResult.cells;
  var primaryPeriodEl = primaryResult.periodEl;

  // Render secondary clocks
  var secondaryContainer = document.getElementById("secondary-clocks");
  var secondaryClocks = [];
  for (var i = 0; i < DEFAULT_CITIES.length; i++) {
    secondaryClocks.push(renderSecondaryClock(secondaryContainer, DEFAULT_CITIES[i]));
  }

  // Get current times
  var primaryTime = getTimeForZone("America/New_York");
  var primaryDigits = showSeconds ? primaryTime.digits : primaryTime.digits.slice(0, 4);

  // Cascade primary first
  await powerOnCascade(primaryCells, primaryPeriodEl, primaryDigits, primaryTime.period, 50);

  // Cascade all secondary clocks in parallel
  var secondaryCascades = [];
  for (var i = 0; i < secondaryClocks.length; i++) {
    var sc = secondaryClocks[i];
    var time = getTimeForZone(sc.tz);
    var digits = time.digits.slice(0, 4);

    // Update day badge during cascade
    var dayOffset = getDayOffset(sc.tz, "America/New_York");
    if (dayOffset) {
      sc.dayBadgeEl.textContent = dayOffset;
      sc.dayBadgeEl.style.display = "";
    }

    secondaryCascades.push(powerOnCascade(sc.cells, sc.periodEl, digits, time.period, 50));
  }
  await Promise.all(secondaryCascades);

  // ── Unified tick loop ──
  var primaryPrev = primaryDigits;
  var secondaryPrevs = [];
  for (var i = 0; i < secondaryClocks.length; i++) {
    var time = getTimeForZone(secondaryClocks[i].tz);
    secondaryPrevs.push(time.digits.slice(0, 4));
  }

  function tick() {
    // Primary
    var pTime = getTimeForZone("America/New_York");
    var pDigits = showSeconds ? pTime.digits : pTime.digits.slice(0, 4);
    var pChanged = diffDigits(primaryPrev, pDigits);
    for (var j = 0; j < pChanged.length; j++) {
      triggerFlip(primaryCells[pChanged[j]], primaryPrev[pChanged[j]], pDigits[pChanged[j]]);
    }
    if (primaryPeriodEl.textContent !== pTime.period) {
      primaryPeriodEl.textContent = pTime.period;
    }
    primaryPrev = pDigits;

    // Secondary clocks
    for (var i = 0; i < secondaryClocks.length; i++) {
      var sc = secondaryClocks[i];
      var sTime = getTimeForZone(sc.tz);
      var sDigits = sTime.digits.slice(0, 4);
      var sChanged = diffDigits(secondaryPrevs[i], sDigits);
      for (var j = 0; j < sChanged.length; j++) {
        triggerFlip(sc.cells[sChanged[j]], secondaryPrevs[i][sChanged[j]], sDigits[sChanged[j]]);
      }
      if (sc.periodEl.textContent !== sTime.period) {
        sc.periodEl.textContent = sTime.period;
      }

      // Update day badge
      var dayOffset = getDayOffset(sc.tz, "America/New_York");
      if (dayOffset) {
        sc.dayBadgeEl.textContent = dayOffset;
        sc.dayBadgeEl.style.display = "";
      } else {
        sc.dayBadgeEl.style.display = "none";
      }

      secondaryPrevs[i] = sDigits;
    }
  }

  setInterval(tick, 1000);
}

init();
