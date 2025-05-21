// Daily Dice Game with archive, horse race dice colors, black out used dice, live evaluation, and stats.

// Constants & Utilities
const HORSE_RACE_COLORS = {
  1: { bg: "#e63946", color: "white" }, // red bg, white text
  2: { bg: "black", color: "#ffcc00" }, // black bg, yellow text
  3: { bg: "#457b9d", color: "white" }, // blue bg, white text
  4: { bg: "#f1fa3c", color: "black" }, // yellow bg, black text
  5: { bg: "#2a9d8f", color: "white" }, // greenish bg, white text
  6: { bg: "#a8dadc", color: "black" }, // light cyan bg, black text
};

const maxArchiveDays = 30;

let expression = "";
let submissions = []; // array of {expr, result, score}
let streak = 0;

let target = 0;
let dice = [];

const diceContainer = document.getElementById("dice-container");
const expressionDiv = document.getElementById("expression");
const liveResultDiv = document.getElementById("live-result");
const targetDiv = document.getElementById("target");
const resultsTableBody = document.querySelector("#results-table tbody");
const scoreSpan = document.getElementById("score");
const streakSpan = document.getElementById("streak");
const archiveDiv = document.getElementById("archive");
const submitBtn = document.getElementById("submit-btn");

// Get YYYY-MM-DD string from date
function getDateKey(date) {
  return date.toISOString().slice(0, 10);
}

// Seeded random number generator (Mulberry32)
function mulberry32(seed) {
  return function() {
    var t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Generate today's puzzle (dice + target) seeded by date
function generateDiceAndTarget(date) {
  const seed = Number(date.toISOString().slice(0,10).replace(/-/g,""));
  const rng = mulberry32(seed);

  // roll 5 dice (1-6)
  dice = [];
  for (let i=0; i<5; i++) {
    dice.push(Math.floor(rng()*6)+1);
  }

  // target from 1 to 100
  target = Math.floor(rng()*100)+1;

  targetDiv.textContent = `Target: ${target}`;

  renderDice();
}

// Render dice, black out used dice
function renderDice() {
  diceContainer.innerHTML = "";
  const usedNums = getUsedDiceNumbers();
  for (let d of dice) {
    const die = document.createElement("div");
    die.className = "dice";
    die.textContent = d;
    die.dataset.num = d;
    // apply horse racing colors by data-num
    const c = HORSE_RACE_COLORS[d];
    if (!usedNums.includes(d)) {
      die.style.backgroundColor = c.bg;
      die.style.color = c.color;
      die.classList.remove("used");
    } else {
      // used dice blacked out
      die.style.backgroundColor = "#222";
      die.style.color = "#555";
      die.classList.add("used");
    }
    diceContainer.appendChild(die);
  }
}

// Get used dice numbers from expression
function getUsedDiceNumbers() {
  let counts = {};
  for (let d of dice) {
    counts[d] = (counts[d] || 0) + 1;
  }
  // Count usage in expression (digits only)
  let exprNums = expression.match(/\d/g) || [];
  let used = [];

  // Count each digit used
  for (let n of exprNums) {
    let num = Number(n);
    if (counts[num] && counts[num] > 0) {
      used.push(num);
      counts[num]--;
    }
  }
  return used;
}

// Validate the expression syntax, check dice usage and evaluate result
// Returns {valid: bool, message: string, value: number or NaN}
function validateExpression(expr) {
  if (expr.length === 0) {
    return { valid: false, message: "Expression is empty", value: NaN };
  }
  // Only allowed chars: digits 1-6, +-*/() whitespace
  if (!/^[1-6+\-*/()\s]+$/.test(expr)) {
    return { valid: false, message: "Invalid characters in expression", value: NaN };
  }
  // Check dice usage counts
  let diceCounts = {};
  for (let d of dice) diceCounts[d] = (diceCounts[d]||0) + 1;

  let exprNums = expr.match(/\d/g) || [];
  let exprCounts = {};
  for (let n of exprNums) exprCounts[n] = (exprCounts[n]||0) + 1;

  for (let n in exprCounts) {
    if ((exprCounts[n]||0) > (diceCounts[n]||0)) {
      return { valid: false, message: `Used digit ${n} more times than available`, value: NaN };
    }
  }

  // Try to evaluate the expression safely
  try {
    // eslint-disable-next-line no-new-func
    let val = Function(`"use strict"; return (${expr})`)();
    if (typeof val !== "number" || isNaN(val) || !isFinite(val)) {
      return { valid: false, message: "Expression does not evaluate to a finite number", value: NaN };
    }
    return { valid: true, message: "", value: val };
  } catch(e) {
    return { valid: false, message: "Syntax error in expression", value: NaN };
  }
}

// Add operator or digit to expression
function addOp(op) {
  expression += op;
  updateDisplay();
}

// Backspace last character
function backspace() {
  expression = expression.slice(0, -1);
  updateDisplay();
}

// Clear expression
function clearExpression() {
  expression = "";
  updateDisplay();
}

// Update expression display and live evaluation
function updateDisplay() {
  expressionDiv.textContent = expression || "Type your expression...";
  updateUsedDice();
  updateLiveResult();
  updateButtonsDisabled();
}

// Update used dice coloring (black out used dice)
function updateUsedDice() {
  renderDice();
}

// Update live evaluation and show result or error message
function updateLiveResult() {
  if (expression.length === 0) {
    liveResultDiv.textContent = "";
    scoreSpan.textContent = "-";
    return;
  }
  let v = validateExpression(expression);
  if (v.valid) {
    liveResultDiv.textContent = `= ${v.value.toFixed(4)}`;
    scoreSpan.textContent = Math.abs(target - v.value).toFixed(4);
  } else {
    liveResultDiv.textContent = `Error: ${v.message}`;
    scoreSpan.textContent = "-";
  }
}

// Enable or disable buttons if needed (no disable now, but for future)
function updateButtonsDisabled() {
  // no disabling for now
}

// Submit expression handler
function submitExpression() {
  let v = validateExpression(expression);
  if (!v.valid) {
    alert("Invalid expression:\n" + v.message);
    return;
  }
  let scoreVal = Math.abs(target - v.value);

  // Check for duplicate solution (order independent)
  // We'll sort tokens (numbers + ops) ignoring whitespace and parentheses
  let normExpr = normalizeExpression(expression);

  if (submissions.some(s => normalizeExpression(s.expr) === normExpr)) {
    alert("You already submitted this solution!");
    return;
  }

  submissions.push({
    expr: expression,
    result: v.value,
    score: scoreVal,
  });

  if (scoreVal === 0) {
    streak++;
  } else {
    streak = 0;
  }

  saveGame();
  expression = "";
  updateDisplay();
  renderResultsTable();
  updateScoreStreak();
  renderArchive();
}

// Normalize expression for uniqueness check
// Lowercase, remove spaces, sort tokens (digits and ops separately)
function normalizeExpression(expr) {
  // Remove whitespace
  let cleaned = expr.replace(/\s+/g, "");
  // Tokenize digits and operators separately
  let tokens = cleaned.match(/(\d+|[+\-*/()])/g) || [];
  // Separate digits and operators, then sort digits, then combine back
  let digits = tokens.filter(t => /^[1-6]+$/.test(t)).sort();
  let ops = tokens.filter(t => /^[+\-*/()]$/.test(t));
  // Combine sorted digits with ops in order they appear (ops stay same pos)
  // To keep simple, just join digits sorted + ops joined after
  return digits.join("") + ops.join("");
}

// Render results table
function renderResultsTable() {
  resultsTableBody.innerHTML = "";
  submissions.forEach((s,i) => {
    const tr = document.createElement("tr");
    const indexTd = document.createElement("td");
    indexTd.textContent = i+1;
    const exprTd = document.createElement("td");
    exprTd.textContent = s.expr;
    const resultTd = document.createElement("td");
    resultTd.textContent = s.result.toFixed(4);
    const scoreTd = document.createElement("td");
    scoreTd.textContent = s.score.toFixed(4);

    tr.appendChild(indexTd);
    tr.appendChild(exprTd);
    tr.appendChild(resultTd);
    tr.appendChild(scoreTd);
    resultsTableBody.appendChild(tr);
  });
}

// Update score and streak display
function updateScoreStreak() {
  if (submissions.length === 0) {
    scoreSpan.textContent = "-";
  } else {
    // Show best score so far
    let best = submissions.reduce((acc,s) => s.score < acc ? s.score : acc, submissions[0].score);
    scoreSpan.textContent = best.toFixed(4);
  }
  streakSpan.textContent = streak;
}

// Save game state to localStorage
function saveGame() {
  const data = {
    submissions,
    streak,
    target,
    dice,
    dateKey: getDateKey(new Date()),
  };
  localStorage.setItem("dailyDiceGame", JSON.stringify(data));
}

// Load game state from localStorage (only if today's date)
function loadGame() {
  let dataRaw = localStorage.getItem("dailyDiceGame");
  if (!dataRaw) return;
  try {
    let data = JSON.parse(dataRaw);
    if (data.dateKey === getDateKey(new Date())) {
      submissions = data.submissions || [];
      streak = data.streak || 0;
      target = data.target || target;
      dice = data.dice || dice;
      renderDice();
      renderResultsTable();
      updateScoreStreak();
      renderArchive();
    } else {
      // Old date, clear storage
      localStorage.removeItem("dailyDiceGame");
    }
  } catch {
    localStorage.removeItem("dailyDiceGame");
  }
}

// Render archive summary for last 30 days
function renderArchive() {
  archiveDiv.innerHTML = "";

  const today = new Date();
  let archiveEntries = [];

  // Load all localStorage keys for dailyDiceGame_YYYY-MM-DD or just one storage key?
  // We only have one storage key "dailyDiceGame" for today,
  // So we can't get past days submissions from localStorage.
  // We must store archive as well.
  // We'll store archive in localStorage key 'dailyDiceArchive'

  let archiveRaw = localStorage.getItem("dailyDiceArchive");
  let archive = archiveRaw ? JSON.parse(archiveRaw) : {};

  // Add today's entry
  const todayKey = getDateKey(today);
  archive[todayKey] = archive[todayKey] || { count: 0, perfect: false };
  archive[todayKey].count = submissions.length;
  archive[todayKey].perfect = submissions.some(s => s.score === 0);

  // Clean archive older than 30 days
  const cutoffDate = new Date(today.getTime() - maxArchiveDays*86400000);
  for (let dayKey in archive) {
    let d = new Date(dayKey);
    if (d < cutoffDate) delete archive[dayKey];
  }

  // Save back archive
  localStorage.setItem("dailyDiceArchive", JSON.stringify(archive));

  // Sort keys descending (most recent first)
  const keysSorted = Object.keys(archive).sort((a,b) => b.localeCompare(a));

  // Show archive entries (max 30)
  for (let i = 0; i < Math.min(keysSorted.length, maxArchiveDays); i++) {
    let day = keysSorted[i];
    let entry = archive[day];
    const div = document.createElement("div");
    div.className = "day" + (entry.perfect ? " perfect" : "");
    div.textContent = `${day}: ${entry.count} solution${entry.count === 1 ? "" : "s"}`;
    if (entry.perfect) {
      const check = document.createElement("span");
      check.className = "checkmark";
      check.textContent = " ✓";
      div.appendChild(check);
    }
    archiveDiv.appendChild(div);
  }
}

// Init
function init() {
  generateDiceAndTarget(new Date());
  loadGame();
  updateDisplay();
  renderResultsTable();
  updateScoreStreak();
  renderArchive();
}

submitBtn.addEventListener("click", submitExpression);

init();
