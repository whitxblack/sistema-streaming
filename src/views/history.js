/* ============================================================
   VIEW: HISTORY (Global)
   ============================================================ */
window.renderHistory = function() {
  return `
    <div class="app-layout">
      ${window.renderTopNav('Historial')}
      <main class="page stagger" id="history-content">
        <div class="empty-state"><div class="spinner spinner-lg"></div></div>
      </main>
      ${window.renderBottomNav()}
    </div>
  `;
};

window.mountHistory = async function() {
  window.mountNavbar();
  const content = document.getElementById('history-content');
  if (!content) return;

  const user = window.store.currentUser();
  if (!user) return;

  try {
    const db = window.store.getSupabase();
    const { data: payments, error } = await db
      .from('payments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const badges = { pending: 'badge-pending', review: 'badge-review', approved: 'badge-approved', rejected: 'badge-rejected' };
    const labels = { pending: 'Pendiente', review: 'En Revisión', approved: 'Aprobado', rejected: 'Rechazado' };

    content.innerHTML = `
      <div class="page-header">
        <div class="page-title">Historial de Pagos</div>
      </div>
      <div class="filter-row" id="hist-filter">
        <button class="filter-chip active" data-filter="all">Todos</button>
        <button class="filter-chip" data-filter="review">En Revisión</button>
        <button class="filter-chip" data-filter="approved">Aprobados</button>
      </div>
      <div class="flex-col gap-3 desktop-grid" style="margin-top:20px" id="hist-list">
        ${payments.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon">📄</div>
            <div class="empty-state-title">Sin pagos aún</div>
          </div>
        ` : payments.map(p => {
          const dateStr = new Date(p.created_at).toLocaleDateString('es-VE', { year: 'numeric', month: 'short', day: 'numeric' });
          const periodStr = (p.period_start && p.period_end)
            ? `${new Date(p.period_start + 'T12:00:00').toLocaleDateString('es-VE', { month: 'short', day: '2-digit' })} – ${new Date(p.period_end + 'T12:00:00').toLocaleDateString('es-VE', { month: 'short', day: '2-digit', year: 'numeric' })}`
            : null;
          const hasDiscount = p.discount_amount > 0 || p.wallet_amount > 0;
          return `
            <div class="card-flat animate-fadeInUp" data-status="${p.status}">
              <div class="flex-between" style="margin-bottom:8px">
                <div>
                  ${p.invoice_number ? `<div style="font:700 11px/1 var(--font-family);color:var(--color-primary);letter-spacing:0.06em;margin-bottom:5px">${p.invoice_number}</div>` : ''}
                  <div style="font:600 14px/1 var(--font-family);color:var(--color-on-surface)">Pago con ${p.method}</div>
                  <div style="font:400 12px/1 var(--font-family);color:var(--color-outline);margin-top:4px">${dateStr}${periodStr ? ` · ${periodStr}` : ''}</div>
                </div>
                <div style="text-align:right">
                  <div style="font:700 16px/1 var(--font-family);color:var(--color-primary)">${window.api.formatUSD(p.total_usd)}</div>
                  ${p.subtotal && p.subtotal !== p.total_usd ? `<div style="font:400 11px/1 var(--font-family);color:var(--color-outline);text-decoration:line-through;margin-top:2px">${window.api.formatUSD(p.subtotal)}</div>` : ''}
                </div>
              </div>
              ${hasDiscount ? `
              <div class="info-box" style="padding:10px 12px;margin-bottom:10px;background:rgba(168,230,163,0.08);border-color:rgba(168,230,163,0.2)">
                ${p.discount_amount > 0 ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--color-success)"><span>🎟 Descuento</span><span>-${window.api.formatUSD(p.discount_amount)}</span></div>` : ''}
                ${p.wallet_amount > 0 ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--color-success);margin-top:4px"><span>💰 Créditos</span><span>-${window.api.formatUSD(p.wallet_amount)}</span></div>` : ''}
              </div>` : ''}
              ${p.receipt_url ? `<div class="info-box" style="padding:10px;margin-bottom:10px"><a href="${p.receipt_url}" target="_blank" style="color:var(--color-primary);font-size:13px;text-decoration:none">📎 Ver Comprobante</a></div>` : ''}
              ${p.admin_note ? `<div class="info-box" style="padding:10px;margin-bottom:10px;background:rgba(255,180,171,0.08);border-color:rgba(255,180,171,0.2)"><div style="font-weight:600;font-size:12px;color:var(--color-error);margin-bottom:4px">Nota del Admin:</div><div style="font-size:12px">${p.admin_note}</div></div>` : ''}
              <div class="flex-between">
                <span class="status-badge ${badges[p.status] || 'badge-pending'}">${labels[p.status] || 'Pendiente'}</span>
                <span style="font-size:11px;color:var(--color-outline)">ID: ${p.id.substring(0,8)}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    document.querySelectorAll('#hist-filter .filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#hist-filter .filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const filter = chip.dataset.filter;
        document.querySelectorAll('#hist-list .card-flat').forEach(card => {
          card.style.display = (filter === 'all' || card.dataset.status === filter) ? '' : 'none';
        });
      });
    });

  } catch (err) {
    content.innerHTML = `<div class="empty-state"><div class="empty-state-text" style="color:var(--color-error)">Error cargando historial</div></div>`;
  }
};
