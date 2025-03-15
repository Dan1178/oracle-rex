// Tab switching
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

        button.classList.add('active');
        document.getElementById(button.dataset.tab).classList.add('active');
    });
});

// Rules Q&A
function askRules() {
    const question = document.getElementById('rules-question').value;
    if (!question) return;

    fetch('/api/rules-chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('rules-answer').textContent = data.answer || data.error;
    })
    .catch(error => {
        document.getElementById('rules-answer').textContent = 'Error: ' + error;
    });
}


// Strategy Suggester - Generate Game from TTS String and Set Images
function generateGame() {
    const ttsString = document.getElementById('tts-input').value.trim();
    if (!ttsString) {
        alert('Please enter a TTS string.');
        return;
    }

    fetch('/api/build-game-from-tts/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tts_string: ttsString, game_name: 'strategy' })
    })
        .then(response => {
            if (!response.ok) throw new Error('Failed to generate game');
            return response.json();
        })
        .then(data => {
            const gameData = data.game;
            const board = gameData.board;

            const hexes = document.querySelectorAll('.hex');
            hexes.forEach(hex => {
                const pos = hex.getAttribute('data-position');
                const tile = board.find(t => t.designation === pos);
                let tileId = '0';

                if (tile && tile.system && tile.system.tile_id !== undefined) {
                    tileId = tile.system.tile_id.toString();
                }

                // Special case: Mecatol Rex at 0-0
                if (pos === "0-0" && !tile) {
                    tileId = "18"; // Mecatol Rex system ID
                }

                hex.style.backgroundImage = `url('/static/images/systems/ST_${tileId}.png')`;
                hex.style.backgroundSize = 'cover';
                hex.style.backgroundPosition = 'center';
                hex.style.backgroundRepeat = 'no-repeat';
            });
            window.gameData = gameData;
        })
        .catch(error => {
            alert('Error generating game: ' + error.message);
        });
}

// Strategy Suggester
function suggestStrategy() {
    const faction = document.getElementById('faction-select').value;
    if (!faction || !currentGameJson) {
        document.getElementById('strategy-response').textContent = 'Please generate a game and select a faction.';
        return;
    }

    fetch('/api/strategy-suggester/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_json: currentGameJson, player_faction: faction })
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('strategy-response').textContent = data.strategy || data.error;
    })
    .catch(error => {
        document.getElementById('strategy-response').textContent = 'Error: ' + error;
    });
}