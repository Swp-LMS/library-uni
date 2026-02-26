// assets/js/librarian-dashboard.js
import { apiGet, apiPatch } from './api.js';

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
  if (!area) {
    alert(`${title}: ${body}`);
    return;
  }
  const id = `t${Date.now()}`;
  area.insertAdjacentHTML(
    'beforeend',
    `<div id="${id}" class="toast text-bg-dark border-0" role="alert" data-bs-delay="2200">
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

/* === Dashboard === */
export function initAdminDashboard() {
  const notiList = document.getElementById('notificationList');
  const btnMarkAllRead = document.getElementById('btnMarkAllRead');

  // Load overview statistics
  // Load overview statistics
  async function loadOverview() {
    try {
      // ⚠️ Đổi endpoint: dùng lại /admin/overview cho chắc chắn tồn tại
      const data = await apiGet('/admin/overview');

      // data dự kiến: { totalUsers, totalBooks, activeLoans, overdueLoans }
      const totalUsers = data?.totalUsers ?? '—';
      const totalBooks = data?.totalBooks ?? '—';
      const activeLoans = data?.activeLoans ?? '—';
      const overdueLoans = data?.overdueLoans ?? '—';

      const kpiUsers = document.getElementById('kpiUsers');
      const kpiBooks = document.getElementById('kpiBooks');
      const kpiLoans = document.getElementById('kpiLoans');
      const kpiOverdue = document.getElementById('kpiOverdue');

      if (kpiUsers) kpiUsers.textContent = totalUsers;
      if (kpiBooks) kpiBooks.textContent = totalBooks;
      if (kpiLoans) kpiLoans.textContent = activeLoans;
      if (kpiOverdue) kpiOverdue.textContent = overdueLoans;
    } catch (err) {
      console.error('Failed to load overview:', err);
      toast('Error', 'Failed to load dashboard overview');
    }
  }

  // Load overview statistics (always call)
  loadOverview();

  if (!notiList) return;

  async function loadNotifications() {
    notiList.innerHTML = `<li class="list-group-item small text-muted">Loading…</li>`;
    try {
      const json = await apiGet('/notifications?unread=true');
      const items = json.data || [];
      if (!items.length) {
        notiList.innerHTML = `<li class="list-group-item small text-muted">No new notifications</li>`;
        return;
      }
      notiList.innerHTML = items
        .map(
          (n) => `
        <li class="list-group-item d-flex justify-content-between align-items-start">
          <div class="ms-2 me-auto">
            <div class="fw-semibold">${esc(n.title)}</div>
            ${esc(n.message)}
            <div class="text-muted small">${new Date(n.createdAt).toLocaleString('vi-VN')}</div>
          </div>
          <button class="btn btn-sm btn-outline-secondary mark-read" data-id="${n.id}">
            <i class="bi bi-check2"></i>
          </button>
        </li>`,
        )
        .join('');
    } catch (err) {
      notiList.innerHTML = `<li class="list-group-item text-danger small">Failed to load notifications</li>`;
      console.error('Notification load error:', err);
    }
  }

  notiList.addEventListener('click', async (e) => {
    const btn = e.target.closest('.mark-read');
    if (btn) {
      const id = btn.dataset.id;
      try {
        await apiPatch(`/notifications/${id}/read`);
        toast('Notification', 'Marked as read');
        loadNotifications();
      } catch (err) {
        toast('Error', 'Could not mark as read');
      }
    }
  });

  btnMarkAllRead?.addEventListener('click', async () => {
    try {
      await apiPatch('/notifications/read-all');
      toast('Notification', 'All marked as read');
      loadNotifications();
    } catch {
      toast('Error', 'Failed to mark all');
    }
  });

  loadNotifications();
}
