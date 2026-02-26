// assets/js/admin-loans.js
import { apiGet, apiDelete } from './api.js';

const loanBody = document.getElementById('loanBody');
const txt = document.getElementById('searchLoan');
const sort = document.getElementById('sortLoan');
const btnSearch = document.getElementById('btnSearch');
const countEl = document.getElementById('countLoans');
const pagerEl = document.getElementById('pagerLoans');

// Modal view detail (giống librarian)
const loanModalEl = document.getElementById('loanDetailModal');
const loanModal = loanModalEl ? new bootstrap.Modal(loanModalEl) : null;

function esc(x) {
  return x ? String(x).replace(/[<>]/g, '') : '';
}

function fmt(d) {
  return d ? new Date(d).toLocaleDateString('vi-VN') : '';
}

function fmtFull(d) {
  return d ? new Date(d).toLocaleString('vi-VN') : '';
}

function getTitle(l) {
  return l.details?.[0]?.copy?.book?.title || '';
}

function getReader(l) {
  return l.user?.fullName || l.user?.name || l.user?.email || '(unknown)';
}

// ✅ Tóm tắt danh sách sách (Book A, Book B +3 more)
function getBookSummary(l) {
  const titles = l.details?.map((d) => d.copy?.book?.title).filter(Boolean) || [];

  if (!titles.length) return '';

  if (titles.length === 1) return titles[0];

  if (titles.length === 2) return `${titles[0]}, ${titles[1]}`;

  const extra = titles.length - 2;
  return `${titles[0]}, ${titles[1]} +${extra} more book`;
}

// badge giống librarian-loans
function badgeStatus(st) {
  const map = {
    pending: 'secondary',
    borrowed: 'info',
    returned: 'success',
    late: 'danger',
    cancelled: 'dark',
    reserved: 'warning',
  };
  return `<span class="badge text-bg-${map[st] || 'secondary'} text-capitalize">${esc(st)}</span>`;
}

// Toast đơn giản (dùng chung cho error)
function toast(title, body) {
  const area = document.getElementById('toastArea');
  if (!area) {
    alert(`${title}: ${body}`);
    return;
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

// ===== STATE phân trang =====
let page = 1;
const size = 10; // 10 record / trang
let total = 0;

/* ==================================
   LOAD LOANS (có phân trang)
================================== */
async function loadLoans(goPage) {
  if (typeof goPage === 'number') page = goPage;

  loanBody.innerHTML = `<tr><td colspan="7" class="text-center py-3 text-muted">Loading…</td></tr>`;

  try {
    const params = new URLSearchParams();
    params.set('include', 'user,processedBy,details.copy.book,fines');
    params.set('page', String(page));
    params.set('limit', String(size));

    // search theo q (title / reader)
    if (txt.value.trim()) {
      params.set('q', txt.value.trim());
    }

    const res = await apiGet(`/borrow-records?${params.toString()}`);

    // BE trả thẳng object { items, total, page, limit, totalPages }
    const data = res.data || res;
    let items = Array.isArray(data.items) ? data.items : [];
    total = data.total ?? items.length;

    /* SORTING (trong 1 trang) */
    switch (sort.value) {
      case 'id-desc':
        items.sort((a, b) => b.id - a.id);
        break;
      case 'id-asc':
        items.sort((a, b) => a.id - b.id);
        break;
      case 'reader-asc':
        items.sort((a, b) => getReader(a).localeCompare(getReader(b)));
        break;
      case 'reader-desc':
        items.sort((a, b) => getReader(b).localeCompare(getReader(a)));
        break;
      case 'book-asc':
        items.sort((a, b) => getBookSummary(a).localeCompare(getBookSummary(b)));
        break;
      case 'book-desc':
        items.sort((a, b) => getBookSummary(b).localeCompare(getBookSummary(a)));
        break;
    }

    if (!items.length) {
      loanBody.innerHTML = `<tr><td colspan="7" class="text-center py-3 text-muted">No records found</td></tr>`;
      if (countEl) countEl.textContent = '0 records';
      renderPager();
      return;
    }

    loanBody.innerHTML = items
      .map((loan) => {
        const reader = getReader(loan);
        const email = loan.user?.email || '';
        const book = getBookSummary(loan); // ✅ dùng summary

        return `
        <tr>
          <td>${loan.id}</td>

          <td>
            <div>${esc(reader)}</div>
            <small class="text-muted">${esc(email)}</small>
          </td>

          <td>${esc(book)}</td>
          <td>${fmt(loan.borrowDate)}</td>
          <td>${fmt(loan.dueDate)}</td>

          <td>${badgeStatus(loan.status)}</td>

          <td class="text-center">
            <div class="d-flex justify-content-center gap-2">
              <button
                type="button"
                class="btn btn-sm btn-light border btnView"
                data-id="${loan.id}"
                title="View detail"
              >
                <i class="bi bi-eye text-secondary"></i>
              </button>
              <a
                href="admin-loans-edit.html?id=${loan.id}"
                class="btn btn-sm btn-light border"
                title="Edit loan"
              >
                <i class="bi bi-pencil text-primary"></i>
              </a>
              <button
                type="button"
                class="btn btn-sm btn-light border btnDel"
                data-id="${loan.id}"
                title="Delete loan"
              >
                <i class="bi bi-trash text-danger"></i>
              </button>
            </div>
          </td>
        </tr>`;
      })
      .join('');

    if (countEl) {
      countEl.textContent = `${total} record${total > 1 ? 's' : ''}`;
    }

    renderPager();
  } catch (e) {
    console.error(e);
    loanBody.innerHTML = `<tr><td colspan="7" class="text-danger text-center py-3">Failed to load data</td></tr>`;
    if (countEl) countEl.textContent = '';
    if (pagerEl) pagerEl.innerHTML = '';
    toast('Error', 'Failed to load loans');
  }
}

/* ==================================
   PAGINATION UI
================================== */
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

  add(Math.max(1, page - 1), '«', false, page === 1);
  for (let i = 1; i <= pages && i <= 10; i++) {
    add(i, i, i === page);
  }
  add(Math.min(pages, page + 1), '»', false, page === pages);

  pagerEl.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const p = Number(a.dataset.p);
      if (!Number.isNaN(p) && p !== page) {
        loadLoans(p);
      }
    });
  });
}

/* ==================================
   VIEW DETAIL (giống librarian)
================================== */
async function openViewModal(id) {
  if (!loanModal) return;

  try {
    document.getElementById('loanModalLoading')?.classList.remove('d-none');
    document.getElementById('loanModalBody')?.classList.add('d-none');
    document.getElementById('loanModalId').textContent = `#${id}`;

    const res = await apiGet(
      `/borrow-records/${id}?include=user,processedBy,details.copy.book,fines,returnRecords`,
    );
    const r = res?.data || res || {};

    const readerName = r.user?.name || r.user?.fullName || '';
    const readerEmail = r.user?.email || '';
    const processedByLabel =
      r.processedBy?.name || r.processedBy?.fullName || r.processedBy?.email || '';

    const borrowDate = fmtFull(r.borrowDate);
    const dueDate = fmtFull(r.dueDate);
    const returnDate = fmtFull(r.returnDate);

    const fine = Number(r.fineAmount || 0);

    const finesHtml =
      (Array.isArray(r.fines) ? r.fines : [])
        .map(
          (f) =>
            `<div>${Number(f.amount || 0).toLocaleString(
              'vi-VN',
            )} VNĐ – <span class="badge rounded-pill text-bg-${
              f.status === 'paid' ? 'success' : 'warning'
            }">${esc(f.status)}</span></div>`,
        )
        .join('') || '<span class="text-muted small">No fines</span>';

    const details = Array.isArray(r.details) ? r.details : [];
    const booksHtml = details.length
      ? details
          .map((d, idx) => {
            const title = d.copy?.book?.title || '(Unknown book)';
            const copyId = d.copy?.id;
            const copyCode = copyId != null ? `Copy ID: ${copyId}` : `Copy #${idx + 1}`;
            const status = d.status || r.status || 'borrowed';

            return `
              <div class="col-md-6 col-lg-4">
                <div class="loan-book-card p-3 rounded-3 border h-100">
                  <h6 class="mb-1">${esc(title)}</h6>
                  <div class="text-muted small mb-1">
                    <i class="bi bi-upc-scan me-1"></i>${esc(copyCode)}
                  </div>
                  <span class="badge rounded-pill text-bg-light text-capitalize">
                    <i class="bi bi-book-half me-1"></i>${esc(status)}</span>
                </div>
              </div>
            `;
          })
          .join('')
      : `<p class="text-muted small mb-0">No books</p>`;

    document.getElementById('loanUserName').textContent = readerName;
    document.getElementById('loanUserEmail').textContent = readerEmail;
    document.getElementById('loanProcessedBy').textContent = processedByLabel;

    document.getElementById('loanBorrowDate').textContent = borrowDate;
    document.getElementById('loanDueDate').textContent = dueDate;
    document.getElementById('loanReturnDate').textContent = returnDate || '—';

    document.getElementById('loanStatus').innerHTML = badgeStatus(r.status);
    document.getElementById('loanFineAmount').textContent = fine
      ? fine.toLocaleString('vi-VN') + ' VNĐ'
      : '0';

    document.getElementById('loanFines').innerHTML = finesHtml;
    document.getElementById('loanBooks').innerHTML = booksHtml;

    document.getElementById('loanModalLoading')?.classList.add('d-none');
    document.getElementById('loanModalBody')?.classList.remove('d-none');

    loanModal.show();
  } catch (err) {
    console.error('Load loan detail error:', err);
    const msg =
      err?.message ||
      err?.response?.data?.message ||
      err?.data?.message ||
      'Failed to load loan detail';
    toast('Error', msg);
  }
}

/* ==================================
   CLICK HANDLER (delete + view)
================================== */
loanBody.addEventListener('click', async (e) => {
  const btnDel = e.target.closest('.btnDel');
  if (btnDel) {
    const id = btnDel.dataset.id;
    if (!id) return;
    if (!confirm('Delete this loan?')) return;

    try {
      await apiDelete(`/borrow-records/${id}`);
      loadLoans();
    } catch (err) {
      console.error(err);
      toast('Error', 'Failed to delete loan');
    }
    return;
  }

  const btnView = e.target.closest('.btnView');
  if (btnView) {
    const id = btnView.dataset.id;
    if (id) openViewModal(id);
  }
});

/* Events */
btnSearch.addEventListener('click', () => {
  page = 1;
  loadLoans();
});

sort.addEventListener('change', () => {
  page = 1;
  loadLoans();
});

txt.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    page = 1;
    loadLoans();
  }
});

/* INIT */
loadLoans();
