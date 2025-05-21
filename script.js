"use strict";

const diceContainer = document.getElementById("dice-container");
const expressionDiv = document.getElementById("expression");
const resultDiv = document.getElementById("result");
const scoreDiv = document.getElementById("score");
const streakDiv = document.getElementById("streak");
const archiveDiv = document.getElementById("archive");
const targetDiv = document.getElementById("target-number");

const backspaceBtn = document.getElementById("backspace-btn");
const clearBtn = document.getElementById("clear-btn");
const submitBtn = document.getElementById("submit-btn");
const operatorBtns = document.querySelectorAll(".operator-btn");

let diceValues = [];
let usedDice = [false, false, false, false, false];
let expression = "";
let targetNumber = 0;

const diceColors = [
  "dice1", // yellow
  "dice2", // orange
  "dice3", // blue
  "dice4", // cyan
  "dice5", // purple
];

// --- Utility Functions ---

// Seeded random using date string (YYYY-MM-DD)
function seededRandom(seed) {
  let h = 2166136261 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  h += h << 13;
  h ^= h >>> 7;
  h += h << 3;
  h ^= h >>> 17;
  h += h << 5;
  return (h >>> 0) / 4294967296;
}

function getTodayString() {
  // Use Eastern Time Date (midnight)
  const now = new Date();
  // Convert now to EST timezone by offset in minutes
  // EST is UTC-5 or UTC-4 during daylight saving, 
  // but let's fix to UTC-5 for simplicity
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const estOffset = 5 * 60 * 60000;
  const estTime = new Date(utc - estOffset);
  return estTime.toISOString().slice(0, 10); // YYYY-MM-DD
}

function generatePuzzleForDate(dateStr) {
  // Use seededRandom to generate target and dice
  const rng = seededRandom(dateStr);

  // Target number 1 to 100
  const target = 1 + Math.floor(rng * 100);

  // Generate 5 dice rolls (1 to 6)
  // Use second RNG calls to get dice values
  const dice = [];
  let seedNum = 0;
  while (dice.length < 5) {
    const val = 1 + Math.floor(seededRandom(dateStr + seedNum) * 6);
    dice.push(val);
    seedNum++;
  }

  return { target, dice };
}

function updateDiceDisplay() {
  diceContainer.innerHTML = "";
  diceValues.forEach((val, i) => {
    const diceDiv = document.createElement("div");
    diceDiv.className = "dice " + diceColors[i];
    diceDiv.textContent = val;
    if (usedDice[i]) diceDiv.classList.add("used");
    diceDiv.addEventListener("click", () => {
      if (usedDice[i]) return;
      addDiceValue(val, i);
    });
    diceContainer.appendChild(diceDiv);
  });
}

function addDiceValue(val, index) {
  if (usedDice[index]) return;

  // Only add dice value if it doesn't break dice usage rules
  // We'll check usage later on submit for validity
  expression += val;
  usedDice[index] = true;
  updateExpression();
  updateDiceDisplay();
  clearResult();
}

function updateExpression() {
  expressionDiv.textContent = expression || " ";
}

function addOperator(op) {
  if (expression === "") {
    // Don't allow operator first except '('
    if (op === "(") {
      expression += op;
      updateExpression();
      clearResult();
    }
    return;
  }
  expression += op;
  updateExpression();
  clearResult();
}

function backspace() {
  if (expression.length === 0) return;

  // Remove last character
  const lastChar = expression.slice(-1);

  // Find if lastChar is a dice value, then free it
  let diceIndexToFree = -1;
  if ("123456".includes(lastChar)) {
    // Find last dice used with that value (the rightmost)
    // but must match an unused dice in reverse order
    for (let i = usedDice.length - 1; i >= 0; i--) {
      if (usedDice[i] && diceValues[i].toString() === lastChar) {
        diceIndexToFree = i;
        break;
      }
    }
  } else if (lastChar === "(" || lastChar === ")") {
    // just remove parentheses
    diceIndexToFree = -1;
  } else {
    // operator + - * /
    diceIndexToFree = -1;
  }

  if (diceIndexToFree >= 0) {
    usedDice[diceIndexToFree] = false;
  }

  expression = expression.slice(0, -1);
  updateExpression();
  updateDiceDisplay();
  clearResult();
}

function clearExpression() {
  expression = "";
  usedDice = [false, false, false, false, false];
  updateExpression();
  updateDiceDisplay();
  clearResult();
}

function clearResult() {
  resultDiv.textContent = "";
  scoreDiv.textContent = "";
}

function evaluateExpression(expr) {
  // Use Function constructor safely
  try {
    // Replace × ÷ with * and /
    expr = expr.replace(/×/g, "*").replace(/÷/g, "/");

    // Prevent invalid characters (only digits, operators and parens allowed)
    if (/[^0-9+\-*/(). ]/.test(expr)) return null;

    // Evaluate
    // eslint-disable-next-line no-new-func
    const f = new Function("return " + expr);
    const val = f();

    // Only allow finite numbers
    if (typeof val === "number" && isFinite(val)) return val;
    return null;
  } catch {
    return null;
  }
}

function checkDiceUsage(expr) {
  // Check all dice values are used exactly once
  // Count how many times each dice value occurs in expression
  const exprNums = expr.match(/\d+/g) || [];
  const diceCounts = {};
  diceValues.forEach((v) => (diceCounts[v] = (diceCounts[v] || 0) + 1));

  // Count dice values in expression
  const exprCounts = {};
  exprNums.forEach((num) => {
    exprCounts[num] = (exprCounts[num] || 0) + 1;
  });

  // For each dice value, count in expr must equal count in diceValues
  for (const val in diceCounts) {
    const requiredCount = diceCounts[val];
    const actualCount = exprCounts[val] || 0;
    if (actualCount !== requiredCount) return false;
  }

  // Check parentheses balanced
  let balance = 0;
  for (let ch of expr) {
    if (ch === "(") balance++;
    else if (ch === ")") {
      balance--;
      if (balance < 0) return false; // too many closing parens
    }
  }
  if (balance !== 0) return false;

  return true;
}

function saveResult(dateStr, score) {
  // Save daily best and archive in localStorage
  const archiveKey = "dailyDiceArchive";
  let archive = JSON.parse(localStorage.getItem(archiveKey)) || [];

  // Check if today's entry exists
  const todayEntryIndex = archive.findIndex((e) => e.date === dateStr);

  if (todayEntryIndex >= 0) {
    // Update if better score
    if (score < archive[todayEntryIndex].score) {
      archive[todayEntryIndex].score = score;
    }
  } else {
    archive.push({ date: dateStr, score });
  }

  // Keep last 30 days only
  archive = archive
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 30);

  localStorage.setItem(archiveKey, JSON.stringify(archive));
  return archive;
}

function updateArchiveDisplay(archive) {
  if (!archive || archive.length === 0) {
    archiveDiv.innerHTML = "<b>Archive:</b> No previous games played yet.";
    return;
  }
  const listItems = archive
    .map(
      (entry) =>
        `<li><b>${entry.date}</b>: Best Score = ${entry.score}</li>`
    )
    .join("");
  archiveDiv.innerHTML = `<b>Archive (last 30 days):</b><ul>${listItems}</ul>`;
}

function updateStreakDisplay(streak) {
  streakDiv.textContent = `🔥 Perfect Streak (0-diff in a row): ${streak}`;
}

function updateScoreDisplay(score) {
  scoreDiv.textContent = `Score (Difference): ${score}`;
}

function updateResultText(text, isError = false) {
  resultDiv.textContent = text;
  resultDiv.style.color = isError ? "#ff5555" : "#00ff90";
}

function loadStreak(dateStr) {
  const streakKey = "dailyDiceStreak";
  let streakData = JSON.parse(localStorage.getItem(streakKey));
  if (!streakData) return 0;

  if (streakData.lastDate === dateStr) {
    return streakData.streak;
  } else {
    return 0;
  }
}

function saveStreak(dateStr, streak) {
  const streakKey = "dailyDiceStreak";
  localStorage.setItem(
    streakKey,
    JSON.stringify({ lastDate: dateStr, streak: streak })
  );
}

// --- Initialize Game ---

function initGame() {
  const today = getTodayString();

  const puzzle = generatePuzzleForDate(today);
  targetNumber = puzzle.target;
  diceValues = puzzle.dice;
  usedDice = [false, false, false, false, false];
  expression = "";

  targetDiv.textContent = `Target Number: ${targetNumber}`;
  updateDiceDisplay();
  updateExpression();
  clearResult();

  // Load archive and streak
  const archive = JSON.parse(localStorage.getItem("dailyDiceArchive")) || [];
  updateArchiveDisplay(archive);

  // Load streak
  const streak = loadStreak(today);
  updateStreakDisplay(streak);
}

// --- Event Handlers ---

operatorBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    addOperator(btn.dataset.op);
  });
});

backspaceBtn.addEventListener("click", () => {
  backspace();
});

clearBtn.addEventListener("click", () => {
  clearExpression();
});

submitBtn.addEventListener("click", () => {
  if (expression.length === 0) {
    updateResultText("Enter an expression first.", true);
    return;
  }

  if (!checkDiceUsage(expression)) {
    updateResultText(
      "Expression must use all dice exactly once and parentheses must be balanced.",
      true
    );
    return;
  }

  const val = evaluateExpression(expression);
  if (val === null) {
    updateResultText("Invalid expression.", true);
    return;
  }

  const diff = Math.abs(targetNumber - val);
  updateResultText(`Result: ${val}`, false);
  updateScoreDisplay(diff);

  // Save to archive
  const today = getTodayString();
  const archive = saveResult(today, diff);
  updateArchiveDisplay(archive);

  // Update streak
  let streak = loadStreak(today);
  if (diff === 0) {
    streak += 1;
  } else {
    streak = 0;
  }
  saveStreak(today, streak);
  updateStreakDisplay(streak);
});

// --- Start ---
initGame();
