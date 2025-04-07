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