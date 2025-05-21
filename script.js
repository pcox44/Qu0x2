const targetEl = document.getElementById('target');
const diceContainer = document.getElementById('dice-container');
const expressionEl = document.getElementById('expression');
const liveResultEl = document.getElementById('live-result');
const resultsTableBody = document.querySelector('#results-table tbody');
const archiveEl = document.getElementById('archive');
const scoreEl = document.getElementById('score');
const streakEl = document.getElementById('streak');

const diceCount = 5;
const diceValues = [];
let usedDice = new Array(diceCount).fill(false);
let currentExpression = '';
let target = 0;
let results = [];
let streak = 0;

function getSeedFromDate() {
  // YYYYMMDD format as seed
  const now = new Date();
  return Number(`${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}`);
}

function seededRandom(seed) {
  // simple xorshift
  let x = seed % 2147483647;
  return function() {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x < 0 ? ~x + 1 : x) % 1e9 / 1e9;
  }
}

function generateDice() {
  diceValues.length = 0;
  const rand = seededRandom(getSeedFromDate());
  for (let i=0; i<diceCount; i++) {
    // values 1-6
    diceValues.push(1 + Math.floor(rand()*6));
  }
  usedDice.fill(false);
}

function renderDice() {
  diceContainer.innerHTML = '';
  for (let i=0; i<diceCount; i++) {
    const die = document.createElement('div');
    die.className = 'die';
    die.dataset.value = diceValues[i];
    die.textContent = diceValues[i];
    if (usedDice[i]) die.classList.add('used');
    die.title = usedDice[i] ? `Used die (${diceValues[i]})` : `Available die (${diceValues[i]})`;
    die.setAttribute('aria-pressed', usedDice[i]);
    die.setAttribute('role', 'button');
    die.tabIndex = 0;
    die.onclick = () => toggleUseDie(i);
    die.onkeydown = e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleUseDie(i);
      }
    };
    diceContainer.appendChild(die);
  }
}

function toggleUseDie(i) {
  usedDice[i] = !usedDice[i];
  renderDice();
  updateLiveResult();
}

function addOp(char) {
  currentExpression += char;
  updateExpression();
  updateLiveResult();
}

function backspace() {
  currentExpression = currentExpression.slice(0, -1);
  updateExpression();
  updateLiveResult();
}

function clearExpression() {
  currentExpression = '';
  updateExpression();
  liveResultEl.textContent = '';
}

function updateExpression() {
  expressionEl.textContent = currentExpression;
}

function evalSafe(expr) {
  // Allowed characters: digits, + - * / ( )
  if (!/^[0-9+\-*/()\s]+$/.test(expr)) return {valid:false, error:'Invalid characters'};
  try {
    // eslint-disable-next-line no-eval
    const val = eval(expr);
    if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) return {valid:false, error:'Invalid result'};
    return {valid:true, value: val};
  } catch(e) {
    return {valid:false, error: e.message};
  }
}

function updateLiveResult() {
  if (currentExpression.trim() === '') {
    liveResultEl.textContent = '';
    return;
  }

  const res = evalSafe(currentExpression);
  if (!res.valid) {
    liveResultEl.textContent = `Invalid expression`;
    liveResultEl.style.color = '#f44336'; // red
    return;
  }

  // Check dice usage
  const used = usedDiceValues();
  if (!checkDiceUsedCorrectly(used)) {
    liveResultEl.textContent = 'Use each die exactly once';
    liveResultEl.style.color = '#ff9800'; // orange
    return;
  }

  liveResultEl.textContent = `Result: ${res.value}`;
  liveResultEl.style.color = '#8bc34a'; // green
}

function usedDiceValues() {
  // Return array of dice values marked used
  return diceValues.filter((v,i) => usedDice[i]);
}

function checkDiceUsedCorrectly(usedValues) {
  // Player must use each die exactly once, no extras
  if (usedValues.length !== diceCount) return false;
  // Check if expression uses those dice values exactly once

  // Extract numbers from expression
  // This is tricky: Need to parse numbers and count usage.

  // We'll split the expression by operators and parentheses, collect all numbers
  const tokens = currentExpression.match(/\d+/g);
  if (!tokens) return false;

  const exprNums = tokens.map(Number);

  // Sort and compare arrays
  exprNums.sort((a,b)=>a-b);
  usedValues.sort((a,b)=>a-b);

  if (exprNums.length !== usedValues.length) return false;
  for (let i=0; i<exprNums.length; i++) {
    if (exprNums[i] !== usedValues[i]) return false;
  }
  return true;
}

function submitExpression() {
  if (currentExpression.trim() === '') return;

  const res = evalSafe(currentExpression);
  if (!res.valid) {
    alert('Invalid expression. Please correct it.');
    return;
  }

  if (!checkDiceUsedCorrectly(usedDiceValues())) {
    alert('You must use each die exactly once in your expression.');
    return;
  }

  const diff = Math.abs(target - res.value);
  results.push({
    expression: currentExpression,
    result: res.value,
    score: diff
  });

  if (diff === 0) {
    streak++;
    alert(`Perfect! 🎉 Your score is 0. Current streak: ${streak}`);
  } else {
    streak = 0;
    alert(`You scored ${diff}. Try for a perfect match!`);
  }

  saveData();
  updateScoreAndStreak();
  updateResultsTable();
  updateArchive();

  clearExpression();
  generateNewGame();
}

function updateResultsTable() {
  resultsTableBody.innerHTML = '';
  results.forEach((r,i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i+1}</td>
      <td>${r.expression}</td>
      <td>${r.result}</td>
      <td>${r.score}</td>
    `;
    resultsTableBody.appendChild(tr);
  });
}

function updateArchive() {
  let text = '';
  results.forEach((r,i) => {
    text += `${i+1}. ${r.expression} = ${r.result} (score: ${r.score})\n`;
  });
  archiveEl.textContent = text;
}

function updateScoreAndStreak() {
  if (results.length === 0) {
    scoreEl.textContent = '';
    streakEl.textContent = '';
    return;
  }
  const best = Math.min(...results.map(r=>r.score));
  scoreEl.textContent = `Best score today: ${best}`;
  streakEl.textContent = `Current streak: ${streak}`;
}

function generateNewGame() {
  generateDice();
  usedDice.fill(false);
  updateExpression();
  liveResultEl.textContent = '';
  results = [];
  updateResultsTable();
  updateArchive();
  updateScoreAndStreak();
  renderDice();
  // Target = random 1-100
  const rand = seededRandom(getSeedFromDate() + 42); // different seed
  target = 1 + Math.floor(rand()*100);
  targetEl.textContent = `Target Number: ${target}`;
  currentExpression = '';
  clearExpression();
  saveData();
}

function saveData() {
  localStorage.setItem('daily-dice-results', JSON.stringify(results));
  localStorage.setItem('daily-dice-streak', streak);
}

function loadData() {
  const savedResults = localStorage.getItem('daily-dice-results');
  const savedStreak = localStorage.getItem('daily-dice-streak');

  if (savedResults) {
    results = JSON.parse(savedResults);
  }
  if (savedStreak) {
    streak = Number(savedStreak);
  }
  updateResultsTable();
  updateArchive();
  updateScoreAndStreak();
}

function toggleDarkMode() {
  document.body.classList.toggle('dark');
}

// Initialize
window.onload = () => {
  generateNewGame();
  loadData();
};
