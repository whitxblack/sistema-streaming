/* ============================================================
   VIEW: ADMIN (Global)
   ============================================================ */

// ── Helper: Enviar correo de recordatorio vía EmailJS ────────
async function sendReminderEmail(toEmail, toName, bodyText) {
  try {
    if (!window.emailjs || !window.EMAILJS_PUBLIC_KEY || window.EMAILJS_PUBLIC_KEY.includes('REEMPLAZA')) {
      console.warn('[EMAIL] EmailJS no configurado. Configura tus claves en index.html.');
      return false;
    }
    await window.emailjs.send(
      window.EMAILJS_SERVICE_ID,
      window.EMAILJS_TEMPLATE_ID,
      {
        to_email: toEmail,
        to_name:  toName,
        from_name: 'MiStream',
        subject:  'Recordatorio de Pago',
        message:  bodyText,
      },
      window.EMAILJS_PUBLIC_KEY
    );
    return true;
  } catch (err) {
    console.error('[EMAIL] Error al enviar correo:', err);
    return false;
  }
}

// ── Construye el cuerpo del recordatorio para un usuario ──────
function buildReminderBody(userName, overdueSubs, soonSubs) {
  let body = `Hola ${userName},

Te escribimos desde MiStream para informarte sobre el estado de tus servicios:

`;
  if (overdueSubs.length > 0) {
    body += `⚠️ SERVICIOS VENCIDOS:
${overdueSubs.map(s => `  - ${s.services?.name || 'Servicio'} (Venció el ${window.api.formatDate(s.next_due)})`).join('\n')}

`;
  }
  if (soonSubs.length > 0) {
    body += `⏰ SERVICIOS POR VENCER (en los próximos 5 días):
${soonSubs.map(s => `  - ${s.services?.name || 'Servicio'} (Vence el ${window.api.formatDate(s.next_due)})`).join('\n')}

`;
  }
  body += `Por favor, realiza tu pago a la brevedad posible para no interrumpir el servicio.

Cualquier duda, estamos a tu disposición.

Gracias,
El equipo de MiStream`;
  return body;
}
// ─────────────────────────────────────────────────────────────
window.renderAdmin = function () {
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

window.mountAdmin = async function () {
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

    // ── Auto-recordatorios al cargar el panel ────────────────
    const todayKey = new Date().toISOString().split('T')[0];
    const lastCheck = localStorage.getItem('lastReminderCheck');
    if (lastCheck !== todayKey && window.EMAILJS_PUBLIC_KEY && !window.EMAILJS_PUBLIC_KEY.includes('REEMPLAZA')) {
      users.forEach(async (u) => {
        const uSubs = allSubs.filter(s => s.user_id === u.id);
        const overdue = uSubs.filter(s => window.api.getDaysUntilDue(s.next_due) < 0 && s.payment_status !== 'approved');
        const soon    = uSubs.filter(s => { const d = window.api.getDaysUntilDue(s.next_due); return d >= 0 && d <= 5 && s.payment_status !== 'approved'; });
        if (overdue.length > 0 || soon.length > 0) {
          const sent = await sendReminderEmail(u.email, u.name, buildReminderBody(u.name, overdue, soon));
          if (sent) console.log(`[EMAIL] Recordatorio automático enviado a ${u.email}`);
        }
      });
      localStorage.setItem('lastReminderCheck', todayKey);
      console.log('[EMAIL] Check de recordatorios diario completado.');
    }
    // ─────────────────────────────────────────────────────────

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
            <div style="font:400 11px/1 var(--font-family);color:var(--color-outline-variant);margin-top:4px">${new Date(p.created_at).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}</div>
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
              <div>
                <div style="font:600 14px/1 var(--font-family);color:var(--color-on-surface)">${u.name}</div>
                <div style="font:400 12px/1 var(--font-family);color:var(--color-outline);margin-top:3px">${u.email}</div>
                ${u.phone ? `<div style="font:400 12px/1 var(--font-family);color:var(--color-outline);margin-top:2px">📞 ${u.phone}</div>` : ''}
              </div>
            </div>
            <div style="text-align:right">
              <div style="font:700 15px/1 var(--font-family);color:var(--color-primary)">${window.api.formatUSD(totalUSD)}/mes</div>
              <div style="font:400 11px/1 var(--font-family);color:var(--color-outline);margin-top:3px">${uSubs.length} servicios${walletBal > 0 ? ` · 💰 ${window.api.formatUSD(walletBal)}` : ''}</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm view-profile-btn" data-user-id="${u.id}">👁 Ver Perfil</button>
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
        <div class="flex-between" style="margin-bottom:8px">
          <span class="section-title">Gestión de Usuarios (${users.length})</span>
          <button class="btn btn-primary btn-sm" id="open-create-user-btn2">+ Nuevo Usuario</button>
        </div>
        <div style="font:400 12px/1.4 var(--font-family);color:var(--color-outline);margin-bottom:16px">Haz clic en "Ver Perfil" para ver detalle completo de un usuario.</div>
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

      <!-- TAB CREAR USUARIO -->
      <div id="tab-create-user" class="tab-content hidden">
        <div style="display:flex;flex-direction:column;align-items:center;gap:24px;padding:32px 0">
          <div style="width:80px;height:80px;border-radius:50%;background:rgba(233,193,118,0.12);border:2px solid rgba(233,193,118,0.3);display:flex;align-items:center;justify-content:center;font-size:36px">👤</div>
          <div style="text-align:center">
            <div style="font:700 20px/1.3 var(--font-family);color:var(--color-on-surface)">Panel de Administrador</div>
            <div style="font:400 14px/1.5 var(--font-family);color:var(--color-outline);margin-top:8px;max-width:320px">Crea nuevas cuentas de usuario con correo y contraseña. Cada usuario creado aquí se registra automáticamente en Supabase Auth.</div>
          </div>
          <button class="btn btn-primary btn-lg" id="open-create-user-btn" style="gap:10px">
            <span style="font-size:18px">+</span> Crear Nuevo Usuario
          </button>
          <div style="width:100%;max-width:480px">
            <div class="section-title" style="margin-bottom:12px">Usuarios registrados (${users.length})</div>
            <div class="flex-col gap-3">
              ${users.map(u => `
                <div class="card-flat flex-between">
                  <div class="flex-row">
                    <div class="avatar" style="width:38px;height:38px;font-size:15px">${u.avatar || '👤'}</div>
                    <div>
                      <div style="font:600 14px/1 var(--font-family);color:var(--color-on-surface)">${u.name}</div>
                      <div style="font:400 12px/1 var(--font-family);color:var(--color-outline);margin-top:3px">${u.email}</div>
                    </div>
                  </div>
                  <span class="status-badge ${u.role === 'admin' ? 'badge-approved' : 'badge-active'}">${u.role === 'admin' ? 'Admin' : 'Usuario'}</span>
                </div>
              `).join('')}
            </div>
          </div>
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

    // Create user (from both buttons)
    document.getElementById('open-create-user-btn')?.addEventListener('click', () => window._openCreateUserModal());
    document.getElementById('open-create-user-btn2')?.addEventListener('click', () => window._openCreateUserModal());

    // View user profile
    document.querySelectorAll('.view-profile-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const u = users.find(x => x.id === btn.dataset.userId);
        const uSubs = allSubs.filter(s => s.user_id === btn.dataset.userId);
        window._openUserProfileModal(u, uSubs);
      });
    });

  } catch (err) {
    console.error('[ADMIN]', err);
    document.getElementById('admin-content-area').innerHTML = `<div class="empty-state"><div class="empty-state-text" style="color:var(--color-error)">Error cargando datos</div></div>`;
  }
};

window._openAddServiceModal = function () {
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

window._openAssignSubModal = function (users, services, userId, serviceId) {
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
      <div class="form-group"><label class="form-label">Correo del servicio (opcional)</label><input class="form-input" type="email" id="assign-svc-email" placeholder="ej: netflix@cuenta.com" /></div>
      <div class="form-group"><label class="form-label">Precio USD</label><input class="form-input" type="number" id="assign-price" step="0.01" /></div>
      <div class="form-group"><label class="form-label">Día de corte (1-31)</label><input class="form-input" type="number" id="assign-cutday" min="1" max="31" value="20" /></div>
    </div>
    <div class="modal-footer"><button class="btn btn-primary btn-full" id="save-assign-btn">Asignar</button></div>
  `;
  window.openModal(html);
  document.getElementById('save-assign-btn')?.addEventListener('click', async () => {
    const uid = document.getElementById('assign-user').value;
    const sid = document.getElementById('assign-svc').value;
    const svcEmail = document.getElementById('assign-svc-email').value.trim();
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
        next_due: nextDue.toISOString().split('T')[0], payment_status: 'pending',
        service_email: svcEmail || null
      }]);
      window.closeModal();
      window.showToast('Éxito', 'Suscripción asignada', 'success');
      window.mountAdmin();
    } catch (e) { window.showToast('Error', e.message, 'error'); document.getElementById('save-assign-btn').disabled = false; }
  });
};

window._openCreateUserModal = function () {
  const html = `
    <div class="modal-handle"></div>
    <div class="modal-title">Crear Nuevo Usuario</div>
    <div class="modal-subtitle">El usuario se creará en Supabase Auth automáticamente.</div>
    <div class="modal-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="form-group">
          <label class="form-label">Nombre</label>
          <input class="form-input" id="new-user-firstname" placeholder="Juan" autocomplete="off" />
        </div>
        <div class="form-group">
          <label class="form-label">Apellido</label>
          <input class="form-input" id="new-user-lastname" placeholder="Pérez" autocomplete="off" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Teléfono</label>
        <input class="form-input" id="new-user-phone" type="tel" placeholder="+58 412 000 0000" autocomplete="off" />
      </div>
      <div class="form-group">
        <label class="form-label">Correo electrónico</label>
        <input class="form-input" id="new-user-email" type="email" placeholder="usuario@correo.com" autocomplete="off" />
      </div>
      <div class="form-group">
        <label class="form-label">Contraseña</label>
        <div style="position:relative">
          <input class="form-input" id="new-user-password" type="password" placeholder="Mínimo 6 caracteres" autocomplete="new-password" style="padding-right:44px" />
          <button type="button" id="toggle-new-pass" style="position:absolute;right:0;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--color-outline);font-size:18px;padding:8px">👁</button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Avatar (emoji)</label>
        <input class="form-input" id="new-user-avatar" placeholder="👤" maxlength="4" autocomplete="off" value="👤" />
      </div>
      <div id="create-user-error" style="display:none;background:rgba(255,180,171,0.1);border:1px solid rgba(255,180,171,0.3);border-radius:var(--radius-lg);padding:12px;font:400 13px/1.5 var(--font-family);color:var(--color-error)"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary btn-full btn-lg" id="save-new-user-btn">Crear Usuario</button>
      <button class="btn btn-ghost btn-full" id="cancel-new-user-btn">Cancelar</button>
    </div>
  `;

  window.openModal(html);

  document.getElementById('cancel-new-user-btn')?.addEventListener('click', () => window.closeModal());

  // Toggle password visibility
  document.getElementById('toggle-new-pass')?.addEventListener('click', () => {
    const inp = document.getElementById('new-user-password');
    inp.type = inp.type === 'password' ? 'text' : 'password';
  });

  document.getElementById('save-new-user-btn')?.addEventListener('click', async () => {
    const firstName = document.getElementById('new-user-firstname').value.trim();
    const lastName = document.getElementById('new-user-lastname').value.trim();
    const name = [firstName, lastName].filter(Boolean).join(' ');
    const phone = document.getElementById('new-user-phone').value.trim();
    const email = document.getElementById('new-user-email').value.trim().toLowerCase();
    const password = document.getElementById('new-user-password').value;
    const avatar = document.getElementById('new-user-avatar').value.trim() || '👤';
    const errBox = document.getElementById('create-user-error');
    const saveBtn = document.getElementById('save-new-user-btn');

    errBox.style.display = 'none';

    // Validations
    if (!firstName) { errBox.textContent = 'El nombre es obligatorio.'; errBox.style.display = 'block'; return; }
    if (!email || !email.includes('@')) { errBox.textContent = 'Ingresa un correo válido.'; errBox.style.display = 'block'; return; }
    if (password.length < 6) { errBox.textContent = 'La contraseña debe tener al menos 6 caracteres.'; errBox.style.display = 'block'; return; }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<div class="spinner spinner-sm" style="border-top-color:#412d00;margin:0 auto"></div>';

    try {
      // ── 1. Create a temporary Supabase client so admin session is NOT interrupted
      const tempClient = supabase.createClient(
        'https://oxcmccejunruigskizzj.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94Y21jY2VqdW5ydWlnc2tpenpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNDM0MjksImV4cCI6MjA5MzkxOTQyOX0.NbY2pVSklCu5XwQhd6X9EO1Qk9YXsp19RgGZWsontNQ',
        { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
      );

      // ── 2. Register the user in Supabase Auth
      const { data: signUpData, error: signUpError } = await tempClient.auth.signUp({ email, password });

      if (signUpError) throw signUpError;
      if (!signUpData?.user) throw new Error('No se pudo crear el usuario en Auth.');

      const newUserId = signUpData.user.id;

      // ── 3. Insert profile row in the public users table
      const { error: profileError } = await window.store.getSupabase()
        .from('users')
        .insert([{ id: newUserId, name, email, avatar, role: 'user', phone: phone || null }]);

      if (profileError) throw profileError;

      window.closeModal();
      window.showToast('✅ Usuario creado', `${name} se registró correctamente en Supabase.`, 'success');
      window.mountAdmin();

    } catch (err) {
      console.error('[CREATE USER]', err);
      let msg = err.message || 'Ocurrió un error inesperado.';
      if (msg.includes('already registered')) msg = 'Este correo ya está registrado en Supabase.';
      if (msg.includes('weak_password')) msg = 'La contraseña es demasiado débil.';
      errBox.textContent = msg;
      errBox.style.display = 'block';
      saveBtn.disabled = false;
      saveBtn.textContent = 'Crear Usuario';
    }
  });
};

window._openUserProfileModal = function (u, uSubs) {
  if (!u) return;
  const totalMensual = uSubs.reduce((a, s) => a + (parseFloat(s.price_usd) || 0), 0);

  const subsHtml = uSubs.length === 0
    ? `<div style="text-align:center;color:var(--color-outline);padding:16px;font-size:13px">Sin suscripciones asignadas</div>`
    : uSubs.map(s => {
        const svc = s.services || {};
        return `
          <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--color-outline-variant)">
            <div style="width:36px;height:36px;border-radius:8px;background:${svc.color || '#333'}22;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden">
              ${window.api.getServiceLogo(svc.name || '', svc.emoji)}
            </div>
            <div style="flex:1">
              <div style="font:600 13px/1 var(--font-family);color:var(--color-on-surface)">${svc.name || '?'}</div>
              ${s.service_email ? `<div style="font:400 11px/1.4 var(--font-family);color:var(--color-outline);margin-top:3px">📧 ${s.service_email}</div>` : ''}
              <div style="font:400 11px/1 var(--font-family);color:var(--color-outline);margin-top:3px">Vence: ${window.api.formatDate(s.next_due)}</div>
            </div>
            <div style="text-align:right">
              <div style="font:700 14px/1 var(--font-family);color:var(--color-primary)">${window.api.formatUSD(s.price_usd)}</div>
              <span class="status-badge ${s.payment_status === 'approved' ? 'badge-approved' : s.payment_status === 'review' ? 'badge-review' : 'badge-pending'}" style="margin-top:4px;display:inline-flex">${s.payment_status === 'approved' ? 'Pagado' : s.payment_status === 'review' ? 'Revisión' : 'Pendiente'}</span>
            </div>
          </div>
        `;
      }).join('');

  const overdueSubs = uSubs.filter(s => window.api.getDaysUntilDue(s.next_due) < 0 && s.payment_status !== 'approved');
  const soonSubs = uSubs.filter(s => window.api.getDaysUntilDue(s.next_due) >= 0 && window.api.getDaysUntilDue(s.next_due) <= 5 && s.payment_status !== 'approved');

  const reminderBody = buildReminderBody(u.name, overdueSubs, soonSubs);

  const html = `
    <div class="modal-handle"></div>
    <div class="modal-title">Perfil de Usuario</div>
    <div class="modal-body">

      <!-- Avatar + nombre -->
      <div style="display:flex;align-items:center;gap:16px;padding:16px;background:var(--color-surface-container);border-radius:var(--radius-2xl)">
        <div class="avatar" style="width:56px;height:56px;font-size:24px;flex-shrink:0">${u.avatar || '👤'}</div>
        <div>
          <div style="font:700 18px/1.2 var(--font-family);color:var(--color-on-surface)">${u.name}</div>
          <div style="font:400 13px/1 var(--font-family);color:var(--color-outline);margin-top:4px">${u.role === 'admin' ? '👑 Administrador' : '👤 Usuario'}</div>
        </div>
      </div>

      <!-- Datos personales -->
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">📧 Correo</span>
          <span class="info-value" style="font-size:13px">${u.email}</span>
        </div>
        <div class="info-divider"></div>
        <div class="info-row">
          <span class="info-label">📞 Teléfono</span>
          <span class="info-value">${u.phone || '—'}</span>
        </div>
        <div class="info-divider"></div>
        <div class="info-row">
          <span class="info-label">🔑 Contraseña</span>
          <span class="info-value" style="color:var(--color-outline);font-size:12px">Gestionada por Supabase Auth</span>
        </div>
        <div class="info-divider"></div>
        <div class="info-row">
          <span class="info-label">📅 Miembro desde</span>
          <span class="info-value">${u.created_at ? new Date(u.created_at).toLocaleDateString('es-VE') : '—'}</span>
        </div>
      </div>

      <!-- Suscripciones -->
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="font:600 13px/1 var(--font-family);letter-spacing:0.05em;text-transform:uppercase;color:var(--color-outline)">Servicios Activos</div>
          <div style="font:700 15px/1 var(--font-family);color:var(--color-primary)">${window.api.formatUSD(totalMensual)}/mes</div>
        </div>
        <div style="background:var(--color-surface-container);border-radius:var(--radius-xl);padding:0 12px">
          ${subsHtml}
        </div>
      </div>

    </div>
    <div class="modal-footer" style="flex-direction:row; gap:8px">
      <button class="btn btn-secondary btn-full" style="flex:1" id="send-reminder-btn">🔔 Recordatorio</button>
      <button class="btn btn-ghost btn-full" style="flex:1" id="close-profile-modal-btn">Cerrar</button>
    </div>
  `;

  window.openModal(html);
  document.getElementById('close-profile-modal-btn')?.addEventListener('click', () => window.closeModal());

  document.getElementById('send-reminder-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('send-reminder-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner spinner-sm" style="border-top-color:#412d00;margin:0 auto"></div>';
    const sent = await sendReminderEmail(u.email, u.name, reminderBody);
    if (sent) {
      window.showToast('✅ Enviado', `Recordatorio enviado a ${u.email}`, 'success');
      btn.textContent = '✅ Enviado';
    } else {
      window.showToast('⚠️ EmailJS no configurado', 'Configura tus claves en index.html', 'error');
      btn.textContent = '🔔 Recordatorio';
      btn.disabled = false;
    }
  });
};

