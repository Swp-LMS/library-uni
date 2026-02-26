// assets/js/librarian-users.js
import { apiGet, apiPost } from './api.js';

function guardRole() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!token || !user || !['admin', 'librarian'].includes(user.role)) {
    location.href = 'login.html?next=librarian-users.html';
    return null;
  }
  return user;
}

function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function initUsersLibrarian() {
  const me = guardRole();
  if (!me) return;

  const isLibrarian = me.role === 'librarian';

  const qEl = document.getElementById('q');
  const sortSelect = document.getElementById('sort');
  const btnSearch = document.getElementById('btnSearch');
  const tableBody = document.getElementById('tableBody');
  const countEl = document.getElementById('count');
  const pagerEl = document.getElementById('pager');

  let page = 1;
  const size = 10;
  let total = 0;
  let query = '';
  let sort = sortSelect?.value || 'name';

  // ==== MODAL PHÓNG TO AVATAR ====
  const avatarModalEl = document.getElementById('avatarModal');
  const avatarModalImg = document.getElementById('avatarModalImg');
  const avatarModal = avatarModalEl ? new bootstrap.Modal(avatarModalEl) : null;

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
    let items = Array.isArray(allItems) ? allItems : [];

    // Librarian chỉ thấy readers
    if (isLibrarian) {
      items = items.filter((u) => u.role === 'reader' || u.role === 'readers');
    }

    if (!items.length) {
      tableBody.innerHTML = `<tr><td colspan="8" class="text-muted small text-center">No data</td></tr>`;
      return;
    }

    tableBody.innerHTML = items
      .map((u) => {
        // 👉 ƯU TIÊN faceUrl (ảnh chụp lúc đăng ký)
        const faceSrc =
          u.faceUrl && typeof u.faceUrl === 'string' && u.faceUrl.trim()
            ? u.faceUrl
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                u.name || 'User',
              )}&background=0D8ABC&color=fff`;

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

        <td>
          <span class="badge text-bg-${
            u.role === 'admin' ? 'danger' : u.role === 'librarian' ? 'warning' : 'success'
          }">${esc(u.role)}</span>
        </td>

        <td class="small text-muted">
          ${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}<br>
          ${u.updatedAt ? new Date(u.updatedAt).toLocaleDateString() : '-'}
        </td>

        <td class="text-center align-middle">
          <button
            class="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 btn-create-loan-row"
            data-user-id="${u.id}"
          >
            <i class="bi bi-journal-plus"></i>
            Loan
          </button>
        </td>
      </tr>`;
      })
      .join('');
  }

  /* Pagination UI */
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

    add(Math.max(1, page - 1), '&laquo;', false, page === 1);

    for (let i = 1; i <= pages && i <= 10; i++) {
      add(i, i, i === page);
    }

    add(Math.min(pages, page + 1), '&raquo;', false, page === pages);

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

  /* Load users */
  async function load() {
    tableBody.innerHTML = `<tr><td colspan="8" class="text-muted small text-center">Loading…</td></tr>`;
    try {
      const data = await apiGet(
        `/users?q=${encodeURIComponent(query)}&sort=${encodeURIComponent(
          sort,
        )}&page=${page}&size=${size}`,
      );

      const payload = data || {};
      const items = Array.isArray(payload.items)
        ? payload.items
        : Array.isArray(payload)
          ? payload
          : [];

      total = typeof payload.total === 'number' ? payload.total : items.length;

      renderRows(items);

      if (countEl) {
        countEl.textContent = `${total} record${total > 1 ? 's' : ''}`;
      }

      renderPager();
    } catch (err) {
      console.error('Load users librarian error:', err);
      tableBody.innerHTML = `<tr><td colspan="8" class="text-danger small text-center">Load failed</td></tr>`;
      if (countEl) countEl.textContent = '';
      if (pagerEl) pagerEl.innerHTML = '';
    }
  }

  load();

  /* Click avatar & Loan */
  tableBody.addEventListener('click', (e) => {
    // 1. Click avatar → show modal
    const img = e.target.closest('.user-avatar');
    if (img && avatarModal && avatarModalImg) {
      const fullSrc = img.getAttribute('data-fullsrc') || img.getAttribute('src') || '';
      if (fullSrc) {
        avatarModalImg.src = fullSrc;
        avatarModal.show();
      }
      return;
    }

    // 2. Click nút Loan
    const btn = e.target.closest('.btn-create-loan-row');
    if (btn) {
      const userId = btn.dataset.userId;
      if (userId) {
        window.location.href = `librarian-loans-create.html?userId=${userId}`;
      }
    }
  });

  // ===== Create Reader modal =====
  const btnCreateReader = document.getElementById('btnCreateReader');
  const modalCreateReaderEl = document.getElementById('modalCreateReader');
  const formCreateReader = document.getElementById('formCreateReader');

  const bsModalCreateReader = new bootstrap.Modal(modalCreateReaderEl);

  btnCreateReader?.addEventListener('click', () => {
    formCreateReader.reset();
    formCreateReader.classList.remove('was-validated');
    bsModalCreateReader.show();
  });

  formCreateReader?.addEventListener('submit', async (e) => {
    e.preventDefault();

    formCreateReader.classList.add('was-validated');
    if (!formCreateReader.checkValidity()) return;

    const newUser = {
      name: document.getElementById('inputName').value.trim(),
      email: document.getElementById('inputEmail').value.trim(),
      password: document.getElementById('inputPassword').value,
      phone: document.getElementById('inputPhone').value.trim() || undefined,
      address: document.getElementById('inputAddress').value.trim() || undefined,
      role: 'readers',
    };

    try {
      await apiPost('/users', newUser);
      alert('Tạo tài khoản Reader thành công!');
      bsModalCreateReader.hide();
      load();
    } catch (err) {
      alert('Tạo tài khoản thất bại: ' + (err?.message || err));
    }
  });
}
