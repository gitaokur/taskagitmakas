const LS_NICK = "rps:nickname";
const LS_SCORE = "rps:score";

const nicknameCard = document.getElementById("nicknameCard");
const nicknameForm = document.getElementById("nicknameForm");
const nicknameInput = document.getElementById("nicknameInput");
const nicknameError = document.getElementById("nicknameError");

const gameCard = document.getElementById("gameCard");
const nicknameDisplay = document.getElementById("nicknameDisplay");

const winsEl = document.getElementById("wins");
const lossesEl = document.getElementById("losses");
const tiesEl = document.getElementById("ties");

const changeNickBtn = document.getElementById("changeNickBtn");
const resetScoreBtn = document.getElementById("resetScoreBtn");

const moveButtons = Array.from(document.querySelectorAll(".move"));

// Modal elements
const modalOverlay = document.getElementById("modalOverlay");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalTitle = document.getElementById("modalTitle");
const countdownEl = document.getElementById("countdown");
const modalMoves = document.getElementById("modalMoves");
const modalOutcome = document.getElementById("modalOutcome");
const modalError = document.getElementById("modalError");
const nextRoundBtn = document.getElementById("nextRoundBtn");

const MOVE_META = {
  rock: { emoji: "✊", label: "Rock" },
  paper: { emoji: "✋", label: "Paper" },
  scissors: { emoji: "✌️", label: "Scissors" },
};

let countdownTimer = null;
let inRound = false;

function safeTrim(s) {
  return (s || "").trim();
}

function show(el) { el.classList.remove("hidden"); }
function hide(el) { el.classList.add("hidden"); }

function readScore() {
  const raw = localStorage.getItem(LS_SCORE);
  if (!raw) return { wins: 0, losses: 0, ties: 0 };

  try {
    const parsed = JSON.parse(raw);
    return {
      wins: Number(parsed.wins) || 0,
      losses: Number(parsed.losses) || 0,
      ties: Number(parsed.ties) || 0,
    };
  } catch {
    return { wins: 0, losses: 0, ties: 0 };
  }
}

function writeScore(score) {
  localStorage.setItem(LS_SCORE, JSON.stringify(score));
}

function renderScore() {
  const score = readScore();
  winsEl.textContent = String(score.wins);
  lossesEl.textContent = String(score.losses);
  tiesEl.textContent = String(score.ties);
}

function setNicknameAndMaybeResetScore(newNick) {
  const savedNick = localStorage.getItem(LS_NICK);

  // Requirement: nickname changes -> reset scoreboard
  if (!savedNick || savedNick !== newNick) {
    writeScore({ wins: 0, losses: 0, ties: 0 });
  }

  localStorage.setItem(LS_NICK, newNick);
}

function enterGameView() {
  const nick = localStorage.getItem(LS_NICK);
  nicknameDisplay.textContent = nick || "—";
  renderScore();

  hide(nicknameCard);
  show(gameCard);
  closeModal(true);
}

function enterNicknameView() {
  show(nicknameCard);
  hide(gameCard);

  nicknameInput.value = "";
  nicknameInput.focus();

  hide(nicknameError);
  closeModal(true);
}

function setNicknameError(msg) {
  nicknameError.textContent = msg;
  show(nicknameError);
}

function setButtonsDisabled(disabled) {
  moveButtons.forEach(btn => { btn.disabled = disabled; });
}

function outcomeTitle(outcome) {
  if (outcome === "win") return "You Win!";
  if (outcome === "lose") return "You Lose!";
  return "It's a Tie!";
}

function updateScoreForOutcome(outcome) {
  const score = readScore();
  if (outcome === "win") score.wins += 1;
  else if (outcome === "lose") score.losses += 1;
  else score.ties += 1;
  writeScore(score);
  renderScore();
}

function clearCountdownTimer() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function openModal() {
  show(modalOverlay);
  document.body.classList.add("noScroll");
}

function closeModal(force = false) {
  // If a round is in progress, don't allow closing unless forced (like changing nickname).
  if (inRound && !force) return;

  clearCountdownTimer();
  hide(modalOverlay);
  document.body.classList.remove("noScroll");

  // reset modal UI
  modalTitle.textContent = "Get ready…";
  countdownEl.textContent = "3";
  show(countdownEl);

  hide(modalMoves);
  hide(modalOutcome);
  hide(modalError);
  hide(nextRoundBtn);

  modalMoves.textContent = "";
  modalOutcome.textContent = "";
  modalError.textContent = "";
}

function setModalError(msg) {
  modalError.textContent = msg;
  show(modalError);
}

async function requestPlay(move) {
  const res = await fetch("/api/play", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ move }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = payload?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return payload;
}

function startRound(selectedMove) {
  if (inRound) return;
  inRound = true;

  // Lock UI
  setButtonsDisabled(true);

  // Prepare modal
  openModal();
  modalTitle.textContent = "Get ready…";
  hide(modalMoves);
  hide(modalOutcome);
  hide(modalError);
  hide(nextRoundBtn);

  let t = 3;
  countdownEl.textContent = String(t);
  show(countdownEl);

  clearCountdownTimer();
  countdownTimer = setInterval(async () => {
    t -= 1;

    if (t > 0) {
      countdownEl.textContent = String(t);
      return;
    }

    // Stop timer at 0 and resolve round
    clearCountdownTimer();
    countdownEl.textContent = "…";

    try {
      const payload = await requestPlay(selectedMove);

      const playerMove = payload.playerMove;
      const computerMove = payload.computerMove;
      const outcome = payload.outcome;

      const p = MOVE_META[playerMove];
      const c = MOVE_META[computerMove];

      hide(countdownEl);

      modalMoves.textContent = `You: ${p.emoji} ${p.label}  •  Computer: ${c.emoji} ${c.label}`;
      modalOutcome.textContent = outcomeTitle(outcome);

      show(modalMoves);
      show(modalOutcome);
      show(nextRoundBtn);

      updateScoreForOutcome(outcome);
    } catch (e) {
      // On error, allow user to retry next round
      hide(countdownEl);
      setModalError(e?.message || "Network error. Please try again.");
      show(nextRoundBtn);
    }
  }, 1000);
}

function resetForNextRound() {
  inRound = false;
  closeModal(true);
  setButtonsDisabled(false);
}

// --- Events ---

nicknameForm.addEventListener("submit", (ev) => {
  ev.preventDefault();
  hide(nicknameError);

  const nick = safeTrim(nicknameInput.value);
  if (!nick) {
    setNicknameError("Please enter a nickname.");
    return;
  }
  if (nick.length < 2) {
    setNicknameError("Nickname must be at least 2 characters.");
    return;
  }

  setNicknameAndMaybeResetScore(nick);
  enterGameView();
});

changeNickBtn.addEventListener("click", () => {
  enterNicknameView();
});

resetScoreBtn.addEventListener("click", () => {
  writeScore({ wins: 0, losses: 0, ties: 0 });
  renderScore();
  resetForNextRound();
});

moveButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const move = btn.getAttribute("data-move");
    if (!move) return;
    startRound(move);
  });
});

nextRoundBtn.addEventListener("click", () => {
  resetForNextRound();
});

modalCloseBtn.addEventListener("click", () => {
  // Only closable if not in the middle of countdown/round (unless forced elsewhere)
  closeModal(false);
});

// Optional: click outside modal to close (only if not in round)
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal(false);
});

// --- Boot ---

(function init() {
  const savedNick = localStorage.getItem(LS_NICK);
  if (savedNick) enterGameView();
  else enterNicknameView();
})();
