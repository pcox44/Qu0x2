const targetEl = document.getElementById('target');
const diceContainer = document.getElementById('dice-container');
const expressionEl = document.getElementById('expression');
const resultEl = document.getElementById('result');
const scoreEl = document.getElementById('score');
const streakEl = document.getElementById('streak');
const archiveEl = document.getElementById('archive');
const resultsTable = document.querySelector('#results-table tbody');

let expression = '';
let usedDice = [];
let dice = [];
let target = 0;
let results = [];
let todayKey = new Date().toISOString().slice(0, 10);

function seedFromDate() {
  const now = new Date();
  now.setUTCHours(now.getUTCHours() - 4); // Eastern Time
  const seed = parseInt(now.toISOString().slice(0, 10).replace(/-/g, ''), 10);
  return seed;
}

function seededRandom(seed) {
  return function () {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function generatePuzzle() {
  const rng = seededRandom(seedFromDate());
  target = Math.floor(rng() * 100) + 1;
  dice = Array.from({ length: 5 }, () => Math.floor(rng() * 6) + 1);
  usedDice = Array(5).fill(false);
  render();
}

function render() {
  targetEl.textContent = `🎯 Target: ${target}`;
  diceContainer.innerHTML = '';
  dice.forEach((value, i) => {
    const die = document.createElement('div');
    die.className = 'die';
    die.textContent = value;
    die.setAttribute('value', value);
    if (usedDice[i]) die.classList.add('used');
    die.onclick = () => useDie(i);
    diceContainer.appendChild(die);
  });
  expressionEl.textContent = expression;
}

function useDie(index) {
  if (usedDice[index]) return;
  expression += dice[index];
  usedDice[index] = true;
  render();
}

function addOp(op) {
  expression += op;
  render();
}

function backspace() {
  expression = expression.slice(0, -1);
  render();
}

function clearExpression() {
  expression = '';
  usedDice = Array(5).fill(false);
  render();
}

function isEquivalent(a, b) {
  return a.replace(/\s+/g, '') === b.replace(/\s+/g, '');
}

function submitExpression() {
  try {
    const result = eval(expression);
    const score = Math.abs(target - result);
    resultEl.textContent = `Result: ${result}`;
    scoreEl.textContent = `Score: ${score}`;

    // Check for uniqueness
    const alreadySubmitted = results.some(r => isEquivalent(r.expression, expression));
    if (!alreadySubmitted) {
      results.push({ expression, result, score });
      updateResultsTable();
      if (score === 0) {
        saveGame(true);
      } else {
        saveGame(false);
      }
    } else {
      resultEl.textContent += ' (Already submitted)';
    }
  } catch {
    resultEl.textContent = 'Invalid expression';
  }
}

function updateResultsTable() {
  resultsTable.innerHTML = '';
  results.forEach((entry, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `<td>${index + 1}</td><td>${entry.expression}</td><td>${entry.result}</td><td>${entry.score}</td>`;
    resultsTable.appendChild(row);
  });
}

function saveGame(solved) {
  const archive = JSON.parse(localStorage.getItem('ddg-archive') || '{}');
  if (!archive[todayKey]) archive[todayKey] = [];
  archive[todayKey].push({ expression, solved });
  localStorage.setItem('ddg-archive', JSON.stringify(archive));

  updateStreak(archive);
  displayArchive(archive);
}

function updateStreak(archive) {
  let streak = 0;
  let date = new Date();
  for (;;) {
    const key = date.toISOString().slice(0, 10);
    const solvedToday = archive[key]?.some(entry => entry.solved);
    if (solvedToday) {
      streak++;
      date.setDate(date.getDate() - 1);
    } else {
      break;
    }
  }
  streakEl.textContent = `🔥 Streak: ${streak}`;
}

function displayArchive(archive) {
  archiveEl.innerHTML = '<strong>Archive:</strong><br>' + Object.entries(archive).map(([date, entries]) => {
    const solved = entries.some(e => e.solved);
    return `${date}: ${solved ? '✅' : '❌'} (${entries.length} attempts)`;
  }).join('<br>');
}

function toggleDarkMode() {
  document.body.classList.toggle('dark');
}

// Load archive and previous data
const archive = JSON.parse(localStorage.getItem('ddg-archive') || '{}');
if (archive[todayKey]) {
  results = archive[todayKey];
}
generatePuzzle();
updateStreak(archive);
displayArchive(archive);
updateResultsTable();
