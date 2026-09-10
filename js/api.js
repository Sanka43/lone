// Thin wrapper around the Google Apps Script Web App API.
// Uses text/plain content-type on purpose: it avoids a CORS preflight
// (OPTIONS) request, which Apps Script web apps do not handle.

function getToken() {
  return localStorage.getItem('lone_token');
}

function setSession(token, username) {
  localStorage.setItem('lone_token', token);
  localStorage.setItem('lone_username', username);
}

function clearSession() {
  localStorage.removeItem('lone_token');
  localStorage.removeItem('lone_username');
}

function requireLogin() {
  if (!getToken()) {
    window.location.href = 'index.html';
    throw new Error('redirecting to login');
  }
}

async function apiCall(action, params) {
  if (!API_URL || API_URL.indexOf('PASTE_YOUR') === 0) {
    return { ok: false, error: 'API_URL is not configured yet — edit js/config.js' };
  }

  const body = Object.assign({ action: action, token: getToken() }, params || {});
  let res, data;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    });
    data = await res.json();
  } catch (err) {
    return { ok: false, error: 'Could not reach the server: ' + err.message };
  }

  if (data.ok === false && /not authenticated|session expired/i.test(data.error || '')) {
    clearSession();
    window.location.href = 'index.html';
    return;
  }
  return data;
}
