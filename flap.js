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

function getHour24ForZone(timeZone) {
  var now = new Date();
  var formatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone: timeZone,
  });
  var h = parseInt(formatter.format(now), 10);
  // Intl may return 24 for midnight in some locales — normalize to 0
  return h === 24 ? 0 : h;
}

// ── Period label color gradient ──
// Maps each hour of the 24-hour day to a subtle color for the AM/PM label.
// Daytime (6–17): warm tones — soft gold → amber → muted rust
// Nighttime (18–5): cool tones — slate blue → navy → soft indigo

var PERIOD_COLORS = [
  /* 00 */ "#7b6e9b",  // midnight — muted lavender
  /* 01 */ "#7a6d9e",  // deep lavender
  /* 02 */ "#786ba0",  // purple-blue
  /* 03 */ "#6e6a9e",  // indigo hint
  /* 04 */ "#6a6fa0",  // pre-dawn blue-violet
  /* 05 */ "#7080a3",  // dawn horizon — blue lifting
  /* 06 */ "#c8b878",  // sunrise — soft gold
  /* 07 */ "#ccbc70",  // morning gold
  /* 08 */ "#d0be68",  // warm yellow
  /* 09 */ "#d4be60",  // bright morning gold
  /* 10 */ "#d6b858",  // golden amber
  /* 11 */ "#d8b050",  // warm amber
  /* 12 */ "#d4a64a",  // noon — rich amber
  /* 13 */ "#d09e48",  // afternoon amber
  /* 14 */ "#cc9646",  // deepening amber
  /* 15 */ "#c48e44",  // late afternoon
  /* 16 */ "#bc8442",  // golden hour approach
  /* 17 */ "#b07a40",  // dusk — muted rust
  /* 18 */ "#8a7a8e",  // twilight — warm grey-violet
  /* 19 */ "#7e7894",  // evening settling
  /* 20 */ "#787698",  // deepening dusk
  /* 21 */ "#74749c",  // night blue-violet
  /* 22 */ "#7472a0",  // deep evening
  /* 23 */ "#7870a0",  // late night violet
];

function getPeriodColor(hour24) {
  return PERIOD_COLORS[hour24] || PERIOD_COLORS[0];
}

function applyPeriodColor(periodEl, timeZone) {
  var h = getHour24ForZone(timeZone);
  periodEl.style.color = getPeriodColor(h);
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

// ── Power-on rattle (rapid random digits → ease → settle) ──

var RATTLE_CHARS = "0123456789";
// Intervals between each random character — fast start, easing slower
var RATTLE_INTERVALS = [25, 28, 32, 38, 48, 62, 82, 110, 150];

function rattleCell(cell, targetChar) {
  return new Promise(function (resolve) {
    var step = 0;

    function setAllLayers(ch) {
      cell.querySelector(".top-static span").textContent = ch;
      cell.querySelector(".bottom-static span").textContent = ch;
      cell.querySelector(".top-flap span").textContent = ch;
      cell.querySelector(".bottom-flap span").textContent = ch;
    }

    function next() {
      if (step < RATTLE_INTERVALS.length) {
        var ch = RATTLE_CHARS[Math.floor(Math.random() * RATTLE_CHARS.length)];
        setAllLayers(ch);
        var delay = RATTLE_INTERVALS[step];
        step++;
        setTimeout(next, delay);
      } else {
        // Final flip with animation to land on the real digit
        // Tag cell so CSS uses the bouncier rattle-settle keyframes
        cell.classList.add("rattle-settle");
        var current = cell.querySelector(".top-static span").textContent;
        triggerFlip(cell, current, targetChar);
        var bf = cell.querySelector(".bottom-flap");
        bf.addEventListener("animationend", function onEnd() {
          bf.removeEventListener("animationend", onEnd);
          cell.classList.remove("rattle-settle");
          resolve();
        });
      }
    }

    next();
  });
}

function powerOnRattle(cells, periodEl, digits, period, cellStaggerMs) {
  periodEl.textContent = period;

  var promises = [];
  for (var i = 0; i < cells.length; i++) {
    (function (idx) {
      promises.push(new Promise(function (resolve) {
        setTimeout(function () {
          rattleCell(cells[idx], digits[idx]).then(resolve);
        }, idx * cellStaggerMs);
      }));
    })(i);
  }

  return Promise.all(promises);
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

// ── Weather SVG icons (monochromatic outline/line-art) ──

function getWeatherSVG(type) {
  var style = 'stroke="#e0d8b0" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"';
  switch (type) {
    case "sun":
      return '<svg width="12" height="12" viewBox="0 0 24 24" ' + style + '>' +
        '<circle cx="12" cy="12" r="5"/>' +
        '<line x1="12" y1="1" x2="12" y2="3"/>' +
        '<line x1="12" y1="21" x2="12" y2="23"/>' +
        '<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>' +
        '<line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>' +
        '<line x1="1" y1="12" x2="3" y2="12"/>' +
        '<line x1="21" y1="12" x2="23" y2="12"/>' +
        '<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>' +
        '<line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>' +
        '</svg>';
    case "cloud":
      return '<svg width="12" height="12" viewBox="0 0 24 24" ' + style + '>' +
        '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>' +
        '</svg>';
    case "cloud-sun":
      return '<svg width="12" height="12" viewBox="0 0 24 24" ' + style + '>' +
        '<path d="M17 18a5 5 0 0 0 0-10h-1.26a8 8 0 1 0-4.74 9"/>' +
        '<circle cx="18" cy="7" r="3"/>' +
        '<line x1="18" y1="1" x2="18" y2="2"/>' +
        '<line x1="22" y1="7" x2="23" y2="7"/>' +
        '<line x1="20.83" y1="3.17" x2="21.54" y2="2.46"/>' +
        '</svg>';
    case "rain":
      return '<svg width="12" height="12" viewBox="0 0 24 24" ' + style + '>' +
        '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>' +
        '<line x1="8" y1="19" x2="7" y2="22"/>' +
        '<line x1="12" y1="19" x2="11" y2="22"/>' +
        '<line x1="16" y1="19" x2="15" y2="22"/>' +
        '</svg>';
    case "snow":
      return '<svg width="12" height="12" viewBox="0 0 24 24" ' + style + '>' +
        '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>' +
        '<line x1="8" y1="20" x2="8" y2="20.01"/>' +
        '<line x1="12" y1="20" x2="12" y2="20.01"/>' +
        '<line x1="16" y1="20" x2="16" y2="20.01"/>' +
        '<line x1="10" y1="22" x2="10" y2="22.01"/>' +
        '<line x1="14" y1="22" x2="14" y2="22.01"/>' +
        '</svg>';
    case "thunderstorm":
      return '<svg width="12" height="12" viewBox="0 0 24 24" ' + style + '>' +
        '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>' +
        '<polyline points="13 16 11 20 15 20 13 24"/>' +
        '</svg>';
    default:
      return "";
  }
}

function getWeatherIcon(wmoCode) {
  if (wmoCode <= 1) return "sun";
  if (wmoCode === 2) return "cloud-sun";
  if (wmoCode === 3) return "cloud";
  if (wmoCode >= 45 && wmoCode <= 48) return "cloud"; // fog
  if (wmoCode >= 51 && wmoCode <= 67) return "rain";
  if (wmoCode >= 71 && wmoCode <= 77) return "snow";
  if (wmoCode >= 80 && wmoCode <= 82) return "rain";
  if (wmoCode >= 85 && wmoCode <= 86) return "snow";
  if (wmoCode >= 95 && wmoCode <= 99) return "thunderstorm";
  return "cloud"; // fallback
}

function cToF(tempC) {
  return Math.round(tempC * 9 / 5 + 32);
}

// ── Weather API ──

function geocodeCity(name) {
  var url = "https://geocoding-api.open-meteo.com/v1/search?name=" +
    encodeURIComponent(name) + "&count=1&language=en";
  return fetch(url)
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.results && data.results.length > 0) {
        return { lat: data.results[0].latitude, lon: data.results[0].longitude };
      }
      return null;
    });
}

function fetchWeather(lat, lon) {
  var url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat +
    "&longitude=" + lon + "&current=temperature_2m,weather_code&temperature_unit=celsius";
  return fetch(url)
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.current) {
        return {
          tempC: data.current.temperature_2m,
          weatherCode: data.current.weather_code,
        };
      }
      return null;
    });
}

// ── Weather cache ──

var weatherCache = {};

function getWeatherCacheEntry(cityName) {
  return weatherCache[cityName] || null;
}

function isWeatherStale(entry) {
  if (!entry || !entry.fetchedAt) return true;
  return (Date.now() - entry.fetchedAt) > 30 * 60 * 1000;
}

function fetchAndCacheWeather(cityName) {
  var entry = weatherCache[cityName];

  // If we have coords cached, skip geocoding
  var coordsPromise;
  if (entry && entry.lat != null && entry.lon != null) {
    coordsPromise = Promise.resolve({ lat: entry.lat, lon: entry.lon });
  } else {
    coordsPromise = geocodeCity(cityName);
  }

  return coordsPromise.then(function (coords) {
    if (!coords) return null;
    return fetchWeather(coords.lat, coords.lon).then(function (weather) {
      if (!weather) return null;
      weatherCache[cityName] = {
        lat: coords.lat,
        lon: coords.lon,
        tempC: weather.tempC,
        weatherCode: weather.weatherCode,
        fetchedAt: Date.now(),
      };
      return weatherCache[cityName];
    });
  }).catch(function (err) {
    console.warn("Weather fetch failed for " + cityName + ":", err);
    return null;
  });
}

function refreshAllWeather(cityNames, onUpdate) {
  var promises = [];
  for (var i = 0; i < cityNames.length; i++) {
    (function (name) {
      promises.push(
        fetchAndCacheWeather(name).then(function () {
          if (onUpdate) onUpdate(name);
        })
      );
    })(cityNames[i]);
  }
  return Promise.all(promises);
}

// ── Weather display ──

function updateWeatherDisplay(containerEl, cityName, useCelsius) {
  if (!containerEl) return;
  var weatherInfoEl = containerEl.querySelector(".weather-info");

  var entry = getWeatherCacheEntry(cityName);
  if (!entry || entry.tempC == null) {
    if (weatherInfoEl) weatherInfoEl.style.display = "none";
    return;
  }

  if (!weatherInfoEl) {
    weatherInfoEl = document.createElement("span");
    weatherInfoEl.className = "weather-info";
    // Insert before day badge if it exists, otherwise append
    var dayBadge = containerEl.querySelector(".day-badge");
    if (dayBadge) {
      containerEl.insertBefore(weatherInfoEl, dayBadge);
    } else {
      containerEl.appendChild(weatherInfoEl);
    }
  }

  var iconType = getWeatherIcon(entry.weatherCode);
  var temp = useCelsius ? Math.round(entry.tempC) : cToF(entry.tempC);
  var unit = useCelsius ? "\u00b0" : "\u00b0";

  weatherInfoEl.style.display = "";
  weatherInfoEl.innerHTML =
    '<span class="weather-icon">' + getWeatherSVG(iconType) + '</span>' +
    '<span class="weather-temp">' + temp + unit + '</span>';
}

// ── Temperature unit persistence ──

function loadUseCelsius() {
  return localStorage.getItem("tock-useCelsius") === "true";
}

function saveUseCelsius(val) {
  localStorage.setItem("tock-useCelsius", String(val));
}

// ── Secondary clocks config ──

var DEFAULT_CITIES = [
  { name: "NASHVILLE", tz: "America/Chicago" },
  { name: "LOS ANGELES", tz: "America/Los_Angeles" },
  { name: "AUCKLAND", tz: "Pacific/Auckland" },
  { name: "TEL AVIV", tz: "Asia/Jerusalem" },
];

// ── Settings & persistence ──

function loadShowSeconds() {
  var stored = localStorage.getItem("tock-showSeconds");
  return stored === null ? true : stored === "true";
}

function saveShowSeconds(val) {
  localStorage.setItem("tock-showSeconds", String(val));
}

function loadCities() {
  var stored = localStorage.getItem("tock-cities");
  if (stored) {
    try {
      var parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) { /* fall through */ }
  }
  return DEFAULT_CITIES.slice();
}

function saveCities(cities) {
  localStorage.setItem("tock-cities", JSON.stringify(cities));
}

// Kept for backward compat with tests
function loadSettings() {
  return loadShowSeconds();
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
    labelRow: labelRow,
    tz: city.tz,
    name: city.name,
    clockEl: clockEl,
  };
}

// ── Common IANA timezones for datalist ──

var COMMON_TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Anchorage", "Pacific/Honolulu", "America/Phoenix", "America/Toronto",
  "America/Vancouver", "America/Mexico_City", "America/Bogota", "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires", "America/Santiago", "Europe/London", "Europe/Paris",
  "Europe/Berlin", "Europe/Madrid", "Europe/Rome", "Europe/Amsterdam",
  "Europe/Stockholm", "Europe/Moscow", "Europe/Istanbul", "Africa/Cairo",
  "Africa/Johannesburg", "Africa/Lagos", "Asia/Dubai", "Asia/Kolkata",
  "Asia/Bangkok", "Asia/Singapore", "Asia/Hong_Kong", "Asia/Shanghai",
  "Asia/Tokyo", "Asia/Seoul", "Asia/Jerusalem", "Asia/Taipei",
  "Australia/Sydney", "Australia/Melbourne", "Australia/Perth",
  "Pacific/Auckland", "Pacific/Fiji",
];

// ── Admin panel logic ──

function openAdmin() {
  var overlay = document.getElementById("admin-overlay");
  if (overlay) overlay.classList.add("open");
}

function closeAdmin() {
  var overlay = document.getElementById("admin-overlay");
  if (overlay) overlay.classList.remove("open");
}

function renderCityList(cities, onRemove) {
  var list = document.getElementById("admin-city-list");
  if (!list) return;
  list.innerHTML = "";
  for (var i = 0; i < cities.length; i++) {
    (function (idx) {
      var item = document.createElement("div");
      item.className = "admin-city-item";

      var nameSpan = document.createElement("span");
      nameSpan.className = "admin-city-name";
      nameSpan.textContent = cities[idx].name;

      var tzSpan = document.createElement("span");
      tzSpan.className = "admin-city-tz";
      tzSpan.textContent = cities[idx].tz;

      var info = document.createElement("span");
      info.style.display = "flex";
      info.style.alignItems = "center";
      info.appendChild(nameSpan);
      info.appendChild(tzSpan);

      var removeBtn = document.createElement("button");
      removeBtn.className = "admin-city-remove";
      removeBtn.textContent = "\u00d7";
      removeBtn.setAttribute("aria-label", "Remove " + cities[idx].name);
      removeBtn.addEventListener("click", function () {
        onRemove(idx);
      });

      item.appendChild(info);
      item.appendChild(removeBtn);
      list.appendChild(item);
    })(i);
  }
}

function populateTimezoneList() {
  var datalist = document.getElementById("tz-list");
  if (!datalist) return;
  for (var i = 0; i < COMMON_TIMEZONES.length; i++) {
    var opt = document.createElement("option");
    opt.value = COMMON_TIMEZONES[i];
    datalist.appendChild(opt);
  }
}

// ── Init (only runs on index.html, not test pages) ──

var _tickInterval = null;
var _weatherInterval = null;

function buildAndStart(clockEl, secondaryContainer, showSeconds, cities, animate) {
  // Clear previous tick loop
  if (_tickInterval) {
    clearInterval(_tickInterval);
    _tickInterval = null;
  }
  // Clear previous weather interval
  if (_weatherInterval) {
    clearInterval(_weatherInterval);
    _weatherInterval = null;
  }

  var useCelsius = loadUseCelsius();

  // Re-render primary
  clockEl.querySelector(".clock-digits").innerHTML = "";
  var primaryResult = renderClock(clockEl, showSeconds);
  var primaryCells = primaryResult.cells;
  var primaryPeriodEl = primaryResult.periodEl;

  // Re-render secondary clocks
  secondaryContainer.innerHTML = "";
  var secondaryClocks = [];
  for (var i = 0; i < cities.length; i++) {
    secondaryClocks.push(renderSecondaryClock(secondaryContainer, cities[i]));
  }

  // Get current times
  var primaryTime = getTimeForZone("America/New_York");
  var primaryDigits = showSeconds ? primaryTime.digits : primaryTime.digits.slice(0, 4);

  var primaryPrev = primaryDigits;
  var secondaryPrevs = [];
  for (var i = 0; i < secondaryClocks.length; i++) {
    var time = getTimeForZone(secondaryClocks[i].tz);
    secondaryPrevs.push(time.digits.slice(0, 4));
  }

  if (animate) {
    // Rattle animation
    var primaryRattle = powerOnRattle(primaryCells, primaryPeriodEl, primaryDigits, primaryTime.period, 40);
    applyPeriodColor(primaryPeriodEl, "America/New_York");

    var CLOCK_STAGGER_MS = 150;
    var allRattles = [primaryRattle];

    for (var i = 0; i < secondaryClocks.length; i++) {
      (function (idx) {
        allRattles.push(new Promise(function (resolve) {
          setTimeout(function () {
            var sc = secondaryClocks[idx];
            var t = getTimeForZone(sc.tz);
            var d = t.digits.slice(0, 4);
            var dayOffset = getDayOffset(sc.tz, "America/New_York");
            if (dayOffset) {
              sc.dayBadgeEl.textContent = dayOffset;
              sc.dayBadgeEl.style.display = "";
            }
            applyPeriodColor(sc.periodEl, sc.tz);
            powerOnRattle(sc.cells, sc.periodEl, d, t.period, 40).then(resolve);
          }, 200 + idx * CLOCK_STAGGER_MS);
        }));
      })(i);
    }

    Promise.all(allRattles).then(function () {
      startTick();
    });
  } else {
    // Instant set (no animation — used on settings change)
    setAllDigits(primaryCells, primaryDigits);
    primaryPeriodEl.textContent = primaryTime.period;
    applyPeriodColor(primaryPeriodEl, "America/New_York");
    for (var i = 0; i < secondaryClocks.length; i++) {
      var sc = secondaryClocks[i];
      var t = getTimeForZone(sc.tz);
      var d = t.digits.slice(0, 4);
      setAllDigits(sc.cells, d);
      sc.periodEl.textContent = t.period;
      applyPeriodColor(sc.periodEl, sc.tz);
      var dayOffset = getDayOffset(sc.tz, "America/New_York");
      if (dayOffset) {
        sc.dayBadgeEl.textContent = dayOffset;
        sc.dayBadgeEl.style.display = "";
      }
    }
    startTick();
  }

  function startTick() {
    function tick() {
      var pTime = getTimeForZone("America/New_York");
      var pDigits = showSeconds ? pTime.digits : pTime.digits.slice(0, 4);
      var pChanged = diffDigits(primaryPrev, pDigits);
      for (var j = 0; j < pChanged.length; j++) {
        triggerFlip(primaryCells[pChanged[j]], primaryPrev[pChanged[j]], pDigits[pChanged[j]]);
      }
      if (primaryPeriodEl.textContent !== pTime.period) {
        primaryPeriodEl.textContent = pTime.period;
      }
      applyPeriodColor(primaryPeriodEl, "America/New_York");
      primaryPrev = pDigits;

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
        applyPeriodColor(sc.periodEl, sc.tz);
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

    _tickInterval = setInterval(tick, 1000);
  }

  // ── Weather integration ──
  var primaryLabelRow = clockEl.querySelector(".city-label-row") || document.getElementById("primary-label-row");
  var allCityNames = ["NEW YORK"];
  for (var i = 0; i < cities.length; i++) {
    allCityNames.push(cities[i].name);
  }

  function updateAllWeatherDisplays() {
    var celsius = loadUseCelsius();
    updateWeatherDisplay(primaryLabelRow, "NEW YORK", celsius);
    for (var i = 0; i < secondaryClocks.length; i++) {
      updateWeatherDisplay(secondaryClocks[i].labelRow, secondaryClocks[i].name, celsius);
    }
  }

  // Initial fetch + display
  refreshAllWeather(allCityNames, function () {
    updateAllWeatherDisplays();
  });

  // Refresh every 30 minutes
  _weatherInterval = setInterval(function () {
    refreshAllWeather(allCityNames, function () {
      updateAllWeatherDisplays();
    });
  }, 30 * 60 * 1000);
}

function init() {
  var clockEl = document.getElementById("clock");
  if (!clockEl) return;

  var secondaryContainer = document.getElementById("secondary-clocks");
  var showSeconds = loadShowSeconds();
  var cities = loadCities();

  // Initial build with rattle animation
  buildAndStart(clockEl, secondaryContainer, showSeconds, cities, true);

  // ── Admin panel wiring ──
  var trigger = document.getElementById("admin-trigger");
  var closeBtn = document.getElementById("admin-close");
  var overlay = document.getElementById("admin-overlay");
  var toggleSecondsEl = document.getElementById("toggle-seconds");
  var addCityBtn = document.getElementById("add-city-btn");
  var addNameInput = document.getElementById("add-city-name");
  var addTzInput = document.getElementById("add-city-tz");

  var toggleCelsiusEl = document.getElementById("toggle-celsius");

  if (!trigger) return; // not on index.html

  populateTimezoneList();

  // Set initial toggle state
  toggleSecondsEl.checked = showSeconds;
  toggleCelsiusEl.checked = loadUseCelsius();

  // Render initial city list
  renderCityList(cities, removeCity);

  // Open/close
  trigger.addEventListener("click", openAdmin);
  closeBtn.addEventListener("click", closeAdmin);
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeAdmin();
  });

  // Toggle seconds
  toggleSecondsEl.addEventListener("change", function () {
    showSeconds = toggleSecondsEl.checked;
    saveShowSeconds(showSeconds);
    buildAndStart(clockEl, secondaryContainer, showSeconds, cities, false);
  });

  // Toggle celsius
  toggleCelsiusEl.addEventListener("change", function () {
    saveUseCelsius(toggleCelsiusEl.checked);
    // Update weather displays without full rebuild
    var celsius = toggleCelsiusEl.checked;
    var primaryLabelRow = document.getElementById("primary-label-row");
    updateWeatherDisplay(primaryLabelRow, "NEW YORK", celsius);
    var secondaryLabels = secondaryContainer.querySelectorAll(".city-label-row");
    for (var i = 0; i < secondaryLabels.length; i++) {
      var cityName = secondaryLabels[i].querySelector(".city-label").textContent;
      updateWeatherDisplay(secondaryLabels[i], cityName, celsius);
    }
  });

  // Remove city
  function removeCity(idx) {
    cities.splice(idx, 1);
    saveCities(cities);
    renderCityList(cities, removeCity);
    buildAndStart(clockEl, secondaryContainer, showSeconds, cities, false);
  }

  // Add city
  addCityBtn.addEventListener("click", function () {
    var name = addNameInput.value.trim();
    var tz = addTzInput.value.trim();
    if (!name || !tz) return;

    // Validate timezone
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
    } catch (e) {
      addTzInput.style.borderColor = "#d44";
      setTimeout(function () { addTzInput.style.borderColor = ""; }, 1500);
      return;
    }

    cities.push({ name: name.toUpperCase(), tz: tz });
    saveCities(cities);
    addNameInput.value = "";
    addTzInput.value = "";
    renderCityList(cities, removeCity);
    buildAndStart(clockEl, secondaryContainer, showSeconds, cities, false);
  });

  // Allow Enter key in add-city inputs
  addNameInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") addCityBtn.click();
  });
  addTzInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") addCityBtn.click();
  });
}

init();
