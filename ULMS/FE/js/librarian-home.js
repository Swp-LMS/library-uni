// assets/js/librarian-home.js
import { BASE_URL } from './api.js';

function headers() {
  const h = { 'Content-Type': 'application/json' };
  const t = localStorage.getItem('token');
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}

async function get(path) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: headers() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function guardRole() {
  const userRaw = localStorage.getItem('user');
  if (!userRaw) {
    location.href = 'login.html?next=librarian-home.html';
    return null;
  }
  try {
    const u = JSON.parse(userRaw);
    if (!['librarian', 'admin'].includes(u.role)) {
      location.href = 'index.html';
      return null;
    }
    return u;
  } catch {
    location.href = 'login.html';
    return null;
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? '—';
}

function addNotify(text) {
  const list = document.getElementById('notifyList');
  if (!list) return;
  const item = document.createElement('a');
  item.className = 'list-group-item list-group-item-action';
  item.href = '#';
  item.textContent = text;
  list.appendChild(item);
}

async function loadOverview() {
  try {
    const data = await get('/librarian/today');
    setText('dueToday', data.dueToday);
    setText('holdsToProcess', data.holdsToProcess);
    setText('pendingFines', data.pendingFines);
    (data.notifications || []).slice(0, 5).forEach((n) => addNotify(n));
  } catch (e) {
    console.error(e);
    addNotify('Không thể tải dữ liệu hôm nay. Hãy cấu hình API /librarian/today.');
  }
}

export function initLibrarianHome() {
  const user = guardRole();
  if (!user) return;
  loadOverview();
}
