import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from './api.js';

// ===== COMMON UTILITIES =====
function guardRole() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!token || !user || !['admin', 'librarian'].includes(user.role)) {
    location.href = 'login.html';
  }
}

function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function toast(title, body) {
  const area = document.getElementById('toastArea');
  if (!area) return alert(`${title}: ${body}`);
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

// ===== Helper format price (VND) =====
function fmtPrice(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return '-';
  return new Intl.NumberFormat('vi-VN').format(n);
}

// =========================================================
// 🧩 FUNCTION 1: MAIN PAGE — LIST / EDIT / DELETE / UPLOAD
// =========================================================
export async function initBooksAdmin() {
  guardRole();

  // DOM
  const qEl = document.getElementById('q');
  const sortEl = document.getElementById('sort');
  const btnSearch = document.getElementById('btnSearch');
  const btnAdd = document.getElementById('btnAdd');
  const tableBody = document.getElementById('tableBody');
  const countEl = document.getElementById('count');
  const pagerEl = document.getElementById('pager');
  const uploader = document.getElementById('uploader');

  // Modal
  const modalEl = document.getElementById('bookModal');
  const modal = new bootstrap.Modal(modalEl);
  const form = document.getElementById('bookForm');
  const modalTitle = document.getElementById('modalTitle');

  const bookId = document.getElementById('bookId');
  const title = document.getElementById('title');
  const publishYear = document.getElementById('publishYear');
  const totalCopies = document.getElementById('totalCopies');
  const description = document.getElementById('description');
  const authorId = document.getElementById('authorId');
  const categoryId = document.getElementById('categoryId');
  const publisherId = document.getElementById('publisherId');
  const statusGroup = document.getElementById('statusGroup');
  const statusSelect = document.getElementById('status');

  // STATE
  let page = 1,
    size = 10,
    total = 0,
    query = '',
    sort = 'newest';
  let currentUploadId = null;

  // ===== Load dropdown =====
  async function loadSelects() {
    try {
      const [authors, categories, publishers] = await Promise.all([
        apiGet('/authors'),
        apiGet('/categories'),
        apiGet('/publishers'),
      ]);
      fillSelect(authorId, authors);
      fillSelect(categoryId, categories);
      fillSelect(publisherId, publishers);
    } catch {
      toast('Error', 'Cannot load dropdowns');
    }
  }

  function fillSelect(select, items) {
    select.innerHTML = '<option value="">-- Select --</option>';
    if (!Array.isArray(items)) return;
    for (const it of items) {
      select.insertAdjacentHTML('beforeend', `<option value="${it.id}">${esc(it.name)}</option>`);
    }
  }

  // ===== Search / Sort =====
  btnSearch?.addEventListener('click', () => {
    query = qEl.value.trim();
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
  sortEl?.addEventListener('change', () => {
    sort = sortEl.value;
    page = 1;
    load();
  });

  // ===== Add Book (quick add bằng modal, không có price) =====
  btnAdd?.addEventListener('click', async () => {
    form.reset();
    bookId.value = '';
    modalTitle.textContent = 'Add Book';
    statusGroup.classList.add('d-none');
    await loadSelects();
    modal.show();
  });

  // ===== Submit Form (modal) =====
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentBookId = bookId.value?.trim() || null;
    const payload = {
      title: title.value.trim(),
      publishedYear: Number(publishYear.value) || null,
      totalCopies: Number(totalCopies.value) || 0,
      description: description.value.trim() || null,
      authorId: Number(authorId.value) || null,
      categoryId: Number(categoryId.value) || null,
      publisherId: Number(publisherId.value) || null,
    };
    if (currentBookId) payload.status = statusSelect.value || 'available';

    try {
      if (currentBookId) {
        await apiPut(`/books/${currentBookId}`, payload);
        toast('Success', 'Book updated');
      } else {
        if (!payload.title) return toast('Warning', 'Title is required');
        await apiPost('/books', payload);
        toast('Success', 'Book created');
      }
      modal.hide();
      load();
    } catch (err) {
      toast('Error', err.message || 'Save failed');
    }
  });

  // ===== Upload Image =====
  tableBody?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-upload]');
    if (!btn) return;
    currentUploadId = btn.getAttribute('data-upload');
    uploader.click();
  });

  uploader?.addEventListener('change', async () => {
    const file = uploader.files?.[0];
    if (!file || !currentUploadId) return;
    if (file.size > 2 * 1024 * 1024) return toast('Error', 'Ảnh tối đa 2MB');

    try {
      const res = await apiUpload(`/upload/books/${currentUploadId}/images`, file);
      toast('Success', 'Image uploaded: ' + (res.image?.url || ''));
      load();
    } catch (err) {
      toast('Error', err.message || 'Upload failed');
    } finally {
      uploader.value = '';
      currentUploadId = null;
    }
  });

  // ===== Render Rows (có cột Price) =====
  function renderRows(items) {
    if (!items.length) {
      tableBody.innerHTML = `<tr><td colspan="9" class="text-muted small text-center">No data</td></tr>`;
      return;
    }

    tableBody.innerHTML = items
      .map((b) => {
        const imgUrl = b.imageUrl || '';
        const totalCopies = b.totalCopies ?? 0;
        const availableCopies = b.availableCopies ?? totalCopies;
        const price = b.price ?? null;

        return `
  <tr>
    <td>
      ${
        imgUrl
          ? `<img src="${esc(imgUrl)}" alt="cover"
               style="width:60px;height:80px;object-fit:cover;border-radius:4px;cursor:pointer;"
               data-view-img="${esc(imgUrl)}">`
          : `<div class="text-muted small fst-italic">No Image</div>`
      }
    </td>
    <td>${b.id}</td>
    <td>${esc(b.title)}</td>
    <td>${esc(b.author?.name || '')}</td>
    <td>${esc(b.category?.name || '')}</td>
    <td>${esc(b.publisher?.name || '')}</td>
    <!-- 👇 PRICE mới -->
    <td class="text-end">${fmtPrice(price)}</td>
    <!-- copies -->
    <td>${availableCopies}</td>
    <td class="text-center">
      <div class="d-flex justify-content-center gap-2">
        <button class="btn btn-sm btn-light border" data-view="${b.id}" title="View detail">
          <i class="bi bi-eye text-info"></i>
        </button>
        <button class="btn btn-sm btn-light border" data-edit="${b.id}" title="Edit book">
          <i class="bi bi-pencil text-primary"></i>
        </button>
        <button class="btn btn-sm btn-light border" data-del="${b.id}" title="Delete book">
          <i class="bi bi-trash text-danger"></i>
        </button>
      </div>
    </td>
  </tr>`;
      })
      .join('');

    // view ảnh full
    tableBody.querySelectorAll('[data-view-img]').forEach((img) => {
      img.addEventListener('click', () => {
        const url = img.getAttribute('data-view-img');
        if (url) window.open(url, '_blank');
      });
    });

    // === View Detail ===
    tableBody.querySelectorAll('[data-view]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-view');
        try {
          const res = await apiGet(`/books/${id}`);
          const book = res.data || res;
          showBookDetail(book);
        } catch (err) {
          toast('Error', err.message || 'Cannot load book details');
        }
      });
    });

    // === Edit ===
    tableBody.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-edit');
        location.href = `admin-book-edit.html?id=${id}`;
      });
    });

    // === Delete ===
    tableBody.querySelectorAll('[data-del]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-del');
        if (!confirm('Delete this book?')) return;
        try {
          await apiDelete(`/books/${id}`);
          toast('Success', 'Deleted');
          load();
        } catch {
          toast('Error', 'Delete failed');
        }
      });
    });
  }

  // ===== View Book Detail Modal (hiện thêm Price) =====
  function showBookDetail(book) {
    let modalEl = document.getElementById('bookDetailModal');
    if (!modalEl) {
      document.body.insertAdjacentHTML(
        'beforeend',
        `
        <div class="modal fade" id="bookDetailModal" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Book Details</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body p-4">
                <div class="row g-4">
                  <div class="col-md-4 text-center">
                    <img id="detailCover" class="img-fluid rounded shadow-sm" alt="Cover" />
                  </div>
                  <div class="col-md-8">
                    <h5 id="detailTitle" class="fw-semibold mb-2"></h5>
                    <p><strong>Author:</strong> <span id="detailAuthor"></span></p>
                    <p><strong>Category:</strong> <span id="detailCategory"></span></p>
                    <p><strong>Publisher:</strong> <span id="detailPublisher"></span></p>
                    <p><strong>Price:</strong> <span id="detailPrice"></span></p>
                    <p><strong>Copies (available / total):</strong> <span id="detailCopies"></span></p>
                    <p><strong>Published Year:</strong> <span id="detailYear"></span></p>
                    <p><strong>Description:</strong><br><span id="detailDesc" class="text-muted"></span></p>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
              </div>
            </div>
          </div>
        </div>
      `,
      );
      modalEl = document.getElementById('bookDetailModal');
    }

    const totalCopies = book.totalCopies ?? 0;
    const availableCopies = book.availableCopies ?? totalCopies;

    modalEl.querySelector('#detailCover').src = book.imageUrl || 'assets/img/no-cover.png';
    modalEl.querySelector('#detailTitle').textContent = book.title || '-';
    modalEl.querySelector('#detailAuthor').textContent = book.author?.name || '-';
    modalEl.querySelector('#detailCategory').textContent = book.category?.name || '-';
    modalEl.querySelector('#detailPublisher').textContent = book.publisher?.name || '-';
    modalEl.querySelector('#detailPrice').textContent = fmtPrice(book.price);
    modalEl.querySelector('#detailCopies').textContent = `${availableCopies} / ${totalCopies}`;
    modalEl.querySelector('#detailYear').textContent = book.publishedYear ?? '-';
    modalEl.querySelector('#detailDesc').textContent = book.description || '(No description)';

    new bootstrap.Modal(modalEl).show();
  }

  // ===== Pagination =====
  function renderPager() {
    const pages = Math.max(1, Math.ceil(total / size));
    pagerEl.innerHTML = '';
    const add = (p, label, active = false, disabled = false) => {
      pagerEl.insertAdjacentHTML(
        'beforeend',
        `<li class="page-item ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}">
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

  // ===== Load =====
  async function load() {
    tableBody.innerHTML = `<tr><td colspan="9" class="text-muted small text-center">Loading…</td></tr>`;
    try {
      const res = await apiGet(`/books?q=${query}&sort=${sort}&page=${page}&limit=${size}`);
      const data = res.data || res;
      const items = Array.isArray(data.items) ? data.items : [];
      total = data.total ?? items.length;
      renderRows(items);
      countEl.textContent = `${total} record${total > 1 ? 's' : ''}`;
      renderPager();
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="9" class="text-danger small text-center">Load failed: ${esc(
        err.message,
      )}</td></tr>`;
    }
  }

  await loadSelects();
  await load();
}

// =========================================================
// 🧩 FUNCTION 2: CREATE PAGE — ADMIN ADD BOOK PAGE
// =========================================================
export async function initBookCreatePage() {
  guardRole();

  const form = document.getElementById('addBookForm');
  const title = document.getElementById('title');
  const publishedYear = document.getElementById('publishedYear');
  const totalCopiesInput = document.getElementById('totalCopies');
  const priceInput = document.getElementById('price'); // 💰 NEW
  const authorId = document.getElementById('authorId');
  const categoryId = document.getElementById('categoryId');
  const publisherId = document.getElementById('publisherId');
  const description = document.getElementById('description');
  const uploader = document.getElementById('uploader');
  const preview = document.getElementById('preview');
  let selectedFile = null;

  // ====== DÙNG CHUNG CHO CREATE + EDIT ======
  async function fillSelect(sel, path, key = 'name') {
    const res = await apiGet(path);

    // Chuẩn hóa dữ liệu trả về
    let raw = res;
    if (raw && typeof raw === 'object' && 'data' in raw) {
      raw = raw.data;
    }

    let items;
    if (Array.isArray(raw)) {
      items = raw;
    } else if (raw && Array.isArray(raw.items)) {
      items = raw.items;
    } else {
      items = [];
    }

    sel.innerHTML = '<option value="">-- Select --</option>';
    items.forEach((it) => {
      sel.insertAdjacentHTML(
        'beforeend',
        `<option value="${it.id}">${esc(it[key] ?? it.name ?? '')}</option>`,
      );
    });
  }

  await Promise.all([
    fillSelect(authorId, '/authors'),
    fillSelect(categoryId, '/categories'),
    fillSelect(publisherId, '/publishers'),
  ]);

  // Preview ảnh
  preview.addEventListener('click', () => uploader.click());
  uploader.addEventListener('change', () => {
    const file = uploader.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast('Error', 'Ảnh tối đa 2MB');
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.innerHTML = `<img src="${e.target.result}" alt="preview" style="max-width:250px;border-radius:8px;"/>`;
    };
    reader.readAsDataURL(file);
  });

  // ===== Submit Form =====
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const copies = Number(totalCopiesInput.value);
    if (!Number.isInteger(copies) || copies <= 0) {
      return toast('Warning', 'Total copies phải ≥ 1');
    }

    // 💰 price
    const priceRaw = (priceInput?.value || '').trim();
    const price = priceRaw === '' ? 0 : Number(priceRaw);
    if (!Number.isFinite(price) || price < 0) {
      return toast('Warning', 'Price must be a number ≥ 0');
    }

    const payload = {
      title: title.value.trim(),
      publishedYear: Number(publishedYear.value) || null,
      totalCopies: copies,
      price, // 💰 gửi lên backend
      authorId: Number(authorId.value) || null,
      categoryId: Number(categoryId.value) || null,
      publisherId: Number(publisherId.value) || null,
      description: description.value.trim() || null,
    };

    if (!payload.title) return toast('Warning', 'Title is required');

    try {
      const res = await apiPost('/books', payload);
      const book = res.data || res;

      toast('Success', 'Book created successfully');

      if (selectedFile && book?.id) {
        await apiUpload(`/upload/books/${book.id}/images`, selectedFile);
        toast('Success', 'Image uploaded');
      }

      setTimeout(() => (location.href = 'admin-books.html'), 1000);
    } catch (err) {
      toast('Error', err.message || 'Save failed');
    }
  });
}
