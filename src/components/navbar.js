/* ============================================================
   NAVBAR — Component (Global)
   ============================================================ */
window.renderTopNav = function(title = 'SubTrack') {
  const user = window.store.currentUser();
  const initials = user?.avatar || '👤';
  const themeIcon = document.documentElement.getAttribute('data-theme') === 'light' ? '🌙' : '☀️';
  
  return `
    <nav class="top-nav">
      <div class="nav-logo">
        <div class="nav-logo-icon">
          <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
            <path d="M12 24C12 17.373 17.373 12 24 12C30.627 12 36 17.373 36 24C36 30.627 30.627 36 24 36" stroke="#e9c176" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M24 18V24L28 27" stroke="#e9c176" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <span class="nav-logo-text">${title}</span>
      </div>
      <div class="nav-actions">
        <button class="nav-icon-btn" id="theme-toggle-btn" title="Cambiar tema">${themeIcon}</button>
        <button class="nav-icon-btn" id="nav-notif-btn" title="Historial">🔔</button>
        <div class="avatar" style="cursor:pointer" id="nav-avatar">${initials}</div>
        <button class="nav-icon-btn" id="logout-top-btn" title="Cerrar Sesión" style="color:var(--color-error)">🚪</button>
      </div>
    </nav>
  `;
};

window.renderBottomNav = function() {
  const user = window.store.currentUser();
  const adminItems = [
    { path: '/admin', icon: '📊', label: 'Dashboard' },
    { path: '/admin/users', icon: '👥', label: 'Usuarios' },
    { path: '/admin/payments', icon: '💳', label: 'Pagos' },
    { path: '/admin/services', icon: '⚙️', label: 'Servicios' }
  ];
  const userItems = [
    { path: '/', icon: '🏠', label: 'Inicio' },
    { path: '/subscriptions', icon: '📋', label: 'Servicios' },
    { path: '/history', icon: '📄', label: 'Historial' },
    { path: '/profile', icon: '👤', label: 'Perfil' }
  ];
  const items = user?.role === 'admin' ? adminItems : userItems;
  const current = window.getCurrentRoute();

  return `
    <nav class="bottom-nav" role="navigation">
      ${items.map(item => `
        <button class="nav-item${current === item.path ? ' active' : ''}" data-path="${item.path}" aria-label="${item.label}">
          <div class="nav-item-icon-wrap"><span class="nav-item-icon">${item.icon}</span></div>
          <span class="nav-item-label">${item.label}</span>
        </button>
      `).join('')}
    </nav>
  `;
};

window.mountNavbar = function() {
  document.getElementById('nav-avatar')?.addEventListener('click', () => {
    const user = window.store.currentUser();
    window.navigate(user?.role === 'admin' ? '/admin' : '/profile');
  });
  
  document.getElementById('nav-notif-btn')?.addEventListener('click', () => window.navigate('/history'));
  
  document.getElementById('logout-top-btn')?.addEventListener('click', async () => {
    if (confirm('¿Seguro que deseas cerrar sesión?')) {
      await window.store.logout();
    }
  });

  document.getElementById('theme-toggle-btn')?.addEventListener('click', (e) => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('subtrack_theme', newTheme);
    e.target.textContent = newTheme === 'light' ? '🌙' : '☀️';
  });

  document.querySelectorAll('.nav-item[data-path]').forEach(btn => {
    btn.addEventListener('click', () => window.navigate(btn.dataset.path));
  });
};
