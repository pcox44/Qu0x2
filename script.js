// Daily Dice Game - Script
// Patrick Cox, 2025

// State variables
const state = {
  dice: [],          // Current dice values (5 numbers 1-6)
  usedDice: [],      // Indices of dice used in current expression
  expression: '',    // Current expression string
  target: 0,         // Target number to reach
  submissions: [],   // All submissions for today [{expression,result,diff,timestamp}]
  streak: 0,         // Consecutive perfect solution count
  archive: {},       // Archive of past 30 days results {dateStr: [solutions]}
  dateStr: '',       // Today date string e.g. '2025-05-21'
};

const maxArchiveDays = 30;
const maxSolutionsToStore = 100;

// Utility: format date string YYYY-MM-DD
function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

// Save state and archive to localStorage
function saveState() {
  localStorage.setItem('diceGameState', JSON.stringify({
    submissions: state.submissions,
    streak: state.streak,
    expression: state.expression,
    usedDice: state.usedDice,
    dateStr: state.dateStr,
    dice: state.dice,
  }));
}
function saveArchive() {
  localStorage.setItem('diceGameArchive', JSON.stringify(state.archive));
}

// Load state and archive from localStorage
function loadState() {
  const stored = localStorage.getItem('diceGameState');
  if (stored) {
    try {
      const obj = JSON.parse(stored);
      if (obj.dateStr === formatDate(new Date())) {
        state.submissions = obj.submissions || [];
        state.streak = obj.streak || 0;
        state.expression = obj.expression || '';
        state.usedDice = obj.usedDice || [];
        state.dateStr = obj.dateStr;
        state.dice = obj.dice || [];
      }
    } catch {}
  }
}
function loadArchive() {
  const stored = localStorage.getItem('diceGameArchive');
  if (stored) {
    try {
      state.archive = JSON.parse(stored);
    } catch {}
  }
}

// Generate random dice (five dice, 1 to 6)
function generateDice() {
  const dice = [];
  for (let i = 0; i < 5; i++) {
    dice.push(Math.floor(Math.random() * 6) + 1);
  }
  return dice;
}

// Generate target number (1 to 100)
function generateTarget() {
  return Math.floor(Math.random() * 100) + 1;
}

// Initialize game for the day
function initGame() {
  const todayStr = formatDate(new Date());
  state.dateStr = todayStr;
  loadArchive();
  loadState();

  // If no dice for today, generate fresh
  if (!state.dice.length || state.dateStr !== todayStr) {
    state.dice = generateDice();
    state.target = generateTarget();
    state.expression = '';
    state.usedDice = [];
    state.submissions = [];
    saveState();
  }
  updateUI();
}

// Check if a dice index is used
function isDiceUsed(index) {
  return state.usedDice.includes(index);
}

// Add dice value to expression (must not be used already)
function addDice(index) {
  if (isDiceUsed(index)) return;
  state.usedDice.push(index);
  state.expression += state.dice[index];
  saveState();
  updateUI();
}

// Add operator or parenthesis to expression
function addOp(op) {
  // Only allow operator if expression not empty or op is '('
  if (op === '(') {
    state.expression += op;
    saveState();
    updateUI();
    return;
  }
  if (!state.expression) return; // no operator first unless '('
  // Prevent two operators in a row (except '(' or ')')
  const lastChar = state.expression.slice(-1);
  if ('+-*/'.includes(lastChar) && '+-*/'.includes(op)) return;
  // Append operator
  state.expression += op;
  saveState();
  updateUI();
}

// Backspace last character
function backspace() {
  if (!state.expression) return;
  // Remove last char
  const lastChar = state.expression.slice(-1);
  state.expression = state.expression.slice(0, -1);

  // If lastChar was a digit, remove last used dice index (if matches)
  if (/\d/.test(lastChar)) {
    // Remove last dice used that matches this digit (search from right)
    for (let i = state.usedDice.length - 1; i >= 0; i--) {
      if (state.dice[state.usedDice[i]] == lastChar) {
        state.usedDice.splice(i, 1);
        break;
      }
    }
  }

  saveState();
  updateUI();
}

// Clear expression & used dice
function clearExpression() {
  state.expression = '';
  state.usedDice = [];
  saveState();
  updateUI();
}

// Safe eval function for simple math expressions
function safeEval(expr) {
  // Disallow letters or invalid chars except numbers and operators
  if (/[^0-9+\-*/().\s]/.test(expr)) return null;
  try {
    // eslint-disable-next-line no-eval
    const val = eval(expr);
    if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
      return val;
    }
    return null;
  } catch {
    return null;
  }
}

// Submit current expression for scoring
function submitExpression() {
  const expr = state.expression.trim();
  if (!expr) return alert('Please enter an expression.');

  // Must use all five dice exactly once
  if (state.usedDice.length !== state.dice.length) {
    return alert('You must use all five dice exactly once.');
  }

  // Check no duplicate dice usage
  const uniqueUsed = [...new Set(state.usedDice)];
  if (uniqueUsed.length !== state.dice.length) {
    return alert('Each die may only be used once.');
  }

  // Disallow concatenation of dice digits (no adjacent digits)
  const exprNoSpaces = expr.replace(/\s+/g, '');
  if (/[0-9]{2,}/.test(exprNoSpaces)) {
    return alert('You cannot concatenate dice values. Use operators or parentheses between every number.');
  }

  // Evaluate expression safely
  const val = safeEval(expr);
  if (val === null) return alert('Invalid expression.');

  // Round result to nearest integer for scoring
  const resultRounded = Math.round(val);

  // Calculate score (absolute difference from target)
  const diff = Math.abs(resultRounded - state.target);

  // Save submission (keep last maxSolutionsToStore)
  state.submissions.unshift({
    expression: expr,
    result: resultRounded,
    diff: diff,
    timestamp: Date.now(),
  });
  if (state.submissions.length > maxSolutionsToStore) {
    state.submissions.pop();
  }

  // Update streak count for perfect solutions
  if (diff === 0) {
    state.streak++;
  } else {
    state.streak = 0;
  }

  // Add perfect solutions to archive for today's date
  if (!state.archive[state.dateStr]) {
    state.archive[state.dateStr] = [];
  }
  if (diff === 0) {
    state.archive[state.dateStr].push({
      expression: expr,
      result: resultRounded,
      diff,
      timestamp: Date.now(),
    });
    // Limit archive to last 30 days only
    cleanupArchive();
    saveArchive();
  }

  // Clear current expression and used dice for next try
  state.expression = '';
  state.usedDice = [];

  saveState();
  updateUI();
}

// Remove archive entries older than maxArchiveDays
function cleanupArchive() {
  const today = new Date();
  for (const day in state.archive) {
    const dayDate = new Date(day);
    const diffDays = (today - dayDate) / (1000 * 60 * 60 * 24);
    if (diffDays > maxArchiveDays) {
      delete state.archive[day];
    }
  }
}

// Update all UI elements
function updateUI() {
  // Update target number display
  document.getElementById('target').textContent = `Target: ${state.target}`;

  // Render dice buttons with colors, mark used dice
  const diceContainer = document.getElementById('dice-buttons');
  diceContainer.innerHTML = '';
  state.dice.forEach((val, i) => {
    const btn = document.createElement('button');
    btn.textContent = val;
    btn.className = 'dice';
    btn.dataset.value = val;
    if (isDiceUsed(i)) btn.classList.add('used');
    btn.onclick = () => addDice(i);
    btn.setAttribute('aria-pressed', isDiceUsed(i));
    btn.setAttribute('aria-label', `Dice value ${val}${isDiceUsed(i) ? ', used' : ''}`);
    diceContainer.appendChild(btn);
  });

  // Show current expression
  document.getElementById('expression').textContent = state.expression || '...';

  // Live evaluation if expression valid & no concat violation
  const exprNoSpaces = state.expression.replace(/\s+/g, '');
  let liveVal = null;
  if (
    state.expression &&
    !/[0-9]{2,}/.test(exprNoSpaces) &&
    !/[^\d+\-*/().\s]/.test(state.expression)
  ) {
    liveVal = safeEval(state.expression);
  }
  const liveResultEl = document.getElementById('live-result');
  if (liveVal !== null) {
    liveResultEl.textContent = `Current Result: ${liveVal.toFixed(3)}`;
  } else {
    liveResultEl.textContent = 'Current Result: -';
  }

  // Show current best score from submissions
  const scoreEl = document.getElementById('score');
  if (state.submissions.length === 0) {
    scoreEl.textContent = 'No submissions yet.';
  } else {
    const best = state.submissions.reduce((acc, cur) => (cur.diff < acc.diff ? cur : acc));
    scoreEl.textContent = `Best Score: ${best.diff} (Result: ${best.result})`;
  }

  // Show current streak
  document.getElementById('streak').textContent = `Streak (perfect matches): ${state.streak}`;

  // Render archive
  renderArchive();
}

// Render archive list of perfect solutions by day
function renderArchive() {
  const archiveEl = document.getElementById('archive');
  archiveEl.innerHTML = '';
  const days = Object.keys(state.archive).sort((a, b) => (a < b ? 1 : -1)); // recent first
  days.forEach((day) => {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'archive-day';
    const dateH4 = document.createElement('h4');
    dateH4.textContent = day;
    dayDiv.appendChild(dateH4);

    const sols = state.archive[day];
    const list = document.createElement('ul');
    sols.forEach((sol) => {
      const li = document.createElement('li');
      li.textContent = `${sol.expression} = ${sol.result}`;
      list.appendChild(li);
    });
    dayDiv.appendChild(list);
    archiveEl.appendChild(dayDiv);
  });
}

// Initialize the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initGame();

  // Button event listeners
  document.getElementById('btn-backspace').onclick = backspace;
  document.getElementById('btn-clear').onclick = clearExpression;
  document.getElementById('btn-submit').onclick = submitExpression;

  // Operator buttons
  ['+', '-', '*', '/', '(', ')'].forEach((op) => {
    document.getElementById(`btn-op-${op}`).onclick = () => addOp(op);
  });
});
