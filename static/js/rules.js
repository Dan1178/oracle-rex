function askRules() {
    const model = getSelectedModel('rules');
    const question = document.getElementById('rules-question').value;
    if (!question) return;
    const answerBox = document.getElementById('rules-answer');

    api_key = getSelectedApiKey('rules', model);
    if (!api_key) {
        answerBox.textContent = 'Error: No valid api key provided.';
        return;
    }

    runAiJob(
        '/api/jobs/rules/',
        { question: question, api_key: api_key, model: model },
        answerBox,
        'Consulting rules advisor...',
        (result, box) => { box.textContent = result.answer || 'No answer was returned.'; }
    );
}