/* ============================================================
   VIEW: DASHBOARD (Global)
   ============================================================ */
window.renderDashboard = function() {
  return `
    <div class="app-layout">
      ${window.renderTopNav('SubTrack')}
      <main class="page stagger" id="dashboard-content">
        <div class="empty-state">
          <div class="spinner spinner-lg"></div>
          <div class="empty-state-text" style="margin-top:16px">Cargando tus servicios...</div>
        </div>
      </main>
      ${window.renderBottomNav()}
    </div>
  `;
};

window.mountDashboard = async function() {
  window.mountNavbar();
  const content = document.getElementById('dashboard-content');
  if (!content) return;

  try {
    const [subs, rate, wallet] = await Promise.all([
      window.store.getUserSubscriptions(),
      window.api.fetchDolarRate(),
      window.store.getMyWallet()
    ]);

    // Usar precio efectivo (con descuento si el admin lo aplicó)
    const totalUSD = subs.reduce((a, s) => a + window.api.getEffectivePrice(s), 0);
    const pendingCount = subs.filter(s => s.payment_status !== 'approved').length;
    const walletBal = wallet ? parseFloat(wallet.balance) : 0;

    content.innerHTML = `
      <div class="hero-card animate-fadeInUp">
        <div class="hero-label">Total Mensual</div>
        <div class="hero-amount">${window.api.formatUSD(totalUSD)}</div>
        <div class="hero-amount-bs">${rate ? window.api.formatBs(window.api.usdToBs(totalUSD, rate)) : '—'}</div>
        ${walletBal > 0 ? `
        <div style="margin-top:12px;display:inline-flex;align-items:center;gap:6px;background:rgba(168,230,163,0.15);border:1px solid rgba(168,230,163,0.3);border-radius:99px;padding:5px 14px">
          <span style="font-size:14px">💰</span>
          <span style="font:600 13px/1 var(--font-family);color:var(--color-success)">Créditos: ${window.api.formatUSD(walletBal)}</span>
        </div>` : ''}
        <div class="hero-meta" style="margin-top:16px">
          <div class="hero-meta-item">
            <div class="hero-meta-value">${subs.length}</div>
            <div class="hero-meta-label">Activos</div>
          </div>
          <div class="hero-meta-item">
            <div class="hero-meta-value" style="color:${pendingCount > 0 ? 'var(--color-error)' : 'var(--color-success)'}">${pendingCount}</div>
            <div class="hero-meta-label">Pendientes</div>
          </div>
          <div class="hero-meta-item">
            <div class="hero-meta-value">${rate ? parseFloat(rate).toFixed(2) : '—'}</div>
            <div class="hero-meta-label">Bs/$</div>
          </div>
        </div>
      </div>

      <div>
        <div class="section-header">
          <span class="section-title">Mis Suscripciones</span>
          <span class="section-action" id="pay-all-btn" style="${pendingCount > 0 ? '' : 'display:none'}">Pagar todo</span>
        </div>
        <div class="flex-col gap-4 desktop-grid">
          ${subs.length === 0 ? `
            <div class="empty-state">
              <div class="empty-state-icon">📦</div>
              <div class="empty-state-title">Sin suscripciones</div>
              <div class="empty-state-text">No tienes servicios asignados aún.</div>
            </div>
          ` : subs.map(sub => window._renderSubCard(sub, rate)).join('')}
        </div>
      </div>
    `;

    document.querySelectorAll('.pay-btn').forEach(btn => {
      btn.addEventListener('click', () => window.openPaymentModal(subs, [btn.dataset.subId], rate));
    });

    document.getElementById('pay-all-btn')?.addEventListener('click', () => {
      const pendingIds = subs.filter(s => s.payment_status !== 'approved' && s.payment_status !== 'review').map(s => s.id);
      if (pendingIds.length > 0) window.openPaymentModal(subs, pendingIds, rate);
    });

  } catch (err) {
    console.error('[DASHBOARD] Error:', err);
    content.innerHTML = `<div class="empty-state"><div class="empty-state-text" style="color:var(--color-error)">Error al cargar datos de Supabase</div></div>`;
  }
};

window._renderSubCard = function(sub, rate) {
  const svc = sub.services;
  const info = window.api.getPaymentStatusInfo({ nextDue: sub.next_due, paymentStatus: sub.payment_status });
  const bsAmt = rate ? window.api.formatBs(window.api.usdToBs(sub.price_usd, rate)) : '—';
  const isPending = sub.payment_status !== 'approved' && sub.payment_status !== 'review';

  return `
    <div class="sub-card animate-fadeInUp" data-sub-id="${sub.id}">
      <div class="sub-card-header">
        <div class="sub-card-logo" style="background:${svc.color}22">
          ${window.api.getServiceLogo(svc.name, svc.emoji)}
        </div>
        <div style="flex:1">
          <div class="sub-card-title">${sub.custom_name || svc.name}</div>
          <div class="sub-card-subtitle">${svc.category}</div>
        </div>
        <div class="sub-card-price">
          <div class="sub-card-price-usd">${window.api.formatUSD(sub.price_usd)}</div>
          <div class="sub-card-price-bs">${bsAmt}</div>
        </div>
      </div>
      <div class="sub-card-info">
        <div><div class="text-xs text-muted" style="margin-bottom:4px">VENCE</div><div class="sub-card-date">${window.api.formatDate(sub.next_due)}</div></div>
        <div class="sub-card-days ${info.cssClass}">${info.label}</div>
      </div>
      <div class="flex-between">
        <span class="status-badge ${info.badgeClass}">
          ${sub.payment_status === 'approved' ? 'Pagado' : sub.payment_status === 'review' ? 'En Revisión' : 'Pendiente'}
        </span>
        ${isPending ? `<button class="btn btn-primary btn-sm pay-btn" data-sub-id="${sub.id}">Pagar</button>` : ''}
      </div>
    </div>
  `;
};
