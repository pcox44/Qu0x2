const diceColors = {
  1: "number-1",
  2: "number-2",
  3: "number-3",
  4: "number-4",
  5: "number-5",
  6: "number-6",
};

const state = {
  dice: [],
  usedDiceIndices: new Set(),
  expression: "",
  archive: {},  // { 'YYYY-MM-DD': { target: number, attempts: [{expression, result, score}] } }
  streak: 0,
  streakLastDay: null,
  target: 0,
};

function formatDate(date = new Date()) {
  const options = { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" };
  const parts = new Intl.DateTimeFormat("en-US", options).formatToParts(date);
  const y = parts.find(p => p.type === "year").value;
  const m = parts.find(p => p.type === "month").value;
  const d = parts.find(p => p.type === "day").value;
  return `${y}-${m}-${d}`;
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function generateDice() {
  const dice = [];
  for (let i = 0; i < 5; i++) {
    dice.push(Math.floor(Math.random() * 6) + 1);
  }
  return dice;
}

function generateTarget(dice, dateStr) {
  let sum = 0;
  for (let ch of dateStr) sum += ch.charCodeAt(0);
  const diceSum = dice.reduce((a,b) => a+b, 0);
  sum += diceSum * 7;
  return (sum % 100) + 1;
}

function renderDice() {
  const diceContainer = document.getElementById("dice-container");
  diceContainer.innerHTML = "";

  state.dice.forEach((value, idx) => {
    const span = document.createElement("span");
    span.classList.add("horse-race-die", diceColors[value]);
    span.textContent = value;

    if (state.usedDiceIndices.has(idx)) {
      span.classList.add("used");
      span.onclick = null;
      span.title = "";
    } else {
      span.onclick = () => addDieToExpression(idx);
      span.title = "Click to use this die";
    }

    diceContainer.appendChild(span);
  });
}

function canAddNumberToExpression() {
  if (state.expression.length === 0) return true;
  const lastChar = state.expression[state.expression.length - 1];
  return !(/\d/.test(lastChar));
}

function addDieToExpression(dieIdx) {
  if (state.usedDiceIndices.has(dieIdx)) return;
  if (canAddNumberToExpression()) {
    state.expression += state.dice[dieIdx];
    state.usedDiceIndices.add(dieIdx);
    renderDice();
    updateExpressionAndResult();
  }
}

function addOp(op) {
  if (state.expression.length === 0) return;
  const lastChar = state.expression[state.expression.length - 1];
  if ("+-*/()".includes(lastChar)) return; // prevent consecutive operators
  state.expression += op;
  updateExpressionAndResult();
}

function backspace() {
  if (state.expression.length === 0) return;
  const lastChar = state.expression.slice(-1);
  state.expression = state.expression.slice(0, -1);

  // If last char was a digit, find which die it was and mark unused
  if (/\d/.test(lastChar)) {
    // Find the die index whose number matches and is currently used in expression once less
    // Since dice can repeat numbers, we track usage count carefully

    // Count dice numbers used currently in expression:
    const usedNums = Array(5).fill(0);
    for (let i = 0; i < state.expression.length; i++) {
      const ch = state.expression[i];
      if (/\d/.test(ch)) {
        for (let di = 0; di < state.dice.length; di++) {
          if (state.dice[di] === Number(ch)) usedNums[di]++;
        }
      }
    }
    // Reset usedDiceIndices based on counts:
    state.usedDiceIndices.clear();
    // We'll reassign dice used indices based on expression numbers (the first occurrence)
    let exprNums = state.expression.match(/\d/g) || [];
    const diceCopy = [...state.dice];
    exprNums.forEach(n => {
      for (let di = 0; di < diceCopy.length; di++) {
        if (diceCopy[di] === Number(n)) {
          state.usedDiceIndices.add(di);
          diceCopy[di] = null; // so we don't use same die twice
          break;
        }
      }
    });
  }
  renderDice();
  updateExpressionAndResult();
}

function clearExpression() {
  state.expression = "";
  state.usedDiceIndices.clear();
  renderDice();
  updateExpressionAndResult();
}

function safeEval(expr) {
  try {
    // Only allow digits, operators, and parentheses
    if (!/^[\d+\-*/()\s]+$/.test(expr)) return null;
    // Disallow consecutive numbers without operator: We check in submit, so we can skip here
    const val = eval(expr);
    if (typeof val !== "number" || !isFinite(val)) return null;
    return val;
  } catch {
    return null;
  }
}

function updateExpressionAndResult() {
  const exprEl = document.getElementById("expression");
  exprEl.value = state.expression || "";

  if (state.expression.length === 0) {
    updateLiveResult("-");
    updateScoreDisplay("-");
    return;
  }

  const val = safeEval(state.expression);
  if (val === null) {
    updateLiveResult("Invalid");
    updateScoreDisplay("-");
    return;
  }

  updateLiveResult(val);
  updateScoreDisplay(Math.abs(val - state.target));
}

function updateLiveResult(val) {
  const liveResultEl = document.getElementById("live-result");
  if (typeof val === "number") {
    liveResultEl.textContent = `Result: ${Math.round(val)}`;
  } else {
    liveResultEl.textContent = `Result: ${val}`;
  }
}

function updateScoreDisplay(score) {
  const scoreEl = document.getElementById("score-display");
  if (typeof score === "number") {
    scoreEl.textContent = `Score: ${Math.round(score)}`;
  } else {
    scoreEl.textContent = `Score: ${score}`;
  }
}

function submitExpression() {
  if (state.expression.length === 0) return alert("Enter an expression first!");

  // Check if all dice used exactly once
  if (state.usedDiceIndices.size !== state.dice.length) {
    return alert("You must use each die exactly once!");
  }

  // Check if expression is valid and has operators between numbers (no concatenation)
  if (!isValidExpression(state.expression)) {
    return alert("Invalid expression! You cannot combine dice digits directly without operator or parenthesis.");
  }

  const result = safeEval(state.expression);
  if (result === null) return alert("Invalid expression.");

  const roundedResult = Math.round(result);
  const score = Math.abs(roundedResult - state.target);

  const today = formatDate();
  if (!state.archive[today]) {
    state.archive[today] = { target: state.target, attempts: [] };
  }
  state.archive[today].attempts.push({
    expression: state.expression,
    result: roundedResult,
    score,
  });

  // Update streak logic
  if (score === 0) {
    const lastDay = state.streakLastDay;
    const todayDate = new Date(today);
    const yesterdayDate = new Date(todayDate);
    yesterdayDate.setDate(todayDate.getDate() - 1);

    if (lastDay === formatDate(yesterdayDate)) {
      state.streak++;
    } else if (lastDay !== today) {
      state.streak = 1;
    }
    state.streakLastDay = today;
  }

  clearExpression();
  saveState();
  renderArchive();
  updateStreakDisplay();
}

function isValidExpression(expr) {
  // Disallow any two digits adjacent without operator or parenthesis between
  // For example "45" not allowed if 4 and 5 are separate dice
  // We can check if the expression contains any 2+ digit numbers by regex

  // Remove spaces just in case
  const noSpaces = expr.replace(/\s+/g, "");

  // Find all numbers (sequence of digits)
  const numbers = noSpaces.match(/\d+/g) || [];
  for (const numStr of numbers) {
    if (numStr.length > 1) {
      // More than one digit together — invalid
      return false;
    }
  }
  return true;
}

function renderArchive() {
  const archiveEl = document.getElementById("archive");
  archiveEl.innerHTML = "";

  const today = formatDate();
  if (!state.archive[today]) {
    archiveEl.textContent = "No attempts yet today.";
    return;
  }

  const dayData = state.archive[today];
  const header = document.createElement("div");
  header.innerHTML = `<strong>Target: ${dayData.target}</strong>`;
  archiveEl.appendChild(header);

  // List attempts
  dayData.attempts.forEach(({ expression, result, score }, i) => {
    const div = document.createElement("div");
    div.classList.add("archive-attempt");
    div.textContent = `${expression} = ${result} (score: ${score})`;
    if (score === 0) {
      div.classList.add("archive-perfect");
    }
    archiveEl.appendChild(div);
  });
}

function updateStreakDisplay() {
  const streakEl = document.getElementById("streak");
  streakEl.textContent = `Current Streak: ${state.streak}`;
}

function saveState() {
  localStorage.setItem(
    "dailyDiceGameState",
    JSON.stringify({
      archive: state.archive,
      streak: state.streak,
      streakLastDay: state.streakLastDay,
      dice: state.dice,
      target: state.target,
    })
  );
}

function loadState() {
  const saved = localStorage.getItem("dailyDiceGameState");
  if (saved) {
    const obj = JSON.parse(saved);
    state.archive = obj.archive || {};
    state.streak = obj.streak || 0;
    state.streakLastDay = obj.streakLastDay || null;
    state.dice = obj.dice || generateDice();
    state.target = obj.target || generateTarget(state.dice, formatDate());
  } else {
    state.dice = generateDice();
    state.target = generateTarget(state.dice, formatDate());
  }
}

function initGame() {
  loadState();

  // Set target number
  document.getElementById("target-number").textContent = state.target;

  renderDice();
  updateExpressionAndResult();
  renderArchive();
  updateStreakDisplay();
}

document.addEventListener("DOMContentLoaded", () => {
  initGame();

  document.getElementById("btn-submit").onclick = submitExpression;
  document.getElementById("btn-clear").onclick = clearExpression;
  document.getElementById("btn-backspace").onclick = backspace;

  document.querySelectorAll(".btn-op").forEach((button) => {
    button.onclick = () => addOp(button.textContent);
  });
});
