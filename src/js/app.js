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

// Render function
function renderView(handler) {
  const view = document.getElementById('router-view');
  if (!view) return;

  view.style.opacity = '0';
  view.style.transform = 'translateY(10px)';
  view.style.transition = 'opacity 150ms, transform 150ms';

  setTimeout(() => {
    view.innerHTML = handler.render();
    view.style.opacity = '1';
    view.style.transform = 'translateY(0)';
    if (handler.mount) handler.mount();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, 140);
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

  // Desregistrar Service Workers viejos que podrían cachear archivos viejos
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      await reg.unregister();
      console.log('[SW] Desregistrado:', reg.scope);
    }
  }

  // Init router (registra el listener de hashchange pero no navega aún)
  window.initRouter(renderView);

  // Esperar sesión de Supabase
  console.log('[APP] Esperando store.init()...');
  try {
    await window.store.init();
    console.log('[APP] store.init() completado.');
  } catch (err) {
    console.error('[APP] Error en store.init():', err);
  }

  // Ahora que sabemos el estado de la sesión, ocultar loader y navegar
  hideLoader();
  console.log('[APP] Loader oculto. Evaluando ruta...');
  window.handleRoute();
}

init();
