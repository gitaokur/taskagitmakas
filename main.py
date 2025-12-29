import os
import random
from flask import Flask, jsonify, request, render_template

app = Flask(__name__, static_folder="static", template_folder="templates")

MOVES = ("rock", "paper", "scissors")

# who beats who
# key beats value
BEATS = {
    "rock": "scissors",
    "scissors": "paper",
    "paper": "rock",
}

def decide_outcome(player_move: str, computer_move: str) -> str:
    if player_move == computer_move:
        return "tie"
    if BEATS[player_move] == computer_move:
        return "win"
    return "lose"

@app.get("/")
def index():
    return render_template("index.html")

@app.get("/health")
def health():
    return jsonify({"status": "ok"})

@app.post("/api/play")
def play():
    data = request.get_json(silent=True) or {}
    player_move = (data.get("move") or "").strip().lower()

    if player_move not in MOVES:
        return jsonify({
            "error": "Invalid move. Use one of: rock, paper, scissors."
        }), 400

    computer_move = random.choice(MOVES)
    outcome = decide_outcome(player_move, computer_move)

    return jsonify({
        "playerMove": player_move,
        "computerMove": computer_move,
        "outcome": outcome,  # win | lose | tie
    })

if __name__ == "__main__":
    # This is handy for local runs. In Cloud Run you'll likely start with gunicorn, etc.
    port = int(os.environ.get("PORT", "8080"))
    app.run(host="0.0.0.0", port=port)
