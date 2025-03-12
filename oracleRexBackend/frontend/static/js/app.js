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

// Strategy Suggester
function suggestStrategy() {
    const faction = document.getElementById('faction-select').value;
    if (!faction) return;

    // Fetch game JSON from backend (assumes game ID 1 for demo)
    fetch('/api/game/1/')
    .then(response => response.json())
    .then(gameJson => {
        // Render board preview
        const boardPreview = document.getElementById('board-preview');
        boardPreview.innerHTML = '';
        gameJson.board.forEach(tile => {
            const img = document.createElement('img');
            img.src = `/static/images/tiles/tile_${tile.designation}.png`;
            img.alt = tile.system.name;
            img.style.width = '50px'; // Adjust size as needed
            boardPreview.appendChild(img);
        });

        // Fetch strategy
        fetch('/api/strategy-suggester/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ game_json: gameJson, player_faction: faction })
        })
        .then(response => response.json())
        .then(data => {
            document.getElementById('strategy-response').textContent = data.strategy || data.error;
        });
    })
    .catch(error => {
        document.getElementById('strategy-response').textContent = 'Error: ' + error;
    });
}