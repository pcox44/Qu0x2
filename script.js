"use strict";

const DICE_COUNT = 5;
const MIN_DIE = 1;
const MAX_DIE = 6;
const TARGET_MIN = 1;
const TARGET_MAX = 100;
const MAX_ARCHIVE_DAYS = 30;

const state = {
  dice: [],
  usedDiceIndices: new Set(),
  expression: "",
  target: 0,
  archive: {}, // { "YYYY-MM-DD": [ { expression, result, score } ] }
  streak: 0,
};

// Utility: format date string YYYY-MM-DD
function formatDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

// Generate random dice values 1-6
function generateDice() {
  let dice = [];
  for (let i = 0; i < DICE_COUNT; i++) {
    dice.push(Math.floor(Math.random() * (MAX_DIE - MIN_DIE + 1)) + MIN_DIE);
  }
  return dice;
}

// Generate random target 1-100
function generateTarget() {
  return Math.floor(Math.random() * (TARGET_MAX - TARGET_MIN + 1)) + TARGET_MIN;
}

// Evaluate expression safely - returns null if invalid
function safeEval(expr) {
  try {
    // Disallow letters and disallowed characters just in case
    if (/[^0-9+\-*/().\s]/.test(expr)) return null;
    // Evaluate using Function constructor for safety (no globals)
    const func = new Function("return " + expr);
    let val = func();
    if (typeof val !== "number" || !isFinite(val)) return null;
    return val;
  } catch {
    return null;
  }
}

// Check if dice values are all used exactly once and no concatenation
function validateExpression(expr, dice, usedDiceIndices) {
  // Remove whitespace
  const cleanedExpr = expr.replace(/\s+/g, "");

  // Tokenize expr into numbers and operators, must have operator or parenthesis between each number
  // Numbers must be exactly one digit matching dice values (no concatenation)
  // Check dice usage matches dice array, order not important

  // Split expression into tokens of digits and operators/parentheses
  // Example: "1+2*(3+4)-5" => tokens: ['1', '+', '2', '*', '(', '3', '+', '4', ')', '-', '5']
  const tokens = cleanedExpr.match(/\d+|[+\-*/()]/g);
  if (!tokens) return false;

  // Check numbers are single digits (no multi-digit)
  for (let t of tokens) {
    if (/\d/.test(t)) {
      if (t.length > 1) return false; // no multi-digit numbers allowed
    }
  }

  // Check dice usage count
  const usedDice = [];
  tokens.forEach((t) => {
    if (/^\d$/.test(t)) usedDice.push(Number(t));
  });

  // Sort and compare dice used vs dice array
  usedDice.sort((a, b) => a - b);
  const sortedDice = [...dice].sort((a, b) => a - b);

  if (usedDice.length !== dice.length) return false;

  for (let i = 0; i < dice.length; i++) {
    if (usedDice[i] !== sortedDice[i]) return false;
  }

  // Check no two numbers are adjacent without operator/parenthesis in between
  // For that, check tokens sequence: no two digits side by side
  for (let i = 0; i < tokens.length - 1; i++) {
    if (/^\d$/.test(tokens[i]) && /^\d$/.test(tokens[i + 1])) {
      return false; // two numbers directly adjacent = concatenation
    }
  }

  // Check parentheses balanced
  let parenCount = 0;
  for (let t of tokens) {
    if (t === "(") parenCount++;
    else if (t === ")") {
      parenCount--;
      if (parenCount < 0) return false;
    }
  }
  if (parenCount !== 0) return false;

  return true;
}

// Round to nearest int, no decimals
function roundInt(n) {
  return Math.round(n);
}

// Render dice buttons
function renderDice() {
  const diceButtons = document.getElementById("dice-buttons");
  diceButtons.innerHTML = "";

  state.dice.forEach((val, i) => {
    const btn = document.createElement("button");
    btn.className = "dice";
    btn.textContent = val;

    if (state.usedDiceIndices.has(i)) {
      btn.classList.add("used");
      btn.disabled = true;
    } else {
      btn.disabled = false;
      btn.onclick = () => {
        addNumber(val, i);
      };
    }

    // Add horse race style numbers (small below)
    const hrSpan = document.createElement("span");
    hrSpan.textContent = i + 1;
    hrSpan.style.position = "absolute";
    hrSpan.style.bottom = "4px";
    hrSpan.style.right = "6px";
    hrSpan.style.fontSize = "0.6rem";
    hrSpan.style.color = "rgba(0,0,0,0.3)";
    btn.style.position = "relative";
    btn.appendChild(hrSpan);

    diceButtons.appendChild(btn);
  });
}

// Render operators (enable/disable if needed)
function renderOperators() {
  // Operators are always enabled here (user can build any expression)
  // Just no real dice concatenation allowed when submitting
  // So no disabling needed for operators
}

// Add number to expression (from dice)
function addNumber(val, idx) {
  // Add digit only if dice idx not used
  if (state.usedDiceIndices.has(idx)) return;

  // Append number to expression
  state.expression += val.toString();
  state.usedDiceIndices.add(idx);
  updateExpression();
  renderDice();
}

// Add operator or parenthesis to expression
function addOp(op) {
  state.expression += op;
  updateExpression();
}

// Update expression display and live result
function updateExpression() {
  const exprEl = document.getElementById("expression");
  const liveResEl = document.getElementById("live-result");

  exprEl.textContent = state.expression || "...";

  // Evaluate live result only if expression valid so far
  // But partial expressions can be incomplete - just try to eval safely
  const val = safeEval(state.expression);
  if (val === null) {
    liveResEl.textContent = "Current Result: Invalid expression";
  } else {
    liveResEl.textContent = "Current Result: " + roundInt(val);
  }
}

// Backspace last character, handle dice used
function backspace() {
  if (!state.expression) return;

  // Remove last char
  const lastChar = state.expression.slice(-1);
  state.expression = state.expression.slice(0, -1);

  // If last char was a digit, free that dice
  if (/\d/.test(lastChar)) {
    // Find index of that dice used (based on first matching dice in usedDiceIndices)
    // Because dice might have duplicates, find which dice index has that number and is used but not freed yet
    // We'll remove the rightmost used dice with that value to free it

    // Convert Set to array
    let usedArr = Array.from(state.usedDiceIndices);

    // Find rightmost dice index that matches the digit and is used
    for (let i = usedArr.length - 1; i >= 0; i--) {
      let di = usedArr[i];
      if (state.dice[di] == Number(lastChar)) {
        state.usedDiceIndices.delete(di);
        break;
      }
    }
  }
  updateExpression();
  renderDice();
}

// Clear expression and free dice
function clearExpression() {
  state.expression = "";
  state.usedDiceIndices.clear();
  updateExpression();
  renderDice();
}

// Submit expression and update archive
function submitExpression() {
  const expr = state.expression.trim();
  if (!expr) return alert("Expression is empty!");

  // Validate expression: uses all dice once, no concatenation, balanced parens
  if (!validateExpression(expr, state.dice, state.usedDiceIndices)) {
    alert("Invalid expression! Make sure you use each dice exactly once with no concatenation and balanced parentheses.");
    return;
  }

  // Evaluate expression safely
  const valRaw = safeEval(expr);
  if (valRaw === null) {
    alert("Invalid mathematical expression.");
    return;
  }
  const val = roundInt(valRaw);

  // Calculate score: abs difference from target
  const score = Math.abs(val - state.target);

  // Store in archive for today
  const today = formatDate();
  if (!state.archive[today]) state.archive[today] = [];
  state.archive[today].push({ expression: expr, result: val, score });

  saveState();

  // Update score display
  const scoreEl = document.getElementById("score");
  scoreEl.textContent = `Result: ${val} | Score: ${score} (${score === 0 ? "Perfect!" : "Keep trying!"})`;

  // Clear expression & used dice for next try
  clearExpression();

  renderArchive();
  updateStreak();
}

// Render archive of attempts grouped by day
function renderArchive() {
  const archiveEl = document.getElementById("archive");
  archiveEl.innerHTML = "";

  // Sort dates descending (most recent first)
  const dates = Object.keys(state.archive).sort((a, b) => (a < b ? 1 : -1));

  for (const day of dates) {
    // Section for each day
    const daySection = document.createElement("div");
    daySection.className = "archive-day";

    // Header with date and target number
    const dayHeader = document.createElement("h3");
    dayHeader.textContent = `${day} — Target: ${state.archive[day][0]?.target ?? "?"}`;
    daySection.appendChild(dayHeader);

    // List attempts
    const ul = document.createElement("ul");
    ul.className = "archive-list";

    // Sort attempts by score ascending
    const attempts = [...state.archive[day]].sort((a, b) => a.score - b.score);

    for (const attempt of attempts) {
      const li = document.createElement("li");
      li.textContent = `${attempt.expression} = ${attempt.result} (score: ${attempt.score})`;
      if (attempt.score === 0) li.classList.add("perfect");
      ul.appendChild(li);
    }

    daySection.appendChild(ul);

    // Show best score for the day
    const bestScore = Math.min(...state.archive[day].map((a) => a.score));
    const bestScoreEl = document.createElement("div");
    bestScoreEl.className = "perfect-solutions-count";
    bestScoreEl.textContent = `Best score this day: ${bestScore}${bestScore === 0 ? " (Perfect!)" : ""}`;
    daySection.appendChild(bestScoreEl);

    archiveEl.appendChild(daySection);
  }
}

// Update streak count based on archive
function updateStreak() {
  // Find consecutive days with perfect solution
  const dates = Object.keys(state.archive).sort();

  let streak = 0;
  let todayStr = formatDate();
  let date = new Date(todayStr);

  while (true) {
    const dayStr = formatDate(date);
    if (
      state.archive[dayStr] &&
      state.archive[dayStr].some((a) => a.score === 0)
    ) {
      streak++;
      // Previous day
      date.setDate(date.getDate() - 1);
    } else {
      break;
    }
  }
  state.streak = streak;

  const streakEl = document.getElementById("streak");
  streakEl.textContent = `Current perfect solution streak: ${streak} day${streak !== 1 ? "s" : ""}`;
}

// Save state to localStorage
function saveState() {
  localStorage.setItem("dailyDiceState", JSON.stringify(state));
}

// Load state from localStorage
function loadState() {
  const saved = localStorage.getItem("dailyDiceState");
  if (saved) {
    try {
      const loaded = JSON.parse(saved);
      if (loaded) {
        // Overwrite dice and expression to fresh start but keep archive and streak
        state.archive = loaded.archive || {};
        state.streak = loaded.streak || 0;
      }
    } catch {
      // ignore parse errors
    }
  }
}

// Initialize a new game state for the day or load from storage
function initGame() {
  loadState();

  // Setup today's target and dice if not already done
  const today = formatDate();
  if (!state.archive[today]) {
    // New day, generate dice and target
    state.dice = generateDice();
    state.target = generateTarget();

    // Save today's target with archive entry (empty array for attempts)
    state.archive[today] = [];
    state.archive[today].target = state.target;

    // Reset expression and used dice
    state.expression = "";
    state.usedDiceIndices.clear();

    saveState();
  } else {
    // Load today's dice and target from archive
    // dice are not stored, so regenerate? Or store dice in state?

    // Let's store today's dice in state archive for persistence
    // If not present, generate new
    if (!state.archive[today].dice) {
      state.archive[today].dice = generateDice();
      state.archive[today].target = generateTarget();
    }
    state.dice = state.archive[today].dice;
    state.target = state.archive[today].target;
    state.expression = "";
    state.usedDiceIndices.clear();
  }

  updateExpression();
  renderDice();
  renderOperators();
  renderArchive();
  updateStreak();

  // Show target
  const targetEl = document.getElementById("target");
  targetEl.textContent = `Target: ${state.target}`;
}

window.onload = initGame;
