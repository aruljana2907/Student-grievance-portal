/**
 * Centralized API & Security Client
 * 
 * Manages CSRF token discovery, header injection, authenticated fetch,
 * and DOM sanitization utilities.
 */

let cachedCsrfToken = null;

async function fetchCsrfToken() {
  try {
    const res = await fetch('/api/auth/csrf-token', { credentials: 'same-origin' });
    if (res.ok) {
      const data = await res.json();
      cachedCsrfToken = data.csrfToken;
      return cachedCsrfToken;
    }
  } catch (err) {
    console.error('Failed to retrieve CSRF token:', err);
  }
  return null;
}

async function getCsrfToken() {
  if (cachedCsrfToken) return cachedCsrfToken;
  return await fetchCsrfToken();
}

/**
 * Enhanced fetch wrapper that attaches CSRF tokens on state-changing requests
 */
async function request(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  // Attach CSRF token on state-changing calls
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const token = await getCsrfToken();
    if (token) {
      headers['x-csrf-token'] = token;
    }
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }
  }

  const response = await fetch(url, {
    ...options,
    method,
    headers,
    credentials: 'same-origin',
  });

  // Handle session expiration
  if (response.status === 401) {
    const isAuthPage = window.location.pathname === '/' || window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('register.html');
    if (!isAuthPage) {
      window.location.href = '/401.html';
      return response;
    }
  }

  // Handle unauthorized role access
  if (response.status === 403) {
    const data = await response.clone().json().catch(() => ({}));
    if (data.code === 'CSRF_VALIDATION_FAILED') {
      // Refresh CSRF token on CSRF validation failures
      await fetchCsrfToken();
      if (window.showToast) window.showToast('Security token expired. Please retry.', 'error');
    } else if (data.code === 'FORBIDDEN') {
      window.location.href = '/403.html';
      return response;
    }
  }

  return response;
}

const api = {
  get: (url) => request(url, { method: 'GET' }),
  post: (url, body) => request(url, { method: 'POST', body }),
  put: (url, body) => request(url, { method: 'PUT', body }),
  delete: (url) => request(url, { method: 'DELETE' }),
};

/**
 * XSS DEFENSE UTILITY
 * Strictly escapes characters that have special meaning in HTML contexts.
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Helper to safely construct text nodes in elements
 */
function setText(elementId, text) {
  const el = document.getElementById(elementId);
  if (el) el.textContent = text !== null && text !== undefined ? String(text) : '';
}

/**
 * Check active session and update user badge or redirect
 */
async function checkAuth(requiredRole = null) {
  try {
    const res = await api.get('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      const user = data.user;

      if (requiredRole && user.role !== requiredRole) {
        window.location.href = '/403.html';
        return null;
      }

      // Populate user info in header if elements exist
      const nameEl = document.getElementById('user-display-name');
      if (nameEl) nameEl.textContent = user.name;
      const roleEl = document.getElementById('user-display-role');
      if (roleEl) roleEl.textContent = user.role.toUpperCase();

      return user;
    } else {
      if (requiredRole) {
        window.location.href = '/index.html';
      }
      return null;
    }
  } catch (err) {
    if (requiredRole) window.location.href = '/index.html';
    return null;
  }
}

/**
 * Universal Logout Handler
 */
async function handleLogout() {
  try {
    const res = await api.post('/api/auth/logout', {});
    if (res.ok) {
      if (window.showToast) window.showToast('Logged out successfully', 'info');
      setTimeout(() => {
        window.location.href = '/index.html';
      }, 500);
    } else {
      window.location.href = '/index.html';
    }
  } catch (err) {
    window.location.href = '/index.html';
  }
}

// Preload CSRF token on page load & bind global action handlers
document.addEventListener('DOMContentLoaded', () => {
  fetchCsrfToken();
  document.querySelectorAll('.btn-logout, [onclick*="handleLogout"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  });
});
