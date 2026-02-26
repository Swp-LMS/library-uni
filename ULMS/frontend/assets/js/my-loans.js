// assets/js/my-loans.js
import { apiGet, apiPost } from './api.js';

export function initLoans() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  console.log('User data from localStorage:', user);

  if (!token || !user) {
    location.href = 'login.html?next=my-loans.html';
    return;
  }

  const tbody = document.getElementById('loansTableBody');
  const countEl = document.getElementById('countLoans');
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');

  let allLoans = [];

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

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : '';

  const getBookTitle = (rec) => {
    const dt = rec.details?.[0];
    return dt?.copy?.book?.title || rec.bookTitle || 'Unknown title';
  };

  // ===== status badge =====
  function renderStatus(rec) {
    const st = (rec.status || '').toLowerCase();

    let label = 'Unknown';
    let cls = 'secondary';

    switch (st) {
      case 'pending':
        label = 'Pending';
        cls = 'warning';
        break;
      case 'borrowed':
      case 'active':
        label = 'Borrowed';
        cls = 'info';
        break;
      case 'late':
      case 'overdue':
        label = 'Late';
        cls = 'danger';
        break;
      case 'returned':
        label = 'Returned';
        cls = 'success';
        break;
      case 'cancelled':
        label = 'Cancelled';
        cls = 'secondary';
        break;
      default:
        label = 'Unknown';
        cls = 'secondary';
    }

    return `<span class="badge text-bg-${cls}">${label}</span>`;
  }

  function applySort(list, sort) {
    switch (sort) {
      case 'title-asc':
        return list.sort((a, b) => getBookTitle(a).localeCompare(getBookTitle(b)));
      case 'title-desc':
        return list.sort((a, b) => getBookTitle(b).localeCompare(getBookTitle(a)));
      case 'borrow-new':
        return list.sort((a, b) => new Date(b.borrowDate) - new Date(a.borrowDate));
      case 'borrow-old':
        return list.sort((a, b) => new Date(a.borrowDate) - new Date(b.borrowDate));
      case 'due-near':
        return list.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      case 'due-far':
        return list.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
      default:
        return list;
    }
  }

  function applySearch(list, text) {
    if (!text) return list;
    const q = text.toLowerCase();
    return list.filter((rec) => getBookTitle(rec).toLowerCase().includes(q));
  }

  function isOneDayBefore(dueDate) {
    if (!dueDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    const diffDays = (due - today) / (1000 * 60 * 60 * 24);

    return diffDays === 1; // đúng 1 ngày nữa tới hạn
  }

  function normalizeResponse(res) {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  }

  function render() {
    let items = [...allLoans];

    items = applySearch(items, searchInput.value.trim());
    items = applySort(items, sortSelect.value);

    if (!items.length) {
      tbody.innerHTML = `
        <tr><td colspan="4" class="text-muted small text-center">No results.</td></tr>
      `;
      countEl.textContent = '';
      return;
    }

    tbody.innerHTML = items
      .map((rec) => {
        const title = esc(getBookTitle(rec));
        const borrowed = fmtDate(rec.borrowDate);
        const due = fmtDate(rec.dueDate);

        const canExtend =
          user.role?.toUpperCase() === 'READERS' &&
          (user.planId === null || user.planId === undefined) &&
          rec.status?.toLowerCase() === 'borrowed' &&
          isOneDayBefore(rec.dueDate);

        return `
    <tr>
      <td><strong>${title}</strong></td>
      <td>${borrowed}</td>
      <td>${due}</td>
      <td>
        ${renderStatus(rec)}
        ${
          canExtend
            ? `<button 
  class="btn btn-primary extend-btn" 
  style="padding: 2px 8px; font-size: 11px; border-radius: 6px; margin-top: 4px;" 
  data-id="${rec.id}"
>
  Extend
</button>
`
            : ''
        }
      </td>
    </tr>`;
      })
      .join('');

    countEl.textContent = `Showing ${items.length} loan(s)`;
  }

  async function load() {
    tbody.innerHTML = `
      <tr><td colspan="4" class="text-muted small text-center">Loading…</td></tr>
    `;

    try {
      const res = await apiGet(`/borrow-records?userId=${user.id}&include=details.copy.book`);
      allLoans = normalizeResponse(res);
      render();
    } catch (err) {
      console.error('Loan load error:', err);
      tbody.innerHTML = `
        <tr><td colspan="4" class="text-danger small text-center">
          Failed to load loans.
        </td></tr>
      `;
    }
  }

  // ===== Event: search + sort =====
  searchInput?.addEventListener('input', render);
  sortSelect?.addEventListener('change', render);

  // init
  load();

  tbody.addEventListener('click', async (e) => {
    if (e.target.classList.contains('extend-btn')) {
      const id = e.target.dataset.id;

      try {
        await apiPost(`/borrow-records/${id}/extend-due-date`, {}); // ← API đúng
        alert('Gia hạn +7 ngày thành công!');
        load(); // reload bảng
      } catch (err) {
        console.error(err);
        alert('Không thể gia hạn.');
      }
    }
  });
}
