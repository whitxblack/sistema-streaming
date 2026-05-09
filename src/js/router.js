/* ============================================================
   ROUTER — Hash-based SPA (Global, no ES modules)
   ============================================================ */
console.log('[ROUTER] Cargado.');

window._routes = {};
window._renderFn = null;
window._routerReady = false;

window.registerRoute = function(path, handler) {
  window._routes[path] = handler;
};

window.navigate = function(path) {
  window.location.hash = path;
};

window.getParams = function() {
  const hash = window.location.hash.slice(1);
  const [, qs] = hash.split('?');
  return qs ? Object.fromEntries(new URLSearchParams(qs)) : {};
};

window.getCurrentRoute = function() {
  const hash = window.location.hash.slice(1);
  return hash.split('?')[0] || '/';
};

window.handleRoute = function() {
  if (!window._routerReady || !window._renderFn) return;

  const path = window.getCurrentRoute();
  const user = window.store.currentUser();

  console.log('[ROUTER] Ruta actual:', path, '| Usuario:', user?.role || 'none');

  if (!user && path !== '/login') {
    window.location.hash = '/login';
    return;
  }
  if (user && path === '/login') {
    window.location.hash = user.role === 'admin' ? '/admin' : '/';
    return;
  }
  if (path.startsWith('/admin') && user?.role !== 'admin') {
    window.location.hash = '/';
    return;
  }

  const handler = window._routes[path] || window._routes['/'];
  if (handler) window._renderFn(handler);
};

window.initRouter = function(renderFn) {
  window._renderFn = renderFn;
  window._routerReady = true;
  window.addEventListener('hashchange', window.handleRoute);
};
