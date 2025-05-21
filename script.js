// --- Helpers ---
function getEasternMidnight() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const estOffset = -4 * 60; // EDT offset in minutes
  const estTime = new Date(utc + estOffset * 60000);
  estTime.setHours(0, 0, 0, 0);
  return estTime;
}

function seedFromDate() {
  const estMidnight = getEasternMidnight();
  return estMidnight.getFullYear() * 10000 + (estMidnight.getMonth() + 1) * 100 + estMidnight.getDate();
}

function seededRandom(seed) {
  let t = seed += 0x6D2B79F5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function shuffleArray(array, seed) {
  let random = () => seededRandom(seed++);
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// --- Variables ---
let targetNumber;
let diceValues = [];
let usedDice = [false, false, false, false, false];
let expression = "";

const diceContainer = document.getElementById("dice-container");
const targetSpan = document.getElementById("target-number");
const exprText = document.getElementById("expr-text");
const resultDiv = document.getElementById("result");
const scoreDiv = document.getElementById("score");
const streakDiv = document.getElementById("streak");
const archiveDiv = document.getElementById("archive");

// --- Game Setup ---
function initGame() {
  expression = "";
  usedDice = [false, false, false, false, false];
  updateExpression();

  const seed = seedFromDate();

  targetNumber = Math.floor(seededRandom(seed) * 100) + 1;
  targetSpan.textContent = targetNumber;

  diceValues = [1, 2, 3, 4, 5, 6];
  shuffleArray(diceValues, seed + 100);
  diceValues = diceValues.slice(0, 5);

  diceContainer.innerHTML = "";
  diceValues.forEach((value, i) => {
    const die = document.createElement("div");
    die.classList.add("die");
    die.textContent = value;
    die.dataset.index = i;
    die.addEventListener("click", () => toggleDieUsage(i));
    diceContainer.appendChild(die);
  });

  updateDiceStyles();

  loadProgress();
  updateScore("");
  updateStreak();
  updateArchive();

  // Attach button event listeners
  document.getElementById("btn-add").addEventListener("click", () => appendOperator("+"));
  document.getElementById("btn-sub").addEventListener("click", () => appendOperator("-"));
  document.getElementById("btn-mul").addEventListener("click", () => appendOperator("*"));
  document.getElementById("btn-div").addEventListener("click", () => appendOperator("/"));
  document.getElementById("btn-open-paren").addEventListener("click", () => appendOperator("("));
  document.getElementById("btn-close-paren").addEventListener("click", () => appendOperator(")"));
  document.getElementById("btn-backspace").addEventListener("click", backspace);
  document.getElementById("btn-clear").addEventListener("click", clearExpression);
  document.getElementById("btn-submit").addEventListener("click", checkAnswer);
}

function toggleDieUsage(i) {
  if (usedDice[i]) return; // already used
  appendNumber(diceValues[i]);
  usedDice[i] = true;
  updateDiceStyles();
}

function updateDiceStyles() {
  diceContainer.childNodes.forEach((die, i) => {
    if (usedDice[i]) die.classList.add("used");
    else die.classList.remove("used");
  });
}

function appendNumber(num) {
  expression += num.toString();
  updateExpression();
}

function appendOperator(op) {
  if (expression.length === 0 && (op === "+" || op === "-" || op === "*" || op === "/" || op === ")")) {
    // Don't allow operator or closing paren as first char except "("
    return;
  }
  expression += op;
  updateExpression();
}

function updateExpression() {
  exprText.textContent = expression;
}

function backspace() {
  if (expression.length === 0) return;

  const lastChar = expression.slice(-1);
  expression = expression.slice(0, -1);

  // Check if last char was a dice number and re-enable dice
  if ("123456".includes(lastChar)) {
    for (let i = 0; i < diceValues.length; i++) {
      if (diceValues[i].toString() === lastChar && usedDice[i]) {
        usedDice[i] = false;
        break;
      }
    }
  }

  updateExpression();
  updateDiceStyles();
  resultDiv.textContent = "";
}

function clearExpression() {
  expression = "";
  usedDice = [false, false, false, false, false];
  updateExpression();
  updateDiceStyles();
  resultDiv.textContent = "";
}

function checkAnswer() {
  if (expression.length === 0) {
    resultDiv.textContent = "Please enter an expression.";
    return;
  }

  // Validate expression to only contain digits, operators, parentheses
  if (!/^[0-9+\-*/() ]+$/.test(expression)) {
    resultDiv.textContent = "Invalid characters in expression.";
    return;
  }

  // Check if expression uses only dice values once each
  const usedDiceCount = usedDice.filter(Boolean).length;
  const diceNumbersUsed = expression.match(/\d+/g) || [];
  const diceUsedCount = diceNumbersUsed.reduce((acc, val) => {
    const num = parseInt(val, 10);
    return acc + (diceValues.includes(num) ? 1 : 0);
  }, 0);

  // Basic check that number of dice used in expression equals number of dice marked used
  if (diceUsedCount !== usedDiceCount) {
    resultDiv.textContent = "Please use dice values correctly and only once each.";
    return;
  }

  let evaluated;
  try {
    // Evaluate safely using Function constructor instead of eval
    evaluated = Function(`"use strict"; return (${expression})`)();
  } catch (e) {
    resultDiv.textContent = "Error evaluating expression.";
    return;
  }

  if (typeof evaluated !== "number" || !isFinite(evaluated)) {
    resultDiv.textContent = "Expression did not produce a valid number.";
    return;
  }

  const diff = Math.abs(targetNumber - evaluated);
  resultDiv.textContent = `Your result: ${evaluated} | Difference from target: ${diff}`;

  updateScore(diff);
  saveProgress(diff);
}

function updateScore(diff) {
  if (diff === "") {
    scoreDiv.textContent = "";
    return;
  }
  scoreDiv.textContent = `Score (difference): ${diff}`;
}

// --- LocalStorage and Progress ---

function saveProgress(newScore) {
  const todayKey = getTodayKey();
  const bestScoreKey = "dailyDiceBestScore-" + todayKey;
  const storedBest = localStorage.getItem(bestScoreKey);

  let bestScore = storedBest !== null ? Number(storedBest) : Infinity;
  if (newScore < bestScore) {
    localStorage.setItem(bestScoreKey, newScore);
    updateStreak(newScore);
    addToArchive(todayKey, newScore);
  } else {
    updateStreak(newScore);
  }
  updateArchive();
}

function getTodayKey() {
  const estMidnight = getEasternMidnight();
  return estMidnight.toISOString().slice(0, 10);
}

function updateStreak(newScore) {
  let streak = Number(localStorage.getItem("dailyDiceStreak")) || 0;
  const todayKey = getTodayKey();
  const yesterdayKey = getYesterdayKey();
  const storedBestYesterday = localStorage.getItem("dailyDiceBestScore-" + yesterdayKey);

  if (storedBestYesterday !== null) {
    if (newScore === 0) {
      // If score zero today and yesterday had a score, increment streak
      streak += 1;
    } else if (newScore !== undefined) {
      // Reset streak if today’s score is not zero
      streak = 0;
    }
  } else {
    // No yesterday data, streak = 1 if perfect score, else 0
    streak = (newScore === 0) ? 1 : 0;
  }

  localStorage.setItem("dailyDiceStreak", streak);
  streakDiv.textContent = `Consecutive Perfect Scores (0 diff): ${streak}`;
}

function getYesterdayKey() {
  const estMidnight = getEasternMidnight();
  estMidnight.setDate(estMidnight.getDate() - 1);
  return estMidnight.toISOString().slice(0, 10);
}

function addToArchive(date, score) {
  let archive = JSON.parse(localStorage.getItem("dailyDiceArchive") || "[]");
  const found = archive.find((entry) => entry.date === date);
  if (!found) {
    archive.push({ date, score });
    archive.sort((a,b) => b.date.localeCompare(a.date));
    if (archive.length > 30) archive.pop();
    localStorage.setItem("dailyDiceArchive", JSON.stringify(archive));
  } else if (score < found.score) {
    found.score = score;
    localStorage.setItem("dailyDiceArchive", JSON.stringify(archive));
  }
}

function updateArchive() {
  const archive = JSON.parse(localStorage.getItem("dailyDiceArchive") || "[]");
  if (archive.length === 0) {
    archiveDiv.textContent = "No archive data yet.";
    return;
  }
  archiveDiv.innerHTML = "<b>Archive (last 30 days):</b><br>" + 
    archive.map(e => `${e.date}: Best Score = ${e.score}`).join("<br>");
}

function loadProgress() {
  const todayKey = getTodayKey();
  const bestScore = localStorage.getItem("dailyDiceBestScore-" + todayKey);
  if (bestScore !== null) {
    scoreDiv.textContent = `Best score today: ${bestScore}`;
  } else {
    scoreDiv.textContent = "";
  }
  streakDiv.textContent = `Consecutive Perfect Scores (0 diff): ${localStorage.getItem("dailyDiceStreak") || 0}`;
}

// --- Init ---
window.onload = initGame;
