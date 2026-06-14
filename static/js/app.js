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
    const { creds, error } = buildLiveCredentials(gameName, model);
    if (error) {
        answerBox.textContent = 'Error: ' + error;
        return;
    }

    const loadingText = gameName === 'move'
        ? 'Evaluating tactical options...'
        : 'Analyzing board state...';

    runAiJob(
        '/api/jobs/' + gameName + '/',
        Object.assign({ game_json: gameData, player_faction: faction }, creds),
        answerBox,
        loadingText,
        (result, box) => renderAiText(box, result.strategy || 'No recommendation was returned.', result)
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
// Stop polling after 5.5 min — above the backend budget (default provider
// timeout 180s + worker/reaper slack ~300s) so a slow-but-valid job resolves to
// a real terminal status before the client gives up. Lower AI_REQUEST_TIMEOUT on
// the server for snappier failures.
const AI_JOB_POLL_TIMEOUT_MS = 330000;

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


// --- Modes & demo mode (Milestone 3) ----------------------------------------
// Three ways to use the AI features:
//   * Demo      — one-click sample scenarios served from saved responses. No key.
//   * BYOK      — paste your own provider key in Settings (existing flow).
//   * Live demo — an owner-provided access code unlocks a controlled backend key.
// Demo actions always hit /api/demo/run/ (cached, free). The live buttons send
// either the BYOK key or an access code, resolved on the backend.

window.demoCatalog = null;
window.liveDemoEnabled = false;

function loadDemoConfig() {
    fetch('/api/demo/catalog/')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
            if (!data) return;
            window.demoCatalog = data;
            renderDemoLabels();
            if (typeof renderRulesChips === 'function') renderRulesChips();
        })
        .catch(() => {});
    fetch('/api/demo/status/')
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) window.liveDemoEnabled = !!data.live_demo_enabled; })
        .catch(() => {});
}

// Fill any [data-demo-description] placeholders once the catalog loads.
function renderDemoLabels() {
    if (!window.demoCatalog) return;
    document.querySelectorAll('[data-demo-description]').forEach(el => {
        const feature = el.getAttribute('data-demo-description');
        const scen = window.demoCatalog.scenarios[feature];
        if (scen && scen.description) el.textContent = scen.description;
    });
}

// Build the credential fields for a live AI request: an access code (private
// live demo) takes precedence over a BYOK key. Returns { creds } or { error }.
function buildLiveCredentials(tabPrefix, model) {
    const codeEl = document.getElementById('live-demo-access-code');
    const accessCode = codeEl ? codeEl.value.trim() : '';
    if (accessCode) {
        return { creds: { access_code: accessCode } };
    }
    const apiKey = getSelectedApiKey(tabPrefix, model);
    if (!apiKey) {
        return {
            error: 'No API key found. Enter your own key in Settings, add a live-demo ' +
                'access code, or use the "Demo" buttons below (no key required).'
        };
    }
    return { creds: { api_key: apiKey, model: model } };
}

// Render AI result text into a box, with a clear label when it's a demo result.
function renderAiText(box, text, result) {
    box.textContent = '';
    const body = document.createElement('div');
    body.className = 'ai-result-text';
    body.textContent = text;
    box.appendChild(body);
    if (result && result.demo) {
        const note = document.createElement('div');
        note.className = 'demo-label';
        note.textContent = result.demo_label || 'Demo response generated from a saved scenario.';
        box.appendChild(note);
    }
}

// Run a one-click demo scenario through the same poll UI (served pre-completed).
function runDemoJob(scenarioKey, answerBox, loadingText, renderResult) {
    runAiJob('/api/demo/run/', { scenario_key: scenarioKey }, answerBox, loadingText, renderResult);
}

// Load a feature's sample scenario: fill its inputs, then show the saved result.
function loadDemoScenario(feature) {
    if (!window.demoCatalog) {
        alert('Demo data is still loading — try again in a moment.');
        return;
    }
    const scen = window.demoCatalog.scenarios[feature];
    if (!scen) return;

    if (feature === 'strategy' || feature === 'move') {
        loadDemoBoardScenario(feature, scen);
    } else if (feature === 'tac_calc') {
        loadDemoBattleScenario(scen);
    }
}

function loadDemoBoardScenario(feature, scen) {
    const answerBox = document.getElementById(feature + '-response');
    answerBox.classList.add('loading');
    answerBox.textContent = feature === 'move'
        ? 'Loading tactical puzzle...'
        : 'Loading sample board...';

    fetch('/api/build-game-from-tts/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tts_string: scen.tts_string, game_name: feature })
    })
        .then(r => { if (!r.ok) throw new Error('Failed to load sample board'); return r.json(); })
        .then(data => {
            const ttsInput = document.getElementById('tts-input-' + feature);
            if (ttsInput) ttsInput.value = scen.tts_string;
            setBoard(data.game, feature);

            // Auto-select the suggested faction and enable the live button.
            const factionSelect = document.getElementById('faction-select ' + feature);
            const getStrategyBtn = document.getElementById('get-strategy-btn ' + feature);
            if (factionSelect && scen.suggested_faction) {
                factionSelect.value = scen.suggested_faction;
                if (getStrategyBtn) getStrategyBtn.disabled = factionSelect.value === '';
            }

            // Show the saved recommendation for the same scenario.
            answerBox.classList.remove('loading');
            runDemoJob(
                scen.key,
                answerBox,
                feature === 'move' ? 'Evaluating tactical options...' : 'Analyzing board state...',
                (result, box) => renderAiText(box, result.strategy || 'No recommendation was returned.', result)
            );
        })
        .catch(err => {
            answerBox.classList.remove('loading');
            answerBox.textContent = 'Error loading sample: ' + err.message;
        });
}

function loadDemoBattleScenario(scen) {
    if (typeof applyDemoBattleCounts === 'function') {
        applyDemoBattleCounts(scen.unit_counts || {});
    }
    const answerBox = document.getElementById('tactical-calculation-results');
    runDemoJob(
        scen.key,
        answerBox,
        'Calculating combat odds...',
        (result, box) => renderAiText(box, result.calc_results || 'No result was returned.', result)
    );
}

loadDemoConfig();