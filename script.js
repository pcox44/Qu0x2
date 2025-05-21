// Helpers for date and random
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

// Game variables
let targetNumber;
let diceValues = [];
let usedDice = [false, false, false, false, false];
let expression = "";
const diceColors = ["#e63946", "#f1faee", "#a8dadc", "#457b9d", "#1d3557"];

const diceContainer = document.getElementById("dice-container");
const targetSpan = document.getElementById("target-number");
const exprText = document.getElementById("expr-text");
const resultDiv = document.getElementById("result");
const scoreDiv = document.getElementById("score");
const streakDiv = document.getElementById("streak");
const archiveDiv = document.getElementById("archive");

// Initialize Game
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
    die.style.backgroundColor = diceColors[i % diceColors.length];
    die.dataset.index = i;
    die.onclick = () => toggleDieUsage(i);
    diceContainer.appendChild(die);
  });

  loadProgress();
  updateScore("");
  updateStreak();
  updateArchive();
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

// Expression manipulation
function appendNumber(num) {
  expression += num.toString();
  updateExpression();
}

function appendOperator(op) {
  if (expression.length === 0) return; // prevent operator first
  const lastChar = expression[expression.length - 1];
  if ("+-*/".includes(lastChar)) return; // no double operators
  expression += op;
  updateExpression();
}

function backspace() {
  if (expression.length === 0) return;
  const lastChar = expression.slice(-1);
  expression = expression.slice(0, -1);
  if (/\d/.test(lastChar)) {
    for (let i = diceValues.length - 1; i >= 0; i--) {
      if (usedDice[i] && diceValues[i].toString() === lastChar) {
        usedDice[i] = false;
        break;
      }
    }
  }
  updateDiceStyles();
  updateExpression();
  updateScore("");
}

function clearExpression() {
  expression = "";
  usedDice = [false, false, false, false, false];
  updateDiceStyles();
  updateExpression();
  updateScore("");
}

function updateExpression() {
  exprText.textContent = expression;
}

function checkAnswer() {
  if (expression.length === 0) {
    resultDiv.textContent = "Enter an expression!";
    return;
  }
  if (usedDice.includes(false)) {
    resultDiv.textContent = "You must use all dice exactly once.";
    return;
  }
  if (!/^[0-9+\-*/() ]+$/.test(expression)) {
    resultDiv.textContent = "Invalid characters in expression.";
    return;
  }
  try {
    // Evaluate safely:
    const val = eval(expression);
    if (typeof val !== "number" || isNaN(val) || !isFinite(val)) {
      resultDiv.textContent = "Expression result invalid.";
      return;
    }

    const diff = Math.abs(val - targetNumber);
    resultDiv.textContent = `Result: ${val} (Difference: ${diff})`;
    updateScore(diff);

    saveProgress(diff);

  } catch (e) {
    resultDiv.textContent = "Error evaluating expression.";
  }
}

function updateScore(diff) {
  if (diff === "") {
    scoreDiv.textContent = "";
    return;
  }
  scoreDiv.textContent = `Your score (difference from target): ${diff}`;
}

function updateStreak() {
  const streak = localStorage.getItem("dailyDiceStreak") || 0;
  streakDiv.textContent = `Current Streak: ${streak}`;
}

function saveProgress(diff) {
  const todayKey = getTodayKey();
  const bestScoreKey = "dailyDiceBestScore-" + todayKey;
  const storedBest = localStorage.getItem(bestScoreKey);

  if (storedBest === null || diff < Number(storedBest)) {
    localStorage.setItem(bestScoreKey, diff);
    addToArchive(todayKey, diff);
  }

  updateStreakAfter(diff);
  updateArchive();
}

function updateStreakAfter(newScore) {
  const todayKey = getTodayKey();
  const yesterdayKey = getYesterdayKey();

  const storedBestToday = localStorage.getItem("dailyDiceBestScore-" + todayKey);
  const storedBestYesterday = localStorage.getItem("dailyDiceBestScore-" + yesterdayKey);

  let streak = Number(localStorage.getItem("dailyDiceStreak") || 0);

  if (storedBestYesterday !== null) {
    if (newScore <= Number(storedBestYesterday)) {
      streak += 1;
    } else {
      streak = 1;
    }
  } else {
    streak = 1;
  }

  localStorage.setItem("dailyDiceStreak", streak);
  updateStreak();
}

function getTodayKey() {
  const estMidnight = getEasternMidnight();
  return estMidnight.toISOString().slice(0, 10);
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
    resultDiv.textContent = `Best score today: ${bestScore}`;
    updateScore(bestScore);
  } else {
    resultDiv.textContent = "";
    updateScore("");
  }
}

window.onload = () => {
  initGame();
};
