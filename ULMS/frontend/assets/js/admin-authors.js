// assets/js/admin-authors.js
import { apiGet, apiPost, apiPut, apiDelete } from './api.js';

export function initAuthorsAdmin() {
  const tableBody = document.getElementById('tableBody');
  const countEl = document.getElementById('count');
  const pagerEl = document.getElementById('pager');
  const btnAdd = document.getElementById('btnAdd');
  const form = document.getElementById('authorForm');
  const modal = new bootstrap.Modal(document.getElementById('authorModal'));
  const modalTitle = document.getElementById('modalTitle');

  // Modal detail
  const detailModal = new bootstrap.Modal(document.getElementById('authorDetailModal'));
  const detailContent = document.getElementById('authorDetailContent');

  // Fields
  const authorId = document.getElementById('authorId');
  const name = document.getElementById('name');
  const birthYear = document.getElementById('birthYear');

  // Search + Sort
  const qEl = document.getElementById('q');
  const sortEl = document.getElementById('sort');
  const btnSearch = document.getElementById('btnSearch');

  // STATE phân trang
  let page = 1;
  let size = 10;
  let total = 0;
  let query = '';
  let sort = 'id';

  const esc = (s = '') =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  function toast(title, body) {
    const area = document.getElementById('toastArea');
    const id = `t${Date.now()}`;
    area.insertAdjacentHTML(
      'beforeend',
      `
      <div id="${id}" class="toast text-bg-dark border-0" role="alert" data-bs-delay="2500">
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

  // === Search & Sort ===
  btnSearch.addEventListener('click', () => {
    query = qEl.value.trim();
    page = 1;
    load();
  });

  qEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      query = qEl.value.trim();
      page = 1;
      load();
    }
  });

  sortEl.addEventListener('change', () => {
    sort = sortEl.value;
    page = 1;
    load();
  });

  // === Add new ===
  btnAdd.addEventListener('click', () => {
    form.reset();
    authorId.value = '';
    modalTitle.textContent = 'Add Author';
    modal.show();
  });

  // === Submit form ===
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: name.value.trim(),
      birthYear: Number(birthYear.value) || null,
    };

    try {
      if (authorId.value) {
        await apiPut(`/authors/${authorId.value}`, payload);
        toast('Success', 'Author updated');
      } else {
        await apiPost('/authors', payload);
        toast('Success', 'Author created');
      }
      modal.hide();
      load();
    } catch (err) {
      toast('Error', err.message || 'Save failed');
    }
  });

  // === GET ALL AUTHORS + PHÂN TRANG ===
  async function load() {
    tableBody.innerHTML = `<tr><td colspan="5" class="text-muted small">Loading…</td></tr>`;

    try {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      params.append('sort', sort);
      params.append('page', String(page));
      params.append('limit', String(size));

      const data = await apiGet(`/authors?${params.toString()}`);

      // BE nên trả { items, total, page, limit }
      let items = Array.isArray(data.items)
        ? data.items
        : Array.isArray(data.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : [];

      total = data.total ?? items.length;
      page = data.page ?? page;
      size = data.limit ?? size;

      renderRows(items);
      countEl.textContent = `${total} record${total > 1 ? 's' : ''}`;
      renderPager();
    } catch (err) {
      console.error('❌ Load authors error:', err);
      tableBody.innerHTML = `<tr><td colspan="5" class="text-danger small">Load failed</td></tr>`;
      countEl.textContent = '';
      pagerEl.innerHTML = '';
    }
  }

  // === RENDER TABLE ===
  function renderRows(items) {
    if (!items.length) {
      tableBody.innerHTML = `<tr><td colspan="5" class="text-muted small text-center">No authors found</td></tr>`;
      return;
    }

    tableBody.innerHTML = items
      .map(
        (a) => `
      <tr>
        <td>${a.id}</td>
        <td>${esc(a.name)}</td>
        <td id="books-${a.id}" class="text-muted small">Loading...</td>
        <td>${a.birthYear || ''}</td>
        <td class="text-center">
          <div class="d-flex justify-content-center gap-2">
            <button class="btn btn-sm btn-light border" data-view="${a.id}" title="View detail">
              <i class="bi bi-eye text-info"></i>
            </button>
            <button class="btn btn-sm btn-light border" data-edit="${a.id}" title="Edit author">
              <i class="bi bi-pencil text-primary"></i>
            </button>
            <button class="btn btn-sm btn-light border" data-del="${a.id}" title="Delete author">
              <i class="bi bi-trash text-danger"></i>
            </button>
          </div>
        </td>
      </tr>`,
      )
      .join('');

    // View / Edit / Delete
    tableBody
      .querySelectorAll('[data-view]')
      .forEach((b) => b.addEventListener('click', () => openDetail(b.dataset.view)));
    tableBody
      .querySelectorAll('[data-edit]')
      .forEach((b) => b.addEventListener('click', () => openEdit(b.dataset.edit)));
    tableBody
      .querySelectorAll('[data-del]')
      .forEach((b) => b.addEventListener('click', () => doDelete(b.dataset.del)));

    // Load book count từng author
    items.forEach(async (a) => {
      try {
        const res = await apiGet(`/authors/${a.id}`);
        const count = res.data?.books?.length || res.books?.length || 0;
        const el = document.getElementById(`books-${a.id}`);
        if (el) el.textContent = `${count} book${count !== 1 ? 's' : ''}`;
      } catch {
        const el = document.getElementById(`books-${a.id}`);
        if (el) el.textContent = '0 book';
      }
    });
  }

  // === PAGINATION ===
  function renderPager() {
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

  // === DETAIL / EDIT / DELETE giữ nguyên logic cũ ===
  async function openDetail(id) {
    try {
      const res = await apiGet(`/authors/${id}`);
      const a = res.data || res;

      detailContent.innerHTML = `
        <h4 class="mb-3">${esc(a.name)}</h4>
        <div class="mb-3">
          <p><strong>Biography:</strong></p>
          <div class="bg-light p-2 rounded small">${
            a.biography || '<em>No biography provided.</em>'
          }</div>
        </div>
        <p><strong>Birth Year:</strong> ${a.birthYear || '—'}</p>
        <hr>
        <h5 class="mt-3">Books Written (${a.books?.length || 0})</h5>
        ${
          a.books?.length
            ? `<div class="row g-3 mt-2">
              ${a.books
                .map(
                  (b) => `
                <div class="col-md-6 col-lg-4">
                  <div class="card h-100 shadow-sm border-0 book-card">
                    <div class="card-body">
                      <h6 class="card-title mb-1">${esc(b.title)}</h6>
                      <p class="text-muted small mb-0">
                        <i class="bi bi-calendar"></i> ${b.publishedYear || '—'}
                      </p>
                      <p class="text-muted small">
                        <i class="bi bi-journal-text"></i> ${b.status || 'available'}
                      </p>
                    </div>
                  </div>
                </div>`,
                )
                .join('')}
            </div>`
            : `<p class="text-muted mt-2">No books yet.</p>`
        }
      `;
      detailModal.show();
    } catch (err) {
      toast('Error', 'Cannot load author detail');
    }
  }

  async function openEdit(id) {
    const a = await apiGet(`/authors/${id}`);
    authorId.value = a.id;
    name.value = a.name;
    birthYear.value = a.birthYear || '';
    modalTitle.textContent = 'Edit Author';
    modal.show();
  }

  async function doDelete(id) {
    if (!confirm('Delete this author?')) return;
    await apiDelete(`/authors/${id}`);
    toast('Deleted', 'Author removed');
    load();
  }

  // INIT
  load();
}
