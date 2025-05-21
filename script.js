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
let solutions = new Set();

const dieStyles = {
  1: ['red', 'white'],
  2: ['white', 'black'],
  3: ['blue', 'white'],
  4: ['yellow', 'black'],
  5: ['green', 'white'],
  6: ['black', 'yellow']
};

function seedFromDate() {
  const now = new Date();
  now.setUTCHours(now.getUTCHours() - 4); // Eastern time
  return parseInt(now.toISOString().slice(0, 10).replace(/-/g, ''));
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
    die.className = `die ${dieStyles[value][0]}`;
    die.textContent = value;
    if (usedDice[i]) die.classList.add('used');
    die.onclick = () => useDie(i);
    diceContainer.appendChild(die);
  });

  expressionEl.innerHTML = formatExpression(expression);
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
  return expr.replace(/\s+/g, '').split('').sort().join('');
}

function submitExpression() {
  try {
    const result = eval(expression);
    if (usedDice.filter(x => x).length !== 5) {
      resultEl.textContent = '❌ Use all dice';
      return;
    }
    const score = Math.abs(target - result);
    resultEl.textContent = `Result: ${result}`;
    scoreEl.textContent = `Score: ${score}`;
    const normalized = normalize(expression);

    const archive = JSON.parse(localStorage.getItem('ddg-archive') || '{}');
    archive[todayKey] = archive[todayKey] || { solutions: [], streak: 0 };
    if (!archive[todayKey].solutions.includes(normalized)) {
      archive[todayKey].solutions.push(normalized);
      if (score === 0) {
        archive[todayKey].streak = (archive[todayKey].streak || 0) + 1;
        resultEl.textContent += ' 🎉 Perfect!';
      }
    }

    localStorage.setItem('ddg-archive', JSON.stringify(archive));
    updateStreak(archive);
    displayArchive(archive);
  } catch {
    resultEl.textContent = '⚠️ Invalid expression';
  }
}

function formatExpression(expr) {
  return expr.split('').map(ch => {
    const num = parseInt(ch);
    if (!isNaN(num) && num >= 1 && num <= 6) {
      const [bg, fg] = dieStyles[num];
      return `<span style="color:${bg}; font-weight:bold">${ch}</span>`;
    }
    return ch;
  }).join('');
}

function updateStreak(archive) {
  let streak = 0;
  let date = new Date();
  for (;;) {
    const key = date.toISOString().slice(0, 10);
    if (archive[key]?.solutions?.length > 0 && archive[key].solutions.some(exp => eval(exp) === target)) {
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
    const sols = data.solutions.length;
    const emoji = sols > 0 ? '✅' : '❌';
    return `${date}: ${emoji} ${sols} solution${sols === 1 ? '' : 's'}`;
  }).join('<br>');
}

const archive = JSON.parse(localStorage.getItem('ddg-archive') || '{}');
if (archive[todayKey]?.solutions) {
  solutions = new Set(archive[todayKey].solutions);
}
generatePuzzle();
updateStreak(archive);
displayArchive(archive);
