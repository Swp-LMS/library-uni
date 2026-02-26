import { apiGet, apiPost, apiPut, apiDelete } from './api.js';

export function initCategoriesAdmin() {
  const tableBody = document.getElementById('tableBody');
  const countEl = document.getElementById('count');
  const pagerEl = document.getElementById('pager');
  const btnAdd = document.getElementById('btnAdd');
  const form = document.getElementById('categoryForm');
  const modalEl = document.getElementById('categoryModal');
  const modal = new bootstrap.Modal(modalEl);
  const modalTitle = document.getElementById('modalTitle');

  // Detail modal
  const detailModal = new bootstrap.Modal(document.getElementById('categoryDetailModal'));
  const detailContent = document.getElementById('categoryDetailContent');

  // Form fields
  const categoryId = document.getElementById('categoryId');
  const name = document.getElementById('name');
  const description = document.getElementById('description');
  const borrowDurationInput = document.getElementById('borrowDuration');

  // Search & sort
  const qEl = document.getElementById('q');
  const sortEl = document.getElementById('sort');
  const btnSearch = document.getElementById('btnSearch');

  let page = 1,
    size = 10,
    total = 0,
    query = '',
    sort = 'id';

  const esc = (s = '') =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  // ===== Toast helper =====
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

  // ===== Search =====
  btnSearch.addEventListener('click', () => doSearch());
  qEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
  });
  sortEl.addEventListener('change', () => {
    sort = sortEl.value;
    page = 1;
    load();
  });

  function doSearch() {
    query = qEl.value.trim();
    page = 1;
    load();
  }

  // ===== Add new =====
  btnAdd.addEventListener('click', () => {
    form.reset();
    categoryId.value = '';
    borrowDurationInput.value = '';
    modalTitle.textContent = 'Add Category';
    modal.show();
  });

  // ===== Submit form =====
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rawDuration = borrowDurationInput.value.trim();
    const durationNumber = rawDuration === '' ? null : Number(rawDuration);

    const payload = {
      name: name.value.trim(),
      description: description.value.trim() || null,
      // truyền null hoặc số dương, để service xử lý <=0 => null
      borrowDuration:
        durationNumber == null || Number.isNaN(durationNumber) ? null : durationNumber,
    };

    if (!payload.name) {
      name.focus();
      return;
    }

    try {
      if (categoryId.value) {
        await apiPut(`/categories/${categoryId.value}`, payload);
        toast('Success', 'Category updated');
      } else {
        await apiPost('/categories', payload);
        toast('Success', 'Category created');
      }
      modal.hide();
      load();
    } catch (err) {
      toast('Error', err.message || 'Save failed');
    }
  });

  // ===== Load data =====
  // ===== Load data =====
  async function load() {
    const params = [];
    if (query) params.push(`q=${encodeURIComponent(query)}`);
    params.push(`sort=${sort}`, `page=${page}`, `limit=${size}`); // 👈 dùng limit

    const path = `/categories?${params.join('&')}`;

    tableBody.innerHTML = `<tr><td colspan="6" class="text-muted small">Loading…</td></tr>`;
    try {
      const data = await apiGet(path);

      // backend trả { items, total, page, limit, pageCount }
      const items = Array.isArray(data) ? data : data.items || [];
      total = Array.isArray(data) ? items.length : (data.total ?? items.length);

      renderRows(items);
      countEl.textContent = `${total} record${total > 1 ? 's' : ''}`;
      renderPager();
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="6" class="text-danger small">Load failed: ${esc(
        err.message,
      )}</td></tr>`;
      countEl.textContent = '';
      pagerEl.innerHTML = '';
    }
  }

  // ===== Render table =====
  function renderRows(items) {
    if (!items.length) {
      tableBody.innerHTML = `<tr><td colspan="6" class="text-muted small text-center">No categories found</td></tr>`;
      return;
    }

    tableBody.innerHTML = items
      .map((c) => {
        const dur = c.borrowDuration;
        const durLabel =
          dur && dur > 0
            ? `${dur} day${dur > 1 ? 's' : ''}`
            : `<span class="text-muted small">Default</span>`;

        return `
        <tr>
          <td>${c.id}</td>
          <td>${esc(c.name)}</td>
          <td id="books-${c.id}" class="text-muted small">Loading...</td>
          <td class="small">${esc(c.description || '')}</td>
          <td class="small">${durLabel}</td>
          <td class="text-center">
            <div class="d-flex justify-content-center gap-2">
              <button class="btn btn-sm btn-light border" data-view="${c.id}" title="View detail">
                <i class="bi bi-eye text-info"></i>
              </button>
              <button class="btn btn-sm btn-light border" data-edit="${c.id}" title="Edit category">
                <i class="bi bi-pencil text-primary"></i>
              </button>
              <button class="btn btn-sm btn-light border" data-del="${c.id}" title="Delete category">
                <i class="bi bi-trash text-danger"></i>
              </button>
            </div>
          </td>
        </tr>`;
      })
      .join('');

    // Bind events
    tableBody
      .querySelectorAll('[data-view]')
      .forEach((b) => b.addEventListener('click', () => openDetail(b.dataset.view)));
    tableBody
      .querySelectorAll('[data-edit]')
      .forEach((b) => b.addEventListener('click', () => openEdit(b.dataset.edit)));
    tableBody
      .querySelectorAll('[data-del]')
      .forEach((b) => b.addEventListener('click', () => doDelete(b.dataset.del)));

    // Load book counts
    items.forEach(async (c) => {
      try {
        const res = await apiGet(`/categories/${c.id}`);
        const books = res.data?.books || res.books || [];
        const el = document.getElementById(`books-${c.id}`);
        if (el) el.textContent = `${books.length} book${books.length !== 1 ? 's' : ''}`;
      } catch {
        const el = document.getElementById(`books-${c.id}`);
        if (el) el.textContent = '0 book';
      }
    });
  }

  // ===== View detail =====
  async function openDetail(id) {
    try {
      const res = await apiGet(`/categories/${id}`);
      const c = res.data || res;
      const books = c.books || [];
      const dur = c.borrowDuration;
      const durText = dur && dur > 0 ? `${dur} day${dur > 1 ? 's' : ''}` : 'Default settings';

      detailContent.innerHTML = `
        <h4 class="mb-1">${esc(c.name)}</h4>
        <p class="text-muted mb-1">${esc(c.description || 'No description')}</p>
        <p class="small text-muted">
          <i class="bi bi-clock-history me-1"></i>
          Loan duration override: <strong>${durText}</strong>
        </p>
        <hr>
        <h5>Books in this category (${books.length})</h5>
        ${
          books.length
            ? `<div class="row g-3 mt-2">
                ${books
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
                          <i class="bi bi-building"></i> ${b.publisher?.name || '—'}
                        </p>
                      </div>
                    </div>
                  </div>`,
                  )
                  .join('')}
              </div>`
            : `<p class="text-muted mt-2">No books in this category.</p>`
        }
      `;
      detailModal.show();
    } catch (err) {
      toast('Error', 'Cannot load category detail');
    }
  }

  // ===== Edit =====
  async function openEdit(id) {
    try {
      const item = await apiGet(`/categories/${id}`);
      categoryId.value = item.id;
      name.value = item.name || '';
      description.value = item.description || '';
      borrowDurationInput.value =
        item.borrowDuration && item.borrowDuration > 0 ? item.borrowDuration : '';
      modalTitle.textContent = 'Edit Category';
      modal.show();
    } catch (err) {
      toast('Error', err.message || 'Cannot load category');
    }
  }

  // ===== Delete =====
  async function doDelete(id) {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await apiDelete(`/categories/${id}`);
      toast('Deleted', 'Category removed');
      load();
    } catch (err) {
      toast('Error', err.message || 'Delete failed');
    }
  }

  // ===== Pagination =====
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
    for (let i = 1; i <= pages && i <= 10; i++) add(i, i, i === page);
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

  // ===== INIT =====
  load();
}
