// frontend/assets/js/admin-publishers.js
import { apiGet, apiPost, apiPut, apiDelete } from './api.js';

export function initPublishersAdmin() {
  const tableBody = document.getElementById('tableBody');
  const countEl = document.getElementById('count');
  const pagerEl = document.getElementById('pager');
  const form = document.getElementById('publisherForm');
  const modalEl = document.getElementById('publisherModal');
  const modal = new bootstrap.Modal(modalEl);
  const modalTitle = document.getElementById('modalTitle');
  const btnAdd = document.getElementById('btnAdd');

  const qEl = document.getElementById('q');
  const sortEl = document.getElementById('sort');
  const btnSearch = document.getElementById('btnSearch');

  const publisherId = document.getElementById('publisherId');
  const name = document.getElementById('name');
  const address = document.getElementById('address');
  const website = document.getElementById('website');
  const description = document.getElementById('description');

  let page = 1;
  const size = 10;
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
    if (!area) return;
    const id = `t${Date.now()}`;
    area.insertAdjacentHTML(
      'beforeend',
      `
      <div id="${id}" class="toast text-bg-dark border-0" data-bs-delay="2500">
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

  // === Add new ===
  btnAdd.addEventListener('click', () => {
    form.reset();
    publisherId.value = '';
    modalTitle.textContent = 'Add Publisher';
    modal.show();
  });

  // === Search / Sort ===
  function doSearch() {
    query = qEl.value.trim();
    page = 1;
    load();
  }

  btnSearch.addEventListener('click', doSearch);

  qEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      doSearch();
    }
  });

  sortEl.addEventListener('change', () => {
    sort = sortEl.value;
    page = 1;
    load();
  });

  // === Submit form ===
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: name.value.trim(),
      address: address.value.trim() || null,
      website: website.value.trim() || null,
      description: description.value.trim() || null,
    };
    if (!payload.name) {
      name.focus();
      return;
    }
    try {
      if (publisherId.value) {
        await apiPut(`/publishers/${publisherId.value}`, payload);
        toast('Success', 'Publisher updated');
      } else {
        await apiPost('/publishers', payload);
        toast('Success', 'Publisher created');
      }
      modal.hide();
      load();
    } catch (err) {
      console.error(err);
      toast('Error', err.message || 'Save failed');
    }
  });

  // === LOAD: lấy list + filter + sort + paginate ở FE ===
  async function load() {
    tableBody.innerHTML = `<tr><td colspan="6" class="text-muted small">Loading…</td></tr>`;

    try {
      // 1) Lấy full list từ BE
      const data = await apiGet(`/publishers?_t=${Date.now()}`);
      let items = Array.isArray(data) ? data : data.items || data.data || [];

      // 2) Search theo name / address / website (FE)
      if (query) {
        const qLower = query.toLowerCase();
        items = items.filter((p) => {
          const n = String(p.name || '').toLowerCase();
          const a = String(p.address || '').toLowerCase();
          const w = String(p.website || '').toLowerCase();
          return n.includes(qLower) || a.includes(qLower) || w.includes(qLower);
        });
      }

      // 3) Sort (FE)
      items = [...items];
      items.sort((a, b) => {
        if (sort === 'name') {
          return String(a.name || '').localeCompare(String(b.name || ''));
        }
        return (a.id || 0) - (b.id || 0); // sort by id
      });

      // 4) Paginate (FE)
      total = items.length;
      const start = (page - 1) * size;
      const pageItems = items.slice(start, start + size);

      renderRows(pageItems);
      countEl.textContent = `${total} record${total > 1 ? 's' : ''}`;
      renderPager();
    } catch (err) {
      console.error('Load publishers error:', err);
      tableBody.innerHTML = `<tr><td colspan="6" class="text-danger small">Load failed: ${esc(
        err.message || 'Error',
      )}</td></tr>`;
    }
  }

  function renderRows(items) {
    if (!items.length) {
      tableBody.innerHTML = `<tr><td colspan="6" class="text-muted text-center small">No publishers found</td></tr>`;
      return;
    }
    tableBody.innerHTML = items
      .map(
        (p) => `
      <tr>
        <td>${p.id}</td>
        <td>${esc(p.name)}</td>
        <td>${esc(p.address || '')}</td>
        <td>${esc(p.website || '')}</td>
        <td class="small">${esc(p.description || '')}</td>
        <td class="text-center">
          <div class="d-flex justify-content-center gap-2">
            <button class="btn btn-sm btn-light border" data-edit="${p.id}">
              <i class="bi bi-pencil text-primary"></i>
            </button>
            <button class="btn btn-sm btn-light border" data-del="${p.id}">
              <i class="bi bi-trash text-danger"></i>
            </button>
          </div>
        </td>
      </tr>`,
      )
      .join('');

    tableBody
      .querySelectorAll('[data-edit]')
      .forEach((btn) => btn.addEventListener('click', () => openEdit(btn.dataset.edit)));
    tableBody
      .querySelectorAll('[data-del]')
      .forEach((btn) => btn.addEventListener('click', () => doDelete(btn.dataset.del)));
  }

  async function openEdit(id) {
    try {
      const res = await apiGet(`/publishers/${id}`);
      const p = res.data || res; // phòng trường hợp BE bọc trong { data: ... }

      publisherId.value = p.id;
      name.value = p.name || '';
      address.value = p.address || '';
      website.value = p.website || '';
      description.value = p.description || '';
      modalTitle.textContent = 'Edit Publisher';
      modal.show();
    } catch (err) {
      console.error(err);
      toast('Error', 'Cannot load publisher');
    }
  }

  async function doDelete(id) {
    if (!confirm('Delete this publisher?')) return;
    try {
      await apiDelete(`/publishers/${id}`);
      toast('Deleted', 'Publisher removed');
      // nếu xoá hết ở page hiện tại thì lùi 1 page
      if ((page - 1) * size >= total - 1 && page > 1) {
        page -= 1;
      }
      load();
    } catch (err) {
      console.error(err);
      toast('Error', 'Delete failed');
    }
  }

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

  // INIT
  load();
}
