// Daily Dice Game v2 (cleaned, no dark mode)

// ... all previous code remains the same ...

// Submit expression
function submitExpression() {
  let v = validateExpression(expression);
  if (!v.valid) {
    alert("Invalid expression:\n" + v.message);
    return;
  }
  let score = Math.abs(target - v.value);
  submissions.push({
    expr: expression,
    result: v.value,
    score: score.toFixed(4),
  });

  // Update streak: increase if score is 0 else reset
  if (score === 0) streak++;
  else streak = 0;

  // Save to local storage
  saveGame();

  // Clear for next input
  expression = "";
  updateDisplay();
  renderResultsTable();
  updateScoreStreak();
  renderArchive();
}

// Add event listener to submit button
document.getElementById("submit-btn").addEventListener("click", submitExpression);

// Remove dark mode toggle and related listeners

// Initialize the game
function init() {
  generateDiceAndTarget(new Date());
  loadGame();
  renderResultsTable();
  updateScoreStreak();
  renderArchive();
}

init();
