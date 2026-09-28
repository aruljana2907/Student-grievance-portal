/**
 * Theme Manager: Dark / Light Mode with localStorage persistence
 */

(function () {
  const THEME_KEY = 'sgp_portal_theme';

  function getPreferredTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    updateToggleButtons(theme);
  }

  function updateToggleButtons(theme) {
    const btns = document.querySelectorAll('.btn-theme-toggle');
    btns.forEach((btn) => {
      if (theme === 'dark') {
        btn.innerHTML = `<span aria-hidden="true">☀️</span> <span class="theme-text">Light</span>`;
        btn.setAttribute('aria-label', 'Switch to light mode');
      } else {
        btn.innerHTML = `<span aria-hidden="true">🌙</span> <span class="theme-text">Dark</span>`;
        btn.setAttribute('aria-label', 'Switch to dark mode');
      }
    });
  }

  window.toggleTheme = function () {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  };

  // Initialize theme on script load
  const initialTheme = getPreferredTheme();
  applyTheme(initialTheme);

  // Sync with OS theme changes if user hasn't explicitly set preference
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem(THEME_KEY)) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    updateToggleButtons(document.documentElement.getAttribute('data-theme') || 'light');
  });
})();
