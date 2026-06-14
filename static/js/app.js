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
    api_key = getSelectedApiKey(gameName, model);
    if (!api_key) {
        answerBox.textContent = 'Error: No valid api key provided.';
        return;
    }

    const loadingText = gameName === 'move'
        ? 'Evaluating tactical options...'
        : 'Analyzing board state...';

    runAiJob(
        '/api/jobs/' + gameName + '/',
        { game_json: gameData, player_faction: faction, api_key: api_key, model: model },
        answerBox,
        loadingText,
        (result, box) => { box.textContent = result.strategy || 'No recommendation was returned.'; }
    );
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

function getSelectedApiKey(tabPrefix, model) {
    const radio = document.querySelector(`input[name="${tabPrefix}-ai-model"]:checked`);
    const apiMake = radio ? radio.getAttribute('data-api-make') : 'openai';
    api_key = document.getElementById(`${apiMake}-api-key`).value;
    return api_key;
}


// --- Async AI job polling (Milestone 2) -------------------------------------
// AI features now run as background jobs: POST to create the job (returns
// immediately with a job id), then poll the status endpoint until the job
// reaches a terminal state. This keeps the long provider call off the
// browser->backend request path so the hosted app doesn't time out on Render.

const AI_JOB_POLL_INTERVAL_MS = 1500;
const AI_JOB_POLL_TIMEOUT_MS = 180000; // stop polling after 3 minutes

function pollAiJob(jobId, onDone, onError) {
    const startedAt = Date.now();
    const tick = () => {
        fetch('/api/jobs/' + jobId + '/')
            .then(response => {
                if (!response.ok) throw new Error('Could not check job status.');
                return response.json();
            })
            .then(job => {
                if (job.is_terminal) {
                    if (job.status === 'completed') {
                        onDone(job.result || {});
                    } else {
                        onError(job.error ||
                            'The AI request failed. You can retry, switch to demo mode, ' +
                            'or provide your own API key in Live AI Mode.');
                    }
                    return;
                }
                if (Date.now() - startedAt > AI_JOB_POLL_TIMEOUT_MS) {
                    onError('The AI request is taking longer than expected. ' +
                        'Try a smaller scenario, a faster model, or retry.');
                    return;
                }
                setTimeout(tick, AI_JOB_POLL_INTERVAL_MS);
            })
            .catch(err => onError('Error checking job status: ' + err.message));
    };
    tick();
}

// Submit an AI job and drive its full lifecycle (loading -> success/error)
// into a single answer box. ``renderResult(result, answerBox)`` renders the
// terminal job result payload returned by the worker.
function runAiJob(createUrl, body, answerBox, loadingText, renderResult) {
    answerBox.classList.add('loading');
    answerBox.textContent = loadingText;
    fetch(createUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
    .then(response => response.json().then(data => ({ ok: response.ok, data })))
    .then(({ ok, data }) => {
        if (!ok || !data.job_id) {
            throw new Error(data.error || 'Could not start the AI request.');
        }
        pollAiJob(
            data.job_id,
            result => {
                answerBox.classList.remove('loading');
                renderResult(result, answerBox);
            },
            message => {
                answerBox.classList.remove('loading');
                answerBox.textContent = message;
            }
        );
    })
    .catch(err => {
        answerBox.classList.remove('loading');
        answerBox.textContent = 'Error: ' + err.message;
    });
}