// assets/js/librarian-holds.js
import { apiGet, apiPatch } from './api.js';

function guardRole() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!token || !user || !['admin', 'librarian'].includes(user.role)) {
    location.href = 'login.html?next=librarian-holds.html';
    return null;
  }
  return user;
}

const esc = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function badgeStatus(st) {
  const map = {
    pending: 'secondary',
    approved: 'success',
    borrowed: 'info',
    expired: 'dark',
    cancelled: 'danger',
  };
  return `<span class="badge text-bg-${map[st] || 'secondary'} text-capitalize">${esc(st)}</span>`;
}

function toast(title, body) {
  const area = document.getElementById('toastArea');
  if (!area) {
    alert(`${title}: ${body}`);
    return;
  }
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

export function initLibrarianHolds() {
  if (!guardRole()) return;

  const statusSel = document.getElementById('status');
  const qInput = document.getElementById('q');
  const btnSearch = document.getElementById('btnSearch');
  const btnRefresh = document.getElementById('btnRefresh');
  const tableBody = document.getElementById('tableBody');
  const pagerEl = document.getElementById('pager');
  const countEl = document.getElementById('count');

  if (!tableBody) return;

  let page = 1;
  const limit = 10;
  let total = 0;

  statusSel?.addEventListener('change', () => {
    page = 1;
    load();
  });

  btnRefresh?.addEventListener('click', () => {
    page = 1;
    load();
  });

  // click phân trang
  pagerEl?.addEventListener('click', (e) => {
    const a = e.target.closest('[data-p]');
    if (!a) return;
    e.preventDefault();
    const p = Number(a.dataset.p);
    if (!Number.isNaN(p) && p !== page) {
      page = p;
      load();
    }
  });

  function renderRows(items) {
    if (!items.length) {
      tableBody.innerHTML = `<tr><td colspan="6" class="text-muted small text-center">No data</td></tr>`;
      return;
    }

    tableBody.innerHTML = items
      .map(
        (h) => `
        <tr>
          <td>${h.id}</td>
          <td>${esc(h.book?.title || '')}</td>
          <td>${esc(h.user?.name || h.user?.email || '')}</td>
          <td>${
            h.reserveDate
              ? new Date(h.reserveDate).toLocaleString('vi-VN')
              : h.createdAt
                ? new Date(h.createdAt).toLocaleString('vi-VN')
                : ''
          }</td>
          <td>${badgeStatus(h.status)}</td>
          <td class="text-end">
            ${
              h.status === 'pending'
                ? `
              <button class="btn btn-sm btn-outline-primary me-1" data-approve="${h.id}">
                <i class="bi bi-check2-circle"></i> Approve
              </button>
              <button class="btn btn-sm btn-outline-danger" data-reject="${h.id}">
                <i class="bi bi-x-circle"></i> Reject
              </button>
            `
                : ''
            }
            ${
              h.status === 'approved'
                ? `
              <button class="btn btn-sm btn-outline-success me-1" data-confirm="${h.id}">
                <i class="bi bi-journal-check"></i> Confirm Borrow
              </button>
              <button class="btn btn-sm btn-outline-danger" data-cancel="${h.id}">
                <i class="bi bi-x-circle"></i> Cancel
              </button>
            `
                : ''
            }
          </td>
        </tr>`,
      )
      .join('');

    // bind approve
    tableBody.querySelectorAll('[data-approve]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-approve');
        if (id) update(id, 'approved');
      });
    });

    // bind reject
    tableBody.querySelectorAll('[data-reject]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-reject');
        if (!id) return;
        const note = prompt('Nhập lý do từ chối đặt chỗ:');
        if (note === null) return;
        try {
          await apiPatch(`/reservations/${id}/reject`, { note });
          toast('Rejected', `Đã từ chối yêu cầu #${id}`);
          load();
        } catch (err) {
          console.error('Reject error:', err);
          toast('Error', 'Từ chối thất bại');
        }
      });
    });

    // bind confirm borrow
    tableBody.querySelectorAll('[data-confirm]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-confirm');
        if (id) confirmBorrow(id);
      });
    });

    // bind cancel
    tableBody.querySelectorAll('[data-cancel]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-cancel');
        if (id) update(id, 'cancelled');
      });
    });
  }

  function renderPager(totalPages) {
    if (!pagerEl) return;
    const pages = totalPages || Math.max(1, Math.ceil(total / limit));

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

    add(Math.max(1, page - 1), '&laquo;', false, page === 1);

    for (let i = 1; i <= pages && i <= 10; i++) {
      add(i, i, i === page);
    }

    add(Math.min(pages, page + 1), '&raquo;', false, page === pages);
  }

  async function load() {
    tableBody.innerHTML = `<tr><td colspan="6" class="text-muted small text-center">Loading…</td></tr>`;

    const qs = new URLSearchParams();
    qs.set('page', String(page));
    qs.set('limit', String(limit));
    if (statusSel?.value) qs.set('status', statusSel.value);

    try {
      const res = await apiGet(`/reservations?${qs.toString()}`);

      const payload = res?.data || res || {};
      const items = Array.isArray(payload.data)
        ? payload.data
        : Array.isArray(payload.items)
          ? payload.items
          : Array.isArray(payload)
            ? payload
            : [];

      total = typeof payload.total === 'number' ? payload.total : items.length;
      const serverPage = typeof payload.page === 'number' ? payload.page : page;
      const totalPages =
        typeof payload.totalPages === 'number'
          ? payload.totalPages
          : Math.max(1, Math.ceil(total / limit));

      page = serverPage;

      renderRows(items);

      if (countEl) countEl.textContent = `${total} record${total > 1 ? 's' : ''}`;
      renderPager(totalPages);
    } catch (err) {
      console.error('Load holds error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Load failed';
      tableBody.innerHTML = `<tr><td colspan="6" class="text-danger small text-center">Load failed: ${esc(
        errorMsg,
      )}</td></tr>`;
      if (countEl) countEl.textContent = '';
      if (pagerEl) pagerEl.innerHTML = '';
      toast('Error', 'Failed to load reservations');
    }
  }

  async function update(id, action) {
    if (!id) return;
    try {
      if (action === 'approved') {
        await apiPatch(`/reservations/${id}/approve`, {});
      } else if (action === 'cancelled') {
        await apiPatch(`/reservations/${id}/cancel`, {});
      } else {
        await apiPatch(`/reservations/${id}`, { status: action });
      }
      toast('Success', `Reservation ${id} updated to ${action}`);
      load();
    } catch (err) {
      console.error('Update reservation error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Update failed';
      toast('Error', errorMsg);
    }
  }

  async function confirmBorrow(id) {
    if (!id) return;
    try {
      await apiPatch(`/reservations/${id}/confirm-borrow`, {});
      toast('Success', `Reservation ${id} đã xác nhận mượn thành công`);
      load();
    } catch (err) {
      console.error('Confirm borrow error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Confirm failed';
      toast('Error', errorMsg);
    }
  }

  load();
}
