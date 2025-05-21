const expressionDisplay = document.getElementById("expression");
const resultDisplay = document.getElementById("live-result");
const diceContainer = document.getElementById("dice-container");
const targetDisplay = document.getElementById("target");
const tableBody = document.querySelector("#results-table tbody");
const bestScoreDisplay = document.getElementById("best-score");
const streakDisplay = document.getElementById("streak");
const dateInput = document.getElementById("date-select");
const gameNumberDisplay = document.getElementById("game-number");
const perfectCountDisplay = document.getElementById("perfect-count");

const GAME_START_DATE = new Date("2025-05-16");

let currentDate = new Date();
if (currentDate < GAME_START_DATE) currentDate = new Date(GAME_START_DATE); // Don't allow before start date

dateInput.valueAsDate = currentDate;

// Disable future dates
dateInput.max = new Date().toISOString().split("T")[0];
dateInput.min = GAME_START_DATE.toISOString().split("T")[0];

let expression = "";
let usedDice = [];
let dice = [];
let target = 0;

function updateSeededGame(date) {
  const seed = date.toISOString().split("T")[0].replace(/-/g, "");
  const rand = mulberry32(hashCode(seed));
  dice = Array.from({ length: 5 }, () => Math.floor(rand() * 6) + 1);
  target = Math.floor(rand() * 100) + 1;
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function renderDice() {
  diceContainer.innerHTML = "";
  dice.forEach((value, i) => {
    const btn = document.createElement("div");
    btn.className = "die";
    if (usedDice.includes(i)) btn.classList.add("used");
    btn.textContent = value;
    btn.onclick = () => {
      if (!usedDice.includes(i)) {
        expression += value;
        usedDice.push(i);
        updateExpressionDisplay();
        renderDice();
      }
    };
    diceContainer.appendChild(btn);
  });
}

function updateExpressionDisplay() {
  expressionDisplay.textContent = expression;
  try {
    const val = eval(expression);
    if (!isNaN(val)) {
      resultDisplay.textContent = `= ${+val.toFixed(4)}`;
    } else {
      resultDisplay.textContent = ``;
    }
  } catch {
    resultDisplay.textContent = ``;
  }
}

function addOp(op) {
  if (expression.length > 0 || op === "(") {
    expression += op;
    updateExpressionDisplay();
  }
}

function backspace() {
  if (expression.length === 0) return;
  const lastChar = expression.slice(-1);
  expression = expression.slice(0, -1);

  // If last char was a digit, remove from usedDice the die with that digit at the end
  if (/\d/.test(lastChar)) {
    // Find the die index for last digit from right to left
    for (let i = usedDice.length - 1; i >= 0; i--) {
      if (dice[usedDice[i]].toString() === lastChar) {
        usedDice.splice(i, 1);
        break;
      }
    }
  }
  updateExpressionDisplay();
  renderDice();
}

function clearExpression() {
  expression = "";
  usedDice = [];
  updateExpressionDisplay();
  renderDice();
}

function submitExpression() {
  try {
    const result = eval(expression);
    if (isNaN(result)) return alert("Invalid expression.");

    if (!validDiceUsage()) {
      alert("You must use each die exactly once.");
      return;
    }

    const score = Math.abs(target - result);
    saveAttempt(expression, result, score);
    clearExpression();
    loadAttempts();
  } catch {
    alert("Invalid expression.");
  }
}

function validDiceUsage() {
  // Check that each die is used exactly once, by counting dice values in expression digits only
  const numsUsed = expression.match(/\d/g) || [];
  const usedDiceValues = usedDice.map(i => dice[i]);
  if (numsUsed.length !== 5) return false;
  // Sort and compare arrays
  const sortedNumsUsed = numsUsed.map(Number).sort((a, b) => a - b);
  const sortedDice = [...usedDiceValues].sort((a, b) => a - b);
  return JSON.stringify(sortedNumsUsed) === JSON.stringify(sortedDice);
}

function saveAttempt(expr, result, score) {
  const dateKey = dateInput.value;
  const archive = JSON.parse(localStorage.getItem("archive") || "{}");
  if (!archive[dateKey]) archive[dateKey] = [];
  archive[dateKey].push({ expr, result, score });
  localStorage.set
