/* ============================================================
   MODAL — Component (Global)
   ============================================================ */
window.openModal = function(html) {
  const overlay = document.getElementById('modal-overlay');
  overlay.innerHTML = `<div class="modal">${html}</div>`;
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) window.closeModal();
  }, { once: true });
};

window.closeModal = function() {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.add('hidden');
  overlay.innerHTML = '';
  document.body.style.overflow = '';
};
