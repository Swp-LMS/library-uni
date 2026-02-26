// frontend/assets/js/admin-dashboard.js
import { apiGet, apiPatch } from './api.js';

/* ================= helpers ================= */
function guardRole() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!token || !user || !['admin', 'librarian'].includes(user.role)) {
    location.href = 'login.html';
  }
}

const esc = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function toast(title, body) {
  const area = document.getElementById('toastArea');
  if (!area) return;
  const id = `t${Date.now()}`;
  area.insertAdjacentHTML(
    'beforeend',
    `
    <div id="${id}" class="toast text-bg-dark border-0" role="alert" data-bs-delay="2400">
      <div class="d-flex">
        <div class="toast-body"><strong>${esc(title)}:</strong> ${esc(body)}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>`,
  );
  const el = document.getElementById(id);
  if (!el) return;
  bootstrap.Toast.getOrCreateInstance(el).show();
  el.addEventListener('hidden.bs.toast', () => el.remove());
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function toISODate(d) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const dd = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`; // 'YYYY-MM-DD' theo local time
}

function fmtDate(d) {
  if (!d) return '';
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  return x.toLocaleDateString('vi-VN');
}

function isNotFound(e) {
  try {
    const o = JSON.parse(e?.message || '');
    return o?.message?.toLowerCase?.().includes('route not found') || false;
  } catch {
    return false;
  }
}

/* ================= chart helpers ================= */
/* ================= chart helpers ================= */
function drawBars(canvasId, values = []) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  console.log(`[drawBars] Drawing chart with ${values.length} values:`, values);

  // Đảm bảo canvas có kích thước hợp lệ
  let cssW = canvas.clientWidth;
  if (!cssW || cssW === 0) {
    const rect = canvas.getBoundingClientRect();
    cssW = rect.width;

    if (!cssW || cssW === 0) {
      const parent = canvas.parentElement;
      if (parent) {
        cssW = parent.clientWidth || parent.getBoundingClientRect().width;
      }
    }

    if (!cssW || cssW === 0) {
      cssW = 600;
      console.warn('[drawBars] Using fallback width:', cssW);
    }
  }

  const cssH = Number(canvas.getAttribute('height') || 140);
  const dpr = window.devicePixelRatio || 1;

  // Canvas thật = kích thước * devicePixelRatio
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.warn('[drawBars] 2D context not available');
    return;
  }

  // scale theo DPR
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const W = cssW;
  const H = cssH;

  ctx.clearRect(0, 0, W, H);

  const n = values.length;
  if (!n) return; // không có dữ liệu thì thôi

  const normalized = values.map((v) => Math.max(0, Number(v) || 0));
  const maxVal = Math.max(1, ...normalized);
  const cellW = W / n;

  // Trục đáy
  const baseY = H - 22;
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, baseY + 0.5);
  ctx.lineTo(W, baseY + 0.5);
  ctx.stroke();

  // Lấy màu từ CSS variable
  const root = getComputedStyle(document.documentElement);
  const c1 = root.getPropertyValue('--hero-to')?.trim();
  const c2 = root.getPropertyValue('--bs-primary')?.trim();
  const barColor = c1 || c2 || '#074aa8';

  ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto';
  ctx.textAlign = 'center';

  normalized.forEach((val, i) => {
    const h = val > 0 ? Math.round((val / maxVal) * (H - 40)) : 0;
    const xCell = i * cellW;

    // Giới hạn width để cột không bị quá dày
    const barW = Math.min(32, cellW - 8); // max 32px, để lại khoảng trống 2 bên
    const x = xCell + (cellW - barW) / 2;
    const y = baseY - h;

    // Vẽ cột
    ctx.fillStyle = barColor;
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x, y, barW, h, 6);
      ctx.fill();
    } else {
      // fallback nếu browser không hỗ trợ roundRect
      ctx.fillRect(x, y, barW, h);
    }

    // Vẽ giá trị nhỏ phía trên
    if (val > 0) {
      ctx.fillStyle = '#6b7280';
      ctx.fillText(String(val), x + barW / 2, y - 4);
    }
  });
}

function roundRect(ctx, x, y, w, h, r) {
  if (h <= 0 || w <= 0) return;
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Thay thế hàm cũ bằng hàm này
function renderDayLabels(containerId, labels) {
  const wrap = document.getElementById(containerId);
  const canvas = document.getElementById('chart7d');
  if (!wrap || !canvas) return;

  // Xóa style cũ và nội dung cũ
  wrap.removeAttribute('style');
  wrap.innerHTML = '';

  // Thêm class flex để chia đều cột
  wrap.classList.add('d-flex', 'justify-content-between', 'w-100');

  // Lấy số lượng phần tử để tính chiều rộng % (nếu cần chính xác tuyệt đối)
  // Nhưng flex:1 thường là đủ.

  labels.forEach((label) => {
    const div = document.createElement('div');
    div.textContent = label;

    // Style để căn giữa text trong không gian của nó
    div.style.flex = '1 1 0px'; // Chia đều width
    div.style.textAlign = 'center'; // Căn giữa chữ
    div.style.overflow = 'hidden'; // Tránh tràn nếu chữ quá dài
    div.style.whiteSpace = 'nowrap';
    div.style.fontSize = '11px'; // Chỉnh font nhỏ lại chút cho đẹp

    wrap.appendChild(div);
  });
}

/* =============== tính ngày trễ (dùng cho Overdue Top) =============== */
function calcDaysLate(dueDateStr) {
  if (!dueDateStr) return 0;
  const due = new Date(dueDateStr);
  if (Number.isNaN(due.getTime())) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffMs = today.getTime() - due.getTime();
  const d = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return d > 0 ? d : 0;
}

/* ================= page logic ================= */
export function initAdminHome() {
  guardRole();

  const recentBody = document.getElementById('recentLoansBody');
  const overdueList = document.getElementById('overdueList');
  const topBooks = document.getElementById('topBooks');
  const dateFrom = document.getElementById('dateFrom');
  const dateTo = document.getElementById('dateTo');
  const btnFilter = document.getElementById('btnFilter');

  const notificationList = document.getElementById('notificationList');
  const btnMarkAllRead = document.getElementById('btnMarkAllRead');

  // mặc định 30 ngày
  const today = new Date();
  const prev = new Date();
  prev.setDate(today.getDate() - 30);
  if (dateFrom) dateFrom.value = toISODate(prev);
  if (dateTo) dateTo.value = toISODate(today);

  /* ---- KPIs ---- */
  async function loadOverview() {
    try {
      // { totalUsers, totalBooks, activeLoans, overdueLoans }
      const r = await apiGet('/admin/overview');
      setText('kpiUsers', r?.totalUsers ?? '—');
      setText('kpiBooks', r?.totalBooks ?? '—');
      setText('kpiLoans', r?.activeLoans ?? '—');
      setText('kpiOverdue', r?.overdueLoans ?? '—');
    } catch (e) {
      if (!isNotFound(e)) toast('Error', 'Load KPIs failed');
    }
  }

  async function loadNotifications() {
    if (!notificationList) return;
    notificationList.innerHTML = `<li class="list-group-item small text-muted">Loading…</li>`;
    try {
      const json = await apiGet('/notifications');
      const items = json?.data || json?.items || [];
      if (!items.length) {
        notificationList.innerHTML = `<li class="list-group-item small text-muted">No notifications</li>`;
        return;
      }
      notificationList.innerHTML = items
        .map(
          (n) => `
        <li class="list-group-item d-flex justify-content-between align-items-start">
          <div class="ms-2 me-auto flex-grow-1">
            <div class="fw-semibold ${!n.isRead ? 'text-primary' : ''}">${esc(n.title || 'Thông báo')}</div>
            <div class="small text-muted mt-1">${esc(n.message || '')}</div>
            <div class="small text-muted mt-1">${new Date(n.createdAt).toLocaleString('vi-VN')}</div>
          </div>
          ${
            !n.isRead
              ? `<button class="btn btn-sm btn-outline-secondary mark-read-btn" data-id="${n.id}">
                  <i class="bi bi-check2"></i>
                </button>`
              : ''
          }
        </li>`,
        )
        .join('');

      // Mark single
      notificationList.querySelectorAll('.mark-read-btn').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const id = e.currentTarget.dataset.id;
          try {
            await apiPatch(`/notifications/${id}/read`);
            toast('Notification', 'Marked as read');
            loadNotifications();
          } catch (err) {
            console.error(err);
            toast('Error', 'Could not mark as read');
          }
        });
      });
    } catch (e) {
      if (isNotFound(e)) {
        notificationList.closest('.card')?.classList.add('d-none');
        return;
      }
      console.error(e);
      notificationList.innerHTML = `<li class="list-group-item text-danger small">Failed to load notifications</li>`;
    }
  }

  async function loadRecentLoans() {
    if (!recentBody) return;
    recentBody.innerHTML = `<tr><td colspan="5" class="text-muted small">Loading…</td></tr>`;

    const params = new URLSearchParams({
      page: '1',
      limit: '8',
      status: 'borrowed',
      include: 'user,details,details.copy,details.copy.book',
    });

    try {
      const res = await apiGet(`/borrow-records?${params.toString()}`);
      const items = res.items || res.data || res || [];

      document
        .getElementById('recentLoansCount')
        ?.replaceChildren(document.createTextNode(`${items.length || 0} items`));

      if (!items.length) {
        recentBody.innerHTML = `<tr><td colspan="5" class="text-muted small">No data</td></tr>`;
        return;
      }

      recentBody.innerHTML = items
        .map((l) => {
          const bookTitle = l.details?.[0]?.copy?.book?.title || l.bookTitle || '(no title)';
          const userName = l.user?.fullName || l.user?.name || l.user?.email || '—';

          const loanDate = fmtDate(l.borrowDate);
          const due = fmtDate(l.dueDate);
          const status = (l.status || 'borrowed').toLowerCase();
          const badge =
            status === 'overdue' || status === 'late'
              ? 'danger'
              : status === 'returned'
                ? 'secondary'
                : 'primary';

          return `
            <tr>
              <td>${esc(bookTitle)}</td>
              <td>${esc(userName)}</td>
              <td>${loanDate}</td>
              <td>${due}</td>
              <td><span class="badge text-bg-${badge}">${esc(status)}</span></td>
            </tr>
          `;
        })
        .join('');
    } catch (e) {
      console.error('loadRecentLoans error:', e);
      recentBody.innerHTML = `<tr><td colspan="5" class="text-danger small">Load failed</td></tr>`;
    }
  }

  /* =============================
     OVERDUE TOP
  ============================= */
  async function loadOverdueTop() {
    if (!overdueList) return;
    overdueList.innerHTML = `<li class="list-group-item small text-muted">Loading…</li>`;

    const params = new URLSearchParams({
      page: '1',
      limit: '20',
      overdue: 'true',
      include: 'user,details,details.copy,details.copy.book',
    });

    try {
      const res = await apiGet(`/borrow-records?${params.toString()}`);
      let items = res.items || res.data || res || [];

      if (!items.length) {
        overdueList.innerHTML = `<li class="list-group-item small text-muted">No overdue</li>`;
        return;
      }

      items = items
        .map((x) => ({
          ...x,
          _daysLate: calcDaysLate(x.dueDate),
        }))
        .filter((x) => x._daysLate > 0)
        .sort((a, b) => b._daysLate - a._daysLate)
        .slice(0, 5);

      if (!items.length) {
        overdueList.innerHTML = `<li class="list-group-item small text-muted">No overdue</li>`;
        return;
      }

      overdueList.innerHTML = items
        .map((x) => {
          const bookTitle = x.details?.[0]?.copy?.book?.title || x.bookTitle || '(no title)';
          return `
            <li class="list-group-item d-flex justify-content-between align-items-center">
              <span class="small">${esc(bookTitle)}</span>
              <span class="badge text-bg-danger">${x._daysLate}d</span>
            </li>
          `;
        })
        .join('');
    } catch (e) {
      console.error('loadOverdueTop error:', e);
      overdueList.innerHTML = `<li class="list-group-item text-danger small">Load failed</li>`;
    }
  }

  /* =============================
     TOP BOOKS
  ============================= */
  async function loadTopBooks() {
    if (!topBooks) return;
    topBooks.innerHTML = `<li class="list-group-item small text-muted">Loading…</li>`;
    try {
      const items = (await apiGet('/admin/top-books?limit=5')) || [];
      if (!items.length) {
        topBooks.innerHTML = `<li class="list-group-item small text-muted">No data</li>`;
        return;
      }
      topBooks.innerHTML = items
        .map(
          (b) => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
          <span class="small">${esc(b.title)}</span>
          <span class="badge text-bg-secondary">${b.count ?? 0}</span>
        </li>`,
        )
        .join('');
    } catch (e) {
      if (isNotFound(e)) {
        topBooks.closest('.card')?.classList.add('d-none');
        return;
      }
      console.error(e);
      topBooks.innerHTML = `<li class="list-group-item text-danger small">Load failed</li>`;
    }
  }

  /* =============================
     MINI CHART 7D
  ============================= */
  async function loadMiniChart7d() {
    console.log('[Chart] loadMiniChart7d called');
    const canvas = document.getElementById('chart7d');
    if (!canvas) {
      console.warn('[Chart] Canvas not found, retrying in 100ms...');
      setTimeout(loadMiniChart7d, 100);
      return;
    }

    console.log('[Chart] Canvas found, loading data...');

    // Tạo mảng 7 ngày gần nhất (ngày, label, value = 0)
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = toISODate(d); // 'YYYY-MM-DD'

      days.push({
        date: key,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        value: 0,
      });
    }

    // Render labels
    renderDayLabels(
      'chart7dLabels',
      days.map((x) => x.label),
    );

    try {
      const raw = (await apiGet('/admin/stats/loans?days=7')) || [];

      console.log('[Chart] API raw data:', raw);

      // Chuẩn hoá dữ liệu từ API
      const normalizeDateKey = (v) => {
        if (!v) return '';
        const s = String(v);
        // nếu là '2025-11-18T00:00:00.000Z' → lấy 10 ký tự đầu
        return s.slice(0, 10);
      };

      const byDate = new Map(
        raw.map((d) => {
          const dateKey = normalizeDateKey(d.date || d.day || d.d);
          const count =
            d.count !== undefined
              ? Number(d.count)
              : d.cnt !== undefined
                ? Number(d.cnt)
                : d.c !== undefined
                  ? Number(d.c)
                  : 0;
          return [dateKey, Number.isNaN(count) ? 0 : count];
        }),
      );

      console.log('[Chart] byDate map:', byDate);

      // Gán value cho từng ngày
      days.forEach((day) => {
        day.value = byDate.get(day.date) ?? 0;
      });

      console.log('[Chart] Final days data:', days);
      console.log(
        '[Chart] Values to draw:',
        days.map((x) => x.value),
      );

      drawBars(
        'chart7d',
        days.map((x) => x.value),
      );
    } catch (e) {
      console.error('[Chart] Error loading chart data:', e);
      // Nếu lỗi, vẫn vẽ biểu đồ với giá trị 0
      drawBars(
        'chart7d',
        days.map((x) => x.value),
      );
    }
  }

  /* ---- events ---- */
  btnFilter?.addEventListener('click', () => {
    loadRecentLoans();
    loadOverdueTop();
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => loadMiniChart7d(), 120);
  });

  btnMarkAllRead?.addEventListener('click', async () => {
    try {
      // Đường dẫn này tuỳ backend, nếu bạn đặt khác thì đổi lại cho khớp
      await apiPatch('/notifications/mark-all-read');
      toast('Notification', 'All marked as read');
      loadNotifications();
    } catch (e) {
      console.error(e);
      toast('Error', 'Could not mark all as read');
    }
  });

  /* ---- init ---- */
  loadOverview();
  loadRecentLoans();
  loadOverdueTop();
  loadTopBooks();
  loadNotifications();
  loadMiniChart7d();
}
