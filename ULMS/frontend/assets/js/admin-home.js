// assets/js/home-admin-pro.js
// YÊU CẦU: đã có apiGet helper (./api.js). Nếu tên/đường dẫn khác, thay import bên dưới.
import { apiGet } from './api.js';

const PIN_KEY = 'homeAdminPins';
const NOTE_KEY = 'homeAdminNote';
const LAST_LOGIN_KEY = 'lastLoginAt';

const PAGES = [
  { id: 'addBook', label: 'Thêm sách', href: 'books-admin.html', icon: 'bi-plus-circle' },
  { id: 'holds', label: 'Duyệt holds', href: 'holds-admin.html', icon: 'bi-bell' },
  { id: 'users', label: 'Quản lý user', href: 'users-admin.html', icon: 'bi-people' },
  { id: 'overdue', label: 'Thu phạt', href: 'overdue-admin.html', icon: 'bi-cash-coin' },
  { id: 'authors', label: 'Tác giả', href: 'authors-admin.html', icon: 'bi-person-vcard' },
  { id: 'cats', label: 'Danh mục', href: 'categories-admin.html', icon: 'bi-tags' },
  { id: 'setting', label: 'Cài đặt', href: 'settings.html', icon: 'bi-gear' },
  { id: 'dash', label: 'Dashboard', href: 'admin-dashboard.html', icon: 'bi-speedometer2' },
];

const SEARCH_ROUTE_BY_TYPE = {
  book: (item) =>
    `books-admin.html?q=${encodeURIComponent(item.title || item.name || item.q || '')}`,
  author: (item) => `authors-admin.html?q=${encodeURIComponent(item.name || item.q || '')}`,
  user: (item) =>
    `users-admin.html?q=${encodeURIComponent(item.name || item.email || item.q || '')}`,
  hold: () => `holds-admin.html?status=pending`,
  loan: (item) =>
    `overdue-admin.html?q=${encodeURIComponent(item.book || item.user || item.q || '')}`,
  // fallback
  any: (item) => `admin-dashboard.html?q=${encodeURIComponent(item.q || '')}`,
};

function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function toast(title, body) {
  const area = document.getElementById('toastArea');
  const id = `t${Date.now()}`;
  area.insertAdjacentHTML(
    'beforeend',
    `
    <div id="${id}" class="toast text-bg-dark border-0" role="alert" data-bs-delay="2200">
      <div class="d-flex"><div class="toast-body">
        <strong>${esc(title)}</strong><div class="small opacity-75">${esc(body)}</div>
      </div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>
    </div>`,
  );
  new bootstrap.Toast(document.getElementById(id)).show();
}

/* ===================== Identity ===================== */
function fillIdentity() {
  const u = JSON.parse(localStorage.getItem('user') || 'null');
  document.getElementById('adminName').textContent = u?.name || u?.fullName || 'Admin';
  document.getElementById('roleBadge').textContent = u?.role || 'admin';

  const last = localStorage.getItem(LAST_LOGIN_KEY);
  if (!document.getElementById('lastLogin')) return; // có thể không dùng
  document.getElementById('lastLogin').textContent = last ? new Date(last).toLocaleString() : '—';
}

/* ===================== Omni Search ===================== */
/** Bạn có thể đổi endpoint search tuỳ backend:
 *  - Gợi ý: GET /api/search?q=... trả về mảng [{type:'book'|'user'|'author'|'hold'|'loan', title/name, ...}, ...]
 *  - Nếu chưa có API, mình vẫn xử lý local route match (theo nhãn trang)
 */
async function fetchSearch(q) {
  try {
    // nếu bạn chưa có API search, tạm trả kết quả theo label
    if (!q) return [];
    const res = await apiGet(`/api/search?q=${encodeURIComponent(q)}&limit=8`);
    if (Array.isArray(res?.items)) return res.items;
    return [];
  } catch {
    // fallback: match pages
    const low = q.toLowerCase();
    return PAGES.filter((p) => p.label.toLowerCase().includes(low))
      .slice(0, 6)
      .map((p) => ({ type: 'any', q, title: p.label, page: p.href, icon: p.icon }));
  }
}

function renderSearch(results) {
  const pop = document.getElementById('resultPop');
  pop.innerHTML = '';
  if (!results.length) {
    pop.innerHTML = `<div class="result-empty">Không tìm thấy. Thử: <em>book: clean code</em>, <em>user: alice</em></div>`;
    return;
  }
  for (const r of results) {
    const icon =
      r.icon ||
      (r.type === 'book'
        ? 'bi-book'
        : r.type === 'author'
          ? 'bi-person'
          : r.type === 'user'
            ? 'bi-person-badge'
            : r.type === 'hold'
              ? 'bi-bell'
              : r.type === 'loan'
                ? 'bi-arrow-left-right'
                : 'bi-search');
    const main = r.title || r.name || r.q || '(untitled)';
    const sub = r.subtitle || r.email || r.isbn || r.book || r.user || '';
    pop.insertAdjacentHTML(
      'beforeend',
      `
      <div class="result-item" data-type="${esc(r.type || 'any')}" data-main="${esc(main)}" data-json='${esc(JSON.stringify(r))}'>
        <i class="bi ${icon}"></i>
        <div class="flex-grow-1">
          <div class="fw-semibold">${esc(main)}</div>
          ${sub ? `<div class="small text-muted">${esc(sub)}</div>` : ''}
        </div>
        <span class="badge badge-soft text-uppercase">${esc(r.type || 'any')}</span>
      </div>
    `,
    );
  }
}

function openSearchTarget(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = { q: raw, type: 'any' };
  }
  const type = data.type || 'any';
  const route = SEARCH_ROUTE_BY_TYPE[type] || SEARCH_ROUTE_BY_TYPE.any;
  const to = data.page || route(data);
  location.href = to;
}

function bindOmni() {
  const input = document.getElementById('omni');
  const pop = document.getElementById('resultPop');

  const doQuery = async () => {
    const q = input.value.trim();
    if (!q) {
      pop.classList.add('d-none');
      return;
    }
    pop.classList.remove('d-none');
    pop.innerHTML = `<div class="result-empty">Đang gợi ý…</div>`;
    const items = await fetchSearch(q);
    renderSearch(items);
  };

  // live search (debounce)
  let timer = 0;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(doQuery, 220);
  });

  // enter to open first
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const first = pop.querySelector('.result-item');
      if (first) {
        openSearchTarget(first.getAttribute('data-json'));
      } else if (input.value.trim()) {
        openSearchTarget(JSON.stringify({ type: 'any', q: input.value.trim() }));
      }
    }
  });

  // global shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== input) {
      e.preventDefault();
      input.focus();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      input.focus();
    }
  });

  // click result
  pop.addEventListener('click', (e) => {
    const item = e.target.closest('.result-item');
    if (!item) return;
    openSearchTarget(item.getAttribute('data-json'));
  });

  // close when click outside
  document.addEventListener('click', (e) => {
    if (!pop.contains(e.target) && e.target !== input) pop.classList.add('d-none');
  });
}

/* ===================== Pins ===================== */
function readPins() {
  return JSON.parse(localStorage.getItem(PIN_KEY) || '[]');
}
function writePins(pins) {
  localStorage.setItem(PIN_KEY, JSON.stringify(pins));
}

function renderPins() {
  const grid = document.getElementById('pinGrid');
  const pins = readPins();
  grid.innerHTML = '';

  if (!pins.length) {
    grid.innerHTML = `<div class="col-12 text-muted small">Chưa có lối tắt. Nhấn nút ghim ở góc trên để thêm.</div>`;
    return;
  }

  pins.forEach((pid, idx) => {
    const item = PAGES.find((p) => p.id === pid);
    if (!item) return;
    grid.insertAdjacentHTML(
      'beforeend',
      `
      <div class="col-12 col-sm-6">
        <div class="pin-tile" data-go="${esc(item.href)}" title="Mở ${esc(item.label)}">
          <div class="pin-icon"><i class="bi ${item.icon}"></i></div>
          <div class="flex-grow-1">
            <div class="fw-semibold">${esc(item.label)}</div>
            <div class="small text-muted">${esc(item.href)}</div>
          </div>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-secondary" data-up="${idx}" title="Lên"><i class="bi bi-arrow-up"></i></button>
            <button class="btn btn-outline-secondary" data-down="${idx}" title="Xuống"><i class="bi bi-arrow-down"></i></button>
            <button class="btn btn-outline-danger" data-unpin="${esc(item.id)}" title="Bỏ ghim"><i class="bi bi-x-lg"></i></button>
          </div>
        </div>
      </div>
    `,
    );
  });
}

function bindPins() {
  // modal choices
  const modalEl = document.getElementById('pinModal');
  const modal = new bootstrap.Modal(modalEl);
  const choices = document.getElementById('pinChoices');
  const btnAddPin = document.getElementById('btnAddPin');
  const btnModalAddPins = document.getElementById('btnModalAddPins');

  const openPinModal = () => {
    const pins = new Set(readPins());
    choices.innerHTML = '';
    PAGES.forEach((p) => {
      choices.insertAdjacentHTML(
        'beforeend',
        `
        <label class="list-group-item d-flex align-items-center gap-2">
          <input class="form-check-input me-1" type="checkbox" value="${esc(p.id)}" ${pins.has(p.id) ? 'checked' : ''}>
          <i class="bi ${p.icon}"></i>
          <div class="ms-1">
            <div class="fw-semibold">${esc(p.label)}</div>
            <div class="small text-muted">${esc(p.href)}</div>
          </div>
        </label>
      `,
      );
    });
    modal.show();
  };

  btnAddPin.addEventListener('click', openPinModal);

  btnModalAddPins.addEventListener('click', () => {
    const checked = [...choices.querySelectorAll('input[type="checkbox"]:checked')].map(
      (i) => i.value,
    );
    writePins(checked);
    renderPins();
    modal.hide();
  });

  document.getElementById('btnClearPins').addEventListener('click', () => {
    writePins([]);
    renderPins();
  });

  document.getElementById('btnReorderPins').addEventListener('click', () => {
    toast('Gợi ý', 'Dùng mũi tên ↑/↓ trên từng lối tắt để sắp xếp.');
  });

  document.getElementById('pinGrid').addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]');
    const un = e.target.closest('[data-unpin]');
    const up = e.target.closest('[data-up]');
    const down = e.target.closest('[data-down]');
    if (un) {
      const id = un.getAttribute('data-unpin');
      writePins(readPins().filter((x) => x !== id));
      renderPins();
      return;
    }
    if (up || down) {
      const idx = Number((up || down).getAttribute(`data-${up ? 'up' : 'down'}`));
      const arr = readPins();
      const swapWith = up ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= arr.length) return;
      [arr[idx], arr[swapWith]] = [arr[swapWith], arr[idx]];
      writePins(arr);
      renderPins();
      return;
    }
    if (go) location.href = go.getAttribute('data-go');
  });
}

/* ===================== Activity Feed ===================== */
/** Đổi endpoint phù hợp backend của bạn:
 *  - Gợi ý: GET /api/admin/activity?limit=10
 *  - Trả về: [{type:'borrow'|'hold'|'overdue'|'book'|'user', text:'...', time:'2025-10-29T...'}]
 */
async function loadActivity() {
  const box = document.getElementById('activityList');
  box.innerHTML = `<div class="text-muted small">Đang tải hoạt động…</div>`;
  try {
    const res = await apiGet('/api/admin/activity?limit=10');
    const items = Array.isArray(res?.items) ? res.items : [];
    if (!items.length) {
      box.innerHTML = `<div class="text-muted small">Chưa có hoạt động gần đây.</div>`;
      return;
    }

    box.innerHTML = '';
    items.forEach((it) => {
      const icon =
        it.type === 'borrow'
          ? 'bi-arrow-down-circle'
          : it.type === 'return'
            ? 'bi-arrow-up-circle'
            : it.type === 'overdue'
              ? 'bi-exclamation-octagon'
              : it.type === 'hold'
                ? 'bi-bell'
                : it.type === 'book'
                  ? 'bi-book'
                  : it.type === 'user'
                    ? 'bi-person'
                    : 'bi-activity';
      const when = it.time ? timeAgo(it.time) : '';
      box.insertAdjacentHTML(
        'beforeend',
        `
        <div class="timeline-item mb-2">
          <div class="d-flex justify-content-between">
            <div><i class="bi ${icon} me-1"></i>${esc(it.text || '')}</div>
            <span class="text-muted small">${esc(when)}</span>
          </div>
        </div>
      `,
      );
    });
  } catch (e) {
    console.error(e);
    box.innerHTML = `<div class="text-danger small">Không tải được hoạt động.</div>`;
  }
}
function timeAgo(iso) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return `${Math.max(1, Math.floor(diff))}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString();
}

/* ===================== Notes ===================== */
function bindNotes() {
  const area = document.getElementById('noteArea');
  const btn = document.getElementById('btnSaveNote');
  area.value = localStorage.getItem(NOTE_KEY) || '';
  btn.addEventListener('click', () => {
    localStorage.setItem(NOTE_KEY, area.value);
    toast('Notes', 'Đã lưu ghi chú.');
  });
}

/* ===================== Health ===================== */
async function refreshHealth() {
  const set = (id, v) => (document.getElementById(id).textContent = v);
  try {
    const t0 = performance.now();
    const res = await apiGet('/api/_health'); // đổi endpoint health nếu khác
    const t1 = performance.now();
    set('sysApi', res?.ok ? 'OK' : 'Degraded');
    set('sysDb', res?.db || 'Unknown');
    set('sysAuth', res?.auth || 'Unknown');
    set('sysLatency', Math.round(t1 - t0));
  } catch (e) {
    set('sysApi', 'Down');
    set('sysDb', 'Unknown');
    set('sysAuth', 'Unknown');
    set('sysLatency', '—');
  }
}

/* ===================== Init ===================== */
export async function initHomeAdminPro() {
  fillIdentity();
  bindOmni();
  bindPins();
  renderPins();
  bindNotes();
  await loadActivity();
  await refreshHealth();
  document.getElementById('btnHealth').addEventListener('click', refreshHealth);
}
initHomeAdminPro().catch(console.error);
