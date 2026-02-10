"use strict";

const digit = document.getElementById("digit");
let currentValue = 0;
let isFlipping = false;

/**
 * Trigger a split-flap flip animation on a cell element.
 * @param {HTMLElement} cellEl  — the .flap-cell container
 * @param {string} oldChar      — character currently displayed
 * @param {string} newChar      — character to flip to
 */
function triggerFlip(cellEl, oldChar, newChar) {
  if (isFlipping) return;
  isFlipping = true;

  const topStatic = cellEl.querySelector(".top-static span");
  const bottomStatic = cellEl.querySelector(".bottom-static span");
  const topFlap = cellEl.querySelector(".top-flap span");
  const bottomFlap = cellEl.querySelector(".bottom-flap span");
  const bottomFlapEl = cellEl.querySelector(".bottom-flap");

  // Set up layers for the flip:
  // - top-static shows NEW char (revealed as top flap falls away)
  // - top-flap shows OLD char (the card that falls)
  // - bottom-flap shows NEW char (the card that lands)
  // - bottom-static keeps OLD char (visible until bottom flap covers it)
  topStatic.textContent = newChar;
  topFlap.textContent = oldChar;
  bottomFlap.textContent = newChar;

  // Start animations
  cellEl.classList.add("flipping");

  // Clean up when the bottom flap finishes (last animation to complete)
  bottomFlapEl.addEventListener("animationend", function onEnd() {
    bottomFlapEl.removeEventListener("animationend", onEnd);

    // Update bottom-static to new char and reset
    bottomStatic.textContent = newChar;
    cellEl.classList.remove("flipping");

    // Reset flap transforms to their resting state
    cellEl.querySelector(".top-flap").style.transform = "";
    bottomFlapEl.style.transform = "";

    // Sync top-flap text so it's ready for the next flip
    topFlap.textContent = newChar;

    isFlipping = false;
  });
}

// ── Demo timer: cycle 0 → 9 → 0 → … ──
setInterval(() => {
  const oldValue = currentValue;
  currentValue = (currentValue + 1) % 10;
  triggerFlip(digit, String(oldValue), String(currentValue));
}, 1000);
