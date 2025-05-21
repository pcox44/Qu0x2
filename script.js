// Seeded random by date string, deterministic dice and target
function seedRandom(seed) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  return function () {
    h += h << 13;
    h ^= h >>> 7;
    h += h << 3;
    h ^= h >>> 17;
    h += h << 5;
    return (h >>> 0) / 4294967296;
  };
}

const maxSolutionsToStore = 100;

let state = {
  dateStr: '',
  target: 0,
  dice: [],
  expression: '',
  usedDice: [],
  submissions: [],
  streak: 0,
  archive: {},
};

const diceColors = {
  1: 'dice1',
  2: 'dice2',
  3: 'dice3',
  4: 'dice4',
  5: 'dice5',
  6: 'dice6',
};

function getTodayString() {
  // Date at midnight ET
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  // ET is UTC-4 or UTC-5 depending on DST, here assume UTC-4 (EDT)
  const EToffset = 4 * 60 * 60000;
  const et = new Date(utc - EToffset);
  return et.toISOString().slice(0, 10);
}

function generatePuzzle(dateStr) {
  const rand = seedRandom(dateStr);
  // Target 1 to 100
  const target = 1 + Math.floor(rand() * 100);

  // Generate 5 dice 1-6
  const dice = [];
  for (let i = 0; i < 5; i++) {
    dice.push(1 + Math.floor(rand() * 6));
  }

  return { target, dice };
}

function saveState() {
  localStorage.setItem('dailyDiceState', JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem('dailyDiceState');
  if (saved) {
    try {
      const loaded = JSON.parse(saved);
      // Only load if same day
      if (loaded.dateStr === getTodayString()) {
        state = loaded;
        return;
      }
    } catch {}
  }
  // Otherwise generate new puzzle
  const dateStr = getTodayString();
  const { target, dice } = generatePuzzle(dateStr);
  state = {
    dateStr,
    target,
    dice,
    expression: '',
    usedDice: [],
    submissions: [],
    streak: 0,
    archive: loadArchive(),
  };
  saveState();
}

function loadArchive() {
  const saved = localStorage.getItem('dailyDiceArchive');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {}
  }
  return {};
}

function saveArchive() {
  localStorage.setItem('dailyDiceArchive', JSON.stringify(state.archive));
}

function updateUI() {
  // Target number
  document.getElementById('target').textContent = `Target: ${state.target}`;

  // Dice display
  const diceContainer = document.getElementById('dice-container');
  diceContainer.innerHTML = '';
  state.dice.forEach((val, i) => {
    const d = document.createElement('div');
    d.classList.add('dice', diceColors[val]);
    d.textContent = val;
    if (state.usedDice.includes(i)) {
      d.classList.add('used');
    } else {
      d.style.cursor = 'pointer';
      d.onclick = () => {
        if (!state.usedDice.includes(i)) {
          state.usedDice.push(i);
          addOp(val.toString());
          updateUI();
        }
      };
    }
    diceContainer.appendChild(d);
  });

  // Expression display
  document.getElementById('expression').textContent = state.expression;

  // Live result
  updateLiveResult();

  // Score display
  const scoreDiv = document.getElementById('score');
  scoreDiv.textContent = '';

  // Streak display
  const streakDiv = document.getElementById('streak');
  streakDiv.textContent = `Streak: ${state.streak}`;

  // Buttons smaller but consistent
  // Done in CSS

  renderResults();
  renderArchive();
}

function addOp(op) {
  state.expression += op;
  updateUI();
}

function clearExpression() {
  state.expression = '';
  state.usedDice = [];
  updateUI();
}

function backspace() {
  if (!state.expression) return;
  // Remove last char, and if last char was a digit from dice, remove used dice index for last dice used
  // We must track dice usage carefully by checking expression

  // This is complex because multiple dice might be same digit.

  // Simplest approach: remove last char, then recalc usedDice based on expression digits and dice
  state.expression = state.expression.slice(0, -1);

  // Rebuild usedDice from expression digits and dice availability
  // Count how many times each digit appears in expression
  let countDigits = {};
  for (const ch of state.expression) {
    if ('123456'.includes(ch)) {
      countDigits[ch] = (countDigits[ch] || 0) + 1;
    }
  }
  // Recalculate usedDice indices by matching dice values to counts
  let newUsed = [];
  const diceCopy = state.dice.slice();
  for (const dVal in countDigits) {
    let needed = countDigits[dVal];
    for (let i = 0; i < diceCopy.length && needed > 0; i++) {
      if (diceCopy[i] == Number(dVal)) {
        newUsed.push(i);
        needed--;
      }
    }
  }
  state.usedDice = newUsed;
  updateUI();
}

function safeEval(expr) {
  try {
    // Only allow digits, operators, parentheses
    if (!/^[0-9+\-*/(). ]*$/.test(expr)) return null;
    // Prevent empty
    if (expr.trim() === '') return null;

    // Evaluate using Function
    // Use eval fallback with Function
    // Be careful: no variables allowed
    let val = Function(`"use strict"; return (${expr})`)();

    if (typeof val === 'number' && isFinite(val)) return val;
  } catch {}
  return null;
}

function updateLiveResult() {
  const liveResultDiv = document.getElementById('live-result');
  const val = safeEval(state.expression);
  if (val === null) {
    liveResultDiv.textContent = '';
    return;
  }
  liveResultDiv.textContent = `Result: ${Math.round(val)}`;
}

function submitExpression() {
  const expr = state.expression.trim();
  if (!expr) return alert('Please enter an expression.');

  // Check all dice used exactly once
  if (state.usedDice.length !== state.dice.length) {
    return alert('Use all five dice exactly once.');
  }
  // Check no duplicate usage of dice indices
  const uniqueUsed = [...new Set(state.usedDice)];
  if (uniqueUsed.length !== state.dice.length) {
    return alert('Each die may only be used once.');
  }

  // Evaluate result
  const val = safeEval(expr);
  if (val === null) return alert('Invalid expression.');

  const resultRounded = Math.round(val);

  // Compute score difference absolute
  const diff = Math.abs(resultRounded - state.target);

  // Add submission (max keep last 100)
  state.submissions.unshift({
    expression: expr,
    result: resultRounded,
    diff: diff,
    timestamp: Date.now(),
  });
  if (state.submissions.length > maxSolutionsToStore) {
    state.submissions.pop();
  }

  // Update streak (only perfect solutions count)
  if (diff === 0) {
    state.streak++;
  } else {
    state.streak = 0;
  }

  // Save to archive by day
  if (!state.archive[state.dateStr]) {
    state.archive[state.dateStr] = [];
  }
  // Only add perfect solutions to archive
  if (diff === 0) {
    state.archive[state.dateStr].push({
      expression: expr,
      result: resultRounded,
      diff,
      timestamp: Date.now(),
    });
    saveArchive();
  }

  // Clear expression and used dice for next try
  state.expression = '';
  state.usedDice = [];

  saveState();
  updateUI();
}

function renderResults() {
  const tbody = document.querySelector('#results-table tbody');
  tbody.innerHTML = '';
  state.submissions.forEach((s, i) => {
    const tr = document.createElement('tr');
    const numTd = document.createElement('td');
    numTd.textContent = i + 1;
    const exprTd = document.createElement('td');
    exprTd.textContent = s.expression;
    const resTd = document.createElement('td');
    resTd.textContent = Math.round(s.result);
    const scoreTd = document.createElement('td');
    scoreTd.textContent = Math.round(s.diff);
    tr.appendChild(numTd);
    tr.appendChild(exprTd);
    tr.appendChild(resTd);
    tr.appendChild(scoreTd);
    tbody.appendChild(tr);
  });

  // Score display below expression after submit
  if (state.submissions.length) {
    const last = state.submissions[0];
    document.getElementById('score').textContent = `Score (difference): ${Math.round(last.diff)}`;
  }
}

function renderArchive() {
  const archiveDiv = document.getElementById('archive');
  archiveDiv.innerHTML = '';

  // Show last 30 days of archive sorted desc
  const days = Object.keys(state.archive)
    .sort()
    .reverse()
    .slice(0, 30);

  days.forEach((day) => {
    const subm = state.archive[day];
    const perfectCount = subm.filter((s) => s.diff === 0).length;

    const div = document.createElement('div');
    div.classList.add('archive-day');

    if (perfectCount > 0) {
      div.innerHTML = `<strong>${day}</strong>: ${perfectCount} Perfect Solution${perfectCount !== 1 ? 's' : ''} <span class="perfect">&#10003;</span>`;
    } else {
      div.innerHTML = `<strong>${day}</strong>: No Perfect Solutions`;
    }

    archiveDiv.appendChild(div);
  });

  if (days.length === 0) {
    archiveDiv.textContent = 'No archive data yet.';
  }
}

function init() {
  loadState();
  updateUI();
}

init();
