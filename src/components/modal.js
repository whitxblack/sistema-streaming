/* ============================================================
   MODAL — Component (Global)
   ============================================================ */
window.openModal = function(html) {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  
  overlay.innerHTML = `<div class="modal">${html}</div>`;
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Ensure listener is only added once or handled correctly
  if (!overlay.dataset.listenerSet) {
    overlay.addEventListener('mousedown', (e) => {
      // If we click exactly on the overlay (the background) and not the modal content
      if (e.target === overlay) {
        window.closeModal();
      }
    });
    overlay.dataset.listenerSet = 'true';
  }
};

window.closeModal = function() {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  
  overlay.classList.add('hidden');
  // Use a small delay for the innerHTML clear to allow transitions if any
  overlay.innerHTML = '';
  document.body.style.overflow = '';
};
