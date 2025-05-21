const targetEl = document.getElementById('target');
const diceContainer = document.getElementById('dice-container');
const expressionEl = document.getElementById('expression');
const resultEl = document.getElementById('result');
const scoreEl = document.getElementById('score');
const streakEl = document.getElementById('streak');
const archiveEl = document.getElementById('archive');

let expression = '';
let usedDice = [];
let dice = [];
let target = 0;
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
    die.style.backgroundColor = ['#FF6B6B','#6BCB77','#4D96FF','#FFD93D','#845EC2'][i];
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

function normalize(expr) {
  return expr
    .split(/(\D)/)
    .filter(Boolean)
    .map(x => /\d/.test(x) ? +x : x)
    .map(x => typeof x === 'number' ? x : ` ${x} `)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function sortNumbers(expr) {
  const parts = expr.split(/[\+\-\*\/]/).map(x => x.trim()).filter(Boolean);
  return parts.sort((a, b) => a - b).join(',');
}

function submitExpression() {
  try {
    const result = eval(expression);
    const score = Math.abs(target - result);
    resultEl.textContent = `Result: ${result}`;
    scoreEl.textContent = `Score: ${score}`;
    const archive = JSON.parse(localStorage.getItem('ddg-archive') || '{}');

    if (!archive[todayKey]) {
      archive[todayKey] = { solved: false, expressions: [] };
    }

    if (score === 0) {
      const normalized = normalize(expression);
      const key = sortNumbers(normalized);
      if (!archive[todayKey].expressions.includes(key)) {
        archive[todayKey].expressions.push(key);
      }

      archive[todayKey].solved = true;
      resultEl.textContent += ' 🎉 Congratulations!';
    }

    localStorage.setItem('ddg-archive', JSON.stringify(archive));
    updateStreak(archive);
    displayArchive(archive);
  } catch {
    resultEl.textContent = 'Invalid expression';
  }
}

function updateStreak(archive) {
  let streak = 0;
  let date = new Date();
  for (;;) {
    const key = date.toISOString().slice(0, 10);
    if (archive[key]?.solved) {
      streak++;
      date.setDate(date.getDate() - 1);
    } else {
      break;
    }
  }
  streakEl.textContent = `🔥 Streak: ${streak}`;
}

function displayArchive(archive) {
  archiveEl.innerHTML = '<strong>Archive:</strong><br>' + Object.entries(archive).map(([date, data]) => {
    const count = data.expressions ? data.expressions.length : 0;
    return `${date}: ${data.solved ? '✅' : '❌'} (${count} solution${count === 1 ? '' : 's'})`;
  }).join('<br>');
}

// Load
const archive = JSON.parse(localStorage.getItem('ddg-archive') || '{}');
generatePuzzle();
updateStreak(archive);
displayArchive(archive);
