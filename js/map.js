import { ACTIVE_STATES, ID_STATE_MAP, getAllProjects } from './data.js';

/**
 * Render the interactive India map view
 */
export async function renderMapView(container) {
  // Compute overall KPIs
  const allProjects = await getAllProjects();
  const totalProjects = allProjects.length;
  const liveCount = allProjects.filter(p => p.status === 'Live').length;
  const standbyCount = allProjects.filter(p => p.status === 'Standby').length;
  const totalPendingTasks = allProjects.reduce((sum, p) => {
    return sum + (p.pendingItems || []).filter(item => !item.isCompleted).length;
  }, 0);

  // Compute project counts per state
  const stateCounts = {};
  ACTIVE_STATES.forEach(state => {
    stateCounts[state] = allProjects.filter(p => p.state === state).length;
  });

  container.innerHTML = `
    <div class="map-container">
      <div class="map-hero animate-fade-up">
        <h1>Product Supply Tracking System</h1>
        <p>Monitor heavy machine installations and cargo logistics across India. Select an active state to view detailed project information.</p>
      </div>

      <!-- Split Layout -->
      <div class="map-split-container">
        <!-- Left Side: Searchable States List + KPIs -->
        <div class="map-sidebar animate-slide-left" style="animation-delay: 100ms;">
          <!-- Overall KPIs -->
          <div class="overall-kpi-grid">
            <div class="overall-kpi-card">
              <span class="kpi-val">${totalProjects}</span>
              <span class="kpi-lbl">Total Projects</span>
            </div>
            <div class="overall-kpi-card">
              <span class="kpi-val" style="color: var(--status-live);">${liveCount}</span>
              <span class="kpi-lbl">Live Systems</span>
            </div>
            <div class="overall-kpi-card">
              <span class="kpi-val" style="color: var(--status-standby);">${standbyCount}</span>
              <span class="kpi-lbl">Standby</span>
            </div>
            <div class="overall-kpi-card">
              <span class="kpi-val" style="color: var(--accent-purple);">${totalPendingTasks}</span>
              <span class="kpi-lbl">Pending Tasks</span>
            </div>
          </div>

          <!-- Active Region List Panel -->
          <div class="map-sidebar-card">
            <h2>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-teal)" stroke-width="2" style="vertical-align: -3px; margin-right: 4px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Active Region Registry
            </h2>
            <div class="state-search-box">
              <span class="state-search-icon" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              </span>
              <input type="text" id="state-search" class="form-input state-search-input" placeholder="Search active state..." autocomplete="off" />
            </div>
            <div class="state-sidebar-list" id="sidebar-state-list">
              ${ACTIVE_STATES.map(state => `
                <div class="state-sidebar-item" data-state="${state}">
                  <span class="state-name">${state}</span>
                  <span class="project-count-badge">${stateCounts[state] || 0} active</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Right Side: SVG Map -->
        <div class="map-main-content animate-scale-in" style="animation-delay: 200ms;">
          <div id="india-map" class="india-map-wrapper">
            <div class="map-loading">
              <div class="map-loading-spinner"></div>
              <span>Loading map...</span>
            </div>
          </div>
          <div class="map-legend animate-fade-up" style="animation-delay: 300ms;">
            <div class="legend-item">
              <span class="legend-dot legend-dot-active"></span>
              <span>Active Region</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot legend-dot-inactive"></span>
              <span>Inactive Region</span>
            </div>
            <div class="legend-hint">Click a state on the map or list to view portal</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach search box handler
  const searchInput = document.getElementById('state-search');
  const sidebarList = document.getElementById('sidebar-state-list');
  if (searchInput && sidebarList) {
    searchInput.addEventListener('input', () => {
      const val = searchInput.value.trim().toLowerCase();
      sidebarList.querySelectorAll('.state-sidebar-item').forEach(item => {
        const stateName = item.dataset.state.toLowerCase();
        if (stateName.includes(val)) {
          item.style.display = 'flex';
        } else {
          item.style.display = 'none';
        }
      });
    });
  }

  // Fetch and render SVG map
  try {
    const response = await fetch('./assets/india-map.svg');
    if (!response.ok) throw new Error('Failed to load map');
    const svgText = await response.text();
    const mapWrapper = document.getElementById('india-map');
    mapWrapper.innerHTML = svgText;

    const svg = mapWrapper.querySelector('svg');
    if (!svg) throw new Error('Invalid SVG');

    // Style and configure SVG
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Interactive Map of India');
    svg.style.width = '100%';
    svg.style.maxHeight = 'calc(100vh - 280px)';
    svg.style.minHeight = '400px';

    // Process all state paths
    const paths = svg.querySelectorAll('path');
    paths.forEach((path) => {
      const id = path.getAttribute('id');
      const stateName = path.getAttribute('aria-label') || ID_STATE_MAP[id] || '';

      path.classList.add('state-path');

      if (ACTIVE_STATES.includes(stateName)) {
        path.classList.add('active');
        path.setAttribute('data-state', stateName);
        path.setAttribute('tabindex', '0');
        path.setAttribute('role', 'button');
        path.setAttribute('aria-label', `View logistics for ${stateName}`);

        // Click handler - navigate to state portal
        path.addEventListener('click', () => {
          location.hash = '#/state/' + encodeURIComponent(stateName);
        });

        // Keyboard accessibility
        path.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            location.hash = '#/state/' + encodeURIComponent(stateName);
          }
        });

        // Tooltip and sidebar item highlight on hover
        path.addEventListener('mouseenter', (e) => {
          showTooltip(e, stateName);
          const listItem = document.querySelector(`.state-sidebar-item[data-state="${stateName}"]`);
          if (listItem) {
            listItem.style.background = 'var(--bg-card-hover)';
            listItem.style.borderColor = 'var(--accent-teal)';
            listItem.style.transform = 'translateX(4px)';
          }
        });
        path.addEventListener('mousemove', (e) => moveTooltip(e));
        path.addEventListener('mouseleave', () => {
          hideTooltip();
          const listItem = document.querySelector(`.state-sidebar-item[data-state="${stateName}"]`);
          if (listItem) {
            listItem.style.background = '';
            listItem.style.borderColor = '';
            listItem.style.transform = '';
          }
        });
      } else {
        path.classList.add('inactive');
        path.setAttribute('aria-hidden', 'true');
      }
    });

    // Attach sidebar hover effects to SVG map paths
    if (sidebarList) {
      sidebarList.querySelectorAll('.state-sidebar-item').forEach(item => {
        const stateName = item.dataset.state;
        item.addEventListener('mouseenter', () => {
          const path = svg.querySelector(`path[data-state="${stateName}"]`);
          if (path) {
            path.style.fill = 'var(--accent-teal)';
            path.style.stroke = '#99F6E4';
            path.style.transform = 'scale(1.015)';
            path.style.filter = 'brightness(1.15) drop-shadow(0 0 14px rgba(20, 184, 166, 0.7))';
          }
        });
        item.addEventListener('mouseleave', () => {
          const path = svg.querySelector(`path[data-state="${stateName}"]`);
          if (path) {
            path.style.fill = '';
            path.style.stroke = '';
            path.style.transform = '';
            path.style.filter = '';
          }
        });
        item.addEventListener('click', () => {
          location.hash = '#/state/' + encodeURIComponent(stateName);
        });
      });
    }

  } catch (err) {
    console.error('Map load error:', err);
    const mapWrapper = document.getElementById('india-map');
    mapWrapper.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3z"/><path d="M9 3v15"/><path d="M15 6v15"/></svg>
        </div>
        <p>Could not load map. Please ensure assets/india-map.svg is available.</p>
        <div style="margin-top: 1.5rem; display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center;">
          ${ACTIVE_STATES.map(s => `
            <a href="#/state/${encodeURIComponent(s)}" class="btn btn-secondary btn-sm">${s}</a>
          `).join('')}
        </div>
      </div>
    `;
  }
}

// --- Tooltip helpers ---
let tooltipEl = null;

function showTooltip(e, stateName) {
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'state-tooltip';
    document.body.appendChild(tooltipEl);
  }
  tooltipEl.innerHTML = `
    <strong>${stateName}</strong>
    <span style="opacity:0.7; font-size:0.7rem; display:block;">Click to view portal</span>
  `;
  tooltipEl.style.display = 'block';
  moveTooltip(e);
}

function moveTooltip(e) {
  if (!tooltipEl) return;
  tooltipEl.style.left = (e.pageX + 14) + 'px';
  tooltipEl.style.top = (e.pageY - 40) + 'px';
}

function hideTooltip() {
  if (tooltipEl) {
    tooltipEl.style.display = 'none';
  }
}
