function askRules() {
    const model = getSelectedModel('rules');
    const question = document.getElementById('rules-question').value;
    if (!question) return;
    const answerBox = document.getElementById('rules-answer');

    api_key = document.getElementById('openai-api-key').value;
    if (!api_key) {
        answerBox.textContent = 'Error: No valid api key provided.';
        return;
    }

    answerBox.classList.add('loading');
    fetch('/api/rules-chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question, api_key: api_key, model: model })
    })
    .then(response => response.json())
    .then(data => {
        answerBox.textContent = data.answer || data.error;
        answerBox.classList.remove('loading');
    })
    .catch(error => {
        answerBox.textContent = 'Error: ' + error;
        answerBox.classList.remove('loading');
    });
}