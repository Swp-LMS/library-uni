import { apiGet, apiPost, apiPatch } from './api.js';
import { BASE_URL } from './api.js';

function authHeaders(isJSON = false) {
  const t = localStorage.getItem('token');
  const h = {};
  if (isJSON) h['Content-Type'] = 'application/json';
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}

function guardRole() {
  const t = localStorage.getItem('token');
  const u = JSON.parse(localStorage.getItem('user') || 'null');
  //
}
const esc = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
function fmtMoney(n) {
  return (n ?? 0)
    .toLocaleString(undefined, { style: 'currency', currency: 'VND' })
    .replace('VND', '₫');
}

function toast(title, body) {
  const area = document.getElementById('toastArea');
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

export function initOverdueAdmin() {
  guardRole();

  const qEl = document.getElementById('q');
  const statusSel = document.getElementById('status');
  const btnSearch = document.getElementById('btnSearch');
  const tableBody = document.getElementById('tableBody');
  const countEl = document.getElementById('count');
  const pagerEl = document.getElementById('pager');

  // payment modal
  const payModalEl = document.getElementById('payModal');
  const payModal = new bootstrap.Modal(payModalEl);
  const payForm = document.getElementById('payForm');
  const loanId = document.getElementById('loanId');
  const amount = document.getElementById('amount');
  const method = document.getElementById('method');

  let page = 1,
    size = 10,
    total = 0,
    query = '',
    status = '';

  btnSearch.addEventListener('click', () => {
    query = qEl.value.trim();
    status = statusSel.value;
    page = 1;
    load();
  });
  qEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      query = qEl.value.trim();
      status = statusSel.value;
      page = 1;
      load();
    }
  });
  statusSel.addEventListener('change', () => {
    status = statusSel.value;
    page = 1;
    load();
  });

  payForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const payload = { amount: Number(amount.value), method: method.value };
      // Kỳ vọng: POST /admin/payments  ({ loanId, amount, method })
      await apiPost('/admin/payments', { loanId: Number(loanId.value), ...payload });
      toast('Success', 'Payment recorded');
      payModal.hide();
      load();
    } catch (err) {
      toast('Error', err.message || 'Payment failed');
    }
  });

  function renderPager() {
    const pages = Math.max(1, Math.ceil(total / size));
    pagerEl.innerHTML = '';
    const add = (p, lbl, active = false, disabled = false) => {
      pagerEl.insertAdjacentHTML(
        'beforeend',
        `
        <li class="page-item ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}">
          <a class="page-link" href="#" data-p="${p}">${lbl}</a>
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

  function renderRows(items) {
    if (!items.length) {
      tableBody.innerHTML = `<tr><td colspan="8" class="text-muted small">No data</td></tr>`;
      return;
    }
    tableBody.innerHTML = items
      .map(
        (x) => `
      <tr>
        <td>${x.id}</td>
        <td>${esc(x.book?.title || x.bookTitle || '')}</td>
        <td>${esc(x.user?.fullName || x.user?.email || x.userName || '')}</td>
        <td>${x.dueDate ? new Date(x.dueDate).toLocaleDateString() : ''}</td>
        <td class="${(x.daysLate ?? 0) > 0 ? 'text-danger fw-semibold' : ''}">${x.daysLate ?? 0}</td>
        <td>${fmtMoney(x.fineAmount ?? 0)}</td>
        <td>
          ${
            x.paymentStatus === 'paid'
              ? '<span class="badge text-bg-success">Paid</span>'
              : `<span class="badge text-bg-warning">Unpaid</span>`
          }
        </td>
        <td class="text-end">
          ${
            x.paymentStatus !== 'paid'
              ? `
            <button class="btn btn-sm btn-outline-success me-1" data-pay="${x.id}">
              <i class="bi bi-cash-coin"></i> Pay
            </button>
            <button class="btn btn-sm btn-outline-secondary me-1" data-waive="${x.id}">
              <i class="bi bi-slash-circle"></i> Waive
            </button>
            <button class="btn btn-sm btn-outline-dark" data-remind="${x.id}">
              <i class="bi bi-envelope"></i> Remind
            </button>
          `
              : `
            <button class="btn btn-sm btn-outline-info" data-receipt="${x.id}">
              <i class="bi bi-receipt"></i> Receipt
            </button>
          `
          }
        </td>
      </tr>
    `,
      )
      .join('');

    // bind actions
    tableBody.querySelectorAll('[data-pay]').forEach((btn) => {
      btn.addEventListener('click', () => {
        loanId.value = btn.getAttribute('data-pay');
        amount.value = ''; // để staff nhập số thu cụ thể
        method.value = 'cash';
        payModal.show();
      });
    });
    tableBody.querySelectorAll('[data-waive]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Waive fine for this loan?')) return;
        try {
          // Kỳ vọng: PATCH /admin/loans/:id/fine { action: 'waive' }
          await apiPatch(`/admin/loans/${btn.getAttribute('data-waive')}/fine`, {
            action: 'waive',
          });
          toast('Success', 'Fine waived');
          load();
        } catch (err) {
          toast('Error', err.message || 'Waive failed');
        }
      });
    });
    tableBody.querySelectorAll('[data-remind]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          // Kỳ vọng: POST /admin/loans/:id/remind
          await apiPost(`/admin/loans/${btn.getAttribute('data-remind')}/remind`, {});
          toast('Success', 'Reminder sent');
        } catch (err) {
          toast('Error', err.message || 'Send reminder failed');
        }
      });
    });
    tableBody.querySelectorAll('[data-receipt]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-receipt');
        const url = `${BASE_URL}/admin/payments/receipt?loanId=${encodeURIComponent(id)}&_=${Date.now()}`;

        try {
          const res = await fetch(url, { headers: authHeaders() });
          const ct = (res.headers.get('Content-Type') || '').toLowerCase();

          if (!res.ok) throw new Error(await res.text());

          // Trường hợp BE trả JSON: { url: "..." }
          if (ct.includes('application/json')) {
            const data = await res.json();
            if (data.url) {
              window.open(data.url, '_blank', 'noopener');
            } else {
              // không có url -> hiển thị đơn giản
              toast('Info', 'Receipt created.');
            }
            return;
          }

          // Trường hợp BE trả PDF -> tải file
          if (ct.includes('application/pdf')) {
            const blob = await res.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `receipt-${id}.pdf`;
            a.click();
            URL.revokeObjectURL(a.href);
            return;
          }

          // Trường hợp BE trả HTML -> mở tab mới
          if (ct.includes('text/html')) {
            const html = await res.text();
            const blob = new Blob([html], { type: 'text/html' });
            const href = URL.createObjectURL(blob);
            window.open(href, '_blank', 'noopener');
            // không revoke ngay để tab mới còn đọc được
            setTimeout(() => URL.revokeObjectURL(href), 15000);
            return;
          }

          // Fallback: thử mở như blob chung
          const blob = await res.blob();
          const href = URL.createObjectURL(blob);
          window.open(href, '_blank', 'noopener');
          setTimeout(() => URL.revokeObjectURL(href), 15000);
        } catch (err) {
          toast('Error', err?.message || 'Receipt failed');
        }
      });
    });
  }

  async function load() {
    tableBody.innerHTML = `<tr><td colspan="8" class="text-muted small">Loading…</td></tr>`;
    const path = `/admin/overdue?q=${encodeURIComponent(query)}&status=${encodeURIComponent(status)}&page=${page}&size=${size}`;
    try {
      // Kỳ vọng: { items:[{id, book, user, dueDate, daysLate, fineAmount, paymentStatus}], total }
      const data = await apiGet(path);
      const items = Array.isArray(data) ? data : data.items || [];
      total = Array.isArray(data) ? items.length : (data.total ?? items.length);
      renderRows(items);
      countEl.textContent = `${total} record${total > 1 ? 's' : ''}`;
      renderPager();
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="8" class="text-danger small">Load failed: ${esc(err.message)}</td></tr>`;
      countEl.textContent = '';
      pagerEl.innerHTML = '';
    }
  }

  load();
}
