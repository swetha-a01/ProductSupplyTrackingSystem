import { renderMapView } from './map.js';
import { renderStateView } from './state.js';

const appContainer = document.getElementById('app');
const navbarBack = document.getElementById('navbar-back');
const navbarTitle = document.getElementById('navbar-title');

// Route parser
function parseRoute() {
  const hash = location.hash || '#/';
  if (hash.startsWith('#/state/')) {
    const stateId = decodeURIComponent(hash.replace('#/state/', ''));
    return { view: 'state', stateId };
  }
  return { view: 'map', stateId: null };
}

// Update navbar based on current route
function updateNavbar(route) {
  if (route.view === 'state') {
    navbarBack.style.display = 'flex';
    navbarTitle.textContent = route.stateId;
  } else {
    navbarBack.style.display = 'none';
    navbarTitle.textContent = 'Product Supply Tracking';
  }
}

// Main render function
async function render() {
  const route = parseRoute();
  updateNavbar(route);

  // Clear and prepare container
  appContainer.innerHTML = '';
  appContainer.className = '';

  if (route.view === 'state') {
    appContainer.classList.add('animate-fade-in');
    await renderStateView(appContainer, route.stateId);
  } else {
    appContainer.classList.add('animate-fade-in');
    await renderMapView(appContainer);
  }
}

// Initialize
function init() {
  // Set default route
  if (!location.hash) {
    location.hash = '#/';
  }

  // Listen for route changes
  window.addEventListener('hashchange', render);

  // Initial render
  render();
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
