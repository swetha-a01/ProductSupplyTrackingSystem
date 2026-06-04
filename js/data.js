// Active states that are clickable on the map
export const ACTIVE_STATES = [
  'Tamil Nadu',
  'Andhra Pradesh',
  'Telangana',
  'Maharashtra',
  'Madhya Pradesh',
  'Gujarat',
  'Delhi',
  'Odisha',
  'Chhattisgarh',
  'Jharkhand',
  'Uttarakhand',
  'Punjab'
];

// Location suggestions for specific states
export const LOCATION_SUGGESTIONS = {
  'Tamil Nadu': [
    'North Chennai Power Terminal',
    'Ennur Power Terminals',
    'Neiveli Power Terminal',
    'Thuthukudi'
  ],
  'Maharashtra': [
    'Nagpur'
  ],
  'Andhra Pradesh': [
    'Visakhapatnam Port Terminal',
    'Nellore Power Terminal',
    'Vijayawada Pump Station'
  ],
  'Telangana': [
    'Ramagundam Power Plant',
    'Kothagudem Thermal Station',
    'Hyderabad Logistics Hub'
  ],
  'Madhya Pradesh': [
    'Bhopal Industrial Hub',
    'Singrauli Power Station',
    'Indore Logistics Terminal'
  ],
  'Gujarat': [
    'Mundra Port Terminal',
    'Hazira Industrial Hub',
    'Dahej Petrochemical Complex'
  ],
  'Delhi': [
    'Pragati Power Station',
    'Indraprastha Gas Terminal',
    'Okhla Industrial Area'
  ],
  'Odisha': [
    'Paradip Refinery Station',
    'Talcher Coal Terminal',
    'Kalinganagar Steel Plant'
  ],
  'Chhattisgarh': [
    'Bhilai Steel Plant Station',
    'Korba Thermal Power',
    'Raipur Cargo Hub'
  ],
  'Jharkhand': [
    'Jamshedpur Steel Terminal',
    'Bokaro Power Station',
    'Dhanbad Coal Depot'
  ],
  'Uttarakhand': [
    'Dehradun Terminal',
    'Rishikesh Hydro Station',
    'Haridwar Industrial Area'
  ],
  'Punjab': [
    'Bathinda Thermal Station',
    'Ludhiana Logistics Center',
    'Amritsar Cargo Hub'
  ]
};

// Map state names to SVG element IDs (from @svg-maps/india package)
export const STATE_ID_MAP = {
  'Tamil Nadu': 'tn',
  'Andhra Pradesh': 'ap',
  'Telangana': 'tg',
  'Maharashtra': 'mh',
  'Madhya Pradesh': 'mp',
  'Gujarat': 'gj',
  'Delhi': 'dl',
  'Odisha': 'or',
  'Chhattisgarh': 'ct',
  'Jharkhand': 'jh',
  'Uttarakhand': 'uk',
  'Punjab': 'pb',
  'Karnataka': 'ka',
  'Kerala': 'kl',
  'West Bengal': 'wb',
  'Rajasthan': 'rj',
  'Uttar Pradesh': 'up',
  'Bihar': 'br',
  'Assam': 'as',
  'Arunachal Pradesh': 'ar',
  'Meghalaya': 'ml',
  'Manipur': 'mn',
  'Mizoram': 'mz',
  'Tripura': 'tr',
  'Nagaland': 'nl',
  'Sikkim': 'sk',
  'Himachal Pradesh': 'hp',
  'Haryana': 'hr',
  'Jammu and Kashmir': 'jk',
  'Ladakh': 'la',
  'Goa': 'ga',
  'Chandigarh': 'ch',
  'Puducherry': 'py',
  'Andaman and Nicobar Islands': 'an',
  'Dadra and Nagar Haveli': 'dn',
  'Daman and Diu': 'dd',
  'Lakshadweep': 'ld'
};

// Reverse map: SVG ID to state name
export const ID_STATE_MAP = Object.fromEntries(
  Object.entries(STATE_ID_MAP).map(([name, id]) => [id, name])
);

const API_BASE = './api/projects';

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }
  return data;
}

// Get all projects from SQLite through the API
export async function getAllProjects() {
  return requestJson(API_BASE);
}

// Get projects filtered by state
export async function getProjectsByState(stateName) {
  const params = new URLSearchParams({ state: stateName });
  return requestJson(`${API_BASE}?${params.toString()}`);
}

// Add a new project
export async function addProject(payload) {
  return requestJson(API_BASE, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

// Update a specific pending item's completion status
export async function updatePendingItem(projectId, itemIndex, isCompleted) {
  const result = await requestJson(`${API_BASE}/${encodeURIComponent(projectId)}/pending/${itemIndex}`, {
    method: 'PATCH',
    body: JSON.stringify({ isCompleted })
  });
  return Boolean(result?.success);
}

// Delete a project
export async function deleteProject(projectId) {
  const result = await requestJson(`${API_BASE}/${encodeURIComponent(projectId)}`, {
    method: 'DELETE'
  });
  return Boolean(result?.success);
}

// Compute KPI metrics for a given state
export async function getKPIMetrics(stateName) {
  const projects = await getProjectsByState(stateName);
  const totalProjects = projects.length;
  const liveCount = projects.filter(p => p.status === 'Live').length;
  const standbyCount = projects.filter(p => p.status === 'Standby').length;
  const pendingTasks = projects.reduce((sum, p) => {
    return sum + (p.pendingItems || []).filter(item => !item.isCompleted).length;
  }, 0);
  
  return { totalProjects, liveCount, standbyCount, pendingTasks };
}

// Kept as a no-op so existing app startup stays clean.
export function seedDemoData() {
  return false;
}
