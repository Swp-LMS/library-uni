// assets/js/admin-holds.js
import { apiGet, apiPatch } from './api.js';

const esc = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function badgeStatus(raw) {
  const st = String(raw || '').toLowerCase();

  let color = 'secondary';
  switch (st) {
    case 'pending':
      color = 'secondary';
      break;
    case 'approved':
    case 'ready':
      color = 'info';
      break;
    case 'fulfilled':
    case 'completed':
      color = 'success';
      break;
    case 'expired':
      color = 'warning';
      break;
    case 'cancelled':
    case 'canceled':
      color = 'danger';
      break;
    default:
      color = 'secondary';
  }

  return `
    <span class="badge rounded-pill text-bg-${color} text-capitalize">
      ${esc(st || '-')}
    </span>
  `;
}

function toast(title, body) {
  const area =
    document.getElementById('toastArea') ||
    (() => {
      const el = document.createElement('div');
      el.id = 'toastArea';
      el.className = 'toast-container position-fixed bottom-0 end-0 p-3';
      document.body.appendChild(el);
      return el;
    })();

  const id = `t${Date.now()}`;
  area.insertAdjacentHTML(
    'beforeend',
    `
    <div id="${id}" class="toast text-bg-dark border-0" role="alert" data-bs-delay="2200">
      <div class="d-flex">
        <div class="toast-body"><strong>${esc(title)}:</strong> ${esc(body)}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>`,
  );
  const el = document.getElementById(id);
  bootstrap.Toast.getOrCreateInstance(el).show();
  el.addEventListener('hidden.bs.toast', () => el.remove());
}

export function initHoldsAdmin() {
  const statusSel = document.getElementById('status'); // filter status
  const qInput = document.getElementById('q'); // search user/book/note
  const btnSearch = document.getElementById('btnSearch');
  const btnRefresh = document.getElementById('btnRefresh');
  const tableBody = document.getElementById('tableBody');
  const countEl = document.getElementById('count');
  const pagerEl = document.getElementById('pager');
  const sortSel = document.getElementById('sort'); // optional: sort status

  if (!tableBody) return;

  // STATE phân trang
  let page = 1;
  const size = 10;
  let total = 0;

  // ============ EVENTS ============

  // đổi status -> về page 1
  statusSel?.addEventListener('change', () => {
    page = 1;
    load();
  });

  // nút Search
  btnSearch?.addEventListener('click', () => {
    page = 1;
    load();
  });

  // Enter trong ô search
  qInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      page = 1;
      load();
    }
  });

  // sort theo status
  sortSel?.addEventListener('change', () => {
    page = 1;
    load();
  });

  // Nút Refresh: clear filter + reload từ page 1
  btnRefresh?.addEventListener('click', () => {
    if (qInput) qInput.value = '';
    if (statusSel) statusSel.value = '';
    if (sortSel) sortSel.value = '';
    page = 1;
    load();
  });

  // ============ LOAD DATA ============

  async function load() {
    tableBody.innerHTML =
      '<tr><td colspan="7" class="text-muted small text-center">Loading…</td></tr>';

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(size)); // 10 record / page

      const statusVal = statusSel?.value || '';
      if (statusVal) params.set('status', statusVal);

      const keyword = qInput?.value?.trim();
      if (keyword) params.set('q', keyword); // BE search chung: user / book / note

      const res = await apiGet(`/reservations?${params.toString()}`);

      // Hỗ trợ nhiều kiểu payload:
      // { data, total, page, limit } hoặc { items, total } hoặc mảng thuần
      const payload = res?.data || res || {};
      let list = Array.isArray(payload.items)
        ? payload.items
        : Array.isArray(payload.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];

      total = typeof payload.total === 'number' ? payload.total : list.length;

      // ===== SORT trạng thái client-side (nếu có sortSel) =====
      if (sortSel) {
        const sortVal = sortSel.value || 'status-asc';
        const statusOrder = { pending: 1, approved: 2, cancelled: 3, expired: 4, completed: 5 };
        const getRank = (r) => statusOrder[String(r.status || '').toLowerCase()] ?? 999;

        if (sortVal === 'status-asc') {
          list.sort((a, b) => getRank(a) - getRank(b));
        } else if (sortVal === 'status-desc') {
          list.sort((a, b) => getRank(b) - getRank(a));
        }
      }

      // ===== RENDER =====
      if (!list.length) {
        tableBody.innerHTML =
          '<tr><td colspan="7" class="text-muted small text-center">No reservations found.</td></tr>';
        if (countEl) countEl.textContent = '0 reservations';
        renderPager();
        return;
      }

      renderRows(list);
      if (countEl) {
        countEl.textContent = `${total} reservation${total > 1 ? 's' : ''}`;
      }
      renderPager();
    } catch (err) {
      console.error('Load holds admin error:', err);
      tableBody.innerHTML = `<tr><td colspan="7" class="text-danger small text-center">Load failed: ${esc(
        err?.message || String(err),
      )}</td></tr>`;
      if (countEl) countEl.textContent = '';
      if (pagerEl) pagerEl.innerHTML = '';
    }
  }

  // ============ RENDER TABLE ============

  function renderRows(list) {
    if (!list.length) {
      tableBody.innerHTML =
        '<tr><td colspan="7" class="text-muted small text-center">No reservations found.</td></tr>';
      return;
    }

    tableBody.innerHTML = list
      .map((r) => {
        const userName = r.user ? esc(r.user.fullName || r.user.name || r.user.email || '') : '-';
        const bookTitle = esc(r.book?.title || '');
        const createdAt = r.reserveDate ? new Date(r.reserveDate).toLocaleString('vi-VN') : '';
        const note = esc(r.note || '');
        const statusHtml = badgeStatus(r.status);

        const st = String(r.status || '').toLowerCase();
        const canApprove = st === 'pending';
        const canCancel = !['cancelled', 'canceled', 'fulfilled', 'completed'].includes(st);

        return `
          <tr>
            <td>${r.id}</td>
            <td>${bookTitle}</td>
            <td>${userName}</td>
            <td>${createdAt}</td>
            <td>${statusHtml}</td>
            <td class="note-cell" title="${note}">
              ${note}
            </td>
            <td class="text-center">
              <div class="d-flex justify-content-center gap-2">
                ${
                  canApprove
                    ? `
                  <button class="btn btn-sm btn-light border" 
                          type="button"
                          data-approve="${r.id}"
                          title="Approve reservation">
                    <i class="bi bi-check2-circle text-success"></i>
                  </button>`
                    : ''
                }
                ${
                  canCancel
                    ? `
                  <button class="btn btn-sm btn-light border"
                          type="button"
                          data-cancel="${r.id}"
                          title="Cancel reservation">
                    <i class="bi bi-x-circle text-danger"></i>
                  </button>`
                    : ''
                }
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    // Bind Approve
    tableBody.querySelectorAll('[data-approve]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-approve');
        try {
          await apiPatch(`/reservations/${id}/approve`);
          toast('Success', `Reservation #${id} approved`);
          load();
        } catch (err) {
          console.error('Approve error:', err);
          toast('Error', err?.message || 'Approve failed');
        }
      });
    });

    // Bind Cancel
    tableBody.querySelectorAll('[data-cancel]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-cancel');
        if (!confirm(`Cancel reservation #${id}?`)) return;
        try {
          await apiPatch(`/reservations/${id}/cancel`);
          toast('Success', `Reservation #${id} cancelled`);
          load();
        } catch (err) {
          console.error('Cancel error:', err);
          toast('Error', err?.message || 'Cancel failed');
        }
      });
    });
  }

  // ============ PAGINATION UI ============

  function renderPager() {
    if (!pagerEl) return;
    const pages = Math.max(1, Math.ceil(total / size));
    pagerEl.innerHTML = '';

    const add = (p, label, active = false, disabled = false) => {
      pagerEl.insertAdjacentHTML(
        'beforeend',
        `
        <li class="page-item ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}">
          <a class="page-link" href="#" data-p="${p}">${label}</a>
        </li>
      `,
      );
    };

    add(Math.max(1, page - 1), '&laquo;', page === 1, page === 1);
    for (let i = 1; i <= pages && i <= 10; i++) {
      add(i, i, i === page, false);
    }
    add(Math.min(pages, page + 1), '&raquo;', page === pages, page === pages);

    pagerEl.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const p = Number(a.dataset.p);
        if (!Number.isNaN(p) && p !== page) {
          page = p;
          load();
        }
      });
    });
  }

  // INIT
  load();
}
