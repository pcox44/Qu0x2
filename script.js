// --- Utility: format Date as YYYY-MM-DD ---
function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

// Dice colors class map for horse racing style
const diceClassMap = {
  1: 'die-1',
  2: 'die-2',
  3: 'die-3',
  4: 'die-4',
  5: 'die-5',
  6: 'die-6',
};

// Game variables
const diceCount = 5;
let diceValues = [];
let targetNumber = 0;

// DOM elements
const diceContainer = document.getElementById('dice-container');
const targetDisplay = document.getElementById('target-number');
const answerInput = document.getElementById('answer-input');
const backspaceBtn = document.getElementById('backspace-btn');
const clearBtn = document.getElementById('clear-btn');
const submitBtn = document.getElementById('submit-btn');
const resultMessage = document.getElementById('result-message');
const scoreMessage = document.getElementById('score-message');
const streakMessage = document.getElementById('streak-message');
const archiveList = document.getElementById('archive-list');

let streak = 0;

// Generate dice (5 random numbers 1-6)
function generateDice() {
  diceValues = [];
  for (let i = 0; i < diceCount; i++) {
    diceValues.push(Math.floor(Math.random() * 6) + 1);
  }
}

// Generate target number between 1 and 100
function generateTarget() {
  targetNumber = Math.floor(Math.random() * 100) + 1;
}

// Display dice with colors
function displayDice() {
  diceContainer.innerHTML = '';
  for (const d of diceValues) {
    const die = document.createElement('div');
    die.classList.add('die', diceClassMap[d]);
    die.textContent = d;
    diceContainer.appendChild(die);
  }
}

// Display target number
function displayTarget() {
  targetDisplay.textContent = `Target Number: ${targetNumber}`;
}

// Check if expression uses all dice exactly once
function usesAllDiceOnce(expr) {
  const digitsUsed = expr.match(/[1-6]/g) || [];
  if (digitsUsed.length !== diceCount) return false;

  const diceCountMap = {};
  for (const d of diceValues) {
    diceCountMap[d] = (diceCountMap[d] || 0) + 1;
  }

  const inputCountMap = {};
  for (const d of digitsUsed) {
    inputCountMap[d] = (inputCountMap[d] || 0) + 1;
  }

  for (const key in diceCountMap) {
    if ((inputCountMap[key] || 0) !== diceCountMap[key]) return false;
  }
  for (const key in inputCountMap) {
    if (!diceCountMap[key]) return false;
  }
  return true;
}

// Safely evaluate expression
function evaluateExpression(expr) {
  // Only allow digits, +, -, *, /, parentheses, spaces
  if (!/^[0-9+\-*/().\s]+$/.test(expr)) return null;
  try {
    // eslint-disable-next-line no-eval
    const val = eval(expr);
    if (typeof val === 'number' && isFinite(val) && !isNaN(val)) {
      return val;
    }
  } catch {
    return null;
  }
  return null;
}

// Compute score (absolute difference from target)
function computeScore(value) {
  return Math.abs(value - targetNumber);
}

// Save progress to localStorage
function saveProgress(dateStr, dice, target, answer, score) {
  const progress = JSON.parse(localStorage.getItem('dailyDiceGameProgress') || '{}');
  progress[dateStr] = { dice, target, answer, score };
  localStorage.setItem('dailyDiceGameProgress', JSON.stringify(progress));
}

// Load archive from localStorage and show last 30 days
function loadArchive() {
  const progress = JSON.parse(localStorage.getItem('dailyDiceGameProgress') || '{}');
  archiveList.innerHTML = '';

  // Sort keys descending
  const dates = Object.keys(progress).sort((a, b) => (a < b ? 1 : -1));

  // Show last 30 days
  const last30 = dates.slice(0, 30);

  for (const dateStr of last30) {
    const game = progress[dateStr];
    const li = document.createElement('li');
    li.textContent = `${dateStr}: Score ${game.score} — Answer: ${game.answer || '(none)'}`;
    archiveList.appendChild(li);
  }
}

// Load streak from localStorage
function loadStreak() {
  const stored = localStorage.getItem('dailyDiceGameStreak');
  if (stored) {
    streak = parseInt(stored, 10);
  } else {
    streak = 0;
  }
  updateStreakDisplay();
}

// Save streak to localStorage
function saveStreak() {
  localStorage.setItem('dailyDiceGameStreak', streak.toString());
}

// Update streak display
function updateStreakDisplay() {
  streakMessage.textContent = `Current Perfect Streak: ${streak}`;
}

// Initialize a new game for today
function initGame() {
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
  loadStreak();
  updateStreakDisplay();
  loadArchive();
}

// Submit answer handler
function submitAnswer() {
  const input = answerInput.value.trim();
  if (!input) {
    resultMessage.textContent = 'Please enter an expression.';
    scoreMessage.textContent = '';
    return;
  }

  if (!usesAllDiceOnce(input)) {
    resultMessage.textContent = 'Your expression must use all dice values exactly once.';
    scoreMessage.textContent = '';
    return;
  }

  const val = evaluateExpression(input);
  if (val === null) {
    resultMessage.textContent = 'Invalid expression.';
    scoreMessage.textContent = '';
    return;
  }

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

  const today = formatDate(new Date());
  saveProgress(today, diceValues, targetNumber, input, score.toFixed(2));
  loadArchive();
  updateStreakDisplay();
}

// Button event listeners
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

answerInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    submitAnswer();
  }
});

// On page load
initGame();
