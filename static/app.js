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

const resultBox = document.getElementById("resultBox");
const resultTitle = document.getElementById("resultTitle");
const resultDetails = document.getElementById("resultDetails");
const apiError = document.getElementById("apiError");

const moveButtons = Array.from(document.querySelectorAll(".move"));

const MOVE_META = {
  rock: { emoji: "✊", label: "Rock" },
  paper: { emoji: "✋", label: "Paper" },
  scissors: { emoji: "✌️", label: "Scissors" },
};

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

  hide(resultBox);
  hide(apiError);
}

function enterNicknameView() {
  show(nicknameCard);
  hide(gameCard);

  nicknameInput.value = "";
  nicknameInput.focus();

  hide(nicknameError);
  hide(apiError);
  hide(resultBox);
}

function setNicknameError(msg) {
  nicknameError.textContent = msg;
  show(nicknameError);
}

function setApiError(msg) {
  apiError.textContent = msg;
  show(apiError);
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

async function play(move) {
  hide(apiError);
  setButtonsDisabled(true);

  try {
    const res = await fetch("/api/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ move }),
    });

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = payload?.error || `Request failed (${res.status})`;
      setApiError(msg);
      return;
    }

    const playerMove = payload.playerMove;
    const computerMove = payload.computerMove;
    const outcome = payload.outcome;

    const p = MOVE_META[playerMove];
    const c = MOVE_META[computerMove];

    resultTitle.textContent = outcomeTitle(outcome);
    resultDetails.textContent =
      `You: ${p.emoji} ${p.label} — Computer: ${c.emoji} ${c.label}`;

    show(resultBox);

    updateScoreForOutcome(outcome);
  } catch (e) {
    setApiError("Network error. Please try again.");
  } finally {
    setButtonsDisabled(false);
  }
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
  hide(resultBox);
});

moveButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const move = btn.getAttribute("data-move");
    if (!move) return;
    play(move);
  });
});

// --- Boot ---

(function init() {
  const savedNick = localStorage.getItem(LS_NICK);
  if (savedNick) enterGameView();
  else enterNicknameView();
})();
