// Daily Dice Game v2
// Uses date-based seed to generate dice & target.
// Dice colored by value to match horse racing colors.
// Big target, big buttons, parentheses support, real-time validation.

// Global vars
let dice = [];
let diceUsed = [];
let expression = "";
let target;
let submissions = []; // {expr, result, score}
let streak = 0;

const diceColors = {
  1: "#d32f2f", // red
  2: "#fafafa", // white, black border
  3: "#1976d2", // blue
  4: "#fbc02d", // yellow
  5: "#388e3c", // green
  6: "#000000", // black bg, yellow number handled by CSS
};

const maxArchiveDays = 30;

// Utilities
function getSeedFromDate(date) {
  // yyyyMMdd as number
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

function seededRandom(seed) {
  // simple LCG
  let m = 0x80000000;
  let a = 1103515245;
  let c = 12345;
  seed = (a * seed + c) % m;
  return seed;
}

// Generate dice and target from date
function generateDiceAndTarget(date) {
  let seed = getSeedFromDate(date);
  dice = [];
  diceUsed = [];
  let rseed = seed;

  // Generate 5 dice (1–6) with seeded randomness
  for (let i = 0; i < 5; i++) {
    rseed = seededRandom(rseed);
    dice.push(1 + (rseed % 6));
    diceUsed.push(false);
  }

  // Target between 20 and 100
  rseed = seededRandom(rseed);
  target = 20 + (rseed % 81);

  submissions = [];
  expression = "";
  updateDisplay();
  renderDice();
  renderResultsTable();
  renderArchive();
  updateScoreStreak();
  updateLiveResult();
}

function renderDice() {
  const container = document.getElementById("dice-container");
  container.innerHTML = "";

  dice.forEach((val, i) => {
    const die = document.createElement("div");
    die.classList.add("dice");
    die.setAttribute("data-value", val);
    die.setAttribute("role", "listitem");
    die.textContent = val;
    if (diceUsed[i]) {
      die.classList.add("used");
    }
    die.title = diceUsed[i] ? "Used" : "Click to use this die";
    die.tabIndex = 0;
    die.addEventListener("click", () => {
      toggleDieUsed(i);
    });
    die.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleDieUsed(i);
      }
    });
    container.appendChild(die);
  });
}

function toggleDieUsed(i) {
  diceUsed[i] = !diceUsed[i];
  renderDice();
}

// Check if expression uses dice values exactly once
function usesDiceExactly(expr) {
  // Extract numbers from expression
  let nums = expr.match(/\d+/g);
  if (!nums) return false;
  nums = nums.map(Number);

  // Count dice and used dice
  let diceCounts = {};
  dice.forEach(d => diceCounts[d] = (diceCounts[d] || 0) + 1);
  let usedCounts = {};
  nums.forEach(n => usedCounts[n] = (usedCounts[n] || 0) + 1);

  // Check if usedCounts matches diceCounts exactly
  for (let key in usedCounts) {
    if (usedCounts[key] !== diceCounts[key]) return false;
  }
  for (let key in diceCounts) {
    if (diceCounts[key] !== usedCounts[key]) return false;
  }
  return true;
}

// Validate expression syntax & dice usage
function validateExpression(expr) {
  if (!expr) return {valid: false, message: "Expression is empty."};

  // Only allow digits, + - * / ( ) and spaces
  if (!/^[0-9+\-*/()\s]+$/.test(expr)) {
    return {valid: false, message: "Invalid characters in expression."};
  }

  // Check balanced parentheses
  let balance = 0;
  for (let c of expr) {
    if (c === '(') balance++;
    else if (c === ')') {
      balance--;
      if (balance < 0) return {valid: false, message: "Unmatched parentheses."};
    }
  }
  if (balance !== 0) return {valid: false, message: "Unmatched parentheses."};

  // Check dice usage
  if (!usesDiceExactly(expr)) {
    return {valid: false, message: "Expression must use each dice value exactly once."};
  }

  // Try eval with safe Function
  try {
    // eslint-disable-next-line no-new-func
    let f = new Function(`return ${expr}`);
    let val = f();
    if (typeof val !== "number" || !isFinite(val)) {
      return {valid: false, message: "Expression result is not a valid number."};
    }
    return {valid: true, value: val};
  } catch {
    return {valid: false, message: "Expression syntax error."};
  }
}

// UI update functions
function updateDisplay() {
  document.getElementById("target").textContent = `Target: ${target}`;
  document.getElementById("expression").textContent = expression || "Enter expression...";
  updateLiveResult();
}

function updateLiveResult() {
  let live = document.getElementById("live-result");
  if (!expression) {
    live.textContent = "";
    return;
  }
  let v = validateExpression(expression);
  if (!v.valid) {
    live.textContent = "Invalid expression: " + v.message;
    live.style.color = "crimson";
  } else {
    live.textContent = `Result: ${v.value.toFixed(4)}`;
    live.style.color = "green";
  }
}

function updateScoreStreak() {
  const scoreDiv = document.getElementById("score");
  const streakDiv = document.getElementById("streak");
  if (submissions.length === 0) {
    scoreDiv.textContent = "";
    streakDiv.textContent = "";
    return;
  }
  let last = submissions[submissions.length - 1];
  scoreDiv.textContent = `Last Score: ${last.score}`;
  streakDiv.textContent = `Current Streak: ${streak}`;
}

// Render results table
function renderResultsTable() {
  let tbody = document.querySelector("#results-table tbody");
  tbody.innerHTML = "";
  submissions.forEach((s, i) => {
    let tr = document.createElement("tr");
    let tdNum = document.createElement("td");
    tdNum.textContent = i + 1;
    let tdExpr = document.createElement("td");
    tdExpr.textContent = s.expr;
    let tdResult = document.createElement("td");
    tdResult.textContent = s.result.toFixed(4);
    let tdScore = document.createElement("td");
    tdScore.textContent = s.score;

    tr.appendChild(tdNum);
    tr.appendChild(tdExpr);
    tr.appendChild(tdResult);
    tr.appendChild(tdScore);
    tbody.appendChild(tr);
  });
}

// Add operation or digit or parentheses to expression
function addOp(op) {
  // Don't add invalid consecutive ops
  if (expression.length === 0 && "+-*/".includes(op)) return;

  // For parentheses, allow freely
  if ("()".includes(op)) {
    expression += op;
    updateDisplay();
    return;
  }

  // For operators, prevent consecutive operators
  let lastChar = expression.slice(-1);
  if ("+-*/".includes(lastChar) && "+-*/".includes(op)) return;

  expression += op;
  updateDisplay();
}

// Backspace
function backspace() {
  if (expression.length === 0) return;
  expression = expression.slice(0, -1);
  updateDisplay();
}

// Clear expression
function clearExpression() {
  expression = "";
  updateDisplay();
}

// Submit expression
function submitExpression() {
  let v = validateExpression(expression);
  if (!v.valid) {
    alert("Invalid expression:\n" + v.message);
    return;
  }
  let score = Math.abs(target - v.value);
  submissions.push({
    expr: expression,
    result: v.value,
    score: score.toFixed(4),
  });

  // Update streak: increase if score is 0 else reset
  if (score === 0) streak++;
  else streak = 0;

  // Save to local storage
  saveGame();

  // Clear for next round
  expression = "";
  updateDisplay();
  renderResultsTable();
  updateScoreStreak();
  renderArchive();
}

// Save/load game state (submissions & streak) for current date
function saveGame() {
  let key = "daily-dice-" + getSeedFromDate(new Date());
  let state = { submissions, streak };
  localStorage.setItem(key, JSON.stringify(state));
}

function loadGame() {
  let key = "daily-dice-" + getSeedFromDate(new Date());
  let stateRaw = localStorage.getItem(key);
  if (stateRaw) {
    try {
      let state = JSON.parse(stateRaw);
      submissions = state.submissions || [];
      streak = state.streak || 0;
    } catch {}
  }
}

// Render archive for last 30 days
function renderArchive() {
  let archiveElem = document.getElementById("archive");
  let lines = [];

  let today = new Date();

  for (let i = maxArchiveDays - 1; i >= 0; i--) {
    let d = new Date(today);
    d.setDate(today.getDate() - i);
    let key = "daily-dice-" + getSeedFromDate(d);
    let stateRaw = localStorage.getItem(key);
    if (!stateRaw) {
      lines.push(`${d.toLocaleDateString()} : No data`);
      continue;
    }
    try {
      let state = JSON.parse(stateRaw);
      let subs = state.submissions || [];
      if (subs.length === 0) {
        lines.push(`${d.toLocaleDateString()} : No submissions`);
        continue;
      }

      // Did user get perfect?
      let perfectCount = subs.filter(s => s.score == 0).length;
      let symbol = perfectCount > 0 ? "✔" : "✗";
      lines.push(`${d.toLocaleDateString()} : ${symbol} Perfect solutions: ${perfectCount}`);
    } catch {
      lines.push(`${d.toLocaleDateString()} : Error reading data`);
    }
  }

  archiveElem.textContent = lines.join("\n");
}

// Keyboard input support for dice numbers
window.addEventListener("keydown", e => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

  if ("123456".includes(e.key)) {
    // Add digit only if dice contains that number and count not exceeded
    let countInDice = dice.filter(d => d === Number(e.key)).length;
    let countInExpr = (expression.match(new RegExp(e.key, "g")) || []).length;
    if (countInExpr < countInDice) {
      expression += e.key;
      updateDisplay();
    }
  } else if ("+-*/()".includes(e.key)) {
    addOp(e.key);
  } else if (e.key === "Backspace") {
    backspace();
  } else if (e.key === "Enter") {
    submitExpression();
  }
});

// Initialize
function init() {
  generateDiceAndTarget(new Date());
  loadGame();
  renderResultsTable();
  updateScoreStreak();
  renderArchive();
}

init();

// Dark mode toggle
function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
}
