// DAILY DICE GAME - script.js

// Colors for dice as per horse racing numbers:
// 1: red, 2: white (black text), 3: navy blue, 4: yellow, 5: green, 6: black w/ yellow text
const diceColors = {
   1: "number-1",
   2: "number-2",
   3: "number-3",
   4: "number-4",
   5: "number-5",
   6: "number-6",
};

// State object to hold game data
const state = {
  dice: [],
  usedDiceIndices: new Set(),
  expression: "",
  archive: {},  // { 'YYYY-MM-DD': { target: number, attempts: [{expression, result, score}] } }
  streak: 0,
};

// Utilities
function formatDate(date = new Date()) {
  // Eastern time conversion (UTC-4 or UTC-5)
  // Use Intl.DateTimeFormat with timeZone option for accurate eastern time
  const options = { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" };
  const parts = new Intl.DateTimeFormat("en-US", options).formatToParts(date);
  const y = parts.find(p => p.type === "year").value;
  const m = parts.find(p => p.type === "month").value;
  const d = parts.find(p => p.type === "day").value;
  return `${y}-${m}-${d}`;
}

function shuffleArray(arr) {
  // Fisher-Yates shuffle
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function generateDice() {
  // Generate 5 dice, each 1 to 6
  const dice = [];
  for (let i = 0; i < 5; i++) {
    dice.push(Math.floor(Math.random() * 6) + 1);
  }
  return dice;
}

function generateTarget(dice, dateStr) {
  // Generate a target based on dice and date string
  // We want a deterministic number 1..100 per day, can incorporate dice sum for flavor

  // Hash function: sum of date chars + sum dice, mod 100 +1
  let sum = 0;
  for (let ch of dateStr) sum += ch.charCodeAt(0);
  const diceSum = dice.reduce((a,b) => a+b, 0);
  sum += diceSum * 7; // weight dice sum more

  return (sum % 100) + 1;
}

function renderDice() {
  const diceContainer = document.getElementById("dice-container");
  diceContainer.innerHTML = "";

  state.dice.forEach((value, idx) => {
    const span = document.createElement("span");
    span.classList.add("horse-race-die", diceColors[value]);
    span.textContent = value;

    if (state.usedDiceIndices.has(idx)) {
      span.classList.add("used");
    } else {
      span.onclick = () => addDieToExpression(idx);
      span.title = "Click to use this die";
    }

    diceContainer.appendChild(span);
  });
}

function addDieToExpression(dieIdx) {
  if (state.usedDiceIndices.has(dieIdx)) return; // already used

  // Append die value to expression with validation
  if (canAddNumberToExpression()) {
    state.expression += state.dice[dieIdx];
    state.usedDiceIndices.add(dieIdx);
    updateExpressionAndResult();
  }
}

function canAddNumberToExpression() {
  // Prevent concatenation of dice values (e.g. "3" then "4" directly)
  // Expression must not end with a digit before adding a new digit.
  if (state.expression.length === 0) return true;
  const lastChar = state.expression[state.expression.length - 1];
  return !(/\d/.test(lastChar));
}

function addOp(op) {
  // Validate operator insertion
  if (state.expression.length === 0) {
    // only allow '(' at start
    if (op === "(") {
      state.expression += op;
      updateExpressionAndResult();
    }
    return;
  }

  const lastChar = state.expression[state.expression.length - 1];

  // Prevent two operators or operator after '(' except ')'
  if ("+-*/".includes(op)) {
    // allow if last char is a digit or ')'
    if (/\d/.test(lastChar) || lastChar === ")") {
      state.expression += op;
      updateExpressionAndResult();
    }
  } else if (op === "(") {
    // allow after operator or '(' at start
    if ("+-*/(".includes(lastChar)) {
      state.expression += op;
      updateExpressionAndResult();
    }
  } else if (op === ")") {
    // allow if expression has more '(' than ')' and last char is digit or ')'
    if (canCloseParen()) {
      state.expression += op;
      updateExpressionAndResult();
    }
  }
}

function canCloseParen() {
  // Check if there are unmatched '('
  let openCount = 0, closeCount = 0;
  for (const ch of state.expression) {
    if (ch === "(") openCount++;
    if (ch === ")") closeCount++;
  }
  if (openCount <= closeCount) return false;

  // Check last char is digit or ')'
  const lastChar = state.expression[state.expression.length - 1];
  return /\d/.test(lastChar) || lastChar === ")";
}

function backspace() {
  if (state.expression.length === 0) return;

  const lastChar = state.expression[state.expression.length - 1];
  state.expression = state.expression.slice(0, -1);

  // If lastChar was a die number, find which die and mark unused
  if (/\d/.test(lastChar)) {
    // find rightmost die with that value in usedDiceIndices to remove usage
    // but we must identify the exact die index by the sequence they were added
    // We don't track order so will just remove one matching die index currently used.

    // We find the last used die index for that value and remove usage
    for (let i = state.dice.length - 1; i >= 0; i--) {
      if (state.dice[i] == Number(lastChar) && state.usedDiceIndices.has(i)) {
        state.usedDiceIndices.delete(i);
        break;
      }
    }
  }

  updateExpressionAndResult();
}

function clearExpression() {
  state.expression = "";
  state.usedDiceIndices.clear();
  updateExpressionAndResult();
}

function evalExpression(expr) {
  // Safely evaluate expression
  try {
    // disallow any characters except digits, + - * / ( )
    if (!/^[\d+\-*/()\s]+$/.test(expr)) return null;
    const val = Function(`"use strict";return (${expr})`)();
    if (typeof val === "number" && !isNaN(val) && isFinite(val)) {
      return val;
    }
    return null;
  } catch {
    return null;
  }
}

function updateExpressionAndResult() {
  const exprInput = document.getElementById("expression");
  const liveResult = document.getElementById("live-result");
  const scoreDisplay = document.getElementById("score-display");

  exprInput.value = state.expression;

  const val = evalExpression(state.expression);
  if (val === null) {
    liveResult.textContent = "Invalid expression";
    scoreDisplay.textContent = "-";
  } else {
    liveResult.textContent = `Result: ${val}`;
    // Calculate score
    const diff = Math.abs(val - state.target);
    scoreDisplay.textContent = diff.toFixed(3);
  }

  renderDice();
}

function submitExpression() {
  if (state.usedDiceIndices.size !== state.dice.length) {
    alert("You must use all dice exactly once.");
    return;
  }

  const val = evalExpression(state.expression);
  if (val === null) {
    alert("Invalid expression. Please check your syntax.");
    return;
  }

  // Calculate score = absolute difference
  const diff = Math.abs(val - state.target);

  // Save attempt to archive
  const today = formatDate();
  if (!state.archive[today]) {
    state.archive[today] = { target: state.target, attempts: [] };
  }

  // Save attempt object
  const attempt = {
    expression: state.expression,
    result: Number(val.toFixed(6)),
    score: Number(diff.toFixed(6)),
    timestamp: Date.now(),
  };

  state.archive[today].attempts.push(attempt);

  // Update streak: if score === 0, increase; else reset
  if (diff === 0) {
    if (state.streakLastDay === today) {
      state.streak++;
    } else {
      // check if streak is consecutive day
      const yesterday = getDateOffset(-1);
      if (state.streakLastDay === yesterday) {
        state.streak++;
      } else {
        state.streak = 1;
      }
    }
    state.streakLastDay = today;
  } else {
    if (state.streakLastDay !== today) {
      state.streak = 0;
      state.streakLastDay = today;
    }
  }

  saveState();
  renderArchive();
  clearExpression();
  updateStreakDisplay();

  alert(`Submitted! Your score is ${attempt.score}.`);
}

function renderArchive() {
  const archiveEl = document.getElementById("archive");
  archiveEl.innerHTML = "";

  // Sort dates descending (newest first)
  const dates = Object.keys(state.archive).sort((a, b) => (a < b ? 1 : -1));
  for (const date of dates) {
    const dayData = state.archive[date];
    const dayDiv = document.createElement("div");
    dayDiv.classList.add("archive-day");

    const header = document.createElement("h4");
    header.textContent = `${date} (Target: ${dayData.target})`;
    dayDiv.appendChild(header);

    const attemptsList = document.createElement("ul");
    for (const attempt of dayData.attempts) {
      const li = document.createElement("li");
      li.textContent = `${attempt.expression} = ${attempt.result} (score: ${attempt.score})`;
      attemptsList.appendChild(li);
    }
    dayDiv.appendChild(attemptsList);
    archiveEl.appendChild(dayDiv);
  }
}

function updateStreakDisplay() {
  const streakEl = document.getElementById("streak");
  streakEl.textContent = `Current Streak: ${state.streak}`;
}

function saveState() {
  localStorage.setItem("dailyDiceGameState", JSON.stringify({
    archive: state.archive,
    streak: state.streak,
    streakLastDay: state.streakLastDay,
  }));
}

function loadState() {
  const saved = localStorage.getItem("dailyDiceGameState");
  if (saved) {
    const obj = JSON.parse(saved);
    state.archive = obj.archive || {};
    state.streak = obj.streak || 0;
    state.streakLastDay = obj.streakLastDay || null;
  }
}

function getDateOffset(offset) {
  // Return date string offset days from today in eastern time
  const now = new Date();
  const options = { timeZone: "America/New_York" };
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const estTime = new Date(utc + -5 * 3600000);
  estTime.setDate(estTime.getDate() + offset);
  return formatDate(estTime);
}

function initGame() {
  loadState();

  const today = formatDate();
  if (state.archive[today]) {
    state.target = state.archive[today].target;
  } else {
    state.dice = generateDice();
    state.target = generateTarget(state.dice, today);
  }

  renderDice();
  updateExpressionAndResult();
  renderArchive();
  updateStreakDisplay();
}

// Event listeners for buttons
document.addEventListener("DOMContentLoaded", () => {
  initGame();

  document.getElementById("btn-submit").onclick = submitExpression;
  document.getElementById("btn-clear").onclick = clearExpression;
  document.getElementById("btn-backspace").onclick = backspace;

  // Operator buttons
  document.querySelectorAll(".btn-op").forEach(button => {
    button.onclick = () => addOp(button.textContent);
  });
});
</script>
</body>
</html>
