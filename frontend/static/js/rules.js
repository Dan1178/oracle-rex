function askRules() {
    const question = document.getElementById('rules-question').value;
    if (!question) return;

    api_key = document.getElementById('openai-api-key').value;
    if (!api_key) {
        document.getElementById('rules-answer').textContent = 'Error: No valid api key provided.';
        return;
    }

    fetch('/api/rules-chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, api_key })
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('rules-answer').textContent = data.answer || data.error;
    })
    .catch(error => {
        document.getElementById('rules-answer').textContent = 'Error: ' + error;
    });
}