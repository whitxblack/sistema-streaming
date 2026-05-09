/* ============================================================
   VIEW: PAYMENT MODAL (Global)
   ============================================================ */
window.openPaymentModal = function(subs, selectedIds, rate) {
  const user = window.store.currentUser();
  const selected = new Set(selectedIds);
  let activeMethod = null;

  const totalUSD = () => subs.filter(s => selected.has(s.id)).reduce((a, s) => a + s.price_usd, 0);

  const METHODS = [
    { id: 'PayPal', icon: '🅿️', name: 'PayPal', hint: 'Pago online seguro' },
    { id: 'Binance', icon: '🟡', name: 'Binance Pay', hint: 'Pago con USDT/BTC' },
    { id: 'PagoMovil', icon: '📱', name: 'Pago Móvil', hint: 'Transferencia instantánea' },
    { id: 'Transferencia', icon: '🏦', name: 'Transferencia', hint: 'Transferencia bancaria' }
  ];

  const html = `
    <div class="modal-handle"></div>
    <div class="modal-title">Realizar Pago</div>
    <div class="modal-body">
      <div class="flex-col gap-3" id="svc-list">
        ${subs.map(sub => {
          const svc = sub.services;
          const sel = selected.has(sub.id);
          return `
            <label class="check-item${sel ? ' selected' : ''}" data-sub-id="${sub.id}">
              <div class="check-box">
                <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1 4L4.5 7.5L11 1" stroke="#412d00" stroke-width="2" stroke-linecap="round"/></svg>
              </div>
              <div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:${svc.color}22;border-radius:8px">
                ${window.api.getServiceLogo(svc.name, svc.emoji)}
              </div>
              <div style="flex:1;margin-left:12px">
                <div style="font:600 14px/1 var(--font-family);color:var(--color-on-surface)">${svc.name}</div>
                <div style="font:400 12px/1 var(--font-family);color:var(--color-outline);margin-top:3px">${window.api.formatUSD(sub.price_usd)}${rate ? ' · ' + window.api.formatBs(window.api.usdToBs(sub.price_usd, rate)) : ''}</div>
              </div>
              <input type="checkbox" class="sr-only sub-check" value="${sub.id}" ${sel ? 'checked' : ''} />
            </label>
          `;
        }).join('')}
      </div>

      <div class="info-box">
        <div class="info-row">
          <span class="info-total-label">Total a Pagar</span>
          <div style="text-align:right">
            <div class="info-total-value" id="modal-total-usd">${window.api.formatUSD(totalUSD())}</div>
            <div style="font:400 12px/1 var(--font-family);color:var(--color-outline);margin-top:4px" id="modal-total-bs">
              ${rate ? window.api.formatBs(window.api.usdToBs(totalUSD(), rate)) : ''}
            </div>
          </div>
        </div>
      </div>

      <div>
        <div class="form-label" style="margin-bottom:12px">Método de Pago</div>
        <div class="flex-col gap-3">
          ${METHODS.map(m => `
            <div class="payment-method-card" data-method="${m.id}">
              <div class="payment-method-icon">${m.icon}</div>
              <div><div class="payment-method-name">${m.name}</div><div class="payment-method-hint">${m.hint}</div></div>
              <div class="payment-method-radio"></div>
            </div>
          `).join('')}
        </div>
      </div>
      <div id="payment-data-area"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary btn-full btn-lg" id="proceed-pay-btn" disabled>Continuar con el Pago</button>
      <button class="btn btn-ghost btn-full" id="cancel-pay-btn">Cancelar</button>
    </div>
  `;

  window.openModal(html);

  const updateTotal = () => {
    const t = totalUSD();
    document.getElementById('modal-total-usd').textContent = window.api.formatUSD(t);
    document.getElementById('modal-total-bs').textContent = rate ? window.api.formatBs(window.api.usdToBs(t, rate)) : '';
  };

  const updateProceedBtn = () => {
    document.getElementById('proceed-pay-btn').disabled = selected.size === 0 || !activeMethod;
  };

  document.querySelectorAll('.check-item[data-sub-id]').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.subId;
      const chk = item.querySelector('.sub-check');
      if (selected.has(id)) { selected.delete(id); item.classList.remove('selected'); if (chk) chk.checked = false; }
      else { selected.add(id); item.classList.add('selected'); if (chk) chk.checked = true; }
      updateTotal(); updateProceedBtn();
    });
  });

  document.querySelectorAll('.payment-method-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.payment-method-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      activeMethod = card.dataset.method;
      updateProceedBtn();
    });
  });

  document.getElementById('cancel-pay-btn')?.addEventListener('click', () => window.closeModal());

  document.getElementById('proceed-pay-btn')?.addEventListener('click', () => {
    if (selected.size === 0 || !activeMethod) return;
    const tAmt = totalUSD();
    window._openReceiptModal(subs, selected, rate, user, activeMethod, tAmt);
  });
};

window._openReceiptModal = function(subs, selected, rate, user, activeMethod, totalAmt) {
  let receiptFile = null;
  const html = `
    <div class="modal-handle"></div>
    <div class="modal-title">Adjuntar Comprobante</div>
    <div class="modal-subtitle">Sube la captura de tu pago para verificación</div>
    <div class="modal-body">
      <div class="upload-zone" id="upload-zone">
        <div class="upload-zone-icon">📎</div>
        <div class="upload-zone-text">Toca para subir tu comprobante</div>
        <input type="file" id="receipt-file" accept="image/*,application/pdf" />
      </div>
      <div id="upload-preview-area"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary btn-full btn-lg" id="submit-receipt-btn" disabled>Enviar Comprobante</button>
      <button class="btn btn-ghost btn-full" id="skip-receipt-btn">Enviar después</button>
    </div>
  `;

  window.closeModal();
  const overlay = document.getElementById('modal-overlay');
  overlay.innerHTML = `<div class="modal">${html}</div>`;
  overlay.classList.remove('hidden');

  const fileInput = document.getElementById('receipt-file');
  const zone = document.getElementById('upload-zone');
  const submitBtn = document.getElementById('submit-receipt-btn');

  zone?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', (e) => {
    receiptFile = e.target.files[0];
    if (!receiptFile) return;
    submitBtn.disabled = false;
    if (receiptFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        document.getElementById('upload-preview-area').innerHTML = `<div class="upload-preview"><img src="${ev.target.result}" /></div>`;
        zone.style.display = 'none';
      };
      reader.readAsDataURL(receiptFile);
    }
  });

  submitBtn?.addEventListener('click', async () => {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="spinner spinner-sm" style="border-top-color:#412d00;margin:0 auto"></div>';
    try {
      const paymentData = {
        user_id: user.id,
        method: activeMethod,
        total_usd: totalAmt,
        total_bs: rate ? window.api.usdToBs(totalAmt, rate) : null,
        status: 'review'
      };
      const payment = await window.store.createPayment(paymentData, Array.from(selected));
      if (receiptFile) await window.store.uploadReceipt(receiptFile, payment.id);
      window.closeModal();
      window.showToast('Pago enviado', 'Tu pago está en revisión.', 'success');
      setTimeout(() => window.navigate('/history'), 1000);
    } catch (error) {
      console.error(error);
      window.showToast('Error', 'Hubo un problema procesando el pago', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar Comprobante';
    }
  });

  document.getElementById('skip-receipt-btn')?.addEventListener('click', () => {
    window.closeModal();
    window.navigate('/history');
  });
};
