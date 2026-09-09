if (getToken()) {
  window.location.href = 'dashboard.html';
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('err');
  errEl.textContent = '';
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  try {
    const res = await apiCall('login', { username, password });
    if (res.ok) {
      setSession(res.token, res.username);
      window.location.href = 'dashboard.html';
    } else {
      errEl.textContent = res.error || 'Login failed';
    }
  } catch (err) {
    errEl.textContent = err.message;
  }
});
