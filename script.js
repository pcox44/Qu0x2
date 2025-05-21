const easternNow = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const estOffset = offset + 240;
  return new Date(now.getTime() + estOffset * 60000);
};

function seedFromDate(date) {
  const str = date.toISOString().split('T')[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getDiceAndTarget(date) {
  const rng = mulberry32(seedFromDate(date));
  const dice = Array.from({ length: 5 }, () => Math.floor(rng() * 9) + 1);
  const target = Math.floor(rng() * 100) + 1;
  return { dice, target };
}

function mulberry32(a) {
  return function() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let currentDate = new Date();
let { dice, target } = getDiceAndTarget(currentDate);
let usedDice = [];
let expression = '';
let bestScore = null;
let perfectSolutions = 0;

function renderGame() {
  document.getElementById('target').textContent = target;
  const diceContainer = document.getElementById('dice-container');
  diceContainer.innerHTML = '';
  dice.forEach((val, i) => {
    const div = document.createElement('div');
    div.textContent = val;
    div.className = `die h${val} ${usedDice.includes(i) ? 'used' : ''}`;
    div.onclick = () => {
      if (!usedDice.includes(i)) {
        expression += val;
        usedDice.push(i);
        renderGame();
        updateExpression();
      }
    };
    diceContainer.appendChild(div);
  });
  updateExpression();
}

function updateExpression() {
  document.getElementById('expression').textContent = expression;
  try {
    const result = eval(expression);
    document.getElementById('live-result').textContent = `= ${result}`;
  } catch {
    document.getElementById('live-result').textContent = '';
  }
}

function addOp(op) {
  expression += op;
  updateExpression();
}

function backspace() {
  expression = expression.slice(0, -1);
  updateExpression();
}

function clearExpression() {
  expression = '';
  usedDice = [];
  renderGame();
}

function submitExpression() {
  try {
    const result = eval(expression);
    const roundedResult = Math.round(result * 10000) / 10000;
    const score = Math.abs(target - roundedResult);
    const roundedScore = Math.round(score * 10000) / 10000;

    const todayKey = currentDate.toISOString().split('T')[0];
    const history = JSON.parse(localStorage.getItem(todayKey) || '[]');
    history.push({ expression, result: roundedResult, score: roundedScore });
    localStorage.setItem(todayKey, JSON.stringify(history));

    if (score === 0) {
      perfectSolutions += 1;
      localStorage.setItem('streak', (parseInt(localStorage.getItem('streak') || '0') + 1).toString());
    } else {
      localStorage.setItem('streak', '0');
    }

    if (bestScore === null || score < bestScore) {
      bestScore = score;
      document.getElementById('best-score').textContent = score;
    }

    document.getElementById('perfects').textContent = perfectSolutions;
    document.getElementById('streak').textContent = localStorage.getItem('streak') || '0';
    updateArchive();
    clearExpression();
  } catch {
    alert('Invalid expression');
  }
}

function updateArchive() {
  const todayKey = currentDate.toISOString().split('T')[0];
  const entries = JSON.parse(localStorage.getItem(todayKey) || '[]');
  const archiveDiv = document.getElementById('archive');
  archiveDiv.innerHTML = '';
  entries.forEach((entry, i) => {
    const div = document.createElement('div');
    div.className = 'archive-entry';
    div.innerHTML = `<span>#${i + 1}</span><span>${entry.expression}</span><span>= ${entry.result}</span><span>Score: ${entry.score}</span>`;
    archiveDiv.appendChild(div);
  });
}

renderGame();
updateArchive();
document.getElementById('streak').textContent = localStorage.getItem('streak') || '0';
