const state = {
  dice: [],
  usedDiceIndices: new Set(),
  expression: "",
  target: 0,
  archive: {},
  streak: 0,
  streakLastDay: null,
};

function generateDice() {
  // Five dice: 1–6 each, random colors assigned consistently
  // Just random numbers 1-6 for each die:
  return [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
  ];
}

const diceColors = ["red", "blue", "green", "orange", "purple"];

function generateTarget(dice, dateStr) {
  // Simple seeded hash to produce target number between 1 and 100
  // Sum dice + char codes from date string + modulo
  let seed = dice.reduce((a, b) => a + b, 0);
  for (const ch of dateStr) seed += ch.charCodeAt(0);
  return (seed * 7) % 100 + 1;
}

function formatDate() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function renderDice() {
  const container = document.getElementById("dice-container");
  container.innerHTML = "";
  state.dice.forEach((num, idx) => {
    const die = document.createElement("div");
    die.className = "die " + diceColors[idx % diceColors.length];
    if (state.usedDiceIndices.has(idx)) die.classList.add("used");
    die.textContent = num;
    die.title = `Die ${idx + 1}: ${num}`;
    die.onclick = () => useDie(idx);
    container.appendChild(die);
  });
}

function useDie(dieIdx) {
  if (state.usedDiceIndices.has(dieIdx)) return; // already used
  const dieNum = state.dice[dieIdx];

  // Prevent concatenation of numbers by checking last char in expression
  if (state.expression.length > 0) {
    const lastChar = state.expression.slice(-1);
    if (/\d/.test(lastChar)) return; // disallow direct digit after digit
  }

  state.expression += dieNum.toString();
  state.usedDiceIndices.add(dieIdx);
  renderDice();
  updateExpressionAndResult();
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

  // If last char was a digit, recalculate used dice indices
  if (/\d/.test(lastChar)) {
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
    if (!/^[\d+\-*/()\s]+$/.test(expr)) return null;
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

  updateLiveResult(Math.round(val));
  updateScoreDisplay(Math.abs(Math.round(val) - state.target));
}

function updateLiveResult(val) {
  const liveResultEl = document.getElementById("live-result");
  if (typeof val === "number") {
    liveResultEl.textContent = `Result: ${val}`;
  } else {
    liveResultEl.textContent = `Result: ${val}`;
  }
}

function updateScoreDisplay(score) {
  const scoreEl = document.getElementById("score-display");
  if (typeof score === "number") {
    scoreEl.textContent = `Score: ${score}`;
  } else {
    scoreEl.textContent = `Score: ${score}`;
  }
}

function submitExpression() {
  if (state.expression.length === 0) return alert("Enter an expression first!");

  if (state.usedDiceIndices.size !== state.dice.length) {
    return alert("You must use each die exactly once!");
  }

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
  updatePerfectCount();
}

function isValidExpression(expr) {
  const noSpaces = expr.replace(/\s+/g, "");
  const numbers = noSpaces.match(/\d+/g) || [];
  for (const numStr of numbers) {
    if (numStr.length > 1) {
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
  header.textContent = `Attempts for ${today} (Target: ${dayData.target}):`;
  header.style.fontWeight = "bold";
  header.style.marginBottom = "6px";
  archiveEl.appendChild(header);

  dayData.attempts.forEach((attempt, i) => {
    const div = document.createElement("div");
    div.className = "archive-attempt";
    div.textContent = `${i + 1}. ${attempt.expression} = ${attempt.result} (Score: ${attempt.score})`;
    if (attempt.score === 0) {
      div.classList.add("archive-perfect");
    }
    archiveEl.appendChild(div);
  });
}

function updatePerfectCount() {
  const perfectCountEl = document.getElementById("perfect-count");
  const today = formatDate();
  if (!state.archive[today]) {
    perfectCountEl.textContent = "";
    return;
  }
  const perfects = state.archive[today].attempts.filter(a => a.score === 0).length;
  if (perfects === 0) {
    perfectCountEl.textContent = "No Perfect Solutions Yet";
  } else if (perfects === 1) {
    perfectCountEl.textContent = "1 Perfect Solution!";
  } else {
    perfectCountEl.textContent = `${perfects} Perfect Solutions!`;
  }
}

function updateStreakDisplay() {
  const streakEl = document.getElementById("streak");
  streakEl.textContent = `Current Streak: ${state.streak}`;
}

function saveState() {
  try {
    localStorage.setItem("dailyDiceState", JSON.stringify({
      archive: state.archive,
      streak: state.streak,
      streakLastDay: state.streakLastDay,
    }));
  } catch (e) {
    // ignore localStorage errors
  }
}

function loadState() {
  try {
    const saved = localStorage.getItem("dailyDiceState");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.archive) state.archive = parsed.archive;
      if (typeof parsed.streak === "number") state.streak = parsed.streak;
      if (parsed.streakLastDay) state.streakLastDay = parsed.streakLastDay;
    }
  } catch (e) {
    // ignore load errors
  }
}

function setup() {
  loadState();

  // Setup dice and target for today:
  const today = formatDate();

  if (state.archive[today]) {
    // Use same dice & target if saved attempts exist:
    state.target = state.archive[today].target;
    // If we want to also keep dice fixed for day, store dice in archive too:
    // But currently dice are not stored — so let's store dice in archive next.

    if (state.archive[today].dice) {
      state.dice = state.archive[today].dice;
    } else {
      // fallback if dice not saved:
      state.dice = generateDice();
      state.archive[today].dice = state.dice;
      saveState();
    }
  } else {
    // New day: generate dice and target:
    state.dice = generateDice();
    state.target = generateTarget(state.dice, today);
    // Save dice and target:
    state.archive[today] = { target: state.target, attempts: [], dice: state.dice };
    saveState();
  }

  renderDice();
  document.getElementById("target-number").textContent = state.target;
  updateExpressionAndResult();
  renderArchive();
  updatePerfectCount();
  updateStreakDisplay();

  // Setup buttons
  document.querySelectorAll(".btn-op").forEach(btn => {
    btn.onclick = () => addOp(btn.textContent);
  });

  document.getElementById("btn-backspace").onclick = backspace;
  document.getElementById("btn-clear").onclick = clearExpression;
  document.getElementById("btn-submit").onclick = submitExpression;
}

setup();
