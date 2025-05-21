// script.js

// Constants
const NUM_DICE = 5;
const MAX_DICE_VALUE = 6;

// Elements
const diceContainer = document.getElementById('dice-container');
const targetNumberSpan = document.getElementById('target-number');
const inputField = document.getElementById('input-field');
const messageDiv = document.getElementById('message');
const scoreSpan = document.getElementById('score');
const attemptsSpan = document.getElementById('attempts');
const backspaceBtn = document.getElementById('backspace-btn');
const clearBtn = document.getElementById('clear-btn');

// State
let diceValues = [];
let targetNumber;
let attempts = 0;

// Helpers

// Get current date string in Eastern Time (YYYY-MM-DD)
function getEasternDateString() {
  // Current time in UTC
  const now = new Date();

  // Convert to milliseconds offset for ET (UTC-4 or UTC-5 depending on DST)
  // Use Intl API for timezone conversion
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

// Generate a seed from a string (date string here)
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

// Seeded random number generator (Mulberry32)
function mulberry32(seed) {
  return function() {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

// Generate dice values deterministically based on date string
function generateDice(dateStr) {
  const seed = cyrb128(dateStr)[0];
  const rand = mulberry32(seed);
  const dice = [];
  for (let i = 0; i < NUM_DICE; i++) {
    dice.push(1 + Math.floor(rand() * MAX_DICE_VALUE));
  }
  return dice;
}

// Generate target number deterministically based on date string (1 to 100)
function generateTargetNumber(dateStr) {
  const seed = cyrb128(dateStr)[0] ^ 0xabcdef; // Different seed than dice
  const rand = mulberry32(seed);
  return 1 + Math.floor(rand() * 100);
}

// Render dice as colored dice faces
function renderDice() {
  diceContainer.innerHTML = '';
  diceValues.forEach((val, i) => {
    const dieDiv = document.createElement('div');
    dieDiv.className = `die die-${val}`;
    dieDiv.textContent = val;
    diceContainer.appendChild(dieDiv);
  });
}

// Update displayed target number
function renderTarget() {
  targetNumberSpan.textContent = targetNumber;
}

// Update score and attempts display
function renderStats(score) {
  scoreSpan.textContent = score;
  attemptsSpan.textContent = attempts;
}

// Show message (success or error)
function showMessage(msg, success = false) {
  messageDiv.textContent = msg;
  messageDiv.style.color = success ? 'green' : 'red';
}

// Compute score: absolute difference between user's evaluated expression and target
function computeScore(userAnswer) {
  return Math.abs(targetNumber - userAnswer);
}

// Validate user input expression: only allow digits, +, -, *, /, parentheses, spaces
function isValidExpression(expr) {
  return /^[0-9+\-*/().\s]+$/.test(expr);
}

// Evaluate user input expression safely
function safeEval(expr) {
  if (!isValidExpression(expr)) {
    throw new Error('Invalid characters in expression.');
  }
  // Evaluate with Function constructor
  // Using eval is generally unsafe but here we restrict input
  return Function(`"use strict";return (${expr})`)();
}

// Initialize game for the day
function initGame() {
  const today = getEasternDateString();
  diceValues = generateDice(today);
  targetNumber = generateTargetNumber(today);
  attempts = 0;
  renderDice();
  renderTarget();
  inputField.value = '';
  renderStats('-');
  showMessage('');
}

// Event Handlers

// Handle user submitting an attempt (on Enter key)
inputField.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const input = inputField.value.trim();
    if (input === '') {
      showMessage('Please enter an expression.');
      return;
    }
    try {
      const result = safeEval(input);
      if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
        showMessage('Expression must evaluate to a finite number.');
        return;
      }
      // Check dice usage: each die value used exactly once
      // Extract numbers from expression
      const nums = input.match(/\d+/g);
      if (!nums) {
        showMessage('Expression must use dice values.');
        return;
      }
      // Count dice values and numbers used
      const diceCopy = [...diceValues];
      for (const numStr of nums) {
        const num = parseInt(numStr, 10);
        const index = diceCopy.indexOf(num);
        if (index === -1) {
          showMessage(`Invalid usage: number ${num} not in dice or already used.`);
          return;
        }
        diceCopy.splice(index, 1);
      }
      if (diceCopy.length > 0) {
        showMessage(`You must use all dice values exactly once.`);
        return;
      }
      attempts++;
      const score = computeScore(result);
      renderStats(score);
      if (score === 0) {
        showMessage('Perfect! You matched the target exactly!', true);
      } else {
        showMessage(`Close! Your result is ${result}. Keep trying!`, false);
      }
      inputField.value = '';
    } catch (err) {
      showMessage('Invalid expression. Please try again.');
    }
  }
});

// Backspace button handler
backspaceBtn.addEventListener('click', () => {
  inputField.value = inputField.value.slice(0, -1);
  showMessage('');
});

// Clear button handler
clearBtn.addEventListener('click', () => {
  inputField.value = '';
  showMessage('');
});

// Initialize the game when page loads
window.addEventListener('load', () => {
  initGame();
});
