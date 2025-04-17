// Tab switching
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

        button.classList.add('active');
        document.getElementById(button.dataset.tab).classList.add('active');
    });
});

function setBoard(gameData, gameName) {
    const board = gameData.board;
    const players = gameData.players;

    const hexes = document.querySelectorAll('.hex-grid.' + gameName + ' .hex');
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

    // Update the faction dropdown
    if (gameName == "strategy" || gameName == "move") {
        const factionSelect = document.getElementById('faction-select ' + gameName);
        const getStrategyBtn = document.getElementById('get-strategy-btn ' + gameName);
        factionSelect.innerHTML = '';
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.text = 'Select Faction';
        defaultOption.selected = true;
        factionSelect.appendChild(defaultOption);

        // Populate dropdown with factions from game.players
        if (players) {
            let i = 1;
            players.forEach(player => {
                if (player.faction) {
                    const option = document.createElement('option');
                    option.value = player.faction;
                    option.text = player.faction + ' (Player ' + i + ')';
                    i += 1;
                    factionSelect.appendChild(option);
                }
            });
        }
        factionSelect.disabled = false;
        getStrategyBtn.disabled = true;

        factionSelect.addEventListener('change', () => {
            getStrategyBtn.disabled = factionSelect.value === '';
        });
    } else if (gameName == "fleet") {
        const exportButton = document.getElementById('fleet-manager-export');
        exportButton.disabled = false;
    }

    if (gameName == "strategy") {
        window.strategyGameData = gameData;
    } else if (gameName == "fleet") {
        window.fleetGameData = gameData;
    } else if (gameName == "move") {
        window.moveGameData = gameData;
    }
}


function generateGame(gameName) {
    const ttsString = document.getElementById('tts-input-'+gameName).value.trim();
    if (!ttsString) {
        alert('Please enter a TTS string.');
        return;
    }

    fetch('/api/build-game-from-tts/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tts_string: ttsString, game_name: gameName })
    })
        .then(response => {
            if (!response.ok) throw new Error('Failed to generate game');
            return response.json();
        })
        .then(data => {
            setBoard(data.game, gameName);
        })
        .catch(error => {
            alert('Error generating game: ' + error.message);
        });
}

function suggestStrategy(gameName) {
    const model = getSelectedModel(gameName);
    const faction = document.getElementById('faction-select ' + gameName).value;
    const answerBox = document.getElementById(gameName + '-response');
    let gameData;
    if (gameName == "strategy") {
        gameData = window.strategyGameData;
    } else if (gameName == "move") {
        gameData = window.moveGameData;
    }
    if (!faction || !gameData) {
        answerBox.textContent = 'Please generate a game and select a faction.';
        return;
    }

    answerBox.scrollIntoView({ behavior: 'smooth' });
    api_key = document.getElementById('xai-api-key').value;
    if (!api_key) {
        answerBox.textContent = 'Error: No valid api key provided.';
        return;
    }

    answerBox.classList.add('loading');
    fetch('/api/' + gameName + '-suggester/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_json: gameData, player_faction: faction, api_key: api_key, model: model })
    })
    .then(response => response.json())
    .then(data => {
        answerBox.textContent = data.strategy || data.error;
        answerBox.classList.remove('loading');
    })
    .catch(error => {
        answerBox.textContent = 'Error: ' + error;
        answerBox.classList.remove('loading');
    });
}

function exportFleetManagerToMoveSuggester() {
    let moveGameData = window.fleetGameData;
    moveGameData.name = 'move'
    setBoard(moveGameData, "move")
}

function getSelectedModel(tabPrefix) {
  const radio = document.querySelector(`input[name="${tabPrefix}-ai-model"]:checked`);
  return radio ? radio.value : 'gpt-4';
}