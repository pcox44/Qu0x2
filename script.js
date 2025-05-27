const expressionBox = document.getElementById("expressionBox");
const evaluationBox = document.getElementById("evaluationBox");
const buttonGrid = document.getElementById("buttonGrid");
const diceContainer = document.getElementById("diceContainer");
const targetBox = document.getElementById("targetBox");
const submitBtn = document.getElementById("submitBtn");
const dropdown = document.getElementById("gameDropdown");
const dailyBestScoreBox = document.getElementById("dailyBestScore");
const completionRatioBox = document.getElementById("completionRatio");
const masterScoreBox = document.getElementById("masterScore");
const gameNumberDate = document.getElementById("gameNumberDate");
const qu0xAnimation = document.getElementById("qu0xAnimation");


let currentDate = new Date();
let currentDay = getDayIndex(currentDate);
let maxDay = getDayIndex(new Date());
let usedDice = [];
let diceValues = [];
let target = null;
let lockedDays = JSON.parse(localStorage.getItem("QLockedDays") || "{}");
let bestScores = JSON.parse(localStorage.getItem("QBestScores") || "{}");


const colorBoxes = {
  "1": "🟥", // red box for 1
  "2": "⬜", // white box for 2
  "3": "🟦", // blue box for 3
  "4": "🟨", // yellow box for 4
  "5": "🟩", // green box for 5
  "6": "⬛", // black box for 6
};

function expressionToShareable(expr) {
  return expr.replace(/\d/g, d => colorBoxes[d] || d);
}

function getDayIndex(date) {
  const start = new Date("2025-05-15T00:00:00");
  const diff = Math.floor((date - start) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}


function shuffle(array, rand) {
  let m = array.length, t, i;
  while (m) {
    i = Math.floor(rand() * m--);
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }
  return array;
}

function getBlockedOperators(day) {
  const rand = mulberry32(day + 1);
  const coreOps = ["+", "-", "*", "/", "^", "!"];

  // Get dice and target for the day
  let dice, target;
  if (day < staticPuzzles.length) {
    dice = staticPuzzles[day].dice;
    target = staticPuzzles[day].target;
  } else {
    dice = Array.from({ length: 5 }, () => Math.floor(rand() * 6) + 1);
    target = Math.floor(rand() * 100) + 1;
  }

  const allDiceSmall = dice.every(n => n <= 3);

  // Step 1: Always block either '+' or '-' (not both)
  const blockAdd = rand() < 0.5;
  const primaryBlocked = blockAdd ? "+" : "-";
  const blocked = new Set([primaryBlocked]);

  // Step 2: Block one more operator, excluding both '+' and '-'
  const secondaryCandidates = coreOps.filter(op => op !== "+" && op !== "-");
  blocked.add(secondaryCandidates[Math.floor(rand() * secondaryCandidates.length)]);

  // Step 3: Enforce small dice rule — don't block both '^' and '!'
  if (allDiceSmall && blocked.has("^") && blocked.has("!")) {
    // Unblock one randomly
    if (rand() < 0.5) {
      blocked.delete("^");
    } else {
      blocked.delete("!");
    }

    // Refill to 2 blocked ops (but still exclude the other of '+' or '-')
    const refillOptions = coreOps.filter(
      op => !blocked.has(op) && op !== "+" && op !== "-"
    );
    if (refillOptions.length > 0) {
      blocked.add(refillOptions[Math.floor(rand() * refillOptions.length)]);
    }
  }

  // Final safeguard: ensure exactly 2 blocked ops and not both '+' and '-'
  while (blocked.size < 2) {
    const options = coreOps.filter(
      op => !blocked.has(op) && op !== (blockAdd ? "-" : "+")
    );
    if (options.length === 0) break;
    blocked.add(options[Math.floor(rand() * options.length)]);
  }

  // This part is now safe: we never allow both '+' and '-' to enter
  while (blocked.size > 2) {
    const arr = Array.from(blocked);
    const toRemove = arr[Math.floor(rand() * arr.length)];
    blocked.delete(toRemove);
  }

  return Array.from(blocked);
}












// Example PRNG and hash
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function getDateFromDayIndex(index) {
  const start = new Date("2025-05-15T00:00:00");
  const date = new Date(start.getTime() + index * 86400000);
  return date.toISOString().slice(0, 10);
}

// Step 1: Define the static puzzles for the first 10 days
const staticPuzzles = [
  { dice: [3, 2, 5, 1, 1], target: 82 },
  { dice: [6, 3, 2, 4, 3], target: 46 },
  { dice: [2, 6, 2, 5, 4], target: 93 },
  { dice: [1, 6, 6, 3, 3], target: 44 },
  { dice: [1, 5, 4, 3, 2], target: 76 },
  { dice: [4, 2, 6, 3, 5], target: 4 },
  { dice: [1, 6, 4, 4, 3], target: 4 },
  { dice: [6,3, 1, 6, 1], target: 19 },
  { dice: [3, 1, 1, 3, 5], target: 73 },
  { dice: [3, 1, 3, 2, 6], target: 31 },
  { dice: [4, 5, 5, 3, 2], target: 52 },
];

// Optional: use mulberry32 PRNG for dynamic puzzles from day 10 onward
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Step 2: Modify generatePuzzle to use static for first 10 days, dynamic for others
function generatePuzzle(day) {
  if (day < 11) {
    diceValues = staticPuzzles[day].dice.slice();  // clone array
    target = staticPuzzles[day].target;
  } else {
    // For days 11 onward, generate procedurally using mulberry32 seeded with day+1
    const rand = mulberry32(day + 1);
    diceValues = Array.from({ length: 5 }, () => Math.floor(rand() * 6) + 1);
    target = Math.floor(rand() * 100) + 1;
  }
}

function renderDice() {
  diceContainer.innerHTML = "";
  usedDice = [];
  diceValues.forEach((val, idx) => {
    const die = document.createElement("div");
    die.className = "die";
    die.dataset.index = idx;
    die.dataset.value = val;
    die.innerText = val;
    styleDie(die, val);
    die.addEventListener("click", () => {
      if (!usedDice.includes(idx) && !isLocked(currentDay)) {
        usedDice.push(idx);
        die.classList.add("faded");
        addToExpression(val.toString());
      }
    });
    diceContainer.appendChild(die);
  });
}

function styleDie(die, val) {
  const styles = {
    1: { bg: "red", fg: "white" },
    2: { bg: "white", fg: "black" },
    3: { bg: "blue", fg: "white" },
    4: { bg: "yellow", fg: "black" },
    5: { bg: "green", fg: "white" },
    6: { bg: "black", fg: "yellow" }
  };
  const style = styles[val];
  die.style.backgroundColor = style.bg;
  die.style.color = style.fg;
}

function addToExpression(char) {
  const expr = expressionBox.innerText;
  const lastChar = expr.slice(-1);

  // Define what counts as a number character (digits)
  const isDigit = c => /\d/.test(c);

  // If char is a digit (from dice):
  if (isDigit(char)) {
    // If last char is also a digit, add a space before adding new digit to prevent concatenation
    if (isDigit(lastChar)) {
      expressionBox.innerText += ' ' + char;
    } else {
      expressionBox.innerText += char;
    }
  } else {
    // For operators and parentheses, append directly
    expressionBox.innerText += char;
  }

  evaluateExpression();
}

function doubleFactorial(n) {
  if (n < 0 || !Number.isInteger(n)) throw "Invalid double factorial";
  if (n === 0 || n === 1) return 1;
  let product = 1;
  for (let i = n; i > 1; i -= 2) {
    product *= i;
  }
  return product;
}

function tripleFactorial(n) {
  if (n < 0 || !Number.isInteger(n)) throw "Invalid triple factorial";
  if (n === 0 || n === 1) return 1;
  let product = 1;
  for (let i = n; i > 1; i -= 3) {
    product *= i;
  }
  return product;
}

function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) throw "Invalid factorial";
  return n <= 1 ? 1 : n * factorial(n - 1);
}

function evaluateExpression() {
  const expr = expressionBox.innerText.trim();
  if (expr.length === 0) {
    evaluationBox.innerText = "?";
    return;
  }
  try {
    let replaced = expr;

    // Triple factorial e.g. 5!!! or (2+1)!!!
    replaced = replaced.replace(/(\([^)]+\)|\d+)!!!/g, (_, val) => {
      let n = Number.isNaN(Number(val)) ? eval(val) : Number(val);
      if (!Number.isInteger(n) || n < 0) throw "Invalid triple factorial";
      return tripleFactorial(n);
    });

    // Double factorial e.g. 4!! or (3!!)!!
    replaced = replaced.replace(/(\([^)]+\)|\d+)!!/g, (_, val) => {
      let n = Number.isNaN(Number(val)) ? eval(val) : Number(val);
      if (!Number.isInteger(n) || n < 0) throw "Invalid double factorial";
      return doubleFactorial(n);
    });

    // Single factorial e.g. 3! or (4)!
    replaced = replaced.replace(/(\([^)]+\)|\d+)!/g, (_, val) => {
      let n = Number.isNaN(Number(val)) ? eval(val) : Number(val);
      if (!Number.isInteger(n) || n < 0) throw "Invalid factorial";
      return factorial(n);
    });

    // Replace ^ with **
    replaced = replaced.replace(/\^/g, "**");

    let result = eval(replaced);

    evaluationBox.innerText = result;
  } catch {
    evaluationBox.innerText = "?";
  }
}

function buildButtons() {
  const allOps = ["+", "-", "*", "/", "^", "!", "(", ")", "Back", "Clear"];
  const blockedOps = getBlockedOperators(currentDay);
  buttonGrid.innerHTML = "";

  allOps.forEach(op => {
    if (blockedOps.includes(op)) return; // skip blocked ops

    const btn = document.createElement("button");
    btn.innerText = op;
    btn.onclick = () => {
      if (isLocked(currentDay)) return;

      if (op === "Back") {
        let expr = expressionBox.innerText;
        if (expr.length === 0) return;
        const removed = expr[expr.length - 1];
        expressionBox.innerText = expr.slice(0, -1);
        const idx = usedDice.findLast(i => diceValues[i].toString() === removed);
        if (idx !== undefined) {
          usedDice = usedDice.filter(i => i !== idx);
          document.querySelector(`.die[data-index="${idx}"]`).classList.remove("faded");
        }
      } else if (op === "Clear") {
        expressionBox.innerText = "";
        usedDice = [];
        renderDice();
      } else {
        addToExpression(op);
      }

      evaluateExpression();
    };
    buttonGrid.appendChild(btn);
  });
}

function isLocked(day) {
  return lockedDays[day]?.score === 0;
}

function submit() {
  if (isLocked(currentDay)) return;

  const result = evaluationBox.innerText;
  if (result === "?") {
    alert("Invalid Submission");
    return;
  }
  if (!Number.isInteger(Number(result))) {
  alert("Submission must be an integer result.");
  return;
  }
  if (usedDice.length !== 5) {
    alert("You must use all 5 dice.");
    return;
  }

  const score = Math.abs(Number(result) - target);
  if (!(currentDay in bestScores) || score < bestScores[currentDay]) {
    bestScores[currentDay] = score;
    localStorage.setItem("QBestScores", JSON.stringify(bestScores));
  }

 if (score === 0) {
  lockedDays[currentDay] = { score, expression: expressionBox.innerText };
  localStorage.setItem("QLockedDays", JSON.stringify(lockedDays));
  animateQu0x();

  // ✅ Show the Share button
  document.getElementById("shareBtn").classList.remove("hidden");
}

  renderGame(currentDay);
}

function animateQu0x() {
  qu0xAnimation.classList.remove("hidden");
  setTimeout(() => {
    qu0xAnimation.classList.add("hidden");
  }, 3000);
}

function renderGame(day) {
  currentDay = day;

  generatePuzzle(day);
  renderDice();

  buildButtons();
  
  if (lockedDays[day] && lockedDays[day].expression) {
    expressionBox.innerText = lockedDays[day].expression;
    evaluateExpression();
  } else {
    expressionBox.innerText = "";
    evaluationBox.innerText = "?";
  }

  targetBox.innerText = `Target: ${target}`;
  gameNumberDate.innerText = `Game #${day + 1} (${getDateFromDayIndex(day)})`;

  if (bestScores[day] !== undefined) {
    dailyBestScoreBox.innerText = `${bestScores[day]}`;
  } else {
    dailyBestScoreBox.innerText = "N/A";
  }

  const completedDays = Object.values(bestScores).filter(score => score === 0).length;
  completionRatioBox.innerText = `${completedDays}/${maxDay + 1}`;

  const totalScore = Object.values(bestScores).reduce((a, b) => a + b, 0);
  const totalGames = maxDay + 1;

  if (Object.keys(bestScores).length === totalGames) {
    masterScoreBox.innerText = `${totalScore}`;
  } else {
    masterScoreBox.innerText = "N/A";
  }


  const locked = isLocked(day);

  expressionBox.style.pointerEvents = locked ? "none" : "auto";
  submitBtn.disabled = locked;

  // Disable or enable all operator buttons
  buttonGrid.querySelectorAll("button").forEach(btn => {
    btn.disabled = locked;
    if (locked) {
      btn.classList.add("disabled");
    } else {
      btn.classList.remove("disabled");
    }
  });

  // Hide or show Share button
  const shareBtn = document.getElementById("shareBtn");
  if (locked && lockedDays[day]?.expression) {
    shareBtn.classList.remove("hidden");
  } else {
    shareBtn.classList.add("hidden");
  }
}

document.getElementById("prevDay").onclick = () => {
  if (currentDay > 0) {
    currentDay--;
    renderGame(currentDay);
    populateDropdown();
  }
};

document.getElementById("nextDay").onclick = () => {
  if (currentDay < maxDay) {
    currentDay++;
    renderGame(currentDay);
    populateDropdown();
  }
};

function populateDropdown() {
  dropdown.innerHTML = "";
  for (let i = 0; i <= maxDay; i++) {
    const option = document.createElement("option");
    option.value = i;
    
    // Option text, you can customize with emojis or formatting
    option.text = `Game #${i + 1}`;
    
    // Mark locked games with a star emoji in option text
    if (lockedDays[i] && lockedDays[i].score === 0) {
      option.text = "⭐ " + option.text;
    }

    dropdown.appendChild(option);
  }
  // Set the dropdown value to the currentDay so UI matches the current game
  dropdown.value = currentDay;
}

// Add event listener to handle selection change
dropdown.addEventListener("change", (e) => {
  const selectedDay = Number(e.target.value);
  if (selectedDay >= 0 && selectedDay <= maxDay) {
    renderGame(selectedDay);
  }
});

submitBtn.addEventListener("click", submit);

// Initialize buttons, dropdown, and render current game on page load
buildButtons();
populateDropdown();
renderGame(currentDay);

document.getElementById("shareBtn").addEventListener("click", () => {
  const gameNumber = currentDay + 1;  // game number = day index + 1
  const expression = expressionBox.innerText;
  const shareableExpr = expressionToShareable(expression);

  const shareText = `Qu0x!+ ${gameNumber}: ${shareableExpr}`;

  navigator.clipboard.writeText(shareText).then(() => {
    alert("Copied your Qu0x! expression to clipboard!");
  });
});
