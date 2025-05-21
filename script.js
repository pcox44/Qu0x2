const diceContainer = document.getElementById("dice-container");
const expressionDiv = document.getElementById("expression");
const liveResultDiv = document.getElementById("live-result");
const scoreDisplay = document.getElementById("score-display");
const resultsTableBody = document.querySelector("#results-table tbody");
const archiveDiv = document.getElementById("archive");
const targetDiv = document.getElementById("target");
const buttonsDiv = document.getElementById("buttons");

let dice = [];
let target = 0;
let expression = "";
let submissions = [];
let streak = 0;
const maxArchiveDays = 30;

// Horse race colors keyed by dice value for easy reference
const diceColors = {
  1: "#CC0000",
  2: "#003399",
  3: "#009933",
  4: "#FFCC00",
  5: "#660066",
  6: "#FF6600"
};

// Generate dice and target for given date (seeded)
function generateDiceAndTarget(date) {
  // Simple seeded random for consistency per day
  function seedRandom(seed) {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }
  const seed = date.getFullYear() * 10000 + (date.getMonth()+1) * 100 + date.getDate();
  dice = [];
  for (let i = 0; i < 5; i++) {
    const val = Math.floor(seedRandom(seed + i) * 6) + 1;
    dice.push(val);
  }
  // Target from 50 to 250 (bigger range)
  target = Math.floor(seedRandom(seed + 10) * 201) + 50;
  targetDiv.textContent = `Target: ${target}`;
}

// Render dice, black out used dice
function renderDice() {
  diceContainer.innerHTML = "";
  const usedCounts = getUsedDiceCounts(expression);
  dice.forEach((d,i) => {
    const die = document.createElement("div");
    die.className = "die";
    die.textContent = d;
    die.dataset.value = d;
    die.style.color = diceColors[d];
    // Black out if used up
    if ((usedCounts[d] || 0) >= dice.filter(x => x===d).length) {
      die.classList.add("used");
      die.style.color = "white";
    }
    die.addEventListener("click", () => {
      if (!die.classList.contains("used")) addOp(d.toString());
    });
    diceContainer.appendChild(die);
  });
}

// Get counts of used dice digits in current expression
function getUsedDiceCounts(expr) {
  const counts = {};
  for (let ch of expr) {
    if ("123456".includes(ch)) {
      counts[ch] = (counts[ch] || 0) + 1;
    }
  }
  return counts;
}

// Add operation or digit to expression
function addOp(op) {
  expression += op;
  updateExpression();
}

// Backspace last character
function backspace() {
  expression = expression.slice(0, -1);
  updateExpression();
}

// Clear expression
function clearExpression() {
  expression = "";
  updateExpression();
  liveResultDiv.textContent = "";
  scoreDisplay.textContent = "";
}

// Try evaluate expression safely
function tryEvaluate(expr) {
  // Only allow numbers, + - * / () spaces
  if (!/^[0-9+\-*/()\s]+$/.test(expr)) return null;
  // Check dice counts not exceeded
  const counts = getUsedDiceCounts(expr);
  for (let d in counts) {
    const countInDice = dice.filter(x => x === Number(d)).length;
    if (counts[d] > countInDice) return null;
  }
  try {
    // eslint-disable-next-line no-eval
    let val = eval(expr);
    if (typeof val === "number" && isFinite(val)) {
      return val;
    }
  } catch {
    return null;
  }
  return null;
}

// Update expression display, live result, and dice blackening
function updateExpression() {
  expressionDiv.textContent = expression;
  const val = tryEvaluate(expression);
  if (val === null) {
    liveResultDiv.textContent = "Invalid expression";
    liveResultDiv.style.color = "red";
    scoreDisplay.textContent = "";
  } else {
    liveResultDiv.textContent = `Result: ${val.toFixed(4)}`;
    liveResultDiv.style.color = "#333";
    const diff = Math.abs(val - target);
    scoreDisplay.textContent = `Score (difference): ${diff.toFixed(4)}`;
    scoreDisplay.style.color = diff === 0 ? "green" : "#004488";
  }
  renderDice();
}

// Check if expressions are mathematically equivalent ignoring commutativity of + and *
function canonicalForm(expr) {
  // Remove spaces
  expr = expr.replace(/\s+/g, "");

  // A naive way: parse and sort add and multiply operands, but to keep it simple:
  // We'll just normalize + and * operands sorted alphabetically in a very simple way.
  // This is a very rough approximation to avoid duplicates like 3+5 and 5+3.
  // For better solution, you'd use a math parser library.

  try {
    // Replace all "-" with "+-" for split
    // Handle only + at top level, split by top-level +, then sort operands alphabetically
    let stack = [];
    let parts = [];
    let lastIndex = 0;
    for (let i = 0; i < expr.length; i++) {
      let c = expr[i];
      if (c === '(') stack.push('(');
      else if (c === ')') stack.pop();
      else if (c === '+' && stack.length === 0) {
        parts.push(expr.slice(lastIndex, i));
        lastIndex = i + 1;
      }
    }
    parts.push(expr.slice(lastIndex));
    parts = parts.map(p => p.trim()).filter(p => p !== "");
    parts.sort();

    return parts.join("+");
  } catch {
    return expr;
  }
}

// Submit current expression
function submitExpression() {
  const val = tryEvaluate(expression);
  if (val === null) {
    alert("Invalid expression or uses dice too many times.");
    return;
  }
  const diff = Math.abs(val - target);
  const cform = canonicalForm(expression);

  // Check if duplicate solution for today
  if (submissions.some(s => s.canonical === cform)) {
    alert("You already submitted this solution!");
    return;
  }

  submissions.push({ expr: expression, result: val, diff, canonical: cform });

  if (diff === 0) {
    streak++;
  } else {
    streak = 0;
  }
  saveData();
  renderResults();
  renderArchive();
  clearExpression();
}

// Render submissions table
function renderResults() {
  resultsTableBody.innerHTML = "";
  submissions.forEach((s, i) => {
    const tr = document.createElement("tr");
    const idxTd = document.createElement("td");
    idxTd.textContent = i + 1;
    const exprTd = document.createElement("td");
    exprTd.textContent = s.expr;
    const resTd = document.createElement("td");
    resTd.textContent = s.result.toFixed(4);
    const scoreTd = document.createElement("td");
    scoreTd.textContent = s.diff.toFixed(4);
    tr.appendChild(idxTd);
    tr.appendChild(exprTd);
    tr.appendChild(resTd);
    tr.appendChild(scoreTd);
    resultsTableBody.appendChild(tr);
  });
}

// Save data (submissions, streak, archive) to localStorage by date
function saveData() {
  const todayStr = getTodayStr();
  localStorage.setItem("daily-dice-submissions-" + todayStr, JSON.stringify(submissions));
  localStorage.setItem("daily-dice-streak", streak);
  updateArchive(todayStr, submissions);
}

// Load data for today from localStorage
function loadData() {
  const todayStr = getTodayStr();
  const subData = localStorage.getItem("daily-dice-submissions-" + todayStr);
  submissions = subData ? JSON.parse(subData) : [];
  streak = Number(localStorage.getItem("daily-dice-streak") || "0");
}

// Get date as YYYY-MM-DD string
function getTodayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

// Archive data structure keyed by date
let archiveData = {};

// Update archive data with today's submissions
function updateArchive(dateStr, submissions) {
  archiveData[dateStr] = submissions;
  // Save only last 30 days in archiveData
  const keys = Object.keys(archiveData).sort().slice(-maxArchiveDays);
  const newArchive = {};
  keys.forEach(k => {
    newArchive[k] = archiveData[k];
  });
  archiveData = newArchive;
  localStorage.setItem("daily-dice-archive", JSON.stringify(archiveData));
}

// Load archive from localStorage
function loadArchive() {
  const arch = localStorage.getItem("daily-dice-archive");
  archiveData = arch ? JSON.parse(arch) : {};
}

// Render archive nicely with checkmarks and count of unique solutions
function renderArchive() {
  archiveDiv.innerHTML = "";
  const keys = Object.keys(archiveData).sort().reverse().slice(0, maxArchiveDays);
  if (keys.length === 0) {
    archiveDiv.textContent = "No archive data yet.";
    return;
  }
  keys.forEach(day => {
    const div = document.createElement("div");
    div.className = "day";
    const subm = archiveData[day] || [];
    const perfectCount = subm.filter(s => s.diff === 0).length;
    const uniqueCount = subm.length;
    div.innerHTML = `<strong>${day}</strong>: ${uniqueCount} solution${uniqueCount !== 1 ? 's' : ''}`;
    if (perfectCount > 0) {
      div.innerHTML += ` <span class="perfect">Perfect! &#10003;</span>`;
      div.innerHTML += ` (${perfectCount} perfect solution${perfectCount !== 1 ? 's' : ''})`;
    }
    archiveDiv.appendChild(div);
  });
}

// Initialize
function init() {
  generateDiceAndTarget(new Date());
  loadData();
  loadArchive();
  renderDice();
  renderResults();
  renderArchive();
  updateExpression();
}

init();
