/* ============================================================
   VIEW: SUBSCRIPTIONS (Global)
   ============================================================ */
window.renderSubscriptions = function() {
  return `
    <div class="app-layout">
      ${window.renderTopNav('Servicios')}
      <main class="page stagger" id="subs-content">
        <div class="empty-state"><div class="spinner spinner-lg"></div></div>
      </main>
      ${window.renderBottomNav()}
    </div>
  `;
};

window.mountSubscriptions = async function() {
  window.mountNavbar();
  const content = document.getElementById('subs-content');
  if (!content) return;

  try {
    const [subs, rate] = await Promise.all([
      window.store.getUserSubscriptions(),
      window.api.fetchDolarRate()
    ]);

    content.innerHTML = `
      <div class="page-header">
        <div class="page-title">Todos tus servicios</div>
      </div>
      <div class="filter-row" id="subs-filter">
        <button class="filter-chip active" data-filter="all">Todos</button>
        <button class="filter-chip" data-filter="pending">Pendientes</button>
        <button class="filter-chip" data-filter="approved">Al día</button>
      </div>
      <div class="flex-col gap-4 desktop-grid" style="margin-top:20px" id="subs-list">
        ${subs.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon">📦</div>
            <div class="empty-state-title">Sin suscripciones</div>
          </div>
        ` : subs.map(sub => window._renderSubCardSubs(sub, rate)).join('')}
      </div>
    `;

    document.querySelectorAll('#subs-filter .filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#subs-filter .filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const filter = chip.dataset.filter;
        document.querySelectorAll('#subs-list .sub-card').forEach(card => {
          const status = card.dataset.payStatus;
          if (filter === 'all') card.style.display = '';
          else if (filter === 'pending') card.style.display = status !== 'approved' ? '' : 'none';
          else if (filter === 'approved') card.style.display = status === 'approved' ? '' : 'none';
        });
      });
    });

    document.querySelectorAll('.pay-btn').forEach(btn => {
      btn.addEventListener('click', () => window.openPaymentModal(subs, [btn.dataset.subId], rate));
    });

  } catch (err) {
    content.innerHTML = `<div class="empty-state"><div class="empty-state-text" style="color:var(--color-error)">Error al cargar datos</div></div>`;
  }
};

window._renderSubCardSubs = function(sub, rate) {
  const svc = sub.services;
  const info = window.api.getPaymentStatusInfo({ nextDue: sub.next_due, paymentStatus: sub.payment_status });
  const bsAmt = rate ? window.api.formatBs(window.api.usdToBs(sub.price_usd, rate)) : '—';
  const isPending = sub.payment_status !== 'approved' && sub.payment_status !== 'review';

  return `
    <div class="sub-card animate-fadeInUp" data-sub-id="${sub.id}" data-pay-status="${sub.payment_status}">
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
        <div><div class="text-xs text-muted">VENCE</div><div class="sub-card-date">${window.api.formatDate(sub.next_due)}</div></div>
        <div class="sub-card-days ${info.cssClass}">${info.label}</div>
      </div>
      <div class="flex-between">
        <span class="status-badge ${info.badgeClass}">
          ${sub.payment_status === 'approved' ? 'Al Día' : sub.payment_status === 'review' ? 'En Revisión' : 'Pendiente'}
        </span>
        ${isPending ? `<button class="btn btn-primary btn-sm pay-btn" data-sub-id="${sub.id}">Pagar</button>` : ''}
      </div>
    </div>
  `;
};
