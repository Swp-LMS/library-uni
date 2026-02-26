// assets/js/librarian-loans.js
import { apiGet, apiPost } from './api.js';

function guardRole() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!token || !user || !['admin', 'librarian'].includes(user.role)) {
    location.href = 'login.html?next=librarian-loans.html';
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

function badgeStatus(st) {
  const map = {
    pending: 'secondary',
    borrowed: 'info',
    returned: 'success',
    late: 'danger',
    cancelled: 'dark',
  };
  return `<span class="badge text-bg-${map[st] || 'secondary'} text-capitalize">${esc(st)}</span>`;
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

// 🔁 Helper copy dùng cho mọi chỗ (fine QR)
function copyText(text, label) {
  if (!text) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(() => toast('Info', `Đã copy ${label} vào clipboard`))
      .catch(() => toast('Error', 'Không thể copy, vui lòng copy tay.'));
  } else {
    toast('Error', 'Trình duyệt không hỗ trợ copy tự động.');
  }
}

/* ======================================================
   🔥 BOOK TITLE SHORTEN FUNCTIONS
====================================================== */
function getBookTitles(details) {
  return details?.map((d) => d.copy?.book?.title).filter(Boolean) || [];
}

function summarizeTitles(details, max = 3) {
  const titles = getBookTitles(details);
  if (titles.length <= max) return titles.join(', ');

  const shown = titles.slice(0, max).join(', ');
  const more = titles.length - max;
  return `${shown} +${more} more`;
}

/* ====================================================== */
export function initLibrarianLoans() {
  if (!guardRole()) return;

  const qInput = document.getElementById('q');
  const statusFilter = document.getElementById('statusFilter');
  const btnSearch = document.getElementById('btnSearch');
  const tableBody = document.getElementById('tableBody');
  const pagerEl = document.getElementById('pager');
  const countEl = document.getElementById('count');

  const loanModalEl = document.getElementById('loanDetailModal');
  const loanModal = new bootstrap.Modal(loanModalEl);

  const payModalEl = document.getElementById('payFineModal');
  const payModal = payModalEl ? new bootstrap.Modal(payModalEl) : null;
  const payForm = document.getElementById('payFineForm');

  // 🔁 Poll trạng thái thanh toán tiền phạt (bank_transfer)
  let finePollTimer = null;

  function stopFinePolling() {
    if (finePollTimer) {
      clearInterval(finePollTimer);
      finePollTimer = null;
    }
  }

  async function startFinePolling(borrowId) {
    stopFinePolling();
    let attempts = 0; // ví dụ: 45 lần * 4s = ~3 phút

    finePollTimer = setInterval(async () => {
      attempts += 1;
      try {
        const res = await apiGet(`/borrow-records/${borrowId}?include=fines`);
        const r = res?.data || res || {};

        const fines = Array.isArray(r.fines) ? r.fines : [];
        const hasUnpaid = fines.some((f) => f.status === 'unpaid' || f.status === 'pending');

        if (!hasUnpaid) {
          // ✅ webhook đã cập nhật: không còn phạt chưa thanh toán
          stopFinePolling();
          toast('Success', `Độc giả đã thanh toán tiền phạt cho phiếu #${borrowId}.`);
          payModal?.hide();
          load(); // reload lại bảng Loans
        } else if (attempts >= 45) {
          // quá 3 phút mà vẫn chưa thấy → báo để thủ thư tự kiểm tra
          stopFinePolling();
          toast(
            'Info',
            'Chưa thấy giao dịch khớp trong hệ thống sau vài phút. Vui lòng kiểm tra lại trên SePay / ngân hàng hoặc xử lý thủ công.',
          );
        }
      } catch (err) {
        console.error('Poll fine status error:', err);
        // lỗi lặt vặt vẫn tiếp tục, trừ khi quá attempts
        if (attempts >= 45) {
          stopFinePolling();
          toast('Error', 'Không thể kiểm tra trạng thái thanh toán tự động.');
        }
      }
    }, 4000); // mỗi 4 giây gọi 1 lần
  }

  // Nếu người dùng tự đóng modal → dừng poll
  payModalEl?.addEventListener('hidden.bs.modal', () => {
    stopFinePolling();
  });

  // 🔗 Các phần tử QR SePay cho tiền phạt
  const fineQrSection = document.getElementById('fineQrSection');
  const fineQrImage = document.getElementById('fineQrImage');
  const finePayLink = document.getElementById('finePayLink');
  const fineBankNameEl = document.getElementById('fineBankName');
  const fineBankAccountEl = document.getElementById('fineBankAccount');
  const fineTransferContentEl = document.getElementById('fineTransferContent');
  const btnCopyFineBankAccount = document.getElementById('btnCopyFineBankAccount');
  const btnCopyFineContent = document.getElementById('btnCopyFineContent');

  btnCopyFineBankAccount?.addEventListener('click', () => {
    const txt = fineBankAccountEl?.textContent?.trim() || '';
    copyText(txt, 'số tài khoản');
  });

  btnCopyFineContent?.addEventListener('click', () => {
    const txt = fineTransferContentEl?.textContent?.trim() || '';
    copyText(txt, 'nội dung chuyển khoản');
  });

  // Modal return từng copy (dùng trong loan detail – membership)
  const returnCopyModalEl = document.getElementById('returnCopyModal');
  const returnCopyModal = returnCopyModalEl ? new bootstrap.Modal(returnCopyModalEl) : null;
  const returnCopyForm = document.getElementById('returnCopyForm');

  // Modal return + condition cho cả phiếu (nút xanh ngoài bảng)
  const returnModalEl = document.getElementById('returnLoanModal');
  const returnModal = returnModalEl ? new bootstrap.Modal(returnModalEl) : null;
  const returnForm = document.getElementById('returnLoanForm');
  const returnTableBody = document.getElementById('returnLoanTableBody');
  const returnLateFineEl = document.getElementById('returnLateFine');
  const returnDamageFineEl = document.getElementById('returnDamageFine');
  const returnDepositEl = document.getElementById('returnDeposit'); // 💰 new
  const returnTotalFineEl = document.getElementById('returnTotalFine');

  let currentReturnLoanId = null;
  let currentLateFine = 0;
  let currentDepositHeld = 0; // 💰 tiền cọc đang giữ cho phiếu này

  if (!tableBody) return;

  let page = 1;
  const limit = 10;
  let total = 0;

  /* ================== EVENTS ================== */
  btnSearch?.addEventListener('click', () => {
    page = 1;
    load();
  });

  qInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      page = 1;
      load();
    }
  });

  statusFilter?.addEventListener('change', () => {
    page = 1;
    load();
  });

  pagerEl?.addEventListener('click', (e) => {
    const a = e.target.closest('[data-p]');
    if (!a) return;
    e.preventDefault();
    const p = Number(a.dataset.p);
    if (!Number.isNaN(p) && p !== page) {
      page = p;
      load();
    }
  });

  /* ================== RENDER ROWS ================== */
  function renderRows(items) {
    if (!items.length) {
      tableBody.innerHTML =
        '<tr><td colspan="9" class="text-muted small text-center">No records</td></tr>';
      return;
    }

    tableBody.innerHTML = items
      .map((r) => {
        const readerName = r.user?.name || r.user?.fullName || r.user?.email || '';

        const fullTitles = getBookTitles(r.details).join(', ');
        const titles = summarizeTitles(r.details);

        const borrowDate = r.borrowDate ? new Date(r.borrowDate).toLocaleDateString('vi-VN') : '';
        const dueDate = r.dueDate ? new Date(r.dueDate).toLocaleDateString('vi-VN') : '';

        const fine = Number(r.fineAmount || 0);

        // 🔥 Membership label cho bảng
        const membership = r.user?.plan || r.user?.membershipPlan || r.user?.membership || null;

        const membershipDueRaw =
          r.membershipDueDate || r.user?.planExpiresAt || r.user?.plan_expires_at || null;

        const membershipDue = membershipDueRaw
          ? new Date(membershipDueRaw).toLocaleDateString('vi-VN')
          : '';

        const planName = membership?.name || membership?.planName || membership?.code || '';

        let membershipLabel = 'None';
        if (planName && membershipDue) {
          membershipLabel = `${planName} (tới ${membershipDue})`;
        } else if (planName) {
          membershipLabel = planName;
        }

        let actionsHtml = `
          <button class="btn btn-sm btn-outline-secondary me-1 js-view" data-id="${r.id}">
            <i class="bi bi-eye"></i>
          </button>
        `;

        // 🔁 Phiếu đang còn giữ sách (borrowed / late) → hiện nút Return (trả sách + condition)
        if (r.status === 'borrowed' || r.status === 'late') {
          actionsHtml += `
            <button class="btn btn-sm btn-loan btn-success js-return" data-id="${r.id}">
              <i class="bi bi-check2-circle"></i>
            </button>
          `;
        }

        // 🔁 Phiếu đã trả hết sách nhưng còn phạt → status = pending → hiện nút Thanh toán
        if (r.status === 'pending') {
          actionsHtml += `
            <button class="btn btn-sm btn-warning js-pay" data-id="${r.id}">
              <i class="bi bi-credit-card"></i>
            </button>
          `;
        }

        return `
          <tr>
            <td>${r.id}</td>
            <td>
              <div>${esc(readerName)}</div>
              <div class="text-muted small">${esc(r.user?.email || '')}</div>
            </td>
            <td>
              <div class="books-cell text-truncate" title="${esc(fullTitles)}">
                ${esc(titles)}
              </div>
            </td>
            <td>${esc(borrowDate)}</td>
            <td>${esc(dueDate)}</td>
            <td>${badgeStatus(r.status)}</td>
            <td>${fine ? fine.toLocaleString('vi-VN') : '0'}</td>
            <td>${esc(membershipLabel)}</td>
            <td class="text-center">${actionsHtml}</td>
          </tr>
        `;
      })
      .join('');

    // gắn sự kiện
    tableBody.querySelectorAll('.js-view').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id) openViewModal(id);
      });
    });

    tableBody.querySelectorAll('.js-return').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id) openReturnModal(id);
      });
    });

    tableBody.querySelectorAll('.js-pay').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id) openPayModal(id);
      });
    });
  }

  /* ================== RENDER PAGER ================== */
  function renderPager(totalPages) {
    if (!pagerEl) return;
    const pages = totalPages || Math.max(1, Math.ceil(total / limit));

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
  }

  /* ================== LOAD DATA ================== */
  async function load() {
    tableBody.innerHTML =
      '<tr><td colspan="9" class="text-muted small text-center">Loading…</td></tr>';

    const qs = new URLSearchParams();
    qs.set('page', String(page));
    qs.set('limit', String(limit));
    qs.set('include', 'user,processedBy,details.copy.book,fines');

    if (statusFilter?.value) qs.set('status', statusFilter.value);
    if (qInput?.value?.trim()) qs.set('q', qInput.value.trim());

    try {
      const res = await apiGet(`/borrow-records?${qs.toString()}`);

      const payload = res?.data || res || {};
      const items = Array.isArray(payload.items)
        ? payload.items
        : Array.isArray(payload)
          ? payload
          : [];
      total = typeof payload.total === 'number' ? payload.total : items.length;
      const serverPage = typeof payload.page === 'number' ? payload.page : page;
      const totalPages =
        typeof payload.totalPages === 'number'
          ? payload.totalPages
          : Math.max(1, Math.ceil(total / limit));

      page = serverPage;

      if (!items.length) {
        tableBody.innerHTML =
          '<tr><td colspan="9" class="text-muted small text-center">No records</td></tr>';
      } else {
        renderRows(items);
      }

      if (countEl) countEl.textContent = `${total} record${total > 1 ? 's' : ''}`;
      renderPager(totalPages);
    } catch (err) {
      console.error('Load loans error:', err);
      tableBody.innerHTML =
        '<tr><td colspan="9" class="text-danger small text-center">Load failed</td></tr>';
      if (countEl) countEl.textContent = '';
      if (pagerEl) pagerEl.innerHTML = '';
      toast('Error', 'Failed to load loans');
    }
  }

  /* ================== VIEW MODAL ================== */
  async function openViewModal(id) {
    try {
      document.getElementById('loanModalLoading')?.classList.remove('d-none');
      document.getElementById('loanModalBody')?.classList.add('d-none');
      document.getElementById('loanModalId').textContent = `#${id}`;

      const res = await apiGet(
        `/borrow-records/${id}?include=user,processedBy,details.copy.book,fines,returnRecords`,
      );
      const r = res?.data || res || {};

      // ====== Reader / Processed by ======

      const readerName = r.user?.name || r.user?.fullName || '';
      const readerEmail = r.user?.email || '';
      const processedByLabel =
        r.processedBy?.name || r.processedBy?.fullName || r.processedBy?.email || '';

      const borrowDate = r.borrowDate ? new Date(r.borrowDate).toLocaleString('vi-VN') : '';
      const dueDate = r.dueDate ? new Date(r.dueDate).toLocaleString('vi-VN') : '';
      const returnDate = r.returnDate ? new Date(r.returnDate).toLocaleString('vi-VN') : '';

      // ====== Membership info ======
      const membership = r.user?.plan || r.user?.membershipPlan || r.user?.membership || null;

      const membershipDueRaw =
        r.membershipDueDate || r.user?.planExpiresAt || r.user?.plan_expires_at || null;

      const membershipDue = membershipDueRaw
        ? new Date(membershipDueRaw).toLocaleString('vi-VN')
        : '';

      const hasPlan = !!membership;

      const planName =
        membership?.name ||
        membership?.planName ||
        membership?.code ||
        (hasPlan ? 'Membership plan' : '');

      const planInfoText = hasPlan
        ? membershipDue
          ? `${planName} — hết hạn ${membershipDue}`
          : planName
        : 'None';

      // Header Due date: chỉ dùng cho user KHÔNG có membership
      const headerDueDate = dueDate || '—';

      const fine = Number(r.fineAmount || 0);

      // ====== Fines detail ======
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

      // ====== Books + slot trống ======
      const details = Array.isArray(r.details) ? r.details : [];

      // maxSlots lấy từ BE (membership), fallback 1
      const maxSlots = r.maxBooks || 1;

      const activeDetails = details.filter((d) => {
        const st = d.status || r.status || 'borrowed';
        return st === 'borrowed' || st === 'late';
      });

      // chỉ hiện slot trống nếu có membership
      const showSlots = hasPlan && maxSlots > 1;
      const emptySlots = showSlots ? Math.max(0, maxSlots - activeDetails.length) : 0;

      const detailById = {};
      details.forEach((d) => {
        if (d && d.id != null) detailById[d.id] = d;
      });

      // Card sách đang mượn
      const activeBooksHtml = activeDetails
        .map((d, idx) => {
          const title = d.copy?.book?.title || '(Unknown book)';
          const copyId = d.copy?.id;
          const copyCode = copyId != null ? `Copy ID: ${copyId}` : `Copy #${idx + 1}`;
          const status = d.status || r.status || 'borrowed';
          const isActive = status === 'borrowed' || status === 'late';

          // due date từng cuốn (vẫn tính để dùng cho user KHÔNG có membership
          let bookDueLabel = '—';
          if (d.dueDate) {
            bookDueLabel = new Date(d.dueDate).toLocaleString('vi-VN');
          } else if (d.loanDays && r.borrowDate) {
            const base = new Date(r.borrowDate);
            base.setDate(base.getDate() + Number(d.loanDays));
            bookDueLabel = base.toLocaleString('vi-VN');
          }

          const loanDaysLabel = d.loanDays ? `${d.loanDays} day(s)` : '—';

          // 🔥 chỉ cho return từng copy khi CÓ membership
          let returnBtnHtml = '';
          if (isActive && hasPlan) {
            returnBtnHtml = `
            <button
              class="btn btn-sm btn-outline-danger js-return-copy"
              data-detail-id="${d.id}"
              data-loan-id="${r.id}"
            >
              <i class="bi bi-box-arrow-in-left me-1"></i>
              Return this copy
            </button>
          `;
          } else if (!isActive) {
            returnBtnHtml = `
            <button
              class="btn btn-sm btn-outline-secondary"
              type="button"
              disabled
            >
              <i class="bi bi-check2-circle me-1"></i>
              Returned
            </button>
          `;
          }

          // 🔍 Detail + extra info CHỈ dành cho user KHÔNG có membership
          const extraInfoHtml = !hasPlan
            ? `
              <div class="loan-book-extra small text-muted mt-2 d-none"
                   data-extra-for="${d.id}">
                <div>Due date: <strong>${esc(bookDueLabel)}</strong></div>
                <div>Loan days: ${esc(String(loanDaysLabel))}</div>
              </div>
            `
            : '';

          const detailBtnHtml = !hasPlan
            ? `
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary js-detail"
                data-detail-id="${d.id}"
              >
                <i class="bi bi-info-circle me-1"></i>
                Detail
              </button>
            `
            : '';

          return `
          <div class="col-md-6 col-lg-4">
            <div class="loan-book-card p-3 rounded-3 border h-100 d-flex flex-column">
              <div>
                <h6 class="mb-1">${esc(title)}</h6>
                <div class="text-muted small mb-1">
                  <i class="bi bi-upc-scan me-1"></i>${esc(copyCode)}
                </div>
                <span class="badge rounded-pill text-bg-${
                  status === 'late' ? 'danger' : 'light'
                } text-capitalize mb-2">
                  <i class="bi bi-book-half me-1"></i>${esc(status)}
                </span>
                ${extraInfoHtml}
              </div>

              <div class="mt-auto d-flex gap-2">
                ${detailBtnHtml}
                ${returnBtnHtml}
              </div>
            </div>
          </div>
        `;
        })
        .join('');

      // Card slot trống (chỉ nếu showSlots = true)
      const emptySlotsHtml = showSlots
        ? Array.from({ length: emptySlots })
            .map(
              () => `
              <div class="col-md-6 col-lg-4">
                <div class="loan-book-card p-3 rounded-3 border border-dashed h-100 d-flex flex-column justify-content-center text-center text-muted"
                     style="border-style: dashed;">
                  <div class="mb-2">
                    <i class="bi bi-plus-circle fs-3"></i>
                  </div>
                  <div class="mb-2">Slot trống</div>
                  <button
                    class="btn btn-sm btn-outline-primary js-add-copy"
                    data-loan-id="${r.id}"
                    data-user-id="${r.user?.id || ''}"
                  >
                    Thêm sách vào phiếu này
                  </button>
                </div>
              </div>
            `,
            )
            .join('')
        : '';

      const booksHtml =
        activeBooksHtml || emptySlotsHtml
          ? activeBooksHtml + emptySlotsHtml
          : '<p class="text-muted small mb-0">No books</p>';

      // ====== Gán vào DOM ======
      document.getElementById('loanUserName').textContent = readerName;
      document.getElementById('loanUserEmail').textContent = readerEmail;
      document.getElementById('loanProcessedBy').textContent = processedByLabel;

      const dueDateCol = document.getElementById('loanDueDateCol');

      document.getElementById('loanBorrowDate').textContent = borrowDate;
      document.getElementById('loanReturnDate').textContent = returnDate || '—';

      // 🔥 Ẩn/hiện Due date theo membership
      if (hasPlan) {
        // Có gói → ẩn cột Due date, chỉ xem hạn ở Membership plan
        if (dueDateCol) dueDateCol.classList.add('d-none');
      } else {
        // Không có gói → hiện Due date như bình thường
        if (dueDateCol) dueDateCol.classList.remove('d-none');
        document.getElementById('loanDueDate').textContent = headerDueDate;
      }

      document.getElementById('loanStatus').innerHTML = badgeStatus(r.status);
      document.getElementById('loanFineAmount').textContent = fine
        ? `${fine.toLocaleString('vi-VN')} VNĐ`
        : '0';

      document.getElementById('loanFines').innerHTML = finesHtml;
      document.getElementById('loanBooks').innerHTML = booksHtml;

      // membership text
      const planInfoEl = document.getElementById('loanPlanInfo');
      if (planInfoEl) planInfoEl.textContent = planInfoText;

      const maxBooksLabel = document.getElementById('loanMaxBooksLabel');
      const slotsHelp = document.getElementById('loanSlotsHelp');
      if (maxBooksLabel) maxBooksLabel.textContent = String(maxSlots);
      if (slotsHelp) {
        if (showSlots) slotsHelp.classList.remove('d-none');
        else slotsHelp.classList.add('d-none');
      }

      const booksContainer = document.getElementById('loanBooks');

      // Detail toggle
      booksContainer?.querySelectorAll('.js-detail').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const detailId = e.currentTarget.getAttribute('data-detail-id');
          if (!detailId) return;
          const extra = booksContainer.querySelector(
            `.loan-book-extra[data-extra-for="${detailId}"]`,
          );
          if (!extra) return;
          extra.classList.toggle('d-none');
        });
      });

      // Return từng copy → mở modal condition
      booksContainer?.querySelectorAll('.js-return-copy').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const detailId = Number(e.currentTarget.getAttribute('data-detail-id'));
          const loanId = Number(e.currentTarget.getAttribute('data-loan-id'));
          if (!detailId) return;

          // nếu chưa có modal thì fallback confirm cũ
          if (!returnCopyModal || !returnCopyForm) {
            if (!confirm('Xác nhận trả cuốn sách này?')) return;
            apiPost(`/borrow-details/${detailId}/return`, {})
              .then(() => {
                toast('Success', 'Đã trả cuốn sách này.');
                openViewModal(String(loanId));
                load();
              })
              .catch((err) => {
                console.error('Return copy error:', err);
                toast('Error', 'Không thể trả cuốn sách, vui lòng thử lại.');
              });
            return;
          }

          const d = detailById[detailId] || {};
          const bookTitle = d.copy?.book?.title || '(Unknown book)';
          const copyId = d.copy?.id;
          const copyCode = copyId != null ? `Copy ID: ${copyId}` : '';

          const borrowDateStr = borrowDate;

          // due date từng copy
          let bookDue = '';
          if (d.dueDate) {
            bookDue = new Date(d.dueDate).toLocaleString('vi-VN');
          } else if (d.loanDays && r.borrowDate) {
            const base2 = new Date(r.borrowDate);
            base2.setDate(base2.getDate() + Number(d.loanDays));
            bookDue = base2.toLocaleString('vi-VN');
          }

          // tính số ngày trễ (chỉ hiển thị)
          let lateLabel = 'On time';
          if (bookDue) {
            const now = new Date();
            const dueObj = d.dueDate ? new Date(d.dueDate) : new Date(bookDue);
            const diffMs = now.getTime() - dueObj.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            lateLabel = diffDays > 0 ? `${diffDays} day(s) late` : 'On time';
          }

          // 🔹 TÍNH TIỀN CỌC ĐANG GIỮ CHO PHIẾU NÀY
          const requiredDeposit = Number(r.requiredDeposit || 0);
          const paidDeposit = Number(r.paidDeposit || 0);
          const depositStatus = r.depositStatus || '';
          let depositHeld = 0;
          if (depositStatus === 'held') {
            // cọc đang giữ = min(required, paid)
            depositHeld = Math.min(
              requiredDeposit || paidDeposit || 0,
              paidDeposit || requiredDeposit || 0,
            );
          }

          // set UI cho modal
          const titleEl = document.getElementById('returnCopyTitle');
          if (titleEl) titleEl.textContent = `#${detailId}`;

          const bookEl = document.getElementById('returnCopyBook');
          if (bookEl) bookEl.textContent = bookTitle;

          const metaEl = document.getElementById('returnCopyMeta');
          if (metaEl) metaEl.textContent = copyCode;

          const borrowEl = document.getElementById('returnCopyBorrowDate');
          if (borrowEl) borrowEl.textContent = borrowDateStr || '—';

          const dueEl = document.getElementById('returnCopyDueDate');
          if (dueEl) dueEl.textContent = bookDue || '—';

          const lateEl = document.getElementById('returnCopyLate');
          if (lateEl) lateEl.textContent = lateLabel;

          // 💰 HIỆN TIỀN CỌC TRONG MODAL
          const depositEl = document.getElementById('returnCopyDeposit');
          if (depositEl) {
            depositEl.textContent = depositHeld
              ? `${depositHeld.toLocaleString('vi-VN')} VNĐ`
              : '0 VNĐ';
          }

          // reset form + lưu id
          returnCopyForm.reset();
          returnCopyForm.dataset.detailId = String(detailId);
          returnCopyForm.dataset.loanId = String(loanId);

          returnCopyModal.show();
        });
      });

      // Thêm sách vào phiếu (chỉ có nếu showSlots)
      booksContainer?.querySelectorAll('.js-add-copy').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const loanId = e.currentTarget.getAttribute('data-loan-id');
          const userId = e.currentTarget.getAttribute('data-user-id') || '';
          location.href = `librarian-loans-create.html?borrowId=${loanId}&userId=${userId}`;
        });
      });

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

  /* ================== NEW: OPEN RETURN + CONDITION MODAL (whole loan) ================== */
  async function openReturnModal(id) {
    if (!returnModal || !returnForm || !returnTableBody) {
      // fallback: return nhanh
      if (confirm(`Đánh dấu phiếu mượn #${id} là ĐÃ TRẢ (no condition)?`)) {
        await doReturn(id);
      }
      return;
    }

    try {
      const res = await apiGet(`/borrow-records/${id}?include=user,details.copy.book,fines`);
      const r = res?.data || res || {};

      currentReturnLoanId = r.id;
      currentLateFine = Number(r.fineAmount || 0);

      const requiredDeposit = Number(r.requiredDeposit || 0);
      const paidDeposit = Number(r.paidDeposit || 0);
      currentDepositHeld = r.depositStatus === 'held' ? Math.min(requiredDeposit, paidDeposit) : 0;

      // 🟢 CHỈ LẤY NHỮNG CUỐN CÒN ĐANG MƯỢN
      const allDetails = Array.isArray(r.details) ? r.details : [];
      const details = allDetails.filter((d) => {
        const st = String(d.status || '').toLowerCase();
        return st === 'borrowed' || st === 'late';
      });

      if (!details.length) {
        returnTableBody.innerHTML =
          '<tr><td colspan="4" class="text-muted small text-center">No active books to return</td></tr>';

        // reset tổng tiền phạt = chỉ còn late fine (nếu có), cọc vẫn show
        if (returnLateFineEl) {
          returnLateFineEl.textContent = currentLateFine
            ? currentLateFine.toLocaleString('vi-VN')
            : '0';
        }
        if (returnDamageFineEl) returnDamageFineEl.textContent = '0';
        if (returnDepositEl) {
          returnDepositEl.textContent = currentDepositHeld
            ? currentDepositHeld.toLocaleString('vi-VN')
            : '0';
        }
        if (returnTotalFineEl) {
          const totalBeforeDeposit = currentLateFine;
          const usedFromDeposit = Math.min(currentDepositHeld, totalBeforeDeposit);
          const remaining = totalBeforeDeposit - usedFromDeposit;
          returnTotalFineEl.textContent = remaining ? remaining.toLocaleString('vi-VN') : '0';
        }

        returnModal.show();
        return;
      }

      // ⬇️ phần render rows giữ nguyên nhưng dùng mảng `details` mới
      returnTableBody.innerHTML = details
        .map((d, idx) => {
          const title = d.copy?.book?.title || '(Unknown book)';
          const copyId = d.copy?.id;
          const copyCode = copyId != null ? `Copy ID: ${copyId}` : `Copy #${idx + 1}`;
          const price = Number(d.copy?.book?.price || 0);

          return `
          <tr>
            <td>
              <div>${esc(title)}</div>
              <div class="text-muted small">${esc(copyCode)}</div>
            </td>
            <td class="text-end">
              ${price ? price.toLocaleString('vi-VN') : '—'}
            </td>
            <td>
              <select
                class="form-select form-select-sm js-condition"
                data-detail-id="${d.id}"
                data-price="${price}"
              >
                <option value="normal" selected>Normal</option>
                <option value="damaged">Damaged (50%)</option>
                <option value="lost">Lost (100%)</option>
              </select>
            </td>
            <td class="text-end">
              <span class="js-condition-fine" data-fine-for="${d.id}">0</span>
            </td>
          </tr>
        `;
        })
        .join('');

      // hàm cập nhật phần tổng tiền phạt + cọc
      const updateDamageTotals = () => {
        let totalDamage = 0;
        returnForm.querySelectorAll('.js-condition').forEach((sel) => {
          const detailId = Number(sel.dataset.detailId);
          const price = Number(sel.dataset.price || 0);
          let damage = 0;

          if (sel.value === 'damaged') damage = price * 0.5;
          else if (sel.value === 'lost') damage = price * 1;

          totalDamage += damage;

          const fineSpan = returnForm.querySelector(
            `.js-condition-fine[data-fine-for="${detailId}"]`,
          );
          if (fineSpan) {
            fineSpan.textContent = damage ? damage.toLocaleString('vi-VN') : '0';
          }
        });

        if (returnDamageFineEl) {
          returnDamageFineEl.textContent = totalDamage ? totalDamage.toLocaleString('vi-VN') : '0';
        }

        const totalBeforeDeposit = currentLateFine + totalDamage;
        const usedFromDeposit = Math.min(currentDepositHeld, totalBeforeDeposit);
        const remaining = totalBeforeDeposit - usedFromDeposit;

        if (returnLateFineEl) {
          returnLateFineEl.textContent = currentLateFine
            ? currentLateFine.toLocaleString('vi-VN')
            : '0';
        }
        if (returnDepositEl) {
          returnDepositEl.textContent = currentDepositHeld
            ? currentDepositHeld.toLocaleString('vi-VN')
            : '0';
        }
        if (returnTotalFineEl) {
          returnTotalFineEl.textContent = remaining ? remaining.toLocaleString('vi-VN') : '0';
        }
      };

      // gắn sự kiện change cho select condition
      returnForm
        .querySelectorAll('.js-condition')
        .forEach((sel) => sel.addEventListener('change', updateDamageTotals));

      // set lần đầu
      updateDamageTotals();

      // clear note
      const noteTextarea = returnForm.querySelector('textarea[name="note"]');
      if (noteTextarea) noteTextarea.value = '';

      returnModal.show();
    } catch (err) {
      console.error('Open return modal error:', err);
      toast('Error', 'Không tải được thông tin phiếu mượn');
    }
  }

  // Submit form return + condition (whole loan)
  returnForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentReturnLoanId) return;

    if (!confirm(`Xác nhận trả sách cho phiếu #${currentReturnLoanId}?`)) return;

    const conditions = Array.from(returnForm.querySelectorAll('.js-condition')).map((sel) => ({
      detailId: Number(sel.dataset.detailId),
      condition: sel.value, // normal | damaged | lost
      price: Number(sel.dataset.price || 0),
      damageFine: (() => {
        const price = Number(sel.dataset.price || 0);
        if (sel.value === 'damaged') return price * 0.5;
        if (sel.value === 'lost') return price * 1;
        return 0;
      })(),
    }));

    const note = returnForm.querySelector('textarea[name="note"]')?.value?.trim() || '';

    try {
      await apiPost(`/borrow-records/${currentReturnLoanId}/return`, {
        conditions,
        note,
        fineAmount: currentLateFine,
      });

      // ⚠️ Backend có thể set status = returned hoặc pending tùy có phạt hay không
      toast('Success', `Loan #${currentReturnLoanId} updated (returned / pending)`);
      returnModal.hide();
      load();
    } catch (err) {
      console.error('Return with condition error:', err);
      const msg = err?.message || 'Return failed';
      toast('Error', msg);
    }
  });

  // Submit return từng copy (membership – từ loan detail)
  returnCopyForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const detailId = Number(returnCopyForm.dataset.detailId);
    const loanId = Number(returnCopyForm.dataset.loanId);
    if (!detailId || !loanId) return;

    const condition =
      returnCopyForm.querySelector('input[name="condition"]:checked')?.value || 'good';
    const note = returnCopyForm.querySelector('textarea[name="note"]')?.value?.trim() || '';

    if (!confirm(`Xác nhận trả cuốn sách này với tình trạng: ${condition.toUpperCase()}?`)) return;

    try {
      // 💥 GỌI API VÀ LẤY RESPONSE
      const res = await apiPost(`/borrow-details/${detailId}/return`, { condition, note });
      const payload = res?.data || res || {};

      // 🔢 LẤY CÁC GIÁ TRỊ SAU KHI BE ĐÃ TRỪ CỌC
      const fineAmount = Number(payload.fineAmount ?? 0); // tiền phạt còn lại của phiếu
      const requiredDeposit = Number(payload.requiredDeposit ?? 0);
      const paidDeposit = Number(payload.paidDeposit ?? 0);
      const depositStatus = payload.depositStatus || '';

      // tiền cọc hiện đang giữ sau lần trả này
      const depositHeld =
        depositStatus === 'held'
          ? Math.min(requiredDeposit || paidDeposit || 0, paidDeposit || requiredDeposit || 0)
          : 0;

      // 🧾 GHÉP MESSAGE CHO LIBRARIAN DỄ NHÌN
      let msg = 'Đã trả cuốn sách này.';
      msg += `\nTiền phạt còn lại của phiếu: ${fineAmount.toLocaleString('vi-VN')} VNĐ.`;

      if (depositHeld > 0) {
        msg += `\nTiền cọc đang giữ: ${depositHeld.toLocaleString('vi-VN')} VNĐ.`;
      } else if (requiredDeposit > 0 && depositStatus === 'used') {
        // trường hợp cọc đã được dùng hết để trừ phạt
        msg += `\nTiền cọc đã được dùng để trừ phạt.`;
      }

      toast('Success', msg);

      returnCopyModal?.hide();
      // reload lại detail + danh sách để nhìn được số tiền mới
      openViewModal(String(loanId));
      load();
    } catch (err) {
      console.error('Return copy error:', err);
      toast('Error', 'Không thể trả cuốn sách, vui lòng thử lại.');
    }
  });

  /* ================== RETURN WHOLE LOAN (simple fallback) ================== */
  async function doReturn(id) {
    try {
      await apiPost(`/borrow-records/${id}/return`, {});
      toast('Success', `Loan #${id} updated (returned / pending)`);
      load();
    } catch (err) {
      console.error('Return error:', err);
      const msg = err?.message || 'Return failed';
      toast('Error', msg);
    }
  }

  /* ================== PAY FINE ================== */
  async function openPayModal(id) {
    if (!payModal || !payForm) {
      toast('Error', 'Payment UI not available');
      return;
    }
    try {
      const res = await apiGet(`/borrow-records/${id}?include=user,details.copy.book,fines`);
      const r = res?.data || res;

      const fine = (r.fines || []).find((f) => f.status === 'unpaid') || r.fines?.[0];

      if (!fine) {
        toast('Info', 'Không tìm thấy phiếu phạt chưa thanh toán');
        return;
      }

      const titles =
        r.details
          ?.map((d) => d.copy?.book?.title)
          .filter(Boolean)
          .join(', ') || '—';

      document.getElementById('payBorrowId').textContent = `#${r.id}`;
      document.getElementById('payReader').textContent =
        r.user?.name || r.user?.fullName || r.user?.email || '';
      document.getElementById('payBooks').textContent = titles;
      document.getElementById('payAmount').textContent = Number(fine.amount || 0).toLocaleString(
        'vi-VN',
      );

      // 🔄 reset QR mỗi lần mở modal tiền phạt
      if (fineQrSection) fineQrSection.classList.add('d-none');
      if (fineQrImage) {
        fineQrImage.src = '';
        fineQrImage.style.display = 'none';
      }
      if (finePayLink) finePayLink.href = '#';

      payForm.dataset.borrowId = r.id;
      payModal.show();
    } catch (err) {
      console.error('Open pay modal error:', err);
      toast('Error', 'Không tải được thông tin thanh toán');
    }
  }

  // 🔁 Submit form thanh toán tiền phạt (cash vs bank_transfer)
  payForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const borrowId = payForm.dataset.borrowId;
    if (!borrowId) return;

    const method = payForm.querySelector('input[name="paymentMethod"]:checked')?.value || 'cash';
    const note = payForm.querySelector('textarea[name="note"]')?.value?.trim() || '';

    try {
      const res = await apiPost(`/borrow-records/${borrowId}/pay`, { method, note });
      const body = res?.data || res || {};
      const payData = body.data || body; // BE có thể bọc trong {data: ...}

      // 🔹 Chuyển khoản → hiện QR, KHÔNG đóng modal
      if (method === 'bank_transfer') {
        const payUrl = payData.payUrl || payData.qrUrl || null;
        const qrData = payData.qrData || null; // nếu BE trả base64
        const imgSrc = qrData || payUrl;

        const orderId =
          payData.orderId || payData.code || payData.description || payData.note || '';
        const bankName = payData.bank || 'TPBank';
        const bankAccount = payData.account || payData.acc || '00000012421';

        if (fineQrSection) fineQrSection.classList.remove('d-none');
        if (imgSrc && fineQrImage) {
          fineQrImage.src = imgSrc;
          fineQrImage.style.display = 'block';
        }
        if (finePayLink && payUrl) {
          finePayLink.href = payUrl;
        }
        if (fineBankNameEl) fineBankNameEl.textContent = bankName;
        if (fineBankAccountEl) fineBankAccountEl.textContent = bankAccount;
        if (fineTransferContentEl) fineTransferContentEl.textContent = orderId;

        toast(
          'Success',
          'Đã tạo yêu cầu chuyển khoản. Hệ thống sẽ tự kiểm tra giao dịch sau khi độc giả thanh toán.',
        );

        // 🆕 BẮT ĐẦU POLL TRẠNG THÁI THANH TOÁN
        startFinePolling(borrowId);

        return;
      }

      // 💵 Tiền mặt: flow cũ
      toast('Success', `Đã thanh toán cho phiếu #${borrowId}`);
      payModal.hide();
      load();
    } catch (err) {
      console.error('Pay error:', err);
      toast('Error', 'Thanh toán thất bại');
    }
  });

  /* ================== INIT ================== */
  load();
}

/* ================== AUTO-RUN ================== */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLibrarianLoans);
} else {
  initLibrarianLoans();
}
