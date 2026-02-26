// assets/js/librarian-overdue.js
import { apiGet, apiPost } from './api.js';

function guardRole() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!token || !user || !['admin', 'librarian'].includes(user.role)) {
    location.href = 'login.html?next=librarian-overdue.html';
    return null;
  }
  return user;
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
    .toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })
    .replace('VND', '₫');
}

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

export function initLibrarianOverdue() {
  if (!guardRole()) return;

  const qEl = document.getElementById('q');
  const statusSel = document.getElementById('status');
  const btnSearch = document.getElementById('btnSearch');
  const tableBody = document.getElementById('tableBody');
  const countEl = document.getElementById('count');
  const pagerEl = document.getElementById('pager');

  if (!tableBody || !pagerEl) return;

  // 🏦 Modal QR thanh toán tiền phạt (librarian-overdue.html phải có modal này)
  const fineQrModalEl = document.getElementById('fineQrModal');
  const fineQrModal = fineQrModalEl ? new bootstrap.Modal(fineQrModalEl) : null;
  const fineQrImg = document.getElementById('fineQrImg');
  const fineQrAmount = document.getElementById('fineQrAmount');
  const fineQrBank = document.getElementById('fineQrBank');
  const fineQrAccount = document.getElementById('fineQrAccount');
  const fineQrContent = document.getElementById('fineQrContent');

  let finePollTimer = null;

  // Nếu đóng modal thì dừng poll
  if (fineQrModalEl) {
    fineQrModalEl.addEventListener('hidden.bs.modal', () => {
      if (finePollTimer) {
        clearInterval(finePollTimer);
        finePollTimer = null;
      }
    });
  }

  let page = 1;
  let size = 10;
  let total = 0;
  let query = '';
  let status = '';

  /* ========== EVENTS ========== */
  btnSearch?.addEventListener('click', () => {
    query = qEl?.value.trim() || '';
    status = statusSel?.value || '';
    page = 1;
    load();
  });

  qEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      query = qEl.value.trim();
      status = statusSel?.value || '';
      page = 1;
      load();
    }
  });

  statusSel?.addEventListener('change', () => {
    status = statusSel.value;
    page = 1;
    load();
  });

  /* ========== PAGER ========== */
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

  /* ========== RENDER ROWS ========== */
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
        <td>${esc(x.user?.fullName || x.user?.email || x.userName || '')}</td>
        <td>${esc(x.conditionLabel || '')}</td>
        <td>${x.dueDate ? new Date(x.dueDate).toLocaleDateString('vi-VN') : ''}</td>
        <td class="${(x.daysLate ?? 0) > 0 ? 'text-danger fw-semibold' : ''}">
          ${x.daysLate ?? 0}
        </td>
        <td>${fmtMoney(x.fineAmount ?? 0)}</td>
        <td>
          ${
            x.paymentStatus === 'paid'
              ? '<span class="badge text-bg-success">Paid</span>'
              : x.paymentStatus === 'unpaid'
                ? '<span class="badge text-bg-warning">Unpaid</span>'
                : '<span class="badge text-bg-secondary">None</span>'
          }
        </td>
        <td class="text-end">
          ${
            x.paymentStatus === 'unpaid'
              ? `
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-success" data-pay-cash="${x.id}">
                <i class="bi bi-cash-coin"></i> Cash
              </button>
              <button class="btn btn-outline-primary" data-pay-bank="${x.id}">
                <i class="bi bi-qr-code"></i> Bank
              </button>
            </div>
          `
              : x.paymentStatus === 'paid'
                ? `
            <button class="btn btn-sm btn-outline-info" data-receipt="${x.id}">
              <i class="bi bi-receipt"></i> Receipt
            </button>
          `
                : ''
          }
        </td>
      </tr>`,
      )
      .join('');

    // 💵 Pay cash = /borrow-records/:id/pay
    tableBody.querySelectorAll('[data-pay-cash]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-pay-cash');
        if (!id) return;
        if (!confirm(`Thanh toán tiền phạt (tiền mặt) cho phiếu #${id}?`)) return;

        try {
          await apiPost(`/borrow-records/${id}/pay`, {
            method: 'cash',
            note: '',
          });
          toast('Success', `Đã thanh toán tiền mặt cho phiếu #${id}`);
          load();
        } catch (err) {
          console.error('Pay cash error', err);
          toast('Error', 'Thanh toán tiền mặt thất bại');
        }
      });
    });

    // 🏦 Pay bank transfer = /borrow-records/:id/pay (bank_transfer)
    tableBody.querySelectorAll('[data-pay-bank]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-pay-bank');
        if (!id) return;
        if (!confirm(`Tạo QR chuyển khoản thanh toán tiền phạt cho phiếu #${id}?`)) return;

        try {
          const res = await apiPost(`/borrow-records/${id}/pay`, {
            method: 'bank_transfer',
            note: '',
          });

          const payload = res?.data || res || {};
          const payUrl = payload.payUrl || payload.qrData || (payload.data && payload.data.payUrl);
          const amount = Number(payload.amount ?? payload.data?.amount ?? 0);
          const bank = payload.bank || payload.data?.bank || 'TPBank';
          const account = payload.account || payload.data?.account || '';
          const orderId = payload.orderId || payload.data?.orderId || '';

          if (!payUrl) {
            toast('Error', 'Không nhận được QR từ server');
            return;
          }

          // Gán vào modal
          if (fineQrImg) fineQrImg.src = payUrl;
          if (fineQrAmount) fineQrAmount.textContent = fmtMoney(amount);
          if (fineQrBank) fineQrBank.textContent = bank;
          if (fineQrAccount) fineQrAccount.textContent = account;
          if (fineQrContent) fineQrContent.textContent = orderId || 'FINE payment';

          if (fineQrModal) {
            fineQrModal.show();
          } else {
            // fallback: nếu không có modal thì mở tab mới
            window.open(payUrl, '_blank');
          }

          // 🔁 Bắt đầu poll trạng thái fine sau khi quét QR
          if (finePollTimer) {
            clearInterval(finePollTimer);
            finePollTimer = null;
          }

          finePollTimer = setInterval(async () => {
            try {
              const detailRes = await apiGet(`/borrow-records/${id}?include=user,fines`);
              const rec = detailRes?.data || detailRes || {};
              const fines = Array.isArray(rec.fines) ? rec.fines : [];
              const hasUnpaid = fines.some((f) => {
                const st = (f.status || '').toString().toLowerCase();
                return st === 'unpaid';
              });

              // Không còn unpaid fine nữa → coi như đã thanh toán xong
              if (!hasUnpaid) {
                clearInterval(finePollTimer);
                finePollTimer = null;

                if (fineQrModal) fineQrModal.hide();
                toast('Success', `Thanh toán chuyển khoản cho phiếu #${id} đã hoàn tất.`);
                // reload danh sách Overdue
                load();
              }
            } catch (err) {
              console.error('Poll fine status error', err);
            }
          }, 4000);

          toast(
            'Success',
            `Đã tạo giao dịch chuyển khoản cho phiếu #${id}. Vui lòng quét QR để thanh toán.`,
          );
          // Trạng thái paid/unpaid sẽ được webhook + poll cập nhật.
        } catch (err) {
          console.error('Pay bank transfer error', err);
          toast('Error', 'Không tạo được giao dịch chuyển khoản');
        }
      });
    });

    // Receipt: placeholder
    tableBody.querySelectorAll('[data-receipt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        toast('Info', 'Receipt feature is not implemented yet.');
      });
    });
  }

  /* ========== LOAD DATA ========== */
  async function load() {
    tableBody.innerHTML = `<tr><td colspan="8" class="text-muted small">Loading…</td></tr>`;

    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(size));
    params.set('include', 'user,details,details.copy,details.copy.book,fines');

    try {
      const url = `/borrow-records?${params.toString()}`;
      const res = await apiGet(url);

      const payload = res?.data || res || {};
      const itemsRaw = Array.isArray(payload.items)
        ? payload.items
        : Array.isArray(payload)
          ? payload
          : [];

      const mappedItems = [];

      itemsRaw.forEach((item) => {
        const dueDate = item.dueDate ? new Date(item.dueDate) : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let daysLate = 0;
        if (dueDate) {
          const diffTime = today.getTime() - dueDate.getTime();
          daysLate = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
        }

        const firstDetail = item.details && item.details.length > 0 ? item.details[0] : null;
        const bookTitle = firstDetail?.copy?.book?.title || '';

        const base = {
          id: item.id,
          book: { title: bookTitle },
          bookTitle,
          user: item.user
            ? {
                fullName: item.user.fullName || item.user.name,
                email: item.user.email,
              }
            : null,
          userName: item.user?.fullName || item.user?.name || item.user?.email || '',
          dueDate: item.dueDate,
          daysLate,
        };

        const fines = Array.isArray(item.fines) ? item.fines : [];

        if (fines.length > 0) {
          fines.forEach((fine) => {
            const fineAmount = Number(fine.amount || 0);

            const conditionLabel =
              fine.reason ||
              fine.type ||
              fine.kind ||
              (fine.category === 'late' ? 'Late fine' : '') ||
              '';

            let paymentStatus = null;
            if (fine.status === 'unpaid') paymentStatus = 'unpaid';
            else if (fine.status === 'paid') paymentStatus = 'paid';

            mappedItems.push({
              ...base,
              fineAmount,
              paymentStatus,
              conditionLabel,
              fineId: fine.id,
              fineStatusRaw: fine.status,
            });
          });
        } else {
          const fineAmount = Number(item.fineAmount || 0);
          let paymentStatus = null;
          if (fineAmount > 0) paymentStatus = 'unpaid';

          const conditionLabel = fineAmount > 0 || daysLate > 0 ? 'Late fine' : '';

          mappedItems.push({
            ...base,
            fineAmount,
            paymentStatus,
            conditionLabel,
            fineId: null,
            fineStatusRaw: null,
          });
        }
      });

      // chỉ hiện những row có fine > 0 hoặc đang trễ
      let filtered = mappedItems.filter((x) => (x.daysLate ?? 0) > 0 || (x.fineAmount ?? 0) > 0);

      // search
      if (query && query.trim()) {
        const q = query.toLowerCase().trim();
        filtered = filtered.filter((item) => {
          const book = item.book?.title?.toLowerCase() || '';
          const userName = item.user?.fullName?.toLowerCase() || '';
          const email = item.user?.email?.toLowerCase() || '';
          return book.includes(q) || userName.includes(q) || email.includes(q);
        });
      }

      // status filter
      if (status) {
        if (status === 'overdue') {
          filtered = filtered.filter((x) => (x.daysLate ?? 0) > 0);
        } else if (status === 'unpaid') {
          filtered = filtered.filter((x) => x.paymentStatus === 'unpaid');
        } else if (status === 'paid') {
          filtered = filtered.filter((x) => x.paymentStatus === 'paid');
        }
      }

      total = filtered.length;

      renderRows(filtered);
      if (countEl) countEl.textContent = `${total} record${total > 1 ? 's' : ''}`;
      renderPager();
    } catch (err) {
      console.error('Load overdue error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Load failed';
      tableBody.innerHTML = `<tr><td colspan="8" class="text-danger small">Load failed: ${esc(
        errorMsg,
      )}</td></tr>`;
      if (countEl) countEl.textContent = '';
      pagerEl.innerHTML = '';
      toast('Error', 'Failed to load overdue records');
    }
  }

  load();
}
