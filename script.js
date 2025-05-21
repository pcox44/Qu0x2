const startDate = new Date("2025-05-16T00:00:00Z");
let currentDate = new Date();

const targetEl = document.getElementById("target");
const diceContainer = document.getElementById("dice-container");
const expressionEl = document.getElementById("expression");
const resultEl = document.getElementById("live-result");
const scoreEl = document.getElementById("score-display");
const streakEl = document.getElementById("streak-display");
const archiveEl = document.getElementById("archive");
const resultsTableBody = document.querySelector("#results-table tbody");
const gameLabel = document.getElementById("game-label");

let expression = "";
let usedDice = [];
let dice = [];

function seedRNG(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
    hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
    hash ^= hash >>> 16;
    return (hash >>> 0) / 4294967296;
  };
}

function getGameId(date) {
  return Math.floor((date - startDate) / (1000 * 60 * 60 * 24)) + 1;
}

function getDateKey(date) {
  return date.toISOString().split("T")[0];
}

function getGameData(date) {
  const dateKey = getDateKey(date);
  const rng = seedRNG(dateKey);
  dice = Array.from({ length: 5 }, () => Math.floor(rng() * 6) + 1);
  const target = Math.floor(rng() * 100) + 1;
  return { dice, target };
}

function renderDice() {
  diceContainer.innerHTML = "";
  dice.forEach((val
