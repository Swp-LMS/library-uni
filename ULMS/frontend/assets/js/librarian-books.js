// assets/js/librarian-books.js
import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from './api.js';

// ===== COMMON UTILITIES =====
function guardRole() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!token || !user || !['admin', 'librarian'].includes(user.role)) {
    location.href = 'login.html?next=librarian-books.html';
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

export function toast(title, body) {
  const area = document.getElementById('toastArea');
  if (!area) {
    alert(`${title}: ${body}`);
    return;
  }
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

// format giá VND
function fmtPrice(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return '-';
  return new Intl.NumberFormat('vi-VN').format(n);
}

// =========================================================
// 🧩 FUNCTION 1: LIST / VIEW / DELETE / UPLOAD (librarian-books.html)
// =========================================================
export async function initLibrarianBooks() {
  if (!guardRole()) return;

  const qEl = document.getElementById('q');
  const sortEl = document.getElementById('sort');
  const btnSearch = document.getElementById('btnSearch');
  const btnAdd = document.getElementById('btnAdd');
  const btnImport = document.getElementById('btnImport');
  const fileImport = document.getElementById('fileImport');
  const tableBody = document.getElementById('tableBody');
  const countEl = document.getElementById('count');
  const pagerEl = document.getElementById('pager');
  const uploader = document.getElementById('uploader');
  const importErrorsCard = document.getElementById('importErrorsCard');
  const importErrorsBody = document.getElementById('importErrorsBody');

  if (!tableBody || !pagerEl) return;

  let page = 1,
    size = 10,
    total = 0,
    query = '',
    sort = sortEl?.value || 'newest';
  let currentUploadId = null;

  // ===== Search / Sort =====
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

  sortEl?.addEventListener('change', () => {
    sort = sortEl.value;
    page = 1;
    load();
  });

  // ===== Import CSV/Excel =====
  btnImport?.addEventListener('click', () => {
    if (!fileImport) {
      console.warn('fileImport input not found');
      toast('Error', 'File input not found');
      return;
    }
    fileImport.click(); // mở hộp thoại chọn file
  });

  fileImport?.addEventListener('change', async () => {
    const file = fileImport.files?.[0];
    if (!file) return;

    try {
      // Gọi API BE: POST /api/books/import
      const res = await apiUpload('/books/import', file);

      // BE trả { success, created, skipped, errors }
      const created = res.created ?? 0;
      const skipped = res.skipped ?? 0;
      const errors = Array.isArray(res.errors) ? res.errors : [];

      toast('Import done', `Created: ${created}, Skipped: ${skipped}`);

      // ✅ vẽ danh sách sách bị từ chối (AI / validate khác)
      renderImportErrors(errors);

      // Reload table
      page = 1;
      await load();
    } catch (err) {
      console.error('Import error:', err);
      toast('Error', err.message || 'Import failed');
    } finally {
      fileImport.value = '';
    }
  });

  // ===== Add Book (đi sang trang Add) =====
  btnAdd?.addEventListener('click', () => {
    location.href = 'librarian-book-add.html';
  });

  // ===== Upload Image (1 cover / book) =====
  tableBody.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-upload]');
    const editBtn = e.target.closest('[data-edit]');
    const viewBtn = e.target.closest('[data-view]');

    if (btn && uploader) {
      currentUploadId = btn.getAttribute('data-upload');
      uploader.click();
      return;
    }

    // Edit qua trang riêng
    if (editBtn) {
      const id = editBtn.getAttribute('data-edit');
      if (id) location.href = `librarian-book-edit.html?id=${id}`;
      return;
    }

    // View chi tiết
    if (viewBtn) {
      const id = viewBtn.getAttribute('data-view');
      if (id) openDetail(id);
      return;
    }
  });

  uploader?.addEventListener('change', async () => {
    const file = uploader.files?.[0];
    if (!file || !currentUploadId) return;
    if (file.size > 2 * 1024 * 1024) {
      toast('Error', 'Ảnh tối đa 2MB');
      uploader.value = '';
      currentUploadId = null;
      return;
    }

    try {
      await apiUpload(`/upload/books/${currentUploadId}/images`, file);
      toast('Success', 'Image uploaded');
      load();
    } catch (err) {
      toast('Error', err.message || 'Upload failed');
    } finally {
      uploader.value = '';
      currentUploadId = null;
    }
  });

  // ===== Hiển thị danh sách sách bị AI từ chối khi import =====
  function renderImportErrors(errors = []) {
    if (!importErrorsCard || !importErrorsBody) return;

    if (!errors.length) {
      // Không có lỗi → ẩn card
      importErrorsCard.classList.add('d-none');
      return;
    }

    // Có lỗi → vẽ lại tbody
    importErrorsBody.innerHTML = errors
      .map(
        (err) => `
        <tr>
          <td>${err.row ?? '-'}</td>
          <td>${esc(err.title ?? '(no title)')}</td>
          <td>${esc(err.reason ?? 'Unknown reason')}</td>
        </tr>
      `,
      )
      .join('');

    importErrorsCard.classList.remove('d-none');
  }

  // ===== Render Rows =====
  function renderRows(items) {
    if (!items.length) {
      tableBody.innerHTML =
        '<tr><td colspan="8" class="text-muted small text-center">No data</td></tr>';
      return;
    }

    tableBody.innerHTML = items
      .map((b) => {
        const imgUrl = b.imageUrl || '';
        const price = b.price ?? null;
        const totalCopies = b.totalCopies ?? '';

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
        <td class="text-end">${fmtPrice(price)}</td>
        <td>${totalCopies}</td>
        <td class="text-end">
          <div class="d-flex justify-content-end gap-2">
            <button class="btn btn-sm btn-light border" data-view="${b.id}" title="View detail">
              <i class="bi bi-eye text-info"></i>
            </button>
            <button class="btn btn-sm btn-light border" data-edit="${b.id}" title="Edit book">
              <i class="bi bi-pencil text-primary"></i>
            </button>
            <button class="btn btn-sm btn-light border" data-upload="${b.id}" title="Upload cover">
              <i class="bi bi-cloud-arrow-up text-success"></i>
            </button>
          </div>
        </td>
      </tr>`;
      })
      .join('');

    // view image full
    tableBody.querySelectorAll('[data-view-img]').forEach((img) => {
      img.addEventListener('click', () => {
        const url = img.getAttribute('data-view-img');
        if (url) window.open(url, '_blank');
      });
    });
  }

  // ===== View Book Detail Modal (thêm Price) =====
  async function openDetail(id) {
    try {
      const res = await apiGet(`/books/${id}`);
      const book = res.data || res;

      let detailModalEl = document.getElementById('bookDetailModal');
      if (!detailModalEl) {
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
                      <p><strong>Total Copies:</strong> <span id="detailTotal"></span></p>
                      <p><strong>Available:</strong> <span id="detailAvailable"></span></p>
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
          </div>`,
        );
        detailModalEl = document.getElementById('bookDetailModal');
      }

      detailModalEl.querySelector('#detailCover').src = book.imageUrl || 'assets/img/no-cover.png';
      detailModalEl.querySelector('#detailTitle').textContent = book.title || '-';
      detailModalEl.querySelector('#detailAuthor').textContent = book.author?.name || '-';
      detailModalEl.querySelector('#detailCategory').textContent = book.category?.name || '-';
      detailModalEl.querySelector('#detailPublisher').textContent = book.publisher?.name || '-';
      detailModalEl.querySelector('#detailPrice').textContent = fmtPrice(book.price);
      detailModalEl.querySelector('#detailTotal').textContent = book.totalCopies ?? '-';
      detailModalEl.querySelector('#detailAvailable').textContent = book.availableCopies ?? '-';
      detailModalEl.querySelector('#detailYear').textContent = book.publishedYear ?? '-';
      detailModalEl.querySelector('#detailDesc').textContent =
        book.description || '(No description)';

      new bootstrap.Modal(detailModalEl).show();
    } catch (err) {
      toast('Error', err.message || 'Cannot load book details');
    }
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
    tableBody.innerHTML =
      '<tr><td colspan="8" class="text-muted small text-center">Loading…</td></tr>';
    try {
      const res = await apiGet(
        `/books?q=${encodeURIComponent(query)}&sort=${sort}&page=${page}&limit=${size}`,
      );
      const data = res.data || res;
      const items = Array.isArray(data.items) ? data.items : [];
      total = data.total ?? items.length;
      renderRows(items);
      if (countEl) countEl.textContent = `${total} record${total > 1 ? 's' : ''}`;
      renderPager();
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="8" class="text-danger small text-center">Load failed: ${esc(
        err.message || 'Unknown error',
      )}</td></tr>`;
      if (countEl) countEl.textContent = '';
      pagerEl.innerHTML = '';
    }
  }

  load();
}

// =========================================================
// 🧩 FUNCTION 2: CREATE / EDIT PAGE — librarian-book-add.html
// =========================================================
export async function initBookCreatePage() {
  if (!guardRole()) return;

  const form = document.getElementById('addBookForm');
  const titleInput = document.getElementById('title');
  const publishedYearInput = document.getElementById('publishedYear');
  const totalCopiesInput = document.getElementById('totalCopies');
  const descriptionInput = document.getElementById('description');
  const priceInput = document.getElementById('price'); // 💰 NEW
  const authorSel = document.getElementById('authorId');
  const categorySel = document.getElementById('categoryId');
  const publisherSel = document.getElementById('publisherId');
  const uploader = document.getElementById('uploader');
  const preview = document.getElementById('preview');

  if (!form) return;

  // detect create / edit
  const params = new URLSearchParams(location.search);
  const editId = params.get('id');
  const isEdit = !!editId;
  let currentBookId = editId || null;
  let selectedFile = null;

  // fillSelect giống admin
  async function fillSelect(sel, path, key = 'name') {
    if (!sel) return;
    const res = await apiGet(path);

    let raw = res;
    if (raw && typeof raw === 'object' && 'data' in raw) raw = raw.data;
    if (raw && typeof raw === 'object' && Array.isArray(raw.items)) raw = raw.items;

    const items = Array.isArray(raw) ? raw : [];

    sel.innerHTML = '<option value="">-- Select --</option>';
    items.forEach((it) => {
      sel.insertAdjacentHTML(
        'beforeend',
        `<option value="${it.id}">${esc(it[key] ?? it.name ?? '')}</option>`,
      );
    });
  }

  await Promise.all([
    fillSelect(authorSel, '/authors'),
    fillSelect(categorySel, '/categories'),
    fillSelect(publisherSel, '/publishers'),
  ]);

  // EDIT MODE
  if (isEdit) {
    try {
      const res = await apiGet(`/books/${editId}`);
      const book = res.data || res;
      currentBookId = book.id;

      const header = document.querySelector('.card-header');
      if (header) header.innerHTML = '<i class="bi bi-pencil-square me-1"></i> Edit Book';

      titleInput.value = book.title || '';
      descriptionInput.value = book.description || '';
      publishedYearInput.value = book.publishedYear ?? '';
      totalCopiesInput.value = book.totalCopies ?? 0;
      if (priceInput) priceInput.value = book.price ?? ''; // 💰 load giá

      if (authorSel) authorSel.value = book.author?.id || book.authorId || '';
      if (categorySel) categorySel.value = book.category?.id || book.categoryId || '';
      if (publisherSel) publisherSel.value = book.publisher?.id || book.publisherId || '';

      if (book.imageUrl && preview) {
        preview.innerHTML = `<img src="${esc(
          book.imageUrl,
        )}" alt="cover" style="max-width:250px;border-radius:8px;"/>`;
      }
    } catch (err) {
      console.error(err);
      toast('Error', 'Cannot load book data');
    }
  }

  // Preview ảnh
  if (preview && uploader) {
    preview.addEventListener('click', () => uploader.click());
    uploader.addEventListener('change', () => {
      const file = uploader.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        uploader.value = '';
        toast('Error', 'Ảnh tối đa 2MB');
        return;
      }
      selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        preview.innerHTML = `<img src="${e.target.result}" alt="preview" style="max-width:250px;border-radius:8px;"/>`;
      };
      reader.readAsDataURL(file);
    });
  }

  // Submit Form (create + edit)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const copies = Number(totalCopiesInput.value);
    if (!Number.isInteger(copies) || copies <= 0) {
      toast('Warning', 'Total copies phải ≥ 1');
      return;
    }

    // Validate price
    const priceRaw = (priceInput?.value || '').trim();
    const price = priceRaw === '' ? 0 : Number(priceRaw);
    if (!Number.isFinite(price) || price < 0) {
      toast('Warning', 'Price must be a number ≥ 0');
      return;
    }

    const payload = {
      title: titleInput.value.trim(),
      publishedYear: Number(publishedYearInput.value) || null,
      totalCopies: copies,
      price,
      authorId: Number(authorSel?.value) || null,
      categoryId: Number(categorySel?.value) || null,
      publisherId: Number(publisherSel?.value) || null,
      description: descriptionInput.value.trim() || null,
    };

    if (!payload.title) {
      toast('Warning', 'Title is required');
      return;
    }

    try {
      let book;

      if (currentBookId) {
        const res = await apiPut(`/books/${currentBookId}`, payload);
        book = res.data || res;
        toast('Success', 'Book updated successfully');
      } else {
        const res = await apiPost('/books', payload);
        book = res.data || res;
        currentBookId = book.id;
        toast('Success', 'Book created successfully');
      }

      if (selectedFile && book?.id) {
        await apiUpload(`/upload/books/${book.id}/images`, selectedFile);
        toast('Success', 'Image uploaded');
      }

      setTimeout(() => {
        location.href = 'librarian-books.html';
      }, 800);
    } catch (err) {
      console.error(err);
      toast('Error', err.message || 'Save failed');
    }
  });
}
