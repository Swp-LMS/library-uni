// assets/js/admin-users.js
import { apiGet, apiPut, apiDelete } from './api.js';

// ====== Guard ======
function guardRole() {
  const t = localStorage.getItem('token');
  const u = JSON.parse(localStorage.getItem('user') || 'null');
  if (!t || !u) location.href = 'login.html';
}

const esc = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// ====== Toast helper ======
function toast(title, body) {
  const areaId = 'toastArea';
  let area = document.getElementById(areaId);
  if (!area) {
    area = document.createElement('div');
    area.id = areaId;
    area.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    document.body.appendChild(area);
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

// ====== MAIN ======
export function initUsersAdmin() {
  guardRole();

  const me = JSON.parse(localStorage.getItem('user') || '{}');
  const isLibrarian = me.role === 'librarian';

  const qEl = document.getElementById('q');
  const sortSelect = document.getElementById('sort');
  const btnSearch = document.getElementById('btnSearch');
  const tableBody = document.getElementById('tableBody');
  const countEl = document.getElementById('count');
  const pagerEl = document.getElementById('pager');

  // Biến phân trang & tìm kiếm
  let page = 1;
  let size = 10;
  let total = 0;
  let query = '';
  let sort = 'id';

  // === SEARCH & SORT ===
  btnSearch?.addEventListener('click', () => {
    query = qEl.value.trim();
    page = 1;
    load();
  });

  qEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
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

  // === RENDER TABLE ===
  function renderRows(items) {
    if (!Array.isArray(items)) items = [];

    // Nếu Librarian → chỉ hiển thị Readers (BE đã lọc rồi nhưng cứ để cho chắc)
    if (isLibrarian) items = items.filter((u) => u.role === 'readers');

    if (!items.length) {
      tableBody.innerHTML = `<tr><td colspan="8" class="text-muted small text-center">No records found</td></tr>`;
      if (countEl) countEl.textContent = '0 records';
      return;
    }

    tableBody.innerHTML = items
      .map((u) => {
        // 👉 ưu tiên faceUrl
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
          <span class="badge-role ${esc(u.role)}">${esc(u.role)}</span>
        </td>
        <td class="date-cell">
          <span>${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</span>
          <small>${u.updatedAt ? new Date(u.updatedAt).toLocaleDateString() : '-'}</small>
        </td>
        <td class="text-center">
          <div class="d-flex justify-content-center gap-2">
            <button class="btn btn-sm btn-light border" data-edit="${u.id}" title="Edit user">
              <i class="bi bi-pencil text-primary"></i>
            </button>
            ${
              u.role === 'admin'
                ? ''
                : `
            <button class="btn btn-sm btn-light border" data-del="${u.id}" title="Delete user">
              <i class="bi bi-trash text-danger"></i>
            </button>`
            }
          </div>
        </td>
      </tr>
    `;
      })
      .join('');

    // === Edit user ===
    tableBody.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-edit');
        try {
          const item = await apiGet(`/users/${id}`);
          showEditModal(item);
        } catch {
          toast('Error', 'Cannot load user data');
        }
      });
    });

    // === Delete user ===
    tableBody.querySelectorAll('[data-del]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-del');
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
          await apiDelete(`/users/${id}`);
          toast('Success', 'User deleted');
          load();
        } catch (err) {
          toast('Error', err.message || 'Delete failed');
        }
      });
    });

    // dùng tổng từ BE
    countEl.textContent = `${total} record${total > 1 ? 's' : ''}`;
  }

  // === PAGINATION UI ===
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
        </li>`,
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

  // === LOAD DATA ===
  async function load(goPage) {
    if (typeof goPage === 'number') page = goPage;

    tableBody.innerHTML = `<tr><td colspan="8" class="text-muted small text-center">Loading…</td></tr>`;
    try {
      const data = await apiGet(
        `/users?q=${encodeURIComponent(query)}&sort=${encodeURIComponent(
          sort,
        )}&page=${page}&size=${size}`,
      );

      const items = Array.isArray(data) ? data : data.items || [];
      total = Array.isArray(data) ? items.length : (data.total ?? items.length);

      // nếu BE trả về page/size thì cập nhật lại
      if (!Array.isArray(data)) {
        page = data.page ?? page;
        size = data.size ?? size;
      }

      renderRows(items);
      renderPager();
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="8" class="text-danger small text-center">Load failed: ${esc(
        err.message || err,
      )}</td></tr>`;
      countEl.textContent = '';
      if (pagerEl) pagerEl.innerHTML = '';
    }
  }

  // === EDIT MODAL (giữ nguyên như của bạn) ===
  function showEditModal(item) {
    let modalEl = document.getElementById('editUserModal');
    if (!modalEl) {
      document.body.insertAdjacentHTML(
        'beforeend',
        `
      <div class="modal fade" id="editUserModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Edit User</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <form id="editUserForm" class="modal-body">
              <input type="hidden" id="userId" />
              <div class="mb-3">
                <label class="form-label">Name</label>
                <input id="userName" type="text" class="form-control" required />
              </div>
              <div class="mb-3">
                <label class="form-label">Email</label>
                <input id="userEmail" type="email" class="form-control" required />
              </div>
              <div class="mb-3">
                <label class="form-label">Phone</label>
                <input id="userPhone" type="text" class="form-control" />
              </div>
              <div class="mb-3">
                <label class="form-label">Address</label>
                <input id="userAddress" type="text" class="form-control" />
              </div>
              ${
                isLibrarian
                  ? ''
                  : `
              <div class="mb-3">
                <label class="form-label">Role</label>
                <select id="userRole" class="form-select"></select>
              </div>`
              }
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" class="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      </div>`,
      );
      modalEl = document.getElementById('editUserModal');
    }

    modalEl.querySelector('#userId').value = item.id;
    modalEl.querySelector('#userName').value = item.name || '';
    modalEl.querySelector('#userEmail').value = item.email || '';
    modalEl.querySelector('#userPhone').value = item.phone || '';
    modalEl.querySelector('#userAddress').value = item.address || '';

    const roleSel = modalEl.querySelector('#userRole');

    if (!isLibrarian && roleSel) {
      if (item.role === 'admin') {
        roleSel.innerHTML = `<option value="admin">admin</option>`;
        roleSel.value = 'admin';
        roleSel.disabled = true;
      } else {
        roleSel.disabled = false;
        roleSel.innerHTML = `
          <option value="librarian">librarian</option>
          <option value="readers">readers</option>`;
        roleSel.value = item.role || 'readers';
      }
    }

    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    modalEl.querySelector('#editUserForm').onsubmit = async (e) => {
      e.preventDefault();

      const payload = {
        name: modalEl.querySelector('#userName').value.trim(),
        email: modalEl.querySelector('#userEmail').value.trim(),
        phone: modalEl.querySelector('#userPhone').value.trim() || null,
        address: modalEl.querySelector('#userAddress').value.trim() || null,
      };

      if (!isLibrarian && roleSel && item.role !== 'admin' && !roleSel.disabled) {
        payload.role = roleSel.value;
      }

      try {
        await apiPut(`/users/${item.id}`, payload);
        toast('Success', 'User updated successfully');
        modal.hide();
        load();
      } catch (err) {
        toast('Error', err.message || 'Update failed');
      }
    };
  }

  // === Start ===
  load();
}
