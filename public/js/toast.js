/**
 * Accessible Toast Notification System
 * 
 * SECURITY: Built using native DOM manipulation (textContent)
 * to ensure zero possibility of XSS injection via toast contents.
 */

(function () {
  let container = null;

  function ensureContainer() {
    if (!container) {
      container = document.getElementById('toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.setAttribute('role', 'status');
        container.setAttribute('aria-live', 'polite');
        document.body.appendChild(container);
      }
    }
    return container;
  }

  window.showToast = function (message, type = 'info', duration = 4000) {
    const parent = ensureContainer();

    const toast = document.createElement('div');
    toast.className = `portal-toast toast-${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

    // Icon
    const iconSpan = document.createElement('span');
    iconSpan.setAttribute('aria-hidden', 'true');
    iconSpan.style.fontSize = '1.1rem';
    if (type === 'success') iconSpan.textContent = '✅';
    else if (type === 'error') iconSpan.textContent = '⚠️';
    else iconSpan.textContent = 'ℹ️';

    // Message Text (Safe textContent)
    const textSpan = document.createElement('span');
    textSpan.style.flex = '1';
    textSpan.style.fontSize = '0.92rem';
    textSpan.textContent = String(message);

    // Dismiss Button
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'portal-toast-close';
    closeBtn.setAttribute('aria-label', 'Dismiss notification');
    closeBtn.textContent = '×';
    closeBtn.onclick = () => removeToast(toast);

    toast.appendChild(iconSpan);
    toast.appendChild(textSpan);
    toast.appendChild(closeBtn);

    parent.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => removeToast(toast), duration);
    }
  };

  function removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.2s ease';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 200);
  }
})();
