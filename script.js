// --- Daily Dice Game Script ---

const diceContainer = document.getElementById("dice-container");
const expressionDiv = document.getElementById("expression");
const resultDiv = document.getElementById("result");
const scoreDiv = document.getElementById("score");
const streakDiv = document.getElementById("streak");
const archiveDiv = document.getElementById("archive");

const operatorBtns = document.querySelectorAll(".operator");
const backspaceBtn = document.getElementById("backspace");
const clearBtn = document.getElementById("clear");
const submitBtn = document.getElementById("submit");
const targetDiv = document.getElementById("target");

let diceValues = [];
let usedDice = [false, false, false, false, false];
let expression = "";
let targetNumber = 0;

// Horse racing colors for dice backgrounds
const diceColors = {
  1: "red",
  2: "white",
  3: "blue",
  4: "yellow",
  5: "green",
  6: "black",
};

function getTodayString() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function generatePuzzleForDate(dateStr) {
  // Seed random from date to have reproducible puzzles
  const seed = dateStr.split("-").join("");
  let s = 0;
  for (const c of seed) s += c.charCodeAt(0);
  function seededRand() {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  }

  // Generate 5 dice 1-6
  const dice = [];
  for (let i = 0; i < 5; i++) {
    dice.push(1 + Math.floor(seededRand() * 6));
  }

  // Generate target between 1 and 100 (try to ensure reachable range)
  let target = 1 + Math.floor(seededRand() * 100);

  return { dice, target };
}

function createDiceElements() {
  diceContainer.innerHTML = "";
  diceValues.forEach((val, i) => {
    const div = document.createElement("div");
    div.classList.add("dice");
    div.classList.add(diceColors[val]);
    div.textContent = val;
    if (usedDice[i]) div.classList.add("used");
    div.dataset.index = i;
    div.addEventListener("click", () => addDiceValue(i));
    diceContainer.appendChild(div);
  });
}

function updateDiceDisplay() {
  const diceElems = diceContainer.querySelectorAll(".dice");
  diceElems.forEach((div) => {
    const i = +div.dataset.index;
    if (usedDice[i]) {
      div.classList.add("used");
      div.style.pointerEvents = "none";
    } else {
      div.classList.remove("used");
      div.style.pointerEvents = "auto";
    }
  });
}

function addDiceValue(index) {
  if (usedDice[index]) return; // already used
  const val = diceValues[index];
  // Append val to expression (no validation yet)
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

  const lastChar = expression.slice(-1);

  // Find dice to free if lastChar matches dice value
  let diceIndexToFree = -1;
  if ("123456".includes(lastChar)) {
    for (let i = usedDice.length - 1; i >= 0; i--) {
      if (usedDice[i] && diceValues[i].toString() === lastChar) {
        diceIndexToFree = i;
        break;
      }
    }
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
  try {
    expr = expr.replace(/×/g, "*").replace(/÷/g, "/");
    if (/[^0-9+\-*/(). ]/.test(expr)) return null;
    // eslint-disable-next-line no-new-func
    const f = new Function("return " + expr);
    const val = f();
    if (typeof val === "number" && isFinite(val)) return val;
    return null;
  } catch {
    return null;
  }
}

function checkDiceUsage(expr) {
  const exprNums = expr.match(/\d+/g) || [];
  const diceCounts = {};
  diceValues.forEach((v) => (diceCounts[v] = (diceCounts[v] || 0) + 1));

  const exprCounts = {};
  exprNums.forEach((num) => {
    exprCounts[num] = (exprCounts[num] || 0) + 1;
  });

  for (const val in diceCounts) {
    const requiredCount = diceCounts[val];
    const actualCount = exprCounts[val] || 0;
    if (actualCount !== requiredCount) return false;
  }

  // Check balanced parentheses
  let balance = 0;
  for (let ch of expr) {
    if (ch === "(") balance++;
    else if (ch === ")") {
      balance--;
      if (balance < 0) return false;
    }
  }
  if (balance !== 0) return false;

  return true;
}

function saveResult(dateStr, score) {
  const archiveKey = "dailyDiceArchive";
  let archive = JSON.parse(localStorage.getItem(archiveKey)) || [];

  const todayEntryIndex = archive.findIndex((e) => e.date === dateStr);

  if (todayEntryIndex >= 0) {
    if (score < archive[todayEntryIndex].score) {
      archive[todayEntryIndex].score = score;
    }
  } else {
    archive.push({ date: dateStr, score });
  }

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

// --- Generate Fake Archive for 30 days prior ---

function generateFakeArchive() {
  const today = new Date();
  const archive = [];
  let currentStreak = 0;
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);

    // Randomly decide score - more perfect scores to simulate skill
    let score;
    const perfectChance = 0.15 + currentStreak * 0.05; // streak increases chance of perfect
    if (Math.random() < perfectChance) {
      score = 0;
      currentStreak++;
    } else {
      score = Math.floor(Math.random() * 10) + 1; // difference 1 to 10
      currentStreak = 0;
    }

    archive.push({ date: dateStr, score });
  }
  return archive;
}

function loadOrCreateArchive() {
  const archiveKey = "dailyDiceArchive";
  let archive = JSON.parse(localStorage.getItem(archiveKey));
  if (!archive || archive.length === 0) {
    archive = generateFakeArchive();
    localStorage.setItem(archiveKey, JSON.stringify(archive));
  }
  return archive;
}

// --- Main Initialization ---

function init() {
  const todayStr = getTodayString();
  const puzzle = generatePuzzleForDate(todayStr);
  diceValues = puzzle.dice;
  targetNumber = puzzle.target;

  usedDice = [false, false, false, false, false];
  expression = "";

  targetDiv.textContent = `Target Number: ${targetNumber}`;

  createDiceElements();
  updateExpression();
  clearResult();

  updateArchiveDisplay(loadOrCreateArchive());
  updateStreakDisplay(loadStreak(todayStr));
}

// Button event handlers

operatorBtns.forEach((btn) =>
  btn.addEventListener("click", () => addOperator(btn.dataset.op))
);

backspaceBtn.addEventListener("click", () => backspace());

clearBtn.addEventListener("click", () => clearExpression());

submitBtn.addEventListener("click", () => {
  if (expression.length === 0) {
    updateResultText("Enter an expression first.", true);
    return;
  }
  // Check usage of dice matches exactly once each
  if (!checkDiceUsage(expression)) {
    updateResultText(
      "Expression must use each dice value exactly once and be valid.",
      true
    );
    return;
  }

  // Evaluate expression safely
  const val = evaluateExpression(expression);
  if (val === null) {
    updateResultText("Invalid expression.", true);
    return;
  }

  const diff = Math.abs(val - targetNumber);

  if (!isFinite(diff)) {
    updateResultText("Result is not a finite number.", true);
    return;
  }

  if (diff === 0) {
    updateResultText(
      `🎉 Perfect! You matched the target number exactly: ${val}!`
    );
    let streak = loadStreak(getTodayString());
    streak++;
    saveStreak(getTodayString(), streak);
    updateStreakDisplay(streak);
  } else {
    updateResultText(`Result: ${val}, difference: ${diff}`);
    saveStreak(getTodayString(), 0);
    updateStreakDisplay(0);
  }

  updateScoreDisplay(diff);

  // Save to archive
  const archive = saveResult(getTodayString(), diff);
  updateArchiveDisplay(archive);
});

// Initialize game on load
window.onload = init;
