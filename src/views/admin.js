/* ============================================================
   VIEW: ADMIN (Global)
   ============================================================ */
window.renderAdmin = function() {
  return `
    <div class="app-layout">
      ${window.renderTopNav('Admin')}
      <main class="page animate-fadeIn">
        <div class="page-header">
          <div class="page-title">Panel Administrador</div>
        </div>
        <div class="tabs" id="admin-tabs" style="overflow-x:auto;flex-wrap:nowrap">
          <button class="tab-btn active" data-tab="overview">Resumen</button>
          <button class="tab-btn" data-tab="users">Usuarios</button>
          <button class="tab-btn" data-tab="payments">Pagos</button>
          <button class="tab-btn" data-tab="services">Servicios</button>
          <button class="tab-btn" data-tab="coupons">🎟 Cupones</button>
          <button class="tab-btn" data-tab="wallets">💰 Wallets</button>
        </div>
        <div id="admin-content-area" style="min-height:200px;position:relative">
          <div class="empty-state">
            <div class="spinner spinner-lg"></div>
            <div style="margin-top:16px;color:var(--color-outline)">Sincronizando...</div>
          </div>
        </div>
      </main>
      ${window.renderBottomNav()}
    </div>
  `;
};

window.mountAdmin = async function() {
  window.mountNavbar();
  const db = window.store.getSupabase();

  try {
    const [users, allSubs, payments, services, coupons, wallets] = await Promise.all([
      window.store.getAllUsers(),
      window.store.getAllSubscriptions(),
      window.store.getAllPayments(),
      window.store.getServices(),
      window.store.getCoupons(),
      window.store.getAllWallets()
    ]);

    const totalRevenue = payments.filter(p => p.status === 'approved').reduce((a, p) => a + p.total_usd, 0);
    const pendingPayments = payments.filter(p => p.status === 'review');
    const overdueCount = allSubs.filter(s => window.api.getDaysUntilDue(s.next_due) < 0 && s.payment_status !== 'approved').length;

    const badges = { pending: 'badge-pending', review: 'badge-review', approved: 'badge-approved', rejected: 'badge-rejected' };
    const labels = { pending: 'Pendiente', review: 'En Revisión', approved: 'Aprobado', rejected: 'Rechazado' };

    const renderPayCard = (p) => `
      <div class="card-flat" data-pay-status="${p.status}" style="display:flex;flex-direction:column;gap:12px">
        <div class="flex-between">
          <div>
            <div style="font:600 14px/1 var(--font-family);color:var(--color-on-surface)">${p.users?.name || 'Usuario'}</div>
            <div style="font:400 11px/1 var(--font-family);color:var(--color-outline-variant);margin-top:4px">${new Date(p.created_at).toLocaleString('es-VE', { dateStyle:'short', timeStyle:'short' })}</div>
          </div>
          <div style="text-align:right">
            <div style="font:700 16px/1 var(--font-family);color:var(--color-primary)">${window.api.formatUSD(p.total_usd)}</div>
            <div style="font:400 11px/1 var(--font-family);color:var(--color-outline);margin-top:3px">${p.method}</div>
          </div>
        </div>
        ${p.receipt_url ? `<div class="info-box" style="padding:12px"><a href="${p.receipt_url}" target="_blank" style="color:var(--color-primary);font-size:13px">📎 Ver Comprobante</a></div>` : ''}
        <div class="flex-between">
          <span class="status-badge ${badges[p.status] || 'badge-pending'}">${labels[p.status] || 'Pendiente'}</span>
          ${p.status === 'review' ? `
            <div style="display:flex;gap:8px">
              <button class="btn btn-success btn-sm approve-btn" data-pay-id="${p.id}">✅ Aprobar</button>
              <button class="btn btn-danger btn-sm reject-btn" data-pay-id="${p.id}">❌ Rechazar</button>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    const renderUserRow = (u) => {
      const uSubs = allSubs.filter(s => s.user_id === u.id);
      const totalUSD = uSubs.reduce((a, s) => a + window.api.getEffectivePrice(s), 0);
      const userWallet = wallets.find(w => w.user_id === u.id);
      const walletBal = userWallet ? parseFloat(userWallet.balance) : 0;
      return `
        <div class="card-flat" style="display:flex;flex-direction:column;gap:10px">
          <div class="flex-between">
            <div class="flex-row">
              <div class="avatar" style="width:38px;height:38px;font-size:14px">${u.avatar || '?'}</div>
              <div><div style="font:600 14px/1 var(--font-family);color:var(--color-on-surface)">${u.name}</div><div style="font:400 12px/1 var(--font-family);color:var(--color-outline);margin-top:3px">${u.email}</div></div>
            </div>
            <div style="text-align:right">
              <div style="font:700 15px/1 var(--font-family);color:var(--color-primary)">${window.api.formatUSD(totalUSD)}/mes</div>
              <div style="font:400 11px/1 var(--font-family);color:var(--color-outline);margin-top:3px">${uSubs.length} servicios${walletBal > 0 ? ` · 💰 ${window.api.formatUSD(walletBal)}` : ''}</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-secondary btn-sm assign-sub-btn" data-user-id="${u.id}">+ Suscripción</button>
            <button class="btn btn-ghost btn-sm add-credits-btn" data-user-id="${u.id}">💰 Créditos</button>
            ${uSubs.length > 0 ? `<button class="btn btn-ghost btn-sm apply-coupon-btn" data-user-id="${u.id}">🎟 Descuento</button>` : ''}
          </div>
        </div>
      `;
    };

    document.getElementById('admin-content-area').innerHTML = `
      <div id="tab-overview" class="tab-content">
        <div class="stats-grid">
          <div class="stat-card"><div class="stat-label">Usuarios</div><div class="stat-value">${users.length}</div></div>
          <div class="stat-card"><div class="stat-label">Suscripciones</div><div class="stat-value">${allSubs.length}</div></div>
          <div class="stat-card"><div class="stat-label">En Revisión</div><div class="stat-value" style="color:var(--color-warning)">${pendingPayments.length}</div></div>
          <div class="stat-card"><div class="stat-label">Vencidos</div><div class="stat-value" style="color:var(--color-error)">${overdueCount}</div></div>
        </div>
        <div class="stat-card" style="margin-top:0">
          <div class="stat-label">Ingresos Aprobados</div>
          <div class="stat-value stat-gold">${window.api.formatUSD(totalRevenue)}</div>
        </div>
        ${pendingPayments.length > 0 ? `<div><div class="section-header"><span class="section-title">⏳ En Revisión</span></div><div class="flex-col gap-3 desktop-grid">${pendingPayments.map(renderPayCard).join('')}</div></div>` : ''}
      </div>

      <div id="tab-users" class="tab-content hidden">
        <div class="flex-between" style="margin-bottom:16px"><span class="section-title">Usuarios (${users.length})</span></div>
        <div class="flex-col gap-3 desktop-grid">${users.map(renderUserRow).join('')}</div>
      </div>

      <div id="tab-payments" class="tab-content hidden">
        <div class="filter-row" id="pay-filter">
          <button class="filter-chip active" data-filter="all">Todos</button>
          <button class="filter-chip" data-filter="review">En Revisión</button>
          <button class="filter-chip" data-filter="approved">Aprobados</button>
        </div>
        <div class="flex-col gap-3 desktop-grid" style="margin-top:16px" id="admin-payments-list">
          ${payments.length === 0 ? `<div class="empty-state"><div class="empty-state-icon">💳</div><div class="empty-state-title">Sin pagos</div></div>` : payments.map(renderPayCard).join('')}
        </div>
      </div>

      <!-- TAB SERVICES -->
      <div id="tab-services" class="tab-content hidden">
        <div class="flex-between" style="margin-bottom:16px">
          <span class="section-title">Servicios (${services.length})</span>
          <button class="btn btn-primary btn-sm" id="add-service-btn">+ Nuevo</button>
        </div>
        <div class="flex-col gap-3 desktop-grid">
          ${services.map(svc => `
            <div class="card-flat flex-between">
              <div class="flex-row">
                <div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;background:${svc.color}22;border-radius:8px">
                  ${window.api.getServiceLogo(svc.name, svc.emoji)}
                </div>
                <div>
                  <div style="font:600 14px/1 var(--font-family);color:var(--color-on-surface)">${svc.name}</div>
                  <div style="font:400 12px/1 var(--font-family);color:var(--color-outline);margin-top:4px">${svc.category}</div>
                </div>
              </div>
              <button class="btn btn-ghost btn-sm assign-svc-btn" data-svc-id="${svc.id}">Asignar</button>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- TAB COUPONS -->
      <div id="tab-coupons" class="tab-content hidden">
        <div class="flex-between" style="margin-bottom:16px">
          <span class="section-title">Cupones (${coupons.length})</span>
          <button class="btn btn-primary btn-sm" id="add-coupon-btn">+ Nuevo</button>
        </div>
        <div class="flex-col gap-3">
          ${coupons.length === 0 ? `<div class="empty-state"><div class="empty-state-icon">🎟</div><div class="empty-state-title">Sin cupones</div></div>` :
          coupons.map(c => `
            <div class="card-flat" style="gap:10px;display:flex;flex-direction:column">
              <div class="flex-between">
                <div>
                  <div style="font:700 13px/1 var(--font-family);color:var(--color-primary);letter-spacing:0.08em">${c.code}</div>
                  <div style="font:500 13px/1 var(--font-family);color:var(--color-on-surface);margin-top:4px">${c.name}</div>
                  <div style="font:400 11px/1 var(--font-family);color:var(--color-outline);margin-top:3px">
                    ${c.type === 'percentage' ? `${c.percentage_off}% de descuento` : `-${window.api.formatUSD(c.amount_off)}`}
                    · ${c.total_redemptions || 0} usos${c.max_redemptions ? ` / ${c.max_redemptions}` : ''}
                  </div>
                </div>
                <label class="toggle-switch" title="${c.is_active ? 'Activo' : 'Inactivo'}">
                  <input type="checkbox" class="coupon-toggle" data-coupon-id="${c.id}" ${c.is_active ? 'checked' : ''} />
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div style="display:flex;gap:8px">
                <button class="btn btn-danger btn-sm delete-coupon-btn" data-coupon-id="${c.id}">Eliminar</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- TAB WALLETS -->
      <div id="tab-wallets" class="tab-content hidden">
        <div class="section-title" style="margin-bottom:16px">Créditos por Usuario</div>
        <div class="flex-col gap-3">
          ${users.map(u => {
            const w = wallets.find(wl => wl.user_id === u.id);
            const bal = w ? parseFloat(w.balance) : 0;
            return `
              <div class="card-flat flex-between">
                <div class="flex-row">
                  <div class="avatar" style="width:36px;height:36px;font-size:13px">${u.avatar || '?'}</div>
                  <div>
                    <div style="font:600 13px/1 var(--font-family);color:var(--color-on-surface)">${u.name}</div>
                    <div style="font:400 12px/1 var(--font-family);color:${bal > 0 ? 'var(--color-success)' : 'var(--color-outline)'};margin-top:3px">💰 ${window.api.formatUSD(bal)}</div>
                  </div>
                </div>
                <button class="btn btn-primary btn-sm add-credits-btn" data-user-id="${u.id}">+ Créditos</button>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // Tab switching
    document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`)?.classList.remove('hidden');
      });
    });

    // Payment filters
    document.querySelectorAll('#pay-filter .filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#pay-filter .filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const filter = chip.dataset.filter;
        document.querySelectorAll('#admin-payments-list [data-pay-status]').forEach(card => {
          card.style.display = (filter === 'all' || card.dataset.payStatus === filter) ? '' : 'none';
        });
      });
    });

    // Approve
    document.querySelectorAll('.approve-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const payId = btn.dataset.payId;
        if (!confirm('¿Aprobar pago y renovar suscripciones?')) return;
        btn.disabled = true;
        try {
          const { data: items } = await db.from('payment_items').select('subscription_id').eq('payment_id', payId);
          const subIds = items.map(i => i.subscription_id);
          await window.store.approvePayment(payId, subIds);
          window.showToast('Éxito', 'Pago aprobado y servicios renovados.', 'success');
          window.mountAdmin();
        } catch (err) {
          window.showToast('Error', err.message, 'error');
          btn.disabled = false;
        }
      });
    });

    // Reject
    document.querySelectorAll('.reject-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const note = prompt('Motivo del rechazo (opcional):') || '';
        const payId = btn.dataset.payId;
        btn.disabled = true;
        try {
          await db.from('payments').update({ status: 'rejected', admin_note: note, reviewed_at: new Date().toISOString() }).eq('id', payId);
          window.showToast('Rechazado', 'Pago marcado como rechazado.', 'error');
          window.mountAdmin();
        } catch (err) {
          window.showToast('Error', err.message, 'error');
          btn.disabled = false;
        }
      });
    });

    // Assign subscription
    document.querySelectorAll('.assign-sub-btn').forEach(btn => {
      btn.addEventListener('click', () => window._openAssignSubModal(users, services, btn.dataset.userId, null));
    });
    document.querySelectorAll('.assign-svc-btn').forEach(btn => {
      btn.addEventListener('click', () => window._openAssignSubModal(users, services, null, btn.dataset.svcId));
    });

    // Add wallet credits
    document.querySelectorAll('.add-credits-btn').forEach(btn => {
      btn.addEventListener('click', () => window._openAddCreditsModal(btn.dataset.userId, users));
    });

    // Apply coupon to user's subscription
    document.querySelectorAll('.apply-coupon-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const userSubs = allSubs.filter(s => s.user_id === btn.dataset.userId);
        window._openApplyCouponModal(userSubs, coupons);
      });
    });

    // Coupon toggle active/inactive
    document.querySelectorAll('.coupon-toggle').forEach(toggle => {
      toggle.addEventListener('change', async () => {
        toggle.disabled = true;
        try {
          await window.store.toggleCoupon(toggle.dataset.couponId, toggle.checked);
          window.showToast(toggle.checked ? 'Activado' : 'Desactivado', 'Cupón actualizado', 'success');
        } catch (e) {
          window.showToast('Error', e.message, 'error');
          toggle.checked = !toggle.checked;
        }
        toggle.disabled = false;
      });
    });

    // Delete coupon
    document.querySelectorAll('.delete-coupon-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este cupón?')) return;
        btn.disabled = true;
        try {
          await window.store.deleteCoupon(btn.dataset.couponId);
          window.showToast('Eliminado', 'Cupón eliminado', 'success');
          window.mountAdmin();
        } catch (e) { window.showToast('Error', e.message, 'error'); btn.disabled = false; }
      });
    });

    // Add service
    document.getElementById('add-service-btn')?.addEventListener('click', () => window._openAddServiceModal());

    // Add coupon
    document.getElementById('add-coupon-btn')?.addEventListener('click', () => window._openCreateCouponModal());

  } catch (err) {
    console.error('[ADMIN]', err);
    document.getElementById('admin-content-area').innerHTML = `<div class="empty-state"><div class="empty-state-text" style="color:var(--color-error)">Error cargando datos</div></div>`;
  }
};

window._openAddServiceModal = function() {
  const html = `
    <div class="modal-handle"></div>
    <div class="modal-title">Nuevo Servicio</div>
    <div class="modal-body">
      <div class="form-group"><label class="form-label">Nombre</label><input class="form-input" id="svc-name" /></div>
      <div class="form-group"><label class="form-label">Emoji</label><input class="form-input" id="svc-emoji" value="📱" /></div>
      <div class="form-group"><label class="form-label">Color (hex)</label><input class="form-input" id="svc-color" value="#9a8f80" /></div>
      <div class="form-group"><label class="form-label">Categoría</label>
        <select class="form-select" id="svc-cat">
          <option value="streaming">Streaming</option>
          <option value="music">Música</option>
          <option value="other">Otro</option>
        </select>
      </div>
    </div>
    <div class="modal-footer"><button class="btn btn-primary btn-full" id="save-svc-btn">Guardar</button></div>
  `;
  window.openModal(html);
  document.getElementById('save-svc-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('save-svc-btn');
    btn.disabled = true;
    try {
      await window.store.getSupabase().from('services').insert([{
        name: document.getElementById('svc-name').value,
        emoji: document.getElementById('svc-emoji').value,
        color: document.getElementById('svc-color').value,
        category: document.getElementById('svc-cat').value
      }]);
      window.closeModal();
      window.showToast('Éxito', 'Servicio agregado', 'success');
      window.mountAdmin();
    } catch (e) { window.showToast('Error', e.message, 'error'); btn.disabled = false; }
  });
};

window._openAssignSubModal = function(users, services, userId, serviceId) {
  const html = `
    <div class="modal-handle"></div>
    <div class="modal-title">Asignar Suscripción</div>
    <div class="modal-body">
      <div class="form-group"><label class="form-label">Usuario</label>
        <select class="form-select" id="assign-user">${users.map(u => `<option value="${u.id}" ${u.id === userId ? 'selected' : ''}>${u.name}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label class="form-label">Servicio</label>
        <select class="form-select" id="assign-svc">${services.map(s => `<option value="${s.id}" ${s.id === serviceId ? 'selected' : ''}>${s.emoji} ${s.name}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label class="form-label">Precio USD</label><input class="form-input" type="number" id="assign-price" step="0.01" /></div>
      <div class="form-group"><label class="form-label">Día de corte (1-31)</label><input class="form-input" type="number" id="assign-cutday" min="1" max="31" value="20" /></div>
    </div>
    <div class="modal-footer"><button class="btn btn-primary btn-full" id="save-assign-btn">Asignar</button></div>
  `;
  window.openModal(html);
  document.getElementById('save-assign-btn')?.addEventListener('click', async () => {
    const uid = document.getElementById('assign-user').value;
    const sid = document.getElementById('assign-svc').value;
    const price = parseFloat(document.getElementById('assign-price').value);
    const cutDay = parseInt(document.getElementById('assign-cutday').value);
    if (!uid || !sid || isNaN(price) || isNaN(cutDay)) { window.showToast('Atención', 'Revisa los campos', 'warning'); return; }
    const nextDue = new Date();
    if (nextDue.getDate() >= cutDay) nextDue.setMonth(nextDue.getMonth() + 1);
    nextDue.setDate(cutDay);
    document.getElementById('save-assign-btn').disabled = true;
    try {
      await window.store.getSupabase().from('subscriptions').insert([{
        user_id: uid, service_id: sid, price_usd: price, cut_day: cutDay,
        next_due: nextDue.toISOString().split('T')[0], payment_status: 'pending'
      }]);
      window.closeModal();
      window.showToast('Éxito', 'Suscripción asignada', 'success');
      window.mountAdmin();
    } catch (e) { window.showToast('Error', e.message, 'error'); document.getElementById('save-assign-btn').disabled = false; }
  });
};
