// --- Utility to format date as YYYY-MM-DD ---
function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

// --- Horse racing dice colors mapping for classes ---
const diceClassMap = {
  1: 'die-1',
  2: 'die-2',
  3: 'die-3',
  4: 'die-4',
  5: 'die-5',
  6: 'die-6',
};

// --- Game variables ---
const diceCount = 5;
let diceValues = [];
let targetNumber = 0;

// DOM Elements
const diceContainer = document.getElementById('dice-container');
const answerInput = document.getElementById('answer-input');
const backspaceBtn = document.getElementById('backspace-btn');
const clearBtn = document.getElementById('clear-btn');
const submitBtn = document.getElementById('submit-btn');
const resultMessage = document.getElementById('result-message');
const scoreMessage = document.getElementById('score-message');
const streakMessage = document.getElementById('streak-message');
const archiveList = document.getElementById('archive-list');
const targetDisplay = document.getElementById('target-number');

let streak = 0;

// --- Generate dice values (random 1-6, 5 dice) ---
function generateDice() {
  diceValues = [];
  for (let i = 0; i < diceCount; i++) {
    diceValues.push(Math.floor(Math.random() * 6) + 1);
  }
}

// --- Generate target number between 1 and 100 ---
function generateTarget() {
  targetNumber = Math.floor(Math.random() * 100) + 1;
}

// --- Display dice with colors ---
function displayDice() {
  diceContainer.innerHTML = '';
  for (let d of diceValues) {
    const dieDiv = document.createElement('div');
    dieDiv.classList.add('die', diceClassMap[d]);
    dieDiv.textContent = d;
    diceContainer.appendChild(dieDiv);
  }
}

// --- Display target number ---
function displayTarget() {
  targetDisplay.textContent = `Target Number: ${targetNumber}`;
}

// --- Validate input uses all dice once ---
function usesAllDiceOnce(expr) {
  // Extract digits 1-6 from input (ignore operators and spaces)
  // Count frequency of each dice number
  const digitsUsed = expr.match(/[1-6]/g) || [];
  if (digitsUsed.length !== diceCount) return false;

  // Count dice values
  let diceCountMap = {};
  for (let d of diceValues) {
    diceCountMap[d] = (diceCountMap[d] || 0) + 1;
  }

  // Count digits in input
  let inputCountMap = {};
  for (let d of digitsUsed) {
    let n = parseInt(d, 10);
    inputCountMap[n] = (inputCountMap[n] || 0) + 1;
  }

  // Compare counts
  for (let key in diceCountMap) {
    if ((inputCountMap[key] || 0) !== diceCountMap[key]) return false;
  }

  // Check no extra dice numbers
  for (let key in inputCountMap) {
    if (!diceCountMap[key]) return false;
  }

  return true;
}

// --- Evaluate expression safely ---
function evaluateExpression(expr) {
  // Only allow digits, +, -, *, /, parentheses, and spaces
  if (!/^[0-9+\-*/().\s]+$/.test(expr)) return null;

  try {
    // eslint-disable-next-line no-eval
    let val = eval(expr);
    if (typeof val === 'number' && !isNaN(val) && isFinite(val)) return val;
  } catch {
    return null;
  }
  return null;
}

// --- Compute score: absolute difference from target ---
function computeScore(value) {
  return Math.abs(value - targetNumber);
}

// --- Save game progress to localStorage ---
function saveProgress(dateStr, dice, target, answer, score) {
  let progress = JSON.parse(localStorage.getItem('dailyDiceGameProgress') || '{}');
  progress[dateStr] = { dice, target, answer, score };
  localStorage.setItem('dailyDiceGameProgress', JSON.stringify(progress));
}

// --- Load archive from localStorage ---
function loadArchive() {
  archiveList.innerHTML = '';
  const progress = JSON.parse(localStorage.getItem('dailyDiceGameProgress') || '{}');

  // Sort dates descending
  const dates = Object.keys(progress).sort((a, b) => (a > b ? -1 : 1));

  for (let dateStr of dates) {
    const game = progress[dateStr];
    const li = document.createElement('li');
    li.textContent = `${dateStr}: Score ${game.score} — Answer: ${game.answer || '(none)'}`;
    archiveList.appendChild(li);
  }
}

// --- Load streak from localStorage ---
function loadStreak() {
  const stored = localStorage.getItem('dailyDiceGameStreak');
  if (stored) {
    streak = parseInt(stored, 10);
  } else {
    streak = 0;
  }
  updateStreakDisplay();
}

// --- Save streak ---
function saveStreak() {
  localStorage.setItem('dailyDiceGameStreak', streak.toString());
}

// --- Update streak display ---
function updateStreakDisplay() {
  streakMessage.textContent = `Current Perfect Streak: ${streak}`;
}

// --- Initialize a new game for today ---
function initGame() {
  // Check if saved game for today exists, else generate new
  const today = formatDate(new Date());
  const progress = JSON.parse(localStorage.getItem('dailyDiceGameProgress') || '{}');

  if (progress[today]) {
    diceValues = progress[today].dice;
    targetNumber = progress[today].target;
  } else {
    generateDice();
    generateTarget();
  }

  displayDice();
  displayTarget();
  resultMessage.textContent = '';
  scoreMessage.textContent = '';
  answerInput.value = '';
  updateStreakDisplay();
  loadArchive();
}

// --- Validate and submit answer ---
function submitAnswer() {
  const input = answerInput.value.trim();
  if (!input) {
    resultMessage.textContent = 'Please enter an expression.';
    return;
  }

  // Check dice usage
  if (!usesAllDiceOnce(input)) {
    resultMessage.textContent = 'Your expression must use all dice values exactly once.';
    return;
  }

  // Evaluate expression
  const val = evaluateExpression(input);
  if (val === null) {
    resultMessage.textContent = 'Invalid expression.';
    return;
  }

  // Compute score
  const score = computeScore(val);
  scoreMessage.textContent = `Your result: ${val.toFixed(2)}, Target: ${targetNumber}, Score: ${score.toFixed(2)}`;

  if (score === 0) {
    resultMessage.textContent = '🎉 Perfect! You matched the target exactly!';
    streak++;
  } else {
    resultMessage.textContent = 'Good try! Keep practicing.';
    streak = 0;
  }

  saveStreak();

  // Save progress for today
  const today = formatDate(new Date());
  saveProgress(today, diceValues, targetNumber, input, score.toFixed(2));
  loadArchive();
  updateStreakDisplay();
}

// --- Button event listeners ---
backspaceBtn.addEventListener('click', () => {
  answerInput.value = answerInput.value.slice(0, -1);
  answerInput.focus();
});

clearBtn.addEventListener('click', () => {
  answerInput.value = '';
  answerInput.focus();
});

submitBtn.addEventListener('click', () => {
  submitAnswer();
  answerInput.focus();
});

// Allow pressing Enter to submit answer
answerInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    submitAnswer();
  }
});

// --- On page load ---
loadStreak();
initGame();
