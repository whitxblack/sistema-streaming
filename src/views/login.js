/* ============================================================
   VIEW: LOGIN (Global)
   ============================================================ */
window.renderLogin = function() {
  return `
    <div class="login-page animate-fadeIn">
      <div class="login-logo animate-fadeInDown">
        <div class="login-logo-text">MiStream</div>
        <div class="login-logo-tagline">Gestor de Suscripciones Premium</div>
      </div>
      <div class="login-card animate-fadeInUp" style="animation-delay:100ms">
        <div>
          <div class="page-title" style="font-size:22px">Iniciar Sesión</div>
          <div class="page-subtitle" style="margin-top:6px">Accede a tu panel de suscripciones</div>
        </div>
        <form class="login-form" id="login-form" novalidate>
          <div class="form-group">
            <label class="form-label" for="login-email">Correo Electrónico</label>
            <input class="form-input" type="email" id="login-email" placeholder="correo@email.com" autocomplete="email" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="login-password">Contraseña</label>
            <div style="position:relative">
              <input class="form-input" type="password" id="login-password" placeholder="••••••••" autocomplete="current-password" required />
              <button type="button" id="toggle-pwd" style="position:absolute;right:0;bottom:12px;background:none;border:none;color:var(--color-outline);cursor:pointer;font-size:18px;padding:0">👁</button>
            </div>
          </div>
          <button class="btn btn-primary btn-full btn-lg" type="submit" id="login-btn">
            <span id="login-btn-text">Ingresar</span>
          </button>
        </form>
      </div>
    </div>
  `;
};

window.mountLogin = function() {
  const form = document.getElementById('login-form');
  const togglePwd = document.getElementById('toggle-pwd');
  const pwdInput = document.getElementById('login-password');

  togglePwd?.addEventListener('click', () => {
    pwdInput.type = pwdInput.type === 'password' ? 'text' : 'password';
    togglePwd.textContent = pwdInput.type === 'password' ? '👁' : '🙈';
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');
    const btnText = document.getElementById('login-btn-text');

    if (!email || !password) {
      window.showToast('Campos requeridos', 'Por favor ingresa email y contraseña', 'warning');
      return;
    }

    btn.disabled = true;
    btnText.innerHTML = '<div class="spinner spinner-sm" style="border-top-color:#412d00;margin:0 auto"></div>';

    try {
      await window.store.login(email, password);
      window.showToast('Bienvenido 👋', '', 'success');
      setTimeout(() => {
        const profile = window.store.currentUser();
        window.navigate(profile?.role === 'admin' ? '/admin' : '/');
      }, 600);
    } catch (error) {
      window.showToast('Error de acceso', error.message || 'Verifica tu email y contraseña', 'error');
      btn.disabled = false;
      btnText.textContent = 'Ingresar';
    }
  });
};
