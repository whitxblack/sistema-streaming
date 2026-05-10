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
        <div style="text-align:center;padding:24px 0 16px">
          <div class="avatar" style="width:80px;height:80px;font-size:32px;margin:0 auto 16px auto">${user.avatar || '👤'}</div>
          <div style="font:700 20px/1.2 var(--font-family);color:var(--color-on-surface)">${user.name}</div>
          <div style="font:400 14px/1 var(--font-family);color:var(--color-outline);margin-top:6px">${user.email}</div>
          ${user.phone ? `<div style="font:400 13px/1 var(--font-family);color:var(--color-outline);margin-top:4px">📞 ${user.phone}</div>` : ''}
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

        <!-- Subscriptions section rendered by mountProfile -->
        <div id="profile-subs-area">
          <div class="empty-state"><div class="spinner"></div></div>
        </div>

        <button class="btn btn-ghost btn-full" id="logout-btn" style="color:var(--color-error);margin-top:16px">Cerrar Sesión</button>
      </main>
      ${window.renderBottomNav()}
    </div>
  `;
};

window.mountProfile = async function() {
  window.mountNavbar();
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await window.store.logout();
  });

  // Load and render subscriptions
  const subsArea = document.getElementById('profile-subs-area');
  try {
    const [subs, rate] = await Promise.all([
      window.store.getUserSubscriptions(),
      window.api.fetchDolarRate()
    ]);

    if (subs.length === 0) {
      subsArea.innerHTML = `<div class="empty-state" style="padding:24px 0"><div class="empty-state-icon">📦</div><div class="empty-state-title">Sin servicios asignados</div></div>`;
      return;
    }

    const totalUSD = subs.reduce((a, s) => a + parseFloat(s.price_usd || 0), 0);

    subsArea.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div style="font:600 13px/1 var(--font-family);letter-spacing:0.05em;text-transform:uppercase;color:var(--color-outline)">Mis Servicios</div>
        <div style="font:700 15px/1 var(--font-family);color:var(--color-primary)">${window.api.formatUSD(totalUSD)}/mes</div>
      </div>
      <div class="flex-col gap-3">
        ${subs.map(s => {
          const svc = s.services || {};
          const info = window.api.getPaymentStatusInfo({ nextDue: s.next_due, paymentStatus: s.payment_status });
          return `
            <div class="card-flat" style="display:flex;align-items:center;gap:12px">
              <div style="width:40px;height:40px;border-radius:10px;background:${svc.color || '#333'}22;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden">
                ${window.api.getServiceLogo(svc.name || '', svc.emoji)}
              </div>
              <div style="flex:1;min-width:0">
                <div style="font:600 14px/1 var(--font-family);color:var(--color-on-surface)">${svc.name || '?'}</div>
                ${s.service_email ? `<div style="font:400 11px/1.4 var(--font-family);color:var(--color-outline);margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">📧 ${s.service_email}</div>` : ''}
                <div style="font:400 11px/1 var(--font-family);color:var(--color-outline);margin-top:3px">Vence: ${window.api.formatDate(s.next_due)}</div>
              </div>
              <div style="text-align:right;flex-shrink:0">
                <div style="font:700 14px/1 var(--font-family);color:var(--color-primary)">${window.api.formatUSD(s.price_usd)}</div>
                <span class="sub-card-days ${info.cssClass}" style="margin-top:6px;display:inline-block">${info.label}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } catch (err) {
    console.error('[PROFILE]', err);
    subsArea.innerHTML = `<div class="empty-state"><div class="empty-state-text" style="color:var(--color-error)">Error cargando servicios</div></div>`;
  }
};
