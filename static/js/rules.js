function askRules() {
    const model = getSelectedModel('rules');
    const question = document.getElementById('rules-question').value;
    if (!question) return;
    const answerBox = document.getElementById('rules-answer');

    const { creds, error } = buildLiveCredentials('rules', model);
    if (error) {
        answerBox.textContent = 'Error: ' + error;
        return;
    }

    runAiJob(
        '/api/jobs/rules/',
        Object.assign({ question: question }, creds),
        answerBox,
        'Consulting rules advisor...',
        (result, box) => renderAiText(box, result.answer || 'No answer was returned.', result)
    );
}

// --- Demo prompt chips (Milestone 3) ----------------------------------------
// Each chip is a saved question with a saved answer: clicking it fills the box
// and shows the cached response, so an interviewer can try the rules advisor
// with no API key.
function renderRulesChips() {
    const container = document.getElementById('rules-chips');
    if (!container || !window.demoCatalog) return;
    const rules = window.demoCatalog.scenarios.rules;
    if (!rules || !rules.chips) return;

    container.textContent = '';
    rules.chips.forEach(chip => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'demo-chip';
        btn.textContent = chip.question;
        btn.onclick = () => askDemoRules(chip);
        container.appendChild(btn);
    });
}

function askDemoRules(chip) {
    const questionBox = document.getElementById('rules-question');
    if (questionBox) questionBox.value = chip.question;
    const answerBox = document.getElementById('rules-answer');
    runDemoJob(
        chip.key,
        answerBox,
        'Consulting rules advisor...',
        (result, box) => renderAiText(box, result.answer || 'No answer was returned.', result)
    );
}
