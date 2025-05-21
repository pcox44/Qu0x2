// script.js

const NUM_DICE = 5;
const MAX_DICE_VALUE = 6;

const diceContainer = document.getElementById('dice-container');
const targetNumberSpan = document.getElementById('target-number');
const inputField = document.getElementById('input-field');
const messageDiv = document.getElementById('message');
const liveResultSpan = document.getElementById('live-result');
const liveScoreSpan = document.getElementById('live-score');
const attemptsSpan = document.getElementById('attempts');
const perfectCountSpan = document.getElementById('perfect-count');
const streakSpan = document.getElementById('streak');
const archiveDiv = document.getElementById('archive');
const backspaceBtn = document.getElementById('backspace-btn');
const clearBtn = document.getElementById('clear-btn');

let diceValues = [];
let targetNumber;
let attempts = 0;
let perfectSolutions = 0;
let currentStreak = 0;

const STORAGE_KEY = 'daily-dice-game-data';

// Get current date string in Eastern Time (YYYY-MM-DD)
function getEasternDateString() {
  const now = new Date();
  const options = { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' };
  const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(now);
  
  let year, month, day;
  for (const part of parts) {
    if (part.type === 'year') year = part.value;
    else if (part.type === 'month') month = part.value;
    else if (part.type === 'day') day = part.value;
  }
  return `${year}-${month}-${day}`;
}

// Seed generator functions
function cyrb128(str) {
  let h1 = 1779033703, h2 = 3144134277,
      h3 = 1013904242, h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
      k = str.charCodeAt(i);
      h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
      h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
      h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
      h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1^h2^h3^h4) >>> 0];
}

function mulberry32(seed) {
  return function() {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

function seededRandom(seedStr) {
  const seed = cyrb128(seedStr)[0];
  return mulberry32(seed);
}

// Generate dice values and target number for the day
function generateDailyPuzzle() {
  const dateStr = getEasternDateString();
  const rng = seededRandom(dateStr);

  diceValues = [];
  for (let i = 0; i < NUM_DICE; i++) {
    diceValues.push(1 + Math.floor(rng() * MAX_DICE_VALUE));
  }

  // Target is random between 1 and 100
  targetNumber = 1 + Math.floor(rng() * 100);
}

// Render dice
function renderDice() {
  diceContainer.innerHTML = '';
  for (const val of diceValues) {
    const die = document.createElement('div');
    die.className = 'die';
    die.textContent = val;
    diceContainer.appendChild(die);
  }
}

// Evaluate user expression safely
function safeEval(expr) {
  // Only allow digits, whitespace, + - * / ( )
  if (!/^[0-9+\-*/().\s]+$/.test(expr)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const f = new Function(`return (${expr})`);
    const result = f();
    if (typeof result === 'number' && isFinite(result)) {
      return result;
    }
    return null;
  } catch {
    return null;
  }
}

// Check if all dice values are used exactly once in expression
function checkDiceUsage(expr) {
  // Extract numbers in the expression
  const numbers = expr.match(/\d+/g);
  if (!numbers) return false;

  const usedCounts = {};
  for (const numStr of numbers) {
    const num = parseInt(numStr, 10);
    if (!diceValues.includes(num)) return false;
    usedCounts[num] = (usedCounts[num] || 0) + 1;
  }

  // Check counts match dice counts exactly
  const diceCounts = {};
  for (const d of diceValues) diceCounts[d] = (diceCounts[d] || 0) + 1;

  for (const val in diceCounts) {
    if ((usedCounts[val] || 0) !== diceCounts[val]) return false;
  }

  // Also ensure no extra numbers beyond dice used
  if (Object.keys(usedCounts).length !== Object.keys(diceCounts).length) return false;

  return true;
}

// Load stats and attempts from localStorage
function loadData() {
  const dataRaw = localStorage.getItem(STORAGE_KEY);
  if (!dataRaw) return null;
  try {
    return JSON.parse(dataRaw);
  } catch {
    return null;
  }
}

// Save stats and attempts to localStorage
function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Update UI stats
function updateStatsUI(data) {
  attemptsSpan.textContent = data.attempts;
  perfectCountSpan.textContent = data.perfectSolutions;
  streakSpan.textContent = data.currentStreak;
}

// Add attempt to archive UI
function addAttemptToArchive(attempt) {
  const entry = document.createElement('div');
  entry.className = 'archive-entry';

  const exprSpan = document.createElement('div');
  exprSpan.className = 'archive-expression';
  exprSpan.textContent = attempt.expression;

  const resultSpan = document.createElement('div');
  resultSpan.className = 'archive-result';
  resultSpan.textContent = attempt.result;

  const scoreSpan = document.createElement('div');
  scoreSpan.className = 'archive-score';
  scoreSpan.textContent = attempt.score;

  entry.appendChild(exprSpan);
  entry.appendChild(resultSpan);
  entry.appendChild(scoreSpan);

  archiveDiv.prepend(entry);
}

// Clear archive UI
function clearArchiveUI() {
  archiveDiv.innerHTML = '';
}

// Initialize game data for the day or load from storage
function initGame() {
  const dateStr = getEasternDateString();
  let data = loadData();

  if (!data || data.date !== dateStr) {
    data = {
      date: dateStr,
      attempts: 0,
      perfectSolutions: 0,
      currentStreak: 0,
      attemptsList: []
    };
    saveData(data);
  }

  attempts = data.attempts;
  perfectSolutions = data.perfectSolutions;
  currentStreak = data.currentStreak;

  updateStatsUI(data);
  clearArchiveUI();
  for (const att of data.attemptsList) {
    addAttemptToArchive(att);
  }
}

// Process user input expression
function processInput() {
  const expr = inputField.value.trim();
  if (!expr) {
    liveResultSpan.textContent = '-';
    liveScoreSpan.textContent = '-';
    messageDiv.textContent = '';
    return;
  }

  if (!checkDiceUsage(expr)) {
    liveResultSpan.textContent = '-';
    liveScoreSpan.textContent = '-';
    messageDiv.textContent = 'Expression must use each dice value exactly once.';
    return;
  }

  const result = safeEval(expr);
  if (result === null) {
    liveResultSpan.textContent = '-';
    liveScoreSpan.textContent = '-';
    messageDiv.textContent = 'Invalid expression.';
    return;
  }

  // Round result to 4 decimals internally but display cleanly without trailing zeros
  const roundedResult = Math.round(result * 10000) / 10000;
  const displayResult = Number.isInteger(roundedResult) ? roundedResult : roundedResult.toString();

  const score = Math.abs(roundedResult - targetNumber);
  const displayScore = Number.isInteger(score) ? score : score.toFixed(4).replace(/\.?0+$/, '');

  liveResultSpan.textContent = displayResult;
  liveScoreSpan.textContent = displayScore;

  messageDiv.textContent = '';

  // Save attempt on Enter key or otherwise
  // For this version, on every change do not save automatically
}

// Save current attempt and update stats
function saveAttempt() {
  const expr = inputField.value.trim();
  if (!expr) {
    messageDiv.textContent = 'Please enter an expression first.';
    return;
  }

  if (!checkDiceUsage(expr)) {
    messageDiv.textContent = 'Expression must use each dice value exactly once.';
    return;
  }

  const result = safeEval(expr);
  if (result === null) {
    messageDiv.textContent = 'Invalid expression.';
    return;
  }

  const roundedResult = Math.round(result * 10000) / 10000;
  const score = Math.abs(roundedResult - targetNumber);

  const dateStr = getEasternDateString();
  let data = loadData();
  if (!data || data.date !== dateStr) {
    data = {
      date: dateStr,
      attempts: 0,
      perfectSolutions: 0,
      currentStreak: 0,
      attemptsList: []
    };
  }

  data.attempts += 1;

  if (score === 0) {
    data.perfectSolutions += 1;
    data.currentStreak += 1;
    messageDiv.textContent = '🎉 Perfect match! Great job!';
  } else {
    data.currentStreak = 0;
    messageDiv.textContent = '';
  }

  data.attemptsList.push({
    expression: expr,
    result: Number.isInteger(roundedResult) ? roundedResult : roundedResult.toString(),
    score: Number.isInteger(score) ? score : score.toFixed(4).replace(/\.?0+$/, '')
  });

  saveData(data);

  attempts = data.attempts;
  perfectSolutions = data.perfectSolutions;
  currentStreak = data.currentStreak;

  updateStatsUI(data);
  addAttemptToArchive(data.attemptsList[data.attemptsList.length - 1]);

  // Clear input for next attempt
  inputField.value = '';
  liveResultSpan.textContent = '-';
  liveScoreSpan.textContent = '-';
}

// Event listeners
inputField.addEventListener('input', processInput);

inputField.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    saveAttempt();
  }
});

backspaceBtn.addEventListener('click', () => {
  inputField.value = inputField.value.slice(0, -1);
  processInput();
});

clearBtn.addEventListener('click', () => {
  inputField.value = '';
  processInput();
});

// Initialize everything on load
window.onload = () => {
  generateDailyPuzzle();
  targetNumberSpan.textContent = targetNumber;
  renderDice();
  initGame();
};
