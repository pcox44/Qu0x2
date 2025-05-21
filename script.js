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

// --- DOM Elements ---
const diceContainer = document.getElementById('dice-container');
const answerInput = document.getElementById('answer-input');
const backspaceBtn = document.getElementById('backspace-btn');
const clearBtn = document.getElementById('clear-btn');
const submitBtn = document.getElementById('submit-btn');
const resultMessage = document.getElementById('result-message');
const scoreMessage = document.getElementById('score-message');
const archiveList = document.getElementById('archive-list');


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
  const dates = Object.keys(progress).sort((a,b) => (a > b ? -1 : 1));

  for (let date of dates) {
    const entry = progress[date];
    let li = document.createElement('li');
    li.textContent = `${date} — Dice: [${entry.dice.join(', ')}], Target: ${entry.target}, Your Answer: ${entry.answer}, Score: ${entry.score}`;
    archiveList.appendChild(li);
  }
}

// --- Seed past 30 days archive with fake data ---
function seedArchive() {
  let progress = JSON.parse(localStorage.getItem('dailyDiceGameProgress') || '{}');
  if (Object.keys(progress).length >= 30) return; // Already seeded

  for (let i = 1; i <= 30; i++) {
    let date = new Date();
    date.setDate(date.getDate() - i);
    let dateStr = formatDate(date);

    // Generate fake dice and target
    let dice = [];
    for (let j = 0; j < diceCount; j++) dice.push(Math.floor(Math.random() * 6) + 1);
    let target = Math.floor(Math.random() * 100) + 1;

    // Fake answer and score (random within +/- 20 of target)
    let fakeAnswer = target + (Math.floor(Math.random() * 41) - 20);
    if (fakeAnswer < 1) fakeAnswer = 1;

    let score = Math.abs(fakeAnswer - target);

    progress[dateStr] = { dice, target, answer: fakeAnswer.toString(), score };
  }
  localStorage.setItem('dailyDiceGameProgress', JSON.stringify(progress));
}

// --- Initialize game for today ---
function initGame() {
  const todayStr = formatDate(new Date());
  const progress = JSON.parse(localStorage.getItem('dailyDiceGameProgress') || '{}');

  // If today’s game exists, load it, else create new
  if (progress[todayStr]) {
    diceValues = progress[todayStr].dice;
    targetNumber = progress[todayStr].target;
  } else {
    generateDice();
    generateTarget();
    // Save immediately
    saveProgress(todayStr, diceValues, targetNumber, '', null);
  }

  displayDice();
  answerInput.value = '';
  resultMessage.textContent = '';
  scoreMessage.textContent = `Target Number: ${targetNumber}`;
  loadArchive();
}

// --- Event listeners ---
backspaceBtn.addEventListener('click', () => {
  answerInput.value = answerInput.value.slice(0, -1);
  answerInput.focus();
});

clearBtn.addEventListener('click', () => {
  answerInput.value = '';
  answerInput.focus();
});

submitBtn.addEventListener('click', () => {
  let expr = answerInput.value.trim();
  if (expr.length === 0) {
    resultMessage.textContent = 'Please enter an expression.';
    return;
  }

  if (!usesAllDiceOnce(expr)) {
    resultMessage.textContent = 'You must use all dice values exactly once.';
    return;
  }

  let val = evaluateExpression(expr);
  if (val === null) {
    resultMessage.textContent = 'Invalid expression.';
    return;
  }

  val = Number(val.toFixed(5)); // limit decimals
  let score = computeScore(val);

  if (score === 0) {
    resultMessage.textContent = '🎉 Perfect match! You nailed it!';
  } else {
    resultMessage.textContent = `You got ${val}, which is ${score} away from the target.`;
  }

  scoreMessage.textContent = `Target Number: ${targetNumber}`;

  // Save answer and score
  let todayStr = formatDate(new Date());
  saveProgress(todayStr, diceValues, targetNumber, expr, score);
  loadArchive();
});

// --- Initialize ---
seedArchive();
initGame();
