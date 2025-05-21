// Daily Dice Game script.js

// Dice colors mapping by value (horse racing colors)
const diceColors = {
  1: 'dice-1',
  2: 'dice-2',
  3: 'dice-3',
  4: 'dice-4',
  5: 'dice-5',
  6: 'dice-6'
};

const OPERATORS = ['+', '-', '*', '/', '(', ')'];

const DICE_COUNT = 5;
const MAX_TARGET = 100;
const SEED_OFFSET = 13579; // Offset added to seed to change target number

// Elements
const targetNumberEl = document.getElementById('target-number');
const diceContainer = document.getElementById('dice-container');
const expressionInput = document.getElementById('expression-input');
const numbersButtonsContainer = document.getElementById('numbers-buttons');
const operationsButtonsContainer = document.getElementById('operations-buttons');
const backspaceBtn = document.getElementById('backspace-btn');
const clearBtn = document.getElementById('clear-btn');
const submitBtn = document.getElementById('submit-btn');
const resultMessageEl = document.getElementById('result-message');
const scoreDisplay = document.getElementById('score-display');
const streakDisplay = document.getElementById('streak-display');
const archiveContainer = document.getElementById('archive-container');

let diceValues = [];
let usedDiceIndices = new Set();

let currentExpression = '';

let targetNumber = 0;

let streak = 0;

let archive = {};

// Helpers for date string YYYY-MM-DD
function getTodayDateStr() {
  const now = new Date();
  // Adjust to Eastern Time (ET): UTC-4 or UTC-5 depending on DST
  // For simplicity, assuming ET = UTC-4 (EDT) (May is DST)
  // So subtract 4 hours from UTC time
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const etDate = new Date(utc - 4 * 3600000);
  return etDate.toISOString().slice(0, 10);
}

// Simple seeded random generator: Mulberry32
// Source: https://stackoverflow.com/a/47593316
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Seed from date string + offset
function seedFromDate(dateStr) {
  return parseInt(dateStr.replace(/-/g, ''), 10) + SEED_OFFSET;
}

// Generate target number and dice for a given date string
function generatePuzzle(dateStr) {
  const seed = seedFromDate(dateStr);
  const rand = mulberry32(seed);

  const target = Math.floor(rand() * MAX_TARGET) + 1;

  // Roll 5 dice (values 1-6)
  const dice = [];
  for(let i=0; i<DICE_COUNT; i++) {
    dice.push(Math.floor(rand() * 6) + 1);
  }

  return { target, dice };
}

// Save/load localStorage keys
const STORAGE_PREFIX = 'daily-dice-game-';
function saveData(key, data) {
  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
}
function loadData(key) {
  const data = localStorage.getItem(STORAGE_PREFIX + key);
  return data ? JSON.parse(data) : null;
}

// Display dice with colors and mark used dice
function renderDice() {
  diceContainer.innerHTML = '';
  diceValues.forEach((val, idx) => {
    const d = document.createElement('div');
    d.classList.add('dice', diceColors[val]);
    d.textContent = val;
    if(usedDiceIndices.has(idx)) {
      d.classList.add('used');
    }
    diceContainer.appendChild(d);
  });
}

// Buttons for numbers (dice values)
function renderNumberButtons() {
  numbersButtonsContainer.innerHTML = '';
  diceValues.forEach((val, idx) => {
    const btn = document.createElement('button');
    btn.textContent = val;
    btn.disabled = usedDiceIndices.has(idx);
    btn.addEventListener('click', () => {
      if(!usedDiceIndices.has(idx)) {
        usedDiceIndices.add(idx);
        currentExpression += val.toString();
        updateInput();
        renderDice();
        renderNumberButtons();
      }
    });
    numbersButtonsContainer.appendChild(btn);
  });
}

// Buttons for operators (including parentheses)
function renderOperationButtons() {
  operationsButtonsContainer.innerHTML = '';
  OPERATORS.forEach(op => {
    const btn = document.createElement('button');
    btn.textContent = op;
    btn.addEventListener('click', () => {
      currentExpression += op;
      updateInput();
    });
    operationsButtonsContainer.appendChild(btn);
  });
}

function updateInput() {
  expressionInput.value = currentExpression;
}

// Backspace button
backspaceBtn.addEventListener('click', () => {
  if(currentExpression.length === 0) return;

  // Remove last char
  const lastChar = currentExpression.slice(-1);
  currentExpression = currentExpression.slice(0, -1);

  // If last char was a number, unmark used dice accordingly
  if(/[1-6]/.test(lastChar)) {
    // Need to find which dice was used last that matches lastChar
    // We'll remove the last used dice with that value

    // Get used dice indices in order of usage by reconstructing from expression
    // Simpler way: Just remove one dice with value lastChar from usedDiceIndices

    // We must track dice usage order to be exact, but for now:
    // Remove one dice index with matching value from usedDiceIndices
    for(let idx of Array.from(usedDiceIndices).reverse()) {
      if(diceValues[idx].toString() === lastChar) {
        usedDiceIndices.delete(idx);
        break;
      }
    }
  }

  updateInput();
  renderDice();
  renderNumberButtons();
});

// Clear button
clearBtn.addEventListener('click', () => {
  currentExpression = '';
  usedDiceIndices.clear();
  updateInput();
  renderDice();
  renderNumberButtons();
  resultMessageEl.textContent = '';
});

// Submit button
submitBtn.addEventListener('click', () => {
  if(currentExpression.length === 0) {
    resultMessageEl.textContent = 'Please enter an expression.';
    return;
  }

  // Check if all dice used exactly once
  if(usedDiceIndices.size !== DICE_COUNT) {
    resultMessageEl.textContent = `Please use all ${DICE_COUNT} dice exactly once.`;
    return;
  }

  // Validate expression only contains dice values, operators, and parentheses
  if(!/^[1-6+\-*/()\s]+$/.test(currentExpression)) {
    resultMessageEl.textContent = 'Invalid characters in expression.';
    return;
  }

  // Evaluate expression safely
  let result;
  try {
    // eslint-disable-next-line no-eval
    result = eval(currentExpression);
  } catch {
    resultMessageEl.textContent = 'Invalid expression syntax.';
    return;
  }

  if(typeof result !== 'number' || !isFinite(result)) {
    resultMessageEl.textContent = 'Expression did not evaluate to a valid number.';
    return;
  }

  // Round result to nearest integer since target is int
  result = Math.round(result);

  const score = Math.abs(targetNumber - result);

  scoreDisplay.textContent = score;
  if(score === 0) {
    resultMessageEl.textContent = '🎉 Congratulations! Perfect match!';
    streak++;
  } else {
    resultMessageEl.textContent = `Result is ${result}, target is ${targetNumber}. Score: ${score}`;
    streak = 0;
  }
  streakDisplay.textContent = streak;

  // Save result and expression in archive and for current date
  archive[today] = { expression: currentExpression, score };
  saveData('archive', archive);
  saveData('streak', streak);
  saveData('last-solution-' + today, currentExpression
