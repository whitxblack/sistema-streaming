/* ============================================================
   APP.JS — Main Entry Point (Global, no ES modules)
   ============================================================ */
console.log('[APP] app.js cargado correctamente ✅');

// Inicializar Tema
const savedTheme = localStorage.getItem('subtrack_theme');
if (savedTheme) {
  document.documentElement.setAttribute('data-theme', savedTheme);
}

// Register routes
window.registerRoute('/login',          { render: window.renderLogin,         mount: window.mountLogin });
window.registerRoute('/',               { render: window.renderDashboard,     mount: window.mountDashboard });
window.registerRoute('/subscriptions',  { render: window.renderSubscriptions, mount: window.mountSubscriptions });
window.registerRoute('/history',        { render: window.renderHistory,       mount: window.mountHistory });
window.registerRoute('/profile',        { render: window.renderProfile,       mount: window.mountProfile });
window.registerRoute('/admin',          { render: window.renderAdmin,         mount: window.mountAdmin });
window.registerRoute('/admin/users',    { render: window.renderAdmin,         mount: window.mountAdmin });
window.registerRoute('/admin/payments', { render: window.renderAdmin,         mount: window.mountAdmin });
window.registerRoute('/admin/services', { render: window.renderAdmin,         mount: window.mountAdmin });

// Render function — transición rápida para no percibir demora
function renderView(handler) {
  const view = document.getElementById('router-view');
  if (!view) return;

  view.style.opacity = '0';
  view.style.transform = 'translateY(6px)';
  view.style.transition = 'opacity 80ms ease, transform 80ms ease';

  setTimeout(() => {
    view.innerHTML = handler.render();
    requestAnimationFrame(() => {
      view.style.opacity = '1';
      view.style.transform = 'translateY(0)';
    });
    if (handler.mount) handler.mount();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, 60);
}

function hideLoader() {
  const loader = document.getElementById('app-loader');
  if (loader) {
    loader.classList.add('hidden');
    setTimeout(() => loader.remove(), 450);
  }
}

async function init() {
  console.log('[APP] Inicializando...');

  // Init router
  window.initRouter(renderView);

  // Esperar sesión de Supabase
  try {
    await window.store.init();
  } catch (err) {
    console.error('[APP] Error en store.init():', err);
  }

  hideLoader();
  window.handleRoute();
}

init();

