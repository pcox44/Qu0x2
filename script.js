const targetEl = document.getElementById("target");
const diceContainer = document.getElementById("dice-container");
const expressionEl = document.getElementById("expression");
const liveResultEl = document.getElementById("live-result");
const scoreEl = document.getElementById("score");
const streakEl = document.getElementById("streak");
const tableBody = document.querySelector("#results-table tbody");
const archiveEl = document.getElementById("archive");

let expression = "";
let usedDice = [];
let currentDice = getDailyDice();
let target = getDailyTarget();
let results = getStoredResults();
let streak = parseInt(localStorage.getItem("streak") || "0");

function seedPRNG(seed) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => (h = Math.imul(h ^ (h >>> 13), 0x5bd1e995)) >>> 0;
}

function getToday() {
  const now = new Date();
  now.setUTCHours(5, 0, 0, 0); // Midnight Eastern Time
  return now.toISOString().split("T")[0];
}

function getDailyTarget() {
  const rng = seedPRNG(getToday());
  return (rng() % 100) + 1;
}

function getDailyDice() {
  const rng = seedPRNG(getToday() + "-dice");
  return Array.from({ length: 5 }, () => (rng() % 6) + 1);
}

function renderDice() {
  diceContainer.innerHTML = "";
  currentDice.forEach((value, i) => {
    const div = document.createElement("div");
    div.className = `die die-${value}` + (usedDice.includes(i) ? " used" : "");
    div.textContent = value;
    if (!usedDice.includes(i)) {
      div.onclick = () => {
        expression += value;
        usedDice.push(i);
        updateExpression();
        renderDice();
      };
    }
    diceContainer.appendChild(div);
  });
}

function addOp(op) {
  expression += op;
  updateExpression();
}

function backspace() {
  expression = expression.slice(0, -1);
  updateExpression();
}

function clearExpression() {
  expression = "";
  usedDice = [];
  updateExpression();
  renderDice();
  liveResultEl.textContent = "";
}

function updateExpression() {
  expressionEl.textContent = expression;
  try {
    const result = eval(expression);
    if (typeof result === "number" && !isNaN(result)) {
      liveResultEl.textContent = `= ${result}`;
    } else {
      liveResultEl.textContent = "";
    }
  } catch {
    liveResultEl.textContent = "";
  }
}

function isValidExpression(expr) {
  return /^[\d+\-*/().\s]+$/.test(expr) && !/\d{2,}/.test(expr);
}

function getStoredResults() {
  const all = JSON.parse(localStorage.getItem("dailyResults") || "{}");
  const today = getToday();
  return all[today] || [];
}

function saveResult(expression, result, score) {
  const today = getToday();
  const all = JSON.parse(localStorage.getItem("dailyResults") || "{}");
  if (!all[today]) all[today] = [];
  all[today].push({ expression, result, score });
  localStorage.setItem("dailyResults", JSON.stringify(all));
}

function submitExpression() {
  try {
    if (!isValidExpression(expression)) {
      alert("Invalid expression.");
      return;
    }

    const result = eval(expression);
    const score = Math.abs(result - target);

    saveResult(expression, result, score);
    results.push({ expression, result, score });

    if (score === 0) {
      const lastSolved = localStorage.getItem("lastSolvedDate");
      if (lastSolved !== getToday()) {
        streak += 1;
        localStorage.setItem("lastSolvedDate", getToday());
        localStorage.setItem("streak", streak.toString());
      }
    }

    renderResults();
    clearExpression();
  } catch (e) {
    alert("Error evaluating expression.");
  }
}

function renderResults() {
  targetEl.textContent = target;
  tableBody.innerHTML = "";
  results.forEach((r, i) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${i + 1}</td><td>${r.expression}</td><td>${r.result}</td><td>${r.score}</td>`;
    tableBody.appendChild(row);
  });

  scoreEl.textContent = results.length
    ? `Most recent score: ${results[results.length - 1].score}`
    : "";

  streakEl.textContent = `Streak: ${streak}`;
  renderArchive();
}

function renderArchive() {
  const all = JSON.parse(localStorage.getItem("dailyResults") || "{}");
  const days = Object.keys(all).slice(-30).reverse();
  archiveEl.innerHTML = days.map((date) => {
    const attempts = all[date];
    const perfects = attempts.filter((a) => a.score === 0).length;
    return `<div><strong>${date}</strong>: ${attempts.length} attempt(s), ${
      perfects > 0 ? `${perfects} Perfect Solution${perfects > 1 ? "s" : ""}` : "No perfect"
    }</div>`;
  }).join("");
}

// Initialize
renderDice();
renderResults();
