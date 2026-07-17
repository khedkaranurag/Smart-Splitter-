/**
 * SplitSmart — api.js
 * Centralized API client with JWT auth, WebSocket manager, and helpers.
 */

const API_BASE = 'http://localhost:8080/api';
const WS_URL = 'http://localhost:8080/ws';

// ─── Storage Helpers ──────────────────────────────────────────────────────────
const Auth = {
  save(data) {
    localStorage.setItem('ss_token', data.token);
    localStorage.setItem('ss_user', JSON.stringify({
      id: data.userId, name: data.name,
      email: data.email, avatarColor: data.avatarColor
    }));
  },
  token() { return localStorage.getItem('ss_token'); },
  user() { const u = localStorage.getItem('ss_user'); return u ? JSON.parse(u) : null; },
  isLoggedIn() { return !!this.token() && !!this.user(); },
  logout() { localStorage.removeItem('ss_token'); localStorage.removeItem('ss_user'); }
};

// ─── Core Fetch Wrapper ────────────────────────────────────────────────────────
async function apiFetch(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = Auth.token();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  let data;
  try { data = await res.json(); } catch { data = null; }

  if (!res.ok) {
    const msg = data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

const api = {
  get: (path) => apiFetch('GET', path),
  post: (path, body) => apiFetch('POST', path, body),
  delete: (path) => apiFetch('DELETE', path),
};

// ─── Auth API ─────────────────────────────────────────────────────────────────
const AuthAPI = {
  register: (body) => api.post('/auth/register', body),
  login: (body) => api.post('/auth/login', body),
};

// ─── Groups API ───────────────────────────────────────────────────────────────
const GroupsAPI = {
  create: (body) => api.post('/groups', body),
  list: () => api.get('/groups'),
  get: (id) => api.get(`/groups/${id}`),
  invite: (id, email) => api.post(`/groups/${id}/invite`, { email }),
  balances: (id) => api.get(`/groups/${id}/balances`),
};

// ─── Expenses API ─────────────────────────────────────────────────────────────
const ExpensesAPI = {
  add: (body) => api.post('/expenses', body),
  list: (gid) => api.get(`/expenses/group/${gid}`),
};

// ─── Settlement API ───────────────────────────────────────────────────────────
const SettleAPI = {
  compute: (gid) => api.get(`/settle/${gid}`),
  confirm: (gid) => api.post(`/settle/${gid}/confirm`),
};

// ─── WebSocket Manager (STOMP over SockJS) ────────────────────────────────────
const WS = {
  client: null,
  subs: {},

  connect(onConnect) {
    if (this.client?.connected) { onConnect?.(); return; }
    const socket = new SockJS(WS_URL);
    this.client = Stomp.over(socket);
    this.client.debug = () => { };
    this.client.connect({}, () => {
      console.log('[WS] Connected');
      onConnect?.();
    }, (err) => {
      console.warn('[WS] Error:', err);
    });
  },

  subscribe(topic, callback) {
    if (!this.client?.connected) {
      console.warn('[WS] Not connected, buffering subscription for', topic);
      return;
    }
    if (this.subs[topic]) this.subs[topic].unsubscribe();
    this.subs[topic] = this.client.subscribe(topic, (msg) => {
      try { callback(JSON.parse(msg.body)); }
      catch (e) { callback(msg.body); }
    });
    return this.subs[topic];
  },

  unsubscribe(topic) {
    if (this.subs[topic]) {
      this.subs[topic].unsubscribe();
      delete this.subs[topic];
    }
  },

  disconnect() {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
      this.subs = {};
    }
  }
};

// ─── UI Helpers ───────────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; }, 3000);
  setTimeout(() => toast.remove(), 3400);
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function renderAvatar(name, color, size = '') {
  return `<div class="avatar ${size}" style="background:${color || '#7c3aed'}">${getInitials(name)}</div>`;
}

function formatAmount(amount) {
  return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString('en-IN');
}

function setLoading(btn, loading) {
  if (loading) btn.classList.add('loading');
  else btn.classList.remove('loading');
}

function requireAuth() {
  if (!Auth.isLoggedIn()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

function groupTypeIcon(type) {
  const icons = { ROOMMATES: '🏠', TRIP: '✈️', FRIENDS: '👥', CUSTOM: '➕' };
  return icons[type] || '📋';
}

function groupTypeBadge(type) {
  const classes = { ROOMMATES: 'badge-teal', TRIP: 'badge-purple', FRIENDS: 'badge-green', CUSTOM: 'badge-amber' };
  return `<span class="badge ${classes[type] || 'badge-purple'}">${type}</span>`;
}

function getUrlParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}