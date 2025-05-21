// Starting date is May 16, 2025 (UTC)
const startDate = new Date("2025-05-16T00:00:00Z");
let currentDate = new Date();

// Force currentDate time to midnight UTC for consistency
function toMidnightUTC(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
currentDate = toMidnightUTC(currentDate);

// HTML elements
const targetEl = document.getElementById("target");
const diceContainer = document.getElementById("dice-container");
const expressionEl = document.getElementById("expression");
const resultEl = document.getElementById("live-result");
const scoreEl = document.getElementById("score-display");
const streakEl = document.getElementById("streak-display");
const perfectCountEl = document.getElementById("perfect-count-display");
const archiveEl = document.getElementById("archive");
const resultsTableBody = document.querySelector("#results-table tbody");
const gameLabel = document.getElementById("game-label");

let expression = "";
let usedDice = [];
let dice = [];

// Simple deterministic RNG based on date string
function seedRNG(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
    hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
    hash ^= hash >>> 16;
    return (hash >>> 0) / 4294967296;
  };
}

// Get game number starting at May 16 as #1
function getGameId(date) {
  const diff = Math.floor((toMidnightUTC(date) - startDate) / (1000 * 60 * 60 * 24));
  return diff + 1;
}

// Get ISO date string (yyyy-mm-dd)
function getDateKey(date) {
  const d = toMidnightUTC(date);
  return d.toISOString().split("T")[0];
}

// Generate dice and target for a given date deterministically
function getGameData(date) {
  const dateKey = getDateKey(date);
  const rng = seedRNG(dateKey);
  dice = Array.from({ length: 5 }, () => Math.floor(rng() * 6) + 1);
  const target = Math.floor(rng() * 100) + 1;
  return { dice, target };
}

// Render dice buttons
function renderDice() {
  diceContainer.innerHTML = "";
  dice.forEach((val, i) => {
    const btn = document.createElement("div");
    btn.className = `die die-${val}` + (usedDice.includes(i) ? " used" : "");
    btn.textContent = val;
    btn.onclick = () => {
      if (!usedDice.includes(i)) {
        expression += val;
        usedDice.push(i);
        updateDisplay();
      }
    };
    diceContainer.appendChild(btn);
  });
}

// Add operator or parentheses
function addOp(op) {
  expression += op;
  updateDisplay();
}

// Remove last character from expression
function backspace() {
  if (expression.length === 0) return;
  const lastChar = expression.slice(-1);
  expression = expression.slice(0, -1);
  // If lastChar was a die number, free it up
  if (/[1-6]/.test(lastChar)) {
    // Find which dice index with that value was last used
    for (let i = usedDice.length - 1; i >= 0; i--) {
      if (dice[usedDice[i]] == lastChar) {
        usedDice.splice(i, 1);
        break;
      }
    }
  }
  updateDisplay();
}

// Clear entire expression and free all dice
function clearExpression() {
  expression = "";
  usedDice = [];
  updateDisplay();
}

// Evaluate expression safely
function evaluate(expr) {
  // Disallow empty expression or starting/ending with operators improperly
  if (!expr) return null;

  // Check dice usage validity:
  // We require each dice value used exactly once, and no concatenation (no two digits adjacent)
  // So between any two digits must be an operator or parenthesis.
  // Also check all dice used once.

  // Extract digits used in expression in order:
  const digitsUsed = expr.match(/\d/g) || [];

  // Must use exactly all dice once
  const sortedDice = [...dice].sort().join("");
  const sortedDigitsUsed = [...digitsUsed].sort().join("");
  if (sortedDice !== sortedDigitsUsed) {
    return null;
  }

  // Check for invalid concatenation: no two digits adjacent without operator or parentheses
  // We'll check expr for any instance of two digits adjacent
  if (/\d\d/.test(expr)) {
    return null;
  }

  // Replace × and ÷ with * and / for eval
  let safeExpr = expr.replace(/×/g, "*").replace(/÷/g, "/");

  try {
    // eslint-disable-next-line no-eval
    let val = eval(safeExpr);
    if (typeof val !== "number" || !isFinite(val)) return null;
    return val;
  } catch {
    return null;
  }
}

// Update expression display, live result, and score
function updateDisplay() {
  expressionEl.textContent = expression;
  const val = evaluate(expression);
  if (val === null) {
    resultEl.textContent = "Invalid expression or dice usage";
    scoreEl.textContent = "";
  } else {
    // Round result to integer if close
    const rounded = Math.round(val);
    resultEl.textContent = `Result: ${rounded}`;
    const score = Math.abs(rounded - currentTarget);
    scoreEl.textContent = `Score: ${score}`;
  }
}

// Storage keys
function getStorageKey(date) {
  return `dailyDiceGame_${getDateKey(date)}`;
}

function getStreakKey() {
  return "dailyDiceGame_streak";
}

// Load and save results for current day
function loadResults(date) {
  const key = getStorageKey(date);
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}
function saveResults(date, results) {
  const key = getStorageKey(date);
  localStorage.setItem(key, JSON.stringify(results));
}

// Load streak count
function loadStreak() {
  const raw = localStorage.getItem(getStreakKey());
  return raw ? parseInt(raw) : 0;
}
function saveStreak(val) {
  localStorage.setItem(getStreakKey(), val);
}

// Render attempts table
function renderResultsTable(results) {
  resultsTableBody.innerHTML = "";
  results.forEach((r, i) => {
    const tr = document.createElement("tr");
    const exprTd = document.createElement("td");
    exprTd.textContent = r.expr;
    const resultTd = document.createElement("td");
    resultTd.textContent = r.result;
    const scoreTd = document.createElement("td");
    scoreTd.textContent = r.score;
    const indexTd = document.createElement("td");
    indexTd.textContent = i + 1;
    tr.appendChild(indexTd);
    tr.appendChild(exprTd);
    tr.appendChild(resultTd);
    tr.appendChild(scoreTd);
    resultsTableBody.appendChild(tr);
  });
}

// Render archive
function renderArchive() {
  archiveEl.innerHTML = "";
  // Load all keys that start with dailyDiceGame_
  const keys = Object.keys(localStorage).filter(k => k.startsWith("dailyDiceGame_") && !k.includes("streak"));
  // Sort keys descending (newest first)
  keys.sort((a,b) => (a < b ? 1 : -1));

  keys.forEach(k => {
    const dateStr = k.slice("dailyDiceGame_".length);
    const attempts = JSON.parse(localStorage.getItem(k));
    if (!attempts || attempts.length === 0) return;
    // Count perfect solutions for this day
    const perfectCount = attempts.filter(a => a.score === 0).length;
    // Compute game number
    const dateObj = new Date(dateStr + "T00:00:00Z");
    const gameNum = getGameId(dateObj);
    const div = document.createElement("div");
    div.className = "archive-entry" + (perfectCount > 0 ? " perfect" : "");
    div.innerHTML = `<strong>Game #${gameNum} - ${dateStr}</strong> — Perfect Solutions: ${perfectCount}<br>` +
      attempts.map(a => `${a.expr} = ${a.result} (Score: ${a.score})`).join("<br>");
    archiveEl.appendChild(div);
  });
}

// Submit expression
function submitExpression() {
  const val = evaluate(expression);
  if (val === null) {
    alert("Invalid expression or dice usage.");
    return;
  }
  const rounded = Math.round(val);
  const score = Math.abs(rounded - currentTarget);
  const results = loadResults(currentDate);

  results.push({ expr: expression, result: rounded, score });
  saveResults(currentDate, results);

  // Update perfect solutions count display
  updatePerfectCount();

  renderResultsTable(results);
  renderArchive();

  // Update streak if today is played and score=0 and streak not updated yet
  if (isToday(currentDate) && score === 0) {
    updateStreak();
  }

  // Clear for next attempt
  clearExpression();
}

// Update perfect solutions count display
function updatePerfectCount() {
  const results = loadResults(currentDate);
  const perfectCount = results.filter(r => r.score === 0).length;
  perfectCountEl.textContent = `Perfect Solutions Today: ${perfectCount}`;
}

// Update streak display
function updateStreak() {
  let streak = loadStreak();
  const lastPlayedDateStr = localStorage.getItem("dailyDiceGame_lastPlayed");
  const todayStr = getDateKey(currentDate);
  if (lastPlayedDateStr !== todayStr) {
    // Check if yesterday was played with perfect score
    if (lastPlayedDateStr) {
      const yesterday = new Date(lastPlayedDateStr + "T00:00:00Z");
      yesterday.setUTCDate(yesterday.getUTCDate() + 1);
      if (toMidnightUTC(currentDate).getTime() === toMidnightUTC(yesterday).getTime()) {
        streak++;
      } else {
        streak = 1;
      }
    } else {
      streak = 1;
    }
    saveStreak(streak);
    localStorage.setItem("dailyDiceGame_lastPlayed", todayStr);
  }
  streakEl.textContent = `Current Streak (days with perfect solution): ${streak}`;
}

// Check if given date is today UTC
function isToday(date) {
  return getDateKey(date) === getDateKey(new Date());
}

// Render buttons and everything for currentDate
let currentTarget = 0;

function renderGame() {
  const { dice: newDice, target } = getGameData(currentDate);
  dice = newDice;
  currentTarget = target;

  // Reset expression and used dice
  expression = "";
  usedDice = [];

  targetEl.textContent = target;
  renderDice();
  updateDisplay();

  // Render results for current date
  const results = loadResults(currentDate);
  renderResultsTable(results);
  updatePerfectCount();

  // Update game label with game number and date
  const gameNum = getGameId(currentDate);
  gameLabel.textContent = `Game #${gameNum} — ${getDateKey(currentDate)}`;

  // Update streak display (only for today)
  if (isToday(currentDate)) {
    updateStreak();
  } else {
    streakEl.textContent = "";
  }
}

// Navigation
function previousDay() {
  const prevDate = new Date(currentDate);
  prevDate.setUTCDate(prevDate.getUTCDate() - 1);
  if (prevDate < startDate) return; // No earlier than start date
  currentDate = prevDate;
  renderGame();
}

function nextDay() {
  const nextDate = new Date(currentDate);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  if (nextDate > toMidnightUTC(new Date())) return; // no future dates
  currentDate = nextDate;
  renderGame();
}

renderGame();
renderArchive();
