// script.js

// === Helpers for date seed and random ===
function getEasternMidnight() {
  const now = new Date();
  // Convert to UTC-4 (Eastern Daylight Time or Standard)
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const estOffset = -4 * 60; // EDT offset in minutes
  const estTime = new Date(utc + estOffset * 60000);
  estTime.setHours(0,0,0,0);
  return estTime;
}

function seedFromDate() {
  const estMidnight = getEasternMidnight();
  return estMidnight.getFullYear() * 10000 + (estMidnight.getMonth()+1)*100 + estMidnight.getDate();
}

function seededRandom(seed) {
  // Simple mulberry32 PRNG
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

// === Game variables ===
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

// === Initialize Game ===
function initGame() {
  // Reset expression & used dice
  expression = "";
  usedDice = [false, false, false, false, false];
  updateExpression();

  // Generate puzzle by seed (date)
  const seed = seedFromDate();

  // Generate target number (1-100)
  targetNumber = Math.floor(seededRandom(seed) * 100) + 1;
  targetSpan.textContent = targetNumber;

  // Generate 5 dice (values 1-6)
  diceValues = [1,2,3,4,5,6];
  shuffleArray(diceValues, seed + 100);
  diceValues = diceValues.slice(0,5);

  // Display dice
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

  // Load saved progress
  loadProgress();
  updateScore("");
  updateStreak();
  updateArchive();
}

function toggleDieUsage(i) {
  if (usedDice[i]) return; // already used
  // Add die value to expression if not used
  appendNumber(diceValues[i]);
  usedDice[i] = true;
  updateDiceStyles();
}

function updateDiceStyles() {
  diceContainer.childNodes.forEach((die, i) => {
    if (usedDice[i]) {
      die.classList.add("used");
    } else {
      die.classList.remove("used");
    }
  });
}

// === Expression manipulation ===
function appendNumber(num) {
  expression += num.toString();
  updateExpression();
}

function appendOperator(op) {
  expression += op;
  updateExpression();
}

function backspace() {
  if (expression.length === 0) return;
  // Remove last char from expression
  const lastChar = expression.slice(-1);
  expression = expression.slice(0, -1);
  // If lastChar was a digit and matches a dice used, free that dice
  if (/\d/.test(lastChar)) {
    // Find dice index that matches the number and is used but not freed yet
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

// === Check answer ===
function checkAnswer() {
  if (expression.length === 0) {
    resultDiv.textContent = "Enter an expression!";
    return;
  }
  // Check if all dice used exactly once
  if (usedDice.includes(false)) {
    resultDiv.textContent = "You must use all dice exactly once.";
    return;
  }

  try {
    // Evaluate expression safely
    // Only allow digits, + - * / ( ) and spaces
    if (!/^[0-9+\-*/() ]+$/.test(expression)) {
      resultDiv.textContent = "Invalid characters in expression.";
      return;
    }

    const value = eval(expression); // using eval for simplicity

    if (typeof value !== "number" || isNaN(value) || !isFinite(value)) {
      resultDiv.textContent = "Expression does not evaluate to a valid number.";
      return;
    }

    const diff = Math.abs(value - targetNumber);
    updateScore(diff);

    if (diff === 0) {
      resultDiv.textContent = "🎉 Congratulations! Perfect match!";
      saveProgress(true);
    } else {
      resultDiv.textContent = `Result: ${value}`;
      saveProgress(false, diff);
    }
  } catch (e) {
    resultDiv.textContent = "Error evaluating expression.";
  }
}

function updateScore(diff) {
  if (diff === "") {
    scoreDiv.textContent = "";
  } else {
    scoreDiv.textContent = `Score (distance from target): ${diff}`;
  }
}

// === Local Storage: Save progress, streak, archive ===
function saveProgress(solved, diff = null) {
  const key = `dailyDiceGame-${seedFromDate()}`;
  localStorage.setItem(key, JSON.stringify({
    expression,
    solved,
    diff,
  }));

  // Update streak if solved
  if (solved) {
    updateStreakStorage();
  }

  updateStreak();
  updateArchive();
}

function loadProgress() {
  const key = `dailyDiceGame-${seedFromDate()}`;
  const dataRaw = localStorage.getItem(key);
  if (!dataRaw) return;
  const data = JSON.parse(dataRaw);
  expression = data.expression || "";
  updateExpression();

  if (data.solved) {
    resultDiv.textContent = "🎉 You solved today's puzzle!";
    updateScore(0);
    usedDice = [true, true, true, true, true];
    updateDiceStyles();
  } else if (data.diff !== null) {
    updateScore(data.diff);
    resultDiv.textContent = "Result loaded from saved progress.";
  }
}

function updateStreakStorage() {
  const streakKey = "dailyDiceGame-streak";
  let streakData = JSON.parse(localStorage.getItem(streakKey)) || {lastDate: 0, count: 0};

  const todaySeed = seedFromDate();

  if (streakData.lastDate === todaySeed - 1) {
    streakData.count++;
  } else if (streakData.lastDate !== todaySeed) {
    streakData.count = 1;
  }
  streakData.lastDate = todaySeed;

  localStorage.setItem(streakKey, JSON.stringify(streakData));
}

function updateStreak() {
  const streakKey = "dailyDiceGame-streak";
  let streakData = JSON.parse(localStorage.getItem(streakKey)) || {count: 0};
  streakDiv.textContent = `Current streak: ${streakData.count || 0} day(s)`;
}

function updateArchive() {
  // Show list of past games with their score if solved
  const archiveKey = "dailyDiceGame-archive";
  let archiveData = JSON.parse(localStorage.getItem(archiveKey)) || [];

  // Add current game result to archive if solved
  const todaySeed = seedFromDate();
  const currentKey = `dailyDiceGame-${todaySeed}`;
  const todayDataRaw = localStorage.getItem(currentKey);
  if (todayDataRaw) {
    const todayData = JSON.parse(todayDataRaw);
    if (todayData.solved) {
      // Check if already in archive
      if (!archiveData.some(e => e.date === todaySeed)) {
        archiveData.push({date: todaySeed, score: 0});
        localStorage.setItem(archiveKey, JSON.stringify(archiveData));
      }
    }
  }

  // Display archive list
  archiveDiv.innerHTML = "<strong>Archive of solved puzzles:</strong><br>";
  if (archiveData.length === 0) {
    archiveDiv.innerHTML += "No puzzles solved yet.";
    return;
  }
  archiveData.sort((a,b) => b.date - a.date);
  archiveData.forEach(entry => {
    const dateStr = entry.date.toString();
    const formattedDate = dateStr.slice(0,4) + "-" + dateStr.slice(4,6) + "-" + dateStr.slice(6,8);
    archiveDiv.innerHTML += `${formattedDate} - Score: ${entry.score}<br>`;
  });
}

// === Public API for buttons ===
window.appendOperator = appendOperator;
window.backspace = backspace;
window.clearExpression = clearExpression;
window.checkAnswer = checkAnswer;

// === Initialize on load ===
window.onload = initGame;
