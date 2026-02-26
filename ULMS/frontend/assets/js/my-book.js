// assets/js/my-book.js
import { apiGet } from './api.js';

const PAGE_SIZE = 12;

export function initBooks() {
  const grid = document.getElementById('bookGrid');
  const countEl = document.getElementById('countBooks');
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const btnRefresh = document.getElementById('btnRefresh');
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  const pagerInfo = document.getElementById('pagerInfo');
  const listStatus = document.getElementById('listStatus');

  let currentPage = 1;
  let totalPages = 1;
  let currentQuery = '';
  let currentSort = 'newest';

  const esc = (s = '') =>
    String(s).replace(
      /[&<>"']/g,
      (m) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[m],
    );

  // Lấy rating từ book
  function getRating(b) {
    const raw = b.avgRating ?? b.rating ?? b.averageRating ?? 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }

  async function loadBooks() {
    listStatus.textContent = '';
    grid.innerHTML = `
      <div class="col-12 text-center text-muted py-4">
        Loading books...
      </div>
    `;

    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(PAGE_SIZE),
        q: currentQuery,
        sort: currentSort, // newest/title_asc/title_desc/rating_desc/rating_asc
      });

      const res = await apiGet(`/books?${params.toString()}`);
      const data = res.data || res;

      let items = data.items || data.books || data.result || [];
      const total = data.total ?? items.length;
      totalPages = data.totalPages || Math.max(1, Math.ceil(total / PAGE_SIZE));

      // Nếu BE chưa hỗ trợ sort theo rating thì FE sort lại
      if (currentSort === 'rating_desc') {
        items = [...items].sort((a, b) => getRating(b) - getRating(a));
      } else if (currentSort === 'rating_asc') {
        items = [...items].sort((a, b) => getRating(a) - getRating(b));
      }

      if (countEl) {
        countEl.textContent = `${total} book${total === 1 ? '' : 's'}`;
      }

      if (!items.length) {
        grid.innerHTML = `
          <div class="col-12 text-center text-muted py-4">
            No books found.
          </div>
        `;
      } else {
        grid.innerHTML = items
          .map((b) => {
            const title = esc(b.title || 'Untitled');
            const author = esc(b.author?.name || 'Unknown author');
            const categoryName = esc(b.category?.name || 'General');
            const publisherName = esc(b.publisher?.name || 'Unknown');
            const year = b.publishedYear || b.year || '';
            const desc = b.description || '';
            const shortDesc = esc(desc.length > 90 ? desc.slice(0, 90) + '...' : desc);

            const availableCopies =
              typeof b.availableCopies === 'number'
                ? b.availableCopies
                : typeof b.totalCopies === 'number'
                  ? b.totalCopies
                  : 0;

            const isAvailable = (b.status || 'available') === 'available' && availableCopies > 0;
            const statusBadge = isAvailable
              ? `<span class="badge bg-success rounded-pill ms-2">✓ Available</span>`
              : `<span class="badge bg-secondary rounded-pill ms-2">Unavailable</span>`;

            const img = b.imageUrl
              ? `<img src="${esc(b.imageUrl)}" alt="${title}" class="book-cover-img">`
              : `<div class="book-cover-placeholder">📚</div>`;

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
        <div class="card h-100 border-0 shadow-sm book-card">
          <div class="book-cover-wrapper">
            ${img}
          </div>
          <div class="card-body d-flex flex-column">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="badge rounded-pill bg-light text-dark border">
                ${categoryName}
              </span>
              ${statusBadge}
            </div>
            <h5 class="card-title mb-1 text-truncate" title="${title}">
              ${title}
            </h5>
            <p class="text-muted mb-1">${author}</p>
            ${ratingHtml}
            <p class="text-muted small mb-2">Publisher: ${publisherName}</p>
            <p class="text-muted small flex-grow-1">
              ${shortDesc}
            </p>
            <div class="d-flex justify-content-between align-items-center mt-2">
              <span class="small text-muted">
                ${year ? year : ''}
              </span>
              <a href="book-detail.html?id=${b.id}" class="btn btn-primary btn-sm">
                Details
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
          })
          .join('');
      }

      if (pagerInfo) {
        pagerInfo.textContent = `Page ${currentPage} / ${totalPages}`;
      }
      if (btnPrev) btnPrev.disabled = currentPage <= 1;
      if (btnNext) btnNext.disabled = currentPage >= totalPages;
    } catch (err) {
      console.error(err);
      grid.innerHTML = `
        <div class="col-12 text-center text-danger py-4">
          Failed to load books: ${esc(err.message || String(err))}
        </div>
      `;
    }
  }

  /* ========== Events ========== */
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentQuery = searchInput.value.trim();
        currentPage = 1;
        loadBooks();
      }, 400);
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      currentSort = sortSelect.value || 'newest';
      currentPage = 1;
      loadBooks();
    });
  }

  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      currentPage = 1;
      loadBooks();
    });
  }

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        loadBooks();
      }
    });
  }

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        loadBooks();
      }
    });
  }

  // Init
  loadBooks();
}
