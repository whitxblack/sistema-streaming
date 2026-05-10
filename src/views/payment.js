/* ============================================================
   VIEW: PAYMENT MODAL (Global)
   ============================================================ */
window.openPaymentModal = function (subs, selectedIds, rate) {
  const user = window.store.currentUser();
  const selected = new Set(selectedIds);
  let activeMethod = null;

  const totalUSD = () => subs.filter(s => selected.has(s.id)).reduce((a, s) => a + s.price_usd, 0);

  const METHODS = [
    { id: 'PayPal', icon: '<svg viewBox="0 0 24 24" fill="#0079C1" width="22" height="22"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106z"/></svg>', name: 'PayPal', hint: 'Pago online seguro' },
    { id: 'Binance', icon: '<svg viewBox="0 0 24 24" fill="#FCD535" width="22" height="22"><path d="M16.624 13.9202l2.7175 2.7154-7.353 7.353-7.353-7.353 2.7175-2.7154 4.6355 4.6355zM5.4138 10.1483l-2.7175 2.7154 2.7175 2.7153 2.7175-2.7153zm7.0427-4.1084l-2.7175 2.7154-2.7175-2.7154 2.7175-2.7154zm4.6355 4.6354l2.7175 2.7153-2.7175 2.7153-2.7175-2.7153zM11.9886 1.8893l7.353 7.353-2.7175 2.7154-4.6355-4.6354-4.6355 4.6354-2.7175-2.7154z"/></svg>', name: 'Binance Pay', hint: 'Pago con USDT/BTC' },
    { id: 'PagoMovil', icon: '<img src="logos/bdv_logo.png" style="width:22px;height:22px;object-fit:contain;border-radius:4px" />', name: 'Pago Móvil', hint: 'Transferencia instantánea' },
    { id: 'Transferencia', icon: '<div style="color:var(--color-primary);font-weight:700;font-size:14px;letter-spacing:1px">Bs.</div>', name: 'Transferencia', hint: 'Transferencia bancaria' }
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
    if (activeMethod === 'PayPal') {
      window._openPayPalModal(subs, selected, rate, user, tAmt);
    } else {
      window._openReceiptModal(subs, selected, rate, user, activeMethod, tAmt);
    }
  });
};

window._openPayPalModal = function (subs, selected, rate, user, totalAmt) {
  const html = `
    <div class="modal-handle"></div>
    <div class="modal-title">Pagar con PayPal</div>
    <div class="modal-subtitle">Total a pagar: <strong>$${totalAmt.toFixed(2)} USD</strong></div>
    <div class="modal-body" style="text-align:center; padding: 20px 0;">
      <div id="paypal-button-container"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost btn-full" id="cancel-paypal-btn">Cancelar</button>
    </div>
  `;

  window.openModal(html);

  document.getElementById('cancel-paypal-btn')?.addEventListener('click', () => window.closeModal());

  if (window.paypal) {
    window.paypal.Buttons({
      createOrder: function (data, actions) {
        return actions.order.create({
          purchase_units: [{
            amount: { value: totalAmt.toFixed(2) }
          }]
        });
      },
      onApprove: async function (data, actions) {
        try {
          const details = await actions.order.capture();
          window.showToast('Pago exitoso', 'Procesando en el sistema...', 'success');

          const paymentData = {
            user_id: user.id,
            method: 'PayPal',
            total_usd: totalAmt,
            total_bs: rate ? window.api.usdToBs(totalAmt, rate) : null,
            status: 'approved'
          };

          // Crear pago y aprobar automáticamente
          const payment = await window.store.createPayment(paymentData, Array.from(selected));

          // Actualizar recibo con el ID de transacción de PayPal
          await window.store.getSupabase().from('payments').update({ receipt_url: 'PayPal TX: ' + details.id }).eq('id', payment.id);

          await window.store.approvePayment(payment.id, Array.from(selected));

          window.closeModal();
          window.showToast('Pago completado', 'Tu pago ha sido validado correctamente.', 'success');
          setTimeout(() => window.navigate('/history'), 1000);
        } catch (error) {
          console.error(error);
          window.showToast('Error', 'Hubo un problema registrando el pago en el sistema', 'error');
        }
      },
      onError: function (err) {
        console.error(err);
        window.showToast('Error', 'El pago fue cancelado o hubo un error', 'error');
      }
    }).render('#paypal-button-container');
  } else {
    document.getElementById('paypal-button-container').innerHTML = '<p style="color:var(--color-error)">SDK de PayPal no cargado.</p>';
  }
};

window._openReceiptModal = function (subs, selected, rate, user, activeMethod, totalAmt) {
  let receiptFile = null;
  const isPM = activeMethod === 'PagoMovil';
  const isBinance = activeMethod === 'Binance';
  const needsDetails = isPM || isBinance;

  let detailsHtml = '';
  if (isPM) {
    const amountBs = rate ? window.api.formatBs(window.api.usdToBs(totalAmt, rate)) : '—';
    detailsHtml = `
      <div class="card-flat" style="padding:12px; margin-bottom:12px; background:rgba(233,193,118,0.05); border:1px solid var(--color-outline-variant); border-radius:12px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
          <img src="logos/bdv_logo.png" style="height:24px; object-fit:contain;" />
          <button class="btn btn-secondary btn-sm" id="copy-pm-data-btn" style="border-radius:99px;font-size:11px;padding:4px 12px;min-height:0">📋 Copiar Datos</button>
        </div>
        
        <div style="display:flex; gap:16px; align-items:center;">
          <div style="flex:1; display:flex; flex-direction:column; gap:6px;">
            <div class="flex-between"><span style="font:400 11px var(--font-family); color:var(--color-outline)">Doc</span><span style="font:600 12px var(--font-family); color:var(--color-on-surface)">V-28310728</span></div>
            <div class="flex-between"><span style="font:400 11px var(--font-family); color:var(--color-outline)">Banco</span><span style="font:600 12px var(--font-family); color:var(--color-on-surface)">0102 - BDV</span></div>
            <div class="flex-between"><span style="font:400 11px var(--font-family); color:var(--color-outline)">Teléfono</span><span style="font:600 12px var(--font-family); color:var(--color-on-surface)">04241389911</span></div>
            <div class="flex-between" style="padding-top:6px; border-top:1px dashed var(--color-outline-variant)">
              <span style="font:400 11px var(--font-family); color:var(--color-outline)">Monto (${window.api.formatUSD(totalAmt)})</span>
              <span style="font:700 14px var(--font-family); color:var(--color-primary)">${amountBs}</span>
            </div>
          </div>
          <div style="text-align:center; flex-shrink:0;">
            <img src="logos/codigo_QR.jpeg" style="width:90px; height:90px; border-radius:8px; border:2px solid white; box-shadow:var(--shadow-sm); object-fit:cover;" />
            <div style="font:600 9px var(--font-family); color:var(--color-outline); margin-top:4px; letter-spacing:0.5px">ESCANEAR</div>
          </div>
        </div>
      </div>
    `;
  } else if (isBinance) {
    detailsHtml = `
      <div class="card-flat" style="padding:12px; margin-bottom:12px; background:rgba(252,213,53,0.05); border:1px solid var(--color-outline-variant); border-radius:12px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
          <div style="font-weight:700; color:#FCD535; font-size:16px;">Binance Pay</div>
          <button class="btn btn-secondary btn-sm" id="copy-binance-data-btn" style="border-radius:99px;font-size:11px;padding:4px 12px;min-height:0">📋 Copiar Datos</button>
        </div>
        
        <div style="display:flex; gap:16px; align-items:center;">
          <div style="flex:1; display:flex; flex-direction:column; gap:6px;">
            <div class="flex-between" style="flex-direction:column; align-items:flex-start; gap:4px;">
              <span style="font:400 11px var(--font-family); color:var(--color-outline)">Correo Electrónico</span>
              <span style="font:600 12px var(--font-family); color:var(--color-on-surface); word-break:break-all;">whitxblack901@gmail.com</span>
            </div>
            <div class="flex-between" style="padding-top:6px; border-top:1px dashed var(--color-outline-variant)">
              <span style="font:400 11px var(--font-family); color:var(--color-outline)">Total a Pagar</span>
              <span style="font:700 14px var(--font-family); color:#FCD535;">${totalAmt.toFixed(2)} USDT</span>
            </div>
          </div>
          <div style="text-align:center; flex-shrink:0;">
            <img src="logos/binance.jpeg" style="width:90px; height:90px; border-radius:8px; border:2px solid white; box-shadow:var(--shadow-sm); object-fit:cover;" />
            <div style="font:600 9px var(--font-family); color:var(--color-outline); margin-top:4px; letter-spacing:0.5px">ESCANEAR</div>
          </div>
        </div>
      </div>
    `;
  }

  const html = `
    <div class="modal-handle"></div>
    <div class="modal-title">${needsDetails ? 'Confirmar Pago' : 'Adjuntar Comprobante'}</div>
    <div class="modal-subtitle">${needsDetails ? 'Realiza el pago y sube el comprobante para activar tu servicio' : 'Sube la captura de tu pago para verificación'}</div>
    <div class="modal-body">
      ${detailsHtml}
      <div class="upload-zone" id="upload-zone" style="${needsDetails ? 'margin-top:8px' : ''}">
        <div class="upload-zone-icon">📎</div>
        <div class="upload-zone-text">Adjuntar captura del pago</div>
        <input type="file" id="receipt-file" accept="image/*,application/pdf" />
      </div>
      <div id="upload-preview-area"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary btn-full btn-lg" id="submit-receipt-btn" disabled>Enviar Comprobante</button>
      ${!needsDetails ? '<button class="btn btn-ghost btn-full" id="skip-receipt-btn">Enviar después</button>' : '<button class="btn btn-ghost btn-full" id="cancel-receipt-btn">Cancelar Pago</button>'}
    </div>
  `;

  window.openModal(html);


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

  document.getElementById('cancel-receipt-btn')?.addEventListener('click', () => {
    window.closeModal();
  });

  document.getElementById('copy-pm-data-btn')?.addEventListener('click', async () => {
    const textToCopy = `Pago Móvil\nBanco: 0102 - BANCO DE VENEZUELA\nDocumento: V-28310728\nTeléfono: 04241389911`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      window.showToast('Copiado', 'Datos copiados al portapapeles', 'success');
    } catch (err) {
      window.showToast('Error', 'No se pudo copiar', 'error');
    }
  });

  document.getElementById('copy-binance-data-btn')?.addEventListener('click', async () => {
    const textToCopy = `whitxblack901@gmail.com`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      window.showToast('Copiado', 'Correo copiado al portapapeles', 'success');
    } catch (err) {
      window.showToast('Error', 'No se pudo copiar', 'error');
    }
  });
};
