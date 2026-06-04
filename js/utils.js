// Generate a unique ID (timestamp + random)
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Escape HTML to prevent XSS
export function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Format ISO date to readable format
export function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const options = { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return date.toLocaleDateString('en-IN', options);
}

// Show toast notification
// type can be 'success' or 'error'
export function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = type === 'success' ? '&check;' : '&times;';
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Auto dismiss after 3 seconds
  setTimeout(() => {
    toast.classList.add('hide');
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
      // Clean up container if empty
      if (container && container.children.length === 0) {
        container.remove();
      }
    }, 300);
  }, 3000);
}
