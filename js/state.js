import { 
  getProjectsByState, 
  getKPIMetrics, 
  addProject, 
  updatePendingItem,
  deleteProject,
  LOCATION_SUGGESTIONS, 
  ACTIVE_STATES 
} from './data.js';
import { escapeHtml, formatDate, showToast } from './utils.js';

// Form state (module-level)
let formMaterials = [];
let formPendingItems = [];
let currentState = '';

/**
 * Render the full State Logistics Portal
 */
export async function renderStateView(container, stateId) {
  currentState = stateId;
  formMaterials = [];
  formPendingItems = [];

  container.innerHTML = `
    <div class="portal-container">
      <div class="portal-header animate-fade-up">
        <div>
          <a href="#/" class="btn btn-secondary btn-sm" style="margin-bottom: 0.75rem; display: inline-flex;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to Map
          </a>
          <h1>Logistics Overview: <span style="color: var(--accent-teal)">${escapeHtml(stateId)}</span></h1>
        </div>
      </div>

      <!-- KPI Metrics -->
      <div id="kpi-grid" class="kpi-grid animate-fade-up" style="animation-delay: 100ms;"></div>

      <!-- Split Panel -->
      <div class="portal-split">
        <!-- Column A: Project Registry -->
        <div class="column-a animate-slide-left" style="animation-delay: 200ms;">
          <div class="section-title">
            <span>Project Registry</span>
          </div>
          <div id="project-list"></div>
        </div>

        <!-- Column B: Intake Form -->
        <div class="column-b animate-fade-up" style="animation-delay: 300ms;">
          <div class="form-panel" id="intake-form-panel">
            <h2>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-teal)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              New Installation Record
            </h2>
            ${buildFormHTML(stateId)}
          </div>
        </div>
      </div>
    </div>
  `;

  // Render dynamic content
  await renderKPICards(stateId);
  await renderProjectList(stateId);
  attachFormHandlers(stateId);
}

// ===== KPI CARDS =====
async function renderKPICards(stateId) {
  const metrics = await getKPIMetrics(stateId);
  const kpiGrid = document.getElementById('kpi-grid');
  kpiGrid.innerHTML = `
    <div class="kpi-card kpi-total">
      <div class="kpi-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
      </div>
      <div class="kpi-value">${metrics.totalProjects}</div>
      <div class="kpi-label">Total Projects</div>
    </div>
    <div class="kpi-card kpi-live">
      <div class="kpi-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
      </div>
      <div class="kpi-value">${metrics.liveCount}</div>
      <div class="kpi-label">Live Machines</div>
    </div>
    <div class="kpi-card kpi-standby">
      <div class="kpi-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
      </div>
      <div class="kpi-value">${metrics.standbyCount}</div>
      <div class="kpi-label">Standby Units</div>
    </div>
    <div class="kpi-card kpi-pending">
      <div class="kpi-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
      </div>
      <div class="kpi-value">${metrics.pendingTasks}</div>
      <div class="kpi-label">Pending Tasks</div>
    </div>
  `;
}

// ===== PROJECT LIST =====
async function renderProjectList(stateId) {
  const projects = await getProjectsByState(stateId);
  const listContainer = document.getElementById('project-list');

  if (projects.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v16H4V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M8 12h8"/><path d="M8 16h6"/></svg>
        </div>
        <p>No projects registered for ${escapeHtml(stateId)} yet.</p>
        <p style="font-size: 0.85rem; margin-top: 0.5rem;">Use the form to add the first installation record.</p>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = projects.map((project, idx) => `
    <div class="project-card" style="animation-delay: ${idx * 80}ms;" data-project-id="${project.id}">
      <div class="project-card-header">
        <h3>${escapeHtml(project.projectName)}</h3>
        <div class="project-card-header-actions">
          <span class="badge ${project.status === 'Live' ? 'badge-live' : 'badge-standby'}">
            ${escapeHtml(project.status)}
          </span>
          <button class="btn-delete-project" data-project-id="${project.id}" title="Delete Installation">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      </div>

      <div class="project-card-meta">
        <div class="meta-item">
          <span class="meta-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            Location
          </span>
          <span class="meta-value">${escapeHtml(project.location)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 12h.01"/></svg>
            Machine
          </span>
          <span class="meta-value">${escapeHtml(project.machineType)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
            Application
          </span>
          <span class="meta-value">${escapeHtml(project.applicationType)}</span>
        </div>
      </div>

      ${project.deliveredMaterials && project.deliveredMaterials.length > 0 ? `
        <div class="material-chips-label">Delivered Materials</div>
        <div class="chip-container">
          ${project.deliveredMaterials.map(mat => `
            <span class="chip">${escapeHtml(mat)}</span>
          `).join('')}
        </div>
      ` : ''}

      ${project.requirements ? `
        <div class="requirements-text">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -2px; margin-right: 4px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
          ${escapeHtml(project.requirements)}
        </div>
      ` : ''}

      ${project.pendingItems && project.pendingItems.length > 0 ? `
        <div class="checklist-section-title">Pending Tasks</div>
        <ul class="checklist" data-project-id="${project.id}">
          ${project.pendingItems.map((item, itemIdx) => `
            <li class="checklist-item ${item.isCompleted ? 'completed' : ''}">
              <input 
                type="checkbox" 
                ${item.isCompleted ? 'checked' : ''} 
                data-project-id="${project.id}" 
                data-item-index="${itemIdx}"
                id="chk-${project.id}-${itemIdx}"
              />
              <label class="checklist-text" for="chk-${project.id}-${itemIdx}">${escapeHtml(item.item)}</label>
            </li>
          `).join('')}
        </ul>
      ` : ''}

      <div class="updated-at">Updated: ${formatDate(project.updatedAt)}</div>
    </div>
  `).join('');

  // Attach checkbox event listeners
  listContainer.querySelectorAll('.checklist-item input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', handleCheckboxChange);
  });

  // Attach delete event listeners
  listContainer.querySelectorAll('.btn-delete-project').forEach(btn => {
    btn.addEventListener('click', handleDeleteProjectClick);
  });
}

async function handleCheckboxChange(e) {
  const projectId = e.target.dataset.projectId;
  const itemIndex = parseInt(e.target.dataset.itemIndex, 10);
  const isCompleted = e.target.checked;

  // Update data
  const updated = await updatePendingItem(projectId, itemIndex, isCompleted);
  if (!updated) {
    showToast('Could not update the checklist item.', 'error');
    e.target.checked = !isCompleted;
    return;
  }

  // Update UI immediately
  const listItem = e.target.closest('.checklist-item');
  if (isCompleted) {
    listItem.classList.add('completed');
  } else {
    listItem.classList.remove('completed');
  }

  // Refresh KPIs
  await renderKPICards(currentState);
}

// ===== FORM =====
function buildFormHTML(stateId) {
  const hasSuggestions = LOCATION_SUGGESTIONS[stateId];
  
  return `
    <form id="intake-form" novalidate>
      <!-- State (Read-Only) -->
      <div class="form-group">
        <label for="form-state">State Location</label>
        <input type="text" id="form-state" class="form-input" value="${escapeHtml(stateId)}" readonly />
      </div>

      <!-- Specific Location -->
      <div class="form-group">
        <label for="form-location">Specific Location</label>
        <div class="form-input-with-suggestions" style="position: relative;">
          <input 
            type="text" 
            id="form-location" 
            class="form-input" 
            placeholder="${hasSuggestions ? 'Type or select a location...' : 'Enter location name'}"
            autocomplete="off"
          />
          ${hasSuggestions ? `
            <div class="suggestion-dropdown" id="location-suggestions">
              ${LOCATION_SUGGESTIONS[stateId].map(loc => `
                <div class="suggestion-item" data-value="${escapeHtml(loc)}">${escapeHtml(loc)}</div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Project Name -->
      <div class="form-group">
        <label for="form-project-name">Project Name <span style="color: var(--danger);">*</span></label>
        <input type="text" id="form-project-name" class="form-input" placeholder="e.g., NCPT Boiler Feed System" required />
      </div>

      <!-- Machine Type -->
      <div class="form-group">
        <label>Machine Type</label>
        <div class="toggle-group" id="machine-type-toggle">
          <button type="button" class="toggle-option active" data-value="Powerpack">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -3px;"><rect x="1" y="6" width="22" height="12" rx="2"/><path d="M6 6V4M18 6V4M6 18v2M18 18v2"/></svg>
            Powerpack
          </button>
          <button type="button" class="toggle-option" data-value="Motor">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -3px;"><circle cx="12" cy="12" r="10"/><path d="M14.31 8l5.74 9.94M9.69 8h11.48M7.38 12l5.74-9.94M9.69 16L3.95 6.06M14.31 16H2.83M16.62 12l-5.74 9.94"/></svg>
            Motor
          </button>
        </div>
      </div>

      <!-- Application Type -->
      <div class="form-group">
        <label for="form-application">Application Type</label>
        <input type="text" id="form-application" class="form-input" placeholder="e.g., Boiler Feed Pump" />
      </div>

      <!-- Status -->
      <div class="form-group">
        <label>System Status</label>
        <div class="toggle-group" id="status-toggle">
          <button type="button" class="toggle-option active" data-value="Standby">
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:var(--status-standby); margin-right:4px; vertical-align:1px;"></span>
            Standby
          </button>
          <button type="button" class="toggle-option" data-value="Live">
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:var(--status-live); margin-right:4px; vertical-align:1px;"></span>
            Live
          </button>
        </div>
      </div>

      <!-- Delivered Materials -->
      <div class="form-group">
        <label>Delivered Materials</label>
        <div class="chip-input-group">
          <input type="text" id="form-material-input" class="form-input" placeholder="e.g., Hydraulic Power Unit" />
          <button type="button" id="btn-add-material" class="btn btn-add btn-sm">Add Tag</button>
        </div>
        <div class="chip-container" id="materials-chips"></div>
      </div>

      <!-- Requirements -->
      <div class="form-group">
        <label for="form-requirements">General Requirements / Comments</label>
        <textarea id="form-requirements" class="form-input" placeholder="Notes, special requirements, timelines..."></textarea>
      </div>

      <!-- Pending Items Builder -->
      <div class="form-group">
        <label>Pending Task Checklist</label>
        <div class="chip-input-group">
          <input type="text" id="form-pending-input" class="form-input" placeholder="e.g., Calibrate pressure gauge" />
          <button type="button" id="btn-add-pending" class="btn btn-add btn-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
        <div class="staging-list" id="pending-staging"></div>
      </div>

      <div class="divider"></div>

      <!-- Submit -->
      <button type="submit" class="btn btn-primary btn-submit" id="btn-submit">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
        Commit New Record
      </button>
    </form>
  `;
}

function attachFormHandlers(stateId) {
  const form = document.getElementById('intake-form');
  
  // ---- Toggle Groups ----
  document.querySelectorAll('.toggle-group').forEach(group => {
    group.querySelectorAll('.toggle-option').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.toggle-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  });

  // ---- Location Suggestions ----
  const locationInput = document.getElementById('form-location');
  const suggestionsDropdown = document.getElementById('location-suggestions');
  
  if (suggestionsDropdown) {
    locationInput.addEventListener('focus', () => {
      suggestionsDropdown.classList.add('show');
    });

    locationInput.addEventListener('input', () => {
      const val = locationInput.value.toLowerCase();
      suggestionsDropdown.querySelectorAll('.suggestion-item').forEach(item => {
        const match = item.dataset.value.toLowerCase().includes(val);
        item.style.display = match ? 'block' : 'none';
      });
      suggestionsDropdown.classList.add('show');
    });

    suggestionsDropdown.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        locationInput.value = item.dataset.value;
        suggestionsDropdown.classList.remove('show');
      });
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.form-input-with-suggestions')) {
        suggestionsDropdown.classList.remove('show');
      }
    });
  }

  // ---- Material Tags ----
  const materialInput = document.getElementById('form-material-input');
  const addMaterialBtn = document.getElementById('btn-add-material');
  const materialsContainer = document.getElementById('materials-chips');

  function addMaterial() {
    const val = materialInput.value.trim();
    if (!val) return;
    formMaterials.push(val);
    materialInput.value = '';
    renderMaterialChips();
    materialInput.focus();
  }

  addMaterialBtn.addEventListener('click', addMaterial);
  materialInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addMaterial(); }
  });

  function renderMaterialChips() {
    materialsContainer.innerHTML = formMaterials.map((mat, i) => `
      <span class="chip">
        ${escapeHtml(mat)}
        <button type="button" class="chip-remove" data-index="${i}" title="Remove">&times;</button>
      </span>
    `).join('');
    
    materialsContainer.querySelectorAll('.chip-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        formMaterials.splice(parseInt(btn.dataset.index), 1);
        renderMaterialChips();
      });
    });
  }

  // ---- Pending Items Staging ----
  const pendingInput = document.getElementById('form-pending-input');
  const addPendingBtn = document.getElementById('btn-add-pending');
  const pendingStaging = document.getElementById('pending-staging');

  function addPendingItem() {
    const val = pendingInput.value.trim();
    if (!val) return;
    formPendingItems.push({ item: val, isCompleted: false });
    pendingInput.value = '';
    renderPendingStaging();
    pendingInput.focus();
  }

  addPendingBtn.addEventListener('click', addPendingItem);
  pendingInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addPendingItem(); }
  });

  function renderPendingStaging() {
    if (formPendingItems.length === 0) {
      pendingStaging.innerHTML = '';
      return;
    }
    pendingStaging.innerHTML = formPendingItems.map((item, i) => `
      <div class="staging-item">
        <span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" style="vertical-align: -2px; margin-right: 6px;"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
          ${escapeHtml(item.item)}
        </span>
        <button type="button" class="remove-btn" data-index="${i}" title="Remove">&times;</button>
      </div>
    `).join('');

    pendingStaging.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        formPendingItems.splice(parseInt(btn.dataset.index), 1);
        renderPendingStaging();
      });
    });
  }

  // Clear validation styling when typing
  const projectNameInput = document.getElementById('form-project-name');
  // locationInput is already declared above on line 362

  projectNameInput.addEventListener('input', (e) => {
    e.target.classList.remove('invalid');
    e.target.parentNode.querySelector('.error-message')?.remove();
  });

  locationInput.addEventListener('input', (e) => {
    e.target.classList.remove('invalid');
    e.target.parentNode.querySelector('.error-message')?.remove();
  });

  // ---- Form Submission ----
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const projectName = projectNameInput.value.trim();
    const location = locationInput.value.trim();

    // Clear previous errors
    form.querySelectorAll('.error-message').forEach(el => el.remove());
    form.querySelectorAll('.form-input').forEach(el => el.classList.remove('invalid'));

    let isValid = true;

    // Inline Validation
    if (!projectName) {
      isValid = false;
      projectNameInput.classList.add('invalid');
      const errMsg = document.createElement('span');
      errMsg.className = 'error-message';
      errMsg.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Project Name is required.
      `;
      projectNameInput.parentNode.appendChild(errMsg);
    }

    if (!location) {
      isValid = false;
      locationInput.classList.add('invalid');
      const errMsg = document.createElement('span');
      errMsg.className = 'error-message';
      errMsg.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Specific Location is required.
      `;
      locationInput.parentNode.appendChild(errMsg);
    }

    if (!isValid) {
      showToast('Please correct the highlighted errors before submitting.', 'error');
      form.querySelector('.form-input.invalid')?.focus();
      return;
    }

    // Gather toggle values
    const machineType = document.querySelector('#machine-type-toggle .toggle-option.active')?.dataset.value || 'Powerpack';
    const status = document.querySelector('#status-toggle .toggle-option.active')?.dataset.value || 'Standby';

    const payload = {
      state: stateId,
      location,
      projectName,
      machineType,
      applicationType: document.getElementById('form-application').value.trim(),
      status,
      deliveredMaterials: [...formMaterials],
      requirements: document.getElementById('form-requirements').value.trim(),
      pendingItems: formPendingItems.map(item => ({ ...item }))
    };

    // Save
    await addProject(payload);

    // Reset form
    formMaterials = [];
    formPendingItems = [];
    form.reset();
    document.getElementById('form-state').value = stateId;
    document.getElementById('materials-chips').innerHTML = '';
    document.getElementById('pending-staging').innerHTML = '';
    
    // Reset toggles to defaults
    document.querySelectorAll('#machine-type-toggle .toggle-option').forEach((btn, i) => {
      btn.classList.toggle('active', i === 0);
    });
    document.querySelectorAll('#status-toggle .toggle-option').forEach((btn, i) => {
      btn.classList.toggle('active', i === 0);
    });

    // Success feedback
    showToast('New installation record committed successfully!', 'success');

    // Refresh data views
    await renderKPICards(stateId);
    await renderProjectList(stateId);

    // Scroll to top of project list
    document.querySelector('.column-a')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

async function handleDeleteProjectClick(e) {
  const btn = e.currentTarget;
  const projectId = btn.dataset.projectId;
  const projectName = btn.closest('.project-card').querySelector('h3').textContent;
  
  if (confirm(`Are you sure you want to delete the installation record for "${projectName}"?`)) {
    if (await deleteProject(projectId)) {
      showToast(`Project "${projectName}" deleted successfully.`, 'success');
      await renderKPICards(currentState);
      await renderProjectList(currentState);
    } else {
      showToast('Project could not be found. Refreshing the registry.', 'error');
      await renderProjectList(currentState);
    }
  }
}
