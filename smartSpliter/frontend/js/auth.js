// SplitSmart — auth.js
// Handles login/register tab switching and form submissions.

function switchTab(tab) {
  const loginForm    = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const tabLogin     = document.getElementById('tab-login');
  const tabRegister  = document.getElementById('tab-register');

  if (tab === 'login') {
    loginForm.style.display    = 'flex';
    registerForm.style.display = 'none';
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
  } else {
    loginForm.style.display    = 'none';
    registerForm.style.display = 'flex';
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const btn   = document.getElementById('login-btn');
  const error = document.getElementById('login-error');
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  error.style.display = 'none';
  setLoading(btn, true);

  try {
    const res = await AuthAPI.login({ email, password });
    Auth.save(res.data);
    showToast(`Welcome back, ${res.data.name}! 👋`, 'success');
    setTimeout(() => window.location.href = 'dashboard.html', 600);
  } catch (err) {
    error.textContent = err.message;
    error.style.display = 'block';
  } finally {
    setLoading(btn, false);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn   = document.getElementById('register-btn');
  const error = document.getElementById('reg-error');
  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;

  error.style.display = 'none';
  setLoading(btn, true);

  try {
    const res = await AuthAPI.register({ name, email, password });
    Auth.save(res.data);
    showToast(`Welcome to SplitSmart, ${res.data.name}! 🎉`, 'success');
    setTimeout(() => window.location.href = 'dashboard.html', 600);
  } catch (err) {
    error.textContent = err.message;
    error.style.display = 'block';
  } finally {
    setLoading(btn, false);
  }
}

// Redirect if already logged in
if (Auth.isLoggedIn()) {
  window.location.href = 'dashboard.html';
}
