// assets/js/librarian-blacklist.js
import { apiGet, apiPatch } from './api.js';

/**
 * Escape HTML để tránh XSS
 */
function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Hiển thị toast notification
 */
function toast(title, body, type = 'info') {
  const toastArea = document.getElementById('toastArea');
  if (!toastArea) return;

  const bgClass =
    {
      success: 'bg-success',
      error: 'bg-danger',
      warning: 'bg-warning',
      info: 'bg-info',
    }[type] || 'bg-info';

  const toastEl = document.createElement('div');
  toastEl.className = `toast ${bgClass} text-white`;
  toastEl.setAttribute('role', 'alert');
  toastEl.innerHTML = `
    <div class="toast-header ${bgClass} text-white border-0">
      <strong class="me-auto">${esc(title)}</strong>
      <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
    </div>
    <div class="toast-body">${esc(body)}</div>
  `;

  toastArea.appendChild(toastEl);
  const bsToast = new bootstrap.Toast(toastEl, { autohide: true, delay: 3000 });
  bsToast.show();

  toastEl.addEventListener('hidden.bs.toast', () => {
    toastEl.remove();
  });
}

/**
 * Kiểm tra quyền truy cập
 */
function guardRole() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!token || !user || !['admin', 'librarian'].includes(user.role)) {
    location.href = 'login.html?next=librarian-blacklist.html';
    return null;
  }
  return user;
}

/**
 * Render pagination
 */
function renderPager(currentPage, totalPages, onPageChange) {
  const pagerEl = document.getElementById('pager');
  if (!pagerEl) return;

  if (totalPages <= 1) {
    pagerEl.innerHTML = '';
    return;
  }

  let html = '';

  // Previous button
  html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
    <a class="page-link" href="#" data-page="${currentPage - 1}">&laquo;</a>
  </li>`;

  // Page numbers
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);

  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  if (startPage > 1) {
    html += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
    if (startPage > 2) {
      html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
      <a class="page-link" href="#" data-page="${i}">${i}</a>
    </li>`;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
    html += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
  }

  // Next button
  html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
    <a class="page-link" href="#" data-page="${currentPage + 1}">&raquo;</a>
  </li>`;

  pagerEl.innerHTML = html;

  // Attach event listeners
  pagerEl.querySelectorAll('a[data-page]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = parseInt(link.getAttribute('data-page') || '1');
      if (page >= 1 && page <= totalPages && page !== currentPage) {
        onPageChange(page);
      }
    });
  });
}

/**
 * Khởi tạo trang Blacklist
 */
export function initBlacklistLibrarian() {
  const me = guardRole();
  if (!me) return;

  const qEl = document.getElementById('q');
  const sortSelect = document.getElementById('sort');
  const btnSearch = document.getElementById('btnSearch');
  const tableBody = document.getElementById('tableBody');
  const countEl = document.getElementById('count');

  let page = 1;
  const size = 10;
  let total = 0;
  let query = '';
  let sort = sortSelect?.value || 'name';

  // Modal phóng to avatar
  const avatarModalEl = document.getElementById('avatarModal');
  const avatarModalImg = document.getElementById('avatarModalImg');
  const avatarModal = avatarModalEl ? new bootstrap.Modal(avatarModalEl) : null;

  // Modal xác nhận remove từ blacklist
  const removeBlacklistModalEl = document.getElementById('removeBlacklistModal');
  const removeBlacklistModal = removeBlacklistModalEl
    ? new bootstrap.Modal(removeBlacklistModalEl)
    : null;
  const confirmRemoveBtn = document.getElementById('confirmRemoveBtn');
  let currentRemoveUserId = null;

  /* Filter + Search */
  btnSearch?.addEventListener('click', () => {
    query = qEl?.value.trim() || '';
    page = 1;
    load();
  });

  qEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      query = qEl.value.trim();
      page = 1;
      load();
    }
  });

  sortSelect?.addEventListener('change', () => {
    sort = sortSelect.value;
    page = 1;
    load();
  });

  /* Render data */
  function renderRows(allItems) {
    const items = Array.isArray(allItems) ? allItems : [];

    if (!items.length) {
      tableBody.innerHTML = `<tr><td colspan="8" class="text-muted small text-center">No blacklisted users found</td></tr>`;
      if (countEl) countEl.textContent = '0 records';
      renderPager(1, 1, () => {});
      return;
    }

    tableBody.innerHTML = items
      .map((u) => {
        // Ưu tiên faceUrl (ảnh chụp lúc đăng ký)
        const faceSrc =
          u.faceUrl && typeof u.faceUrl === 'string' && u.faceUrl.trim()
            ? u.faceUrl
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                u.name || 'User',
              )}&background=DC3545&color=fff`;

        // Format blacklisted date (nếu có updatedAt và isBlacklisted = true, dùng updatedAt)
        const blacklistedDate =
          u.isBlacklisted && u.updatedAt
            ? new Date(u.updatedAt).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })
            : '-';

        // Format role badge
        const roleBadge =
          u.role === 'admin'
            ? '<span class="badge bg-danger">Admin</span>'
            : u.role === 'librarian'
              ? '<span class="badge bg-primary">Librarian</span>'
              : '<span class="badge bg-secondary">Reader</span>';

        return `
      <tr>
        <td>${u.id}</td>
        <td>
          <div class="d-flex align-items-center gap-2">
            <img
              src="${esc(faceSrc)}"
              alt="Face"
              class="rounded-circle border user-avatar"
              data-fullsrc="${esc(faceSrc)}"
              style="width:32px;height:32px;object-fit:cover; cursor:pointer;"
            />
            <div>
              <div class="fw-semibold small">${esc(u.name || '')}</div>
              <div class="text-muted xsmall">#${u.id}</div>
            </div>
          </div>
        </td>
        <td>${esc(u.email || '')}</td>
        <td>${esc(u.phone || '')}</td>
        <td>${esc(u.address || '')}</td>
        <td>${roleBadge}</td>
        <td class="small text-muted">${blacklistedDate}</td>
        <td class="text-center align-middle">
          <button
            class="btn btn-sm btn-warning d-inline-flex align-items-center gap-1 btn-remove-blacklist"
            data-user-id="${u.id}"
            data-user-name="${esc(u.name || '')}"
            title="Remove from blacklist"
          >
            <i class="bi bi-person-check"></i>
            Remove
          </button>
        </td>
      </tr>`;
      })
      .join('');

    // Attach event listeners
    attachEventListeners();
  }

  /* Load blacklisted users */
  async function load() {
    tableBody.innerHTML = `<tr><td colspan="8" class="text-muted small text-center">Loading…</td></tr>`;
    try {
      const data = await apiGet(
        `/users/blacklist?q=${encodeURIComponent(query)}&sort=${encodeURIComponent(
          sort,
        )}&page=${page}&size=${size}`,
      );

      // Kiểm tra nếu response có success flag và success = false
      if (data && typeof data === 'object' && 'success' in data && !data.success) {
        throw new Error(data.message || data.error || 'Failed to load blacklist');
      }

      const items = Array.isArray(data) ? data : data?.items || [];
      total = data?.total ?? items.length;

      renderRows(items);

      const totalPages = Math.ceil(total / size);
      renderPager(page, totalPages, (newPage) => {
        page = newPage;
        load();
      });

      if (countEl) countEl.textContent = `${total} record${total > 1 ? 's' : ''}`;
    } catch (err) {
      console.error('Load blacklist error:', err);
      let errorMsg = 'Failed to load blacklist';
      if (err instanceof Error) {
        errorMsg = err.message;
      } else if (typeof err === 'string') {
        errorMsg = err;
      } else if (err && typeof err === 'object' && 'message' in err) {
        errorMsg = String(err.message);
      }
      tableBody.innerHTML = `<tr><td colspan="8" class="text-danger small text-center">Load failed: ${esc(errorMsg)}</td></tr>`;
      if (countEl) countEl.textContent = '';
      renderPager(1, 1, () => {});
      toast('Error', errorMsg, 'error');
    }
  }

  /* Attach event listeners for table actions */
  function attachEventListeners() {
    // Click avatar → show modal
    tableBody.addEventListener('click', (e) => {
      const img = e.target.closest('.user-avatar');
      if (img && avatarModal && avatarModalImg) {
        const fullSrc = img.getAttribute('data-fullsrc') || img.getAttribute('src') || '';
        if (fullSrc) {
          avatarModalImg.src = fullSrc;
          avatarModal.show();
        }
        return;
      }

      // Click nút Remove from blacklist
      const btn = e.target.closest('.btn-remove-blacklist');
      if (btn) {
        const userId = btn.dataset.userId;
        const userName = btn.dataset.userName;
        if (userId && removeBlacklistModal) {
          currentRemoveUserId = userId;
          document.getElementById('removeUserName').textContent = userName || `User #${userId}`;
          removeBlacklistModal.show();
        }
      }
    });
  }

  // Xử lý xác nhận remove từ blacklist
  confirmRemoveBtn?.addEventListener('click', async () => {
    if (!currentRemoveUserId) return;

    try {
      const response = await apiPatch(`/users/${currentRemoveUserId}/blacklist`, {
        isBlacklisted: false,
      });

      // Kiểm tra nếu response có success flag
      if (response && typeof response === 'object' && 'success' in response && !response.success) {
        throw new Error(
          response.message || response.error || 'Failed to remove user from blacklist',
        );
      }

      toast('Success', 'User removed from blacklist successfully', 'success');
      removeBlacklistModal?.hide();
      currentRemoveUserId = null;
      load();
    } catch (err) {
      console.error('Remove from blacklist error:', err);
      let errorMsg = 'Failed to remove user from blacklist';
      if (err instanceof Error) {
        errorMsg = err.message;
      } else if (typeof err === 'string') {
        errorMsg = err;
      } else if (err && typeof err === 'object' && 'message' in err) {
        errorMsg = String(err.message);
      }
      toast('Error', errorMsg, 'error');
    }
  });

  // Load initial data
  load();
}
