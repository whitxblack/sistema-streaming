/* ============================================================
   VIEW: PROFILE (Global)
   ============================================================ */
window.renderProfile = function() {
  const user = window.store.currentUser();
  if (!user) return '';

  return `
    <div class="app-layout">
      ${window.renderTopNav('Perfil')}
      <main class="page stagger animate-fadeInUp">
        <div style="text-align:center;padding:24px 0">
          <div class="avatar" style="width:80px;height:80px;font-size:32px;margin:0 auto 16px auto">${user.avatar || '👤'}</div>
          <div style="font:700 20px/1.2 var(--font-family);color:var(--color-on-surface)">${user.name}</div>
          <div style="font:400 14px/1 var(--font-family);color:var(--color-outline);margin-top:6px">${user.email}</div>
        </div>
        <div class="card-flat" style="margin-bottom:16px">
          <div class="flex-between" style="padding:12px 0;border-bottom:1px solid var(--color-surface-variant)">
            <span style="color:var(--color-on-surface);font-size:14px">Rol en la plataforma</span>
            <span class="status-badge ${user.role === 'admin' ? 'badge-approved' : 'badge-pending'}">${user.role.toUpperCase()}</span>
          </div>
          <div class="flex-between" style="padding:12px 0">
            <span style="color:var(--color-on-surface);font-size:14px">Miembro desde</span>
            <span style="color:var(--color-outline);font-size:14px">${new Date(user.created_at).toLocaleDateString('es-VE')}</span>
          </div>
        </div>
        <button class="btn btn-ghost btn-full" id="logout-btn" style="color:var(--color-error)">Cerrar Sesión</button>
      </main>
      ${window.renderBottomNav()}
    </div>
  `;
};

window.mountProfile = function() {
  window.mountNavbar();
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await window.store.logout();
  });
};
