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
const diceColors = ["#e63946", "#f1faee", "#a8dadc", "#457b9d", "#1d3557"];

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
    die.style.backgroundColor = diceColors[i % diceColors.length];
    die.dataset.index = i;
    die.addEventListener("click", () => toggleDieUsage(i));
    diceContainer.appendChild(die);
  });

  loadProgress();
  updateScore("");
  updateStreak();
  updateArchive();

  // Attach button event listeners
  document.getElementById("btn-add").addEventListener("click", () => appendOperator("+"));
  document.getElementById("btn-sub").addEventListener("click", () => appendOperator("-"));
  document.getElementById("btn-mul").addEventListener("click", () => appendOperator("*"));
  document.getElementById("btn-div").addEventListener("click", () => appendOperator("/"));
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
  if (expression.length === 0) return; // prevent operator first
  const lastChar = expression[expression.length - 1];
  if ("+-*/".includes(lastChar)) return; // prevent double operators
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
    // Evaluate expression safely
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
    resultDiv.textContent = "Invalid expression.";
  }
}

function updateScore(score) {
  if (score === "") {
    scoreDiv.textContent = "";
    return;
  }
  scoreDiv.textContent = `Score (difference from target): ${score}`;
}

function
