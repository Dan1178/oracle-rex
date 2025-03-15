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

function generateGame() {
    const ttsString = document.getElementById('tts-input').value.trim();
    if (!ttsString) {
        document.getElementById('board-preview').textContent = 'Please enter a TTS string.';
        return;
    }

    fetch('/api/build-game-from-tts/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tts_string: ttsString, game_name: 'strategy' })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            document.getElementById('board-preview').textContent = data.error;
            return;
        }
        currentGameJson = data.game_json;
        document.getElementById('board-preview').textContent = 'Game generated successfully! Select a faction and get your strategy.';
    })
    .catch(error => {
        document.getElementById('board-preview').textContent = 'Error: ' + error;
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