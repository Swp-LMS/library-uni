// assets/js/home.js
import { apiGet } from './api.js';

export function initHome() {
  const grid = document.getElementById('bookGrid');
  const count = document.getElementById('countBrowse');
  const pager = document.getElementById('pagerBrowse');
  const filter = document.getElementById('availFilter');
  const chips = document.getElementById('catChips');
  const qInput = document.getElementById('q');
  const btnSearch = document.getElementById('btnSearch');
  const sortSelect = document.getElementById('sortBrowse');

  let books = [];
  let currentBooks = [];
  let currentCategory = 'all';
  let currentFilter = 'all';
  let currentPage = 1;
  const perPage = 9;
  let currentQuery = '';
  let currentSort = 'newest';

  /* ========== helpers ========== */
  function esc(s = '') {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Lấy điểm rating từ book (ưu tiên avgRating, fallback rating/averageRating)
  function getRating(book) {
    const raw = book.avgRating ?? book.rating ?? book.averageRating ?? 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }

  function getImageUrl(book) {
    if (book.imageUrl) return book.imageUrl;
    if (Array.isArray(book.images) && book.images.length > 0) {
      return book.images[0].url;
    }
    if (Array.isArray(book.imageRelations) && book.imageRelations.length > 0) {
      const firstRel = book.imageRelations[0];
      if (firstRel.image?.url) return firstRel.image.url;
      if (firstRel.url) return firstRel.url;
    }
    return 'https://via.placeholder.com/400x300?text=No+Cover';
  }

  /* ========== Fetch Books ========== */
  async function loadBooks(query = '') {
    grid.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary"></div>
        <p class="mt-2 text-muted">Loading books...</p>
      </div>
    `;

    try {
      const params = new URLSearchParams();

      if (query) params.set('q', query);
      // lấy nhiều hơn để lọc + sort phía FE
      params.set('limit', '150');

      const url = `/books?${params.toString()}`;
      console.log('[HOME] Load books from:', url);

      const data = await apiGet(url);
      books = Array.isArray(data) ? data : data.items || data.books || [];

      console.log('[HOME] Books loaded:', books.length);

      updateHighlights();
      renderCategoryChips();
      filterBooks();
    } catch (err) {
      console.error('[HOME] Load books error:', err);
      grid.innerHTML = `<div class="alert alert-danger">Load failed: ${esc(err.message)}</div>`;
    }
  }

  /* ========== Highlights ========== */
  function updateHighlights() {
    document.getElementById('statTotal').textContent = books.length || 0;
    const available = books.filter((b) => (b.availableCopies ?? 0) > 0).length;
    document.getElementById('statAvailable').textContent = available || 0;

    if (books.length) {
      const pick = books[Math.floor(Math.random() * books.length)];
      document.getElementById('statPick').textContent = pick?.title || '—';
    } else {
      document.getElementById('statPick').textContent = '—';
    }
  }

  /* ========== Sort ========== */
  function sortCurrentBooks() {
    switch (currentSort) {
      case 'title_asc':
        currentBooks.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'title_desc':
        currentBooks.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
        break;
      case 'rating_desc':
        currentBooks.sort((a, b) => getRating(b) - getRating(a));
        break;
      case 'rating_asc':
        currentBooks.sort((a, b) => getRating(a) - getRating(b));
        break;
      case 'newest':
      default: {
        const getId = (x) => Number(x.id) || 0;
        currentBooks.sort((a, b) => getId(b) - getId(a));
        break;
      }
    }
  }

  /* ========== Filter + render ========== */
  function filterBooks() {
    currentBooks = books.filter((b) => {
      const matchCat =
        currentCategory === 'all' ||
        b.category === currentCategory ||
        b.category?.name === currentCategory;

      const avail = Number(b.availableCopies ?? b.totalCopies ?? 0);
      const matchAvail = currentFilter === 'all' || (currentFilter === 'available' && avail > 0);

      return matchCat && matchAvail;
    });

    sortCurrentBooks();
    currentPage = 1;
    renderBooks();
  }

  function renderBooks() {
    const start = (currentPage - 1) * perPage;
    const end = start + perPage;
    const pageBooks = currentBooks.slice(start, end);

    if (!pageBooks.length) {
      grid.innerHTML = `
        <div class="col-12 text-center text-muted py-5">
          No books found
        </div>
      `;
      count.textContent = '';
      pager.innerHTML = '';
      return;
    }

    grid.innerHTML = pageBooks
      .map((b) => {
        const author = b.author?.name || 'Unknown';
        const category = b.category?.name || '—';
        const publisher = b.publisher?.name || '';
        const year = b.publishedYear || '';
        const desc = b.description ? b.description.slice(0, 100) + '…' : '';
        const avail = Number(b.availableCopies ?? 0);
        const statusBadge =
          avail > 0
            ? `<span class="badge bg-success"><i class="bi bi-check"></i> Available</span>`
            : `<span class="badge bg-danger">Unavailable</span>`;

        const imageUrl = esc(getImageUrl(b));
        const safeTitle = esc(b.title || 'Untitled');

        // ⭐ hiển thị rating (nếu có)
        const ratingVal = getRating(b);
        let ratingHtml = '';
        if (ratingVal > 0) {
          const clamped = Math.max(0, Math.min(5, Math.round(ratingVal)));
          const stars = '★'.repeat(clamped) + '☆'.repeat(5 - clamped);
          ratingHtml = `
            <div class="text-warning small mb-1">
              ${stars}
              <span class="text-muted ms-1">(${ratingVal.toFixed(1)})</span>
            </div>
          `;
        }

        return `
      <div class="col-12 col-md-6 col-lg-4">
        <div class="card h-100 shadow-sm border-0 overflow-hidden">
          <div class="ratio ratio-4x3 bg-light position-relative">
            <img
              src="${imageUrl}"
              alt="${safeTitle}"
              class="object-fit-cover w-100 h-100"
              style="transition: opacity 0.3s; opacity:0;"
              loading="lazy"
              onerror="this.onerror=null; this.src='https://via.placeholder.com/400x300?text=No+Cover'; this.style.opacity='0.8';"
            >
            <div class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-light"
                 style="opacity:1; transition:opacity 0.3s; pointer-events:none;"
                 data-loading-placeholder>
              <div class="spinner-border spinner-border-sm text-primary"></div>
            </div>
          </div>
          <div class="card-body d-flex flex-column">
            <div class="d-flex justify-content-between mb-2">
              <span class="badge bg-secondary">${esc(category)}</span>
              ${statusBadge}
            </div>
            <h5 class="card-title mb-1">${safeTitle}</h5>
            <p class="text-muted small mb-1">${esc(author)}</p>
            ${ratingHtml}
            <p class="small text-muted mb-2">
              ${publisher ? `Publisher: ${esc(publisher)}` : '&nbsp;'}
            </p>
            <p class="card-text text-body-secondary small mb-3"
               style="height:60px;overflow:hidden;">
              ${esc(desc)}
            </p>
            <div class="mt-auto d-flex justify-content-between align-items-center">
              <small class="text-muted">
                <i class="bi bi-calendar3"></i> ${year}
              </small>
              <a href="book-detail.html?id=${b.id}" class="btn btn-sm btn-primary">
                <i class="bi bi-eye"></i> Details
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
      })
      .join('');

    // ẩn placeholder khi ảnh load xong
    grid.querySelectorAll('img').forEach((img) => {
      const placeholder = img.nextElementSibling;
      img.addEventListener('load', () => {
        if (placeholder) placeholder.style.opacity = '0';
        img.style.opacity = '1';
      });
      img.addEventListener('error', () => {
        if (placeholder) placeholder.style.opacity = '0';
      });
    });

    count.textContent = `${start + 1}-${Math.min(end, currentBooks.length)} of ${currentBooks.length}`;
    renderPagination();
  }

  /* ========== Pagination ========== */
  function renderPagination() {
    const totalPages = Math.ceil(currentBooks.length / perPage);
    pager.innerHTML = '';
    if (totalPages <= 1) return;

    pager.innerHTML = Array.from(
      { length: totalPages },
      (_, i) => `
        <li class="page-item ${i + 1 === currentPage ? 'active' : ''}">
          <a class="page-link" href="#" data-page="${i + 1}">${i + 1}</a>
        </li>
      `,
    ).join('');
  }

  pager.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-page]');
    if (!a) return;
    e.preventDefault();
    currentPage = Number(a.dataset.page);
    renderBooks();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ========== Categories ========== */
  async function renderCategoryChips() {
    try {
      const data = await apiGet('/categories');
      const cats = Array.isArray(data) ? data : data.items || [];
      const all = ['all', ...cats.map((c) => c.slug || c.name)];
      chips.innerHTML = all
        .map(
          (cat) => `
        <button
          class="btn btn-sm ${cat === currentCategory ? 'btn-secondary' : 'btn-outline-secondary'}"
          data-cat="${esc(cat)}"
        >
          ${cat === 'all' ? 'All' : esc(cat)}
        </button>
      `,
        )
        .join('');
    } catch {
      chips.innerHTML = `<button class="btn btn-sm btn-secondary" data-cat="all">All</button>`;
    }
  }

  chips.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-cat]');
    if (!btn) return;
    currentCategory = btn.dataset.cat;
    chips.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('btn-secondary', b === btn);
      b.classList.toggle('btn-outline-secondary', b !== btn);
    });
    filterBooks();
  });

  /* ========== Filters ========== */
  filter.addEventListener('change', (e) => {
    currentFilter = e.target.value || 'all';
    filterBooks();
  });

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value || 'newest';
      sortCurrentBooks();
      currentPage = 1;
      renderBooks();
    });
  }

  /* ========== Search ========== */
  async function doSearch() {
    const keyword = qInput.value.trim();
    currentQuery = keyword;
    await loadBooks(keyword);
  }

  btnSearch?.addEventListener('click', (e) => {
    e.preventDefault();
    doSearch();
  });

  qInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      doSearch();
    }
  });

  /* ========== Init ========== */
  loadBooks();
}
