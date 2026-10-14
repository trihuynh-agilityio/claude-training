const form = document.getElementById('login-form');
const message = document.getElementById('message');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.textContent = '';
  message.className = '';

  const username = form.username.value;
  const password = form.password.value;

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const result = await response.json();

    message.textContent = result.message;
    message.className = result.ok ? 'success' : 'error';
  } catch {
    message.textContent = 'Could not reach the server. Is it running?';
    message.className = 'error';
  }
});
