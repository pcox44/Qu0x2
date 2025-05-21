const expressionDisplay = document.getElementById("expression");
const resultDisplay = document.getElementById("live-result");
const diceContainer = document.getElementById("dice-container");
const targetDisplay = document.getElementById("target");
const tableBody = document.querySelector("#results-table tbody");
const bestScoreDisplay = document.getElementById("best-score");
const streakDisplay = document.getElementById("streak");
const dateInput = document.getElementById("date-select");

let currentDate = new Date();
dateInput.valueAsDate = currentDate;

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
  expression = expression.slice(0, -1);
  updateExpressionDisplay();
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
    if (isNaN(result)) return;
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
  const numsUsed = expression.match(/\d+/g) || [];
  const usedSorted = numsUsed.map(Number).sort((a, b) => a - b);
  const diceSorted = [...dice].sort((a, b) => a - b);
  return JSON.stringify(usedSorted) === JSON.stringify(diceSorted);
}

function saveAttempt(expr, result, score) {
  const dateKey = dateInput.value;
  const archive = JSON.parse(localStorage.getItem("archive") || "{}");
  if (!archive[dateKey]) archive[dateKey] = [];
  archive[dateKey].push({ expr, result, score });
  localStorage.setItem("archive", JSON.stringify(archive));

  updateStreak(archive);
}

function updateStreak(archive) {
  const today = new Date(dateInput.value);
  let streak = 0;
  for (let i = 0; i < 100; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    if (
      archive[key] &&
      archive[key].some((a) => a.score === 0)
    ) {
      streak++;
    } else {
      break;
    }
  }
  streakDisplay.textContent = `🔥 Streak: ${streak}`;
}

function loadAttempts() {
  const dateKey = dateInput.value;
  const archive = JSON.parse(localStorage.getItem("archive") || "{}");
  const data = archive[dateKey] || [];

  tableBody.innerHTML = "";
  let bestScore = Infinity;

  data.forEach((entry, i) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${i + 1}</td><td>${entry.expr}</td><td>${+entry.result.toFixed(4)}</td><td>${+entry.score.toFixed(4)}</td>`;
    tableBody.appendChild(row);
    if (entry.score < bestScore) bestScore = entry.score;
  });

  bestScoreDisplay.textContent = `🎯 Best Score: ${+bestScore.toFixed(4)}`;
}

dateInput.addEventListener("change", () => {
  currentDate = new Date(dateInput.value);
  updateSeededGame(currentDate);
  targetDisplay.textContent = `Target: ${target}`;
  clearExpression();
  loadAttempts();
});

updateSeededGame(currentDate);
targetDisplay.textContent = `Target: ${target}`;
renderDice();
loadAttempts();
