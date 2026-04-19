// ── Shared auth utilities ──────────────────────────────────────
const API = '';

function getToken()    { return localStorage.getItem('amsam_token'); }
function getUser()     { try { return JSON.parse(localStorage.getItem('amsam_user')); } catch { return null; } }
function isAdmin()     { const u = getUser(); return u && ['super_admin','sub_admin'].includes(u.role); }
function isSuperAdmin(){ const u = getUser(); return u && u.role === 'super_admin'; }

function saveSession(token, user) {
  localStorage.setItem('amsam_token', token);
  localStorage.setItem('amsam_user', JSON.stringify(user));
}

function logout() {
  localStorage.removeItem('amsam_token');
  localStorage.removeItem('amsam_user');
  window.location.href = '/index.html';
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// Toast notifications
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type]||'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// Guard: redirect to login if not authenticated
function requireAuth() {
  if (!getToken()) { window.location.href = '/index.html'; return false; }
  return true;
}

// Guard: redirect non-admins away from admin pages
function requireAdminAccess() {
  if (!requireAuth()) return false;
  if (!isAdmin()) { window.location.href = '/home.html'; return false; }
  return true;
}

// Render navbar avatar initials or photo
function renderNavAvatar(user) {
  const el = document.getElementById('navAvatar');
  if (!el) return;
  if (user.photo_path) {
    el.innerHTML = `<img src="${user.photo_path}" alt="${user.name}"/>`;
  } else {
    el.textContent = (user.name || 'U').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  }
}

// ── LOGIN PAGE LOGIC ───────────────────────────────────────────
if (document.getElementById('loginForm')) {
  // Already logged in → redirect
  if (getToken()) {
    const u = getUser();
    window.location.href = isAdmin() ? '/admin.html' : '/home.html';
  }

  const form   = document.getElementById('loginForm');
  const btn    = document.getElementById('loginBtn');
  const errMsg = document.getElementById('errorMsg');
  const errTxt = document.getElementById('errorText');
  const toggle = document.getElementById('togglePwd');
  const pwdFld = document.getElementById('password');

  toggle.addEventListener('click', () => {
    pwdFld.type = pwdFld.type === 'password' ? 'text' : 'password';
    toggle.textContent = pwdFld.type === 'password' ? '👁️' : '🙈';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errMsg.classList.remove('show');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Signing in…';

    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: document.getElementById('email').value.trim(),
          password: pwdFld.value
        })
      });
      saveSession(data.token, data.user);
      const dest = ['super_admin','sub_admin'].includes(data.user.role) ? '/admin.html' : '/home.html';
      window.location.href = dest;
    } catch (err) {
      errTxt.textContent = err.message;
      errMsg.classList.add('show');
      btn.disabled = false;
      btn.innerHTML = 'Sign In';
    }
  });
}
