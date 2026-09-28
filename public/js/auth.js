/**
 * Authentication Module: Login & Registration
 */

document.addEventListener('DOMContentLoaded', () => {
  initLoginForm();
  initRegisterForm();
  initPasswordChecker();
});

/**
 * Handle Login Form
 */
function initLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  const submitBtn = document.getElementById('login-submit-btn');
  const errorAlert = document.getElementById('login-error-alert');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (errorAlert) {
      errorAlert.classList.add('d-none');
      errorAlert.textContent = '';
    }

    const registerNo = document.getElementById('login-regno')?.value.trim();
    const password = document.getElementById('login-password')?.value;

    if (!registerNo || !password) {
      if (errorAlert) {
        errorAlert.textContent = 'Please enter your register number / username and password.';
        errorAlert.classList.remove('d-none');
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Authenticating...`;
    }

    try {
      const res = await api.post('/api/auth/login', { registerNo, password });
      const data = await res.json();

      if (res.ok) {
        showToast('Login successful! Redirecting...', 'success', 2000);
        setTimeout(() => {
          if (data.user.role === 'admin') {
            window.location.href = '/admin/dashboard.html';
          } else {
            window.location.href = '/student/dashboard.html';
          }
        }, 600);
      } else {
        if (errorAlert) {
          errorAlert.textContent = data.error || 'Authentication failed. Please check your credentials.';
          errorAlert.classList.remove('d-none');
        }
        showToast(data.error || 'Login failed', 'error');
      }
    } catch (err) {
      if (errorAlert) {
        errorAlert.textContent = 'A network error occurred. Please try again.';
        errorAlert.classList.remove('d-none');
      }
      showToast('Network error during login', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
      }
    }
  });

  // Demo credential fast-fill buttons
  const demoStudentBtn = document.getElementById('demo-fill-student');
  const demoAdminBtn = document.getElementById('demo-fill-admin');

  if (demoStudentBtn) {
    demoStudentBtn.addEventListener('click', (e) => {
      e.preventDefault();
      fillCredentials('student');
    });
  }
  if (demoAdminBtn) {
    demoAdminBtn.addEventListener('click', (e) => {
      e.preventDefault();
      fillCredentials('admin');
    });
  }
}

/**
 * Fast Demo Autofill Helper
 */
function fillCredentials(role) {
  const regInput = document.getElementById('login-regno');
  const pwdInput = document.getElementById('login-password');
  const errorAlert = document.getElementById('login-error-alert');

  if (!regInput || !pwdInput) return;

  if (errorAlert) {
    errorAlert.classList.add('d-none');
    errorAlert.textContent = '';
  }

  if (role === 'admin') {
    regInput.value = 'ADMIN001';
    pwdInput.value = 'Admin@123';
  } else {
    regInput.value = '110725105034';
    pwdInput.value = 'Student@123';
  }

  regInput.dispatchEvent(new Event('input', { bubbles: true }));
  regInput.dispatchEvent(new Event('change', { bubbles: true }));
  pwdInput.dispatchEvent(new Event('input', { bubbles: true }));
  pwdInput.dispatchEvent(new Event('change', { bubbles: true }));

  if (typeof showToast === 'function') {
    showToast(`Loaded ${role.toUpperCase()} demo credentials`, 'info', 1500);
  }
}

window.fillCredentials = fillCredentials;

/**
 * Handle Registration Form
 */
function initRegisterForm() {
  const form = document.getElementById('register-form');
  if (!form) return;

  const submitBtn = document.getElementById('register-submit-btn');
  const errorAlert = document.getElementById('register-error-alert');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (errorAlert) {
      errorAlert.classList.add('d-none');
      errorAlert.textContent = '';
    }

    const name = document.getElementById('reg-name')?.value.trim();
    const registerNo = document.getElementById('reg-regno')?.value.trim();
    const email = document.getElementById('reg-email')?.value.trim();
    const department = document.getElementById('reg-dept')?.value;
    const password = document.getElementById('reg-password')?.value;
    const confirmPassword = document.getElementById('reg-confirm-password')?.value;

    if (password !== confirmPassword) {
      if (errorAlert) {
        errorAlert.textContent = 'Passwords do not match.';
        errorAlert.classList.remove('d-none');
      }
      showToast('Passwords do not match', 'error');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creating Account...`;
    }

    try {
      const res = await api.post('/api/auth/register', {
        name,
        registerNo,
        email,
        department,
        password,
      });
      const data = await res.json();

      if (res.ok) {
        showToast('Account registered successfully! Redirecting to login...', 'success', 2500);
        setTimeout(() => {
          window.location.href = '/index.html';
        }, 1200);
      } else {
        if (errorAlert) {
          errorAlert.textContent = data.error || 'Registration failed.';
          errorAlert.classList.remove('d-none');
        }
        showToast(data.error || 'Registration failed', 'error');
      }
    } catch (err) {
      if (errorAlert) {
        errorAlert.textContent = 'Network error during registration.';
        errorAlert.classList.remove('d-none');
      }
      showToast('Network error during registration', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Complete Registration';
      }
    }
  });
}

/**
 * Real-time Password Policy Validator
 */
function initPasswordChecker() {
  const pwdInput = document.getElementById('reg-password');
  if (!pwdInput) return;

  const ruleLen = document.getElementById('rule-length');
  const ruleUpper = document.getElementById('rule-upper');
  const ruleLower = document.getElementById('rule-lower');
  const ruleNum = document.getElementById('rule-number');

  pwdInput.addEventListener('input', () => {
    const val = pwdInput.value;

    const hasLen = val.length >= 8;
    const hasUpper = /[A-Z]/.test(val);
    const hasLower = /[a-z]/.test(val);
    const hasNum = /[0-9]/.test(val);

    updateRule(ruleLen, hasLen);
    updateRule(ruleUpper, hasUpper);
    updateRule(ruleLower, hasLower);
    updateRule(ruleNum, hasNum);
  });

  function updateRule(el, isValid) {
    if (!el) return;
    if (isValid) {
      el.classList.add('valid');
      el.querySelector('.rule-icon').textContent = '✓';
    } else {
      el.classList.remove('valid');
      el.querySelector('.rule-icon').textContent = '○';
    }
  }
}
