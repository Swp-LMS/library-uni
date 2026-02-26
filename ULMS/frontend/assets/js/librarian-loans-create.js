// assets/js/librarian-loans-create.js
import { apiGet, apiPost } from './api.js';

/* ============================================================
   FORMAT DATE
============================================================ */
// yyyy-MM-dd (gửi backend)
function formatDateInput(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

// dd/MM/yyyy (hiển thị UI)
function formatDisplay(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${da}/${m}/${y}`;
}

/* ============================================================
   LẤY userId TỪ URL
============================================================ */
const params = new URLSearchParams(location.search);
const userId = params.get('userId');

const userInfoBox = document.getElementById('userInfo');
const userInfoLoading = document.getElementById('userInfoLoading');
const userIdInput = document.getElementById('userIdInput');

if (!userId) {
  if (userInfoLoading) {
    userInfoLoading.textContent = 'Missing userId in URL.';
  }
  document.getElementById('loanForm')?.classList.add('d-none');
} else {
  userIdInput.value = userId;
  loadUserInfo();
}

/* ============================================================
   LOAD USER INFO
============================================================ */
async function loadUserInfo() {
  try {
    const res = await apiGet(`/users/${userId}`);
    const u = res.data || res;

    document.getElementById('uId').textContent = u.id;
    document.getElementById('uName').textContent = u.name || u.fullName || '(no name)';
    document.getElementById('uEmail').textContent = u.email || '-';
    document.getElementById('uPhone').textContent = u.phone || '-';
    document.getElementById('uAddress').textContent = u.address || '-';

    userInfoLoading.classList.add('d-none');
    userInfoBox.classList.remove('d-none');
  } catch (err) {
    console.error(err);
    userInfoLoading.textContent = 'Không tải được thông tin user.';
  }
}

/* ============================================================
   DATE DEFAULTS
============================================================ */
const borrowDateHidden = document.getElementById('borrowDate');
const borrowDateDisplay = document.getElementById('borrowDateDisplay');
const dueDateInput = document.getElementById('dueDate');

const today = new Date();

// luôn mượn trong ngày
if (borrowDateHidden) {
  borrowDateHidden.value = formatDateInput(today); // yyyy-MM-dd
}
if (borrowDateDisplay) {
  borrowDateDisplay.value = formatDisplay(today); // dd/MM/yyyy
}

// DueDate hiển thị = text, JS tự set
if (dueDateInput) {
  dueDateInput.value = '';
  dueDateInput.placeholder = 'Auto by book price';
}

/* ============================================================
   LOAD SETTINGS (để lấy rule theo price)
============================================================ */
let appSettings = null;
async function loadSettings() {
  try {
    const res = await apiGet('/admin/settings');
    appSettings = res.data || res;
  } catch (err) {
    console.error('Không tải được settings, sẽ dùng fallback.', err);
  }
}
loadSettings();

/* ============================================================
   HÀM TÍNH RULE THEO GIÁ (GIỐNG BACKEND)
============================================================ */
function calcRuleByPriceFrontend(price) {
  const p = Number(price ?? 0);

  // settings load từ /admin/settings (đã gán vào appSettings ở trên)
  const s = appSettings || {};

  const lowPriceMax = Number(s.lowPriceMax ?? 200000);
  const midPriceMax = Number(s.midPriceMax ?? 500000);

  const lowLoanDays = Number(s.lowLoanDays ?? 7);
  const midLoanDays = Number(s.midLoanDays ?? 14);
  const highLoanDays = Number(s.highLoanDays ?? 30);

  const lowDeposit = Number(s.lowDeposit ?? 0);
  const midDeposit = Number(s.midDeposit ?? 50000);
  const highDeposit = Number(s.highDeposit ?? 200000);

  // Giá không hợp lệ → xếp vào tier rẻ
  if (!Number.isFinite(p) || p <= 0) {
    return {
      maxLoanDays: lowLoanDays,
      depositAmount: lowDeposit,
      requiresDeposit: lowDeposit > 0,
      tier: 'low',
    };
  }

  if (p <= lowPriceMax) {
    return {
      maxLoanDays: lowLoanDays,
      depositAmount: lowDeposit,
      requiresDeposit: lowDeposit > 0,
      tier: 'low',
    };
  }

  if (p <= midPriceMax) {
    return {
      maxLoanDays: midLoanDays,
      depositAmount: midDeposit,
      requiresDeposit: midDeposit > 0,
      tier: 'medium',
    };
  }

  return {
    maxLoanDays: highLoanDays,
    depositAmount: highDeposit,
    requiresDeposit: highDeposit > 0,
    tier: 'high',
  };
}

/* ============================================================
   HÀM CẬP NHẬT DUE DATE PREVIEW (dd/MM/yyyy)
============================================================ */
let currentDurationDays = null;

function updateDueDatePreview() {
  if (!borrowDateHidden || !dueDateInput || !borrowDateHidden.value || !currentDurationDays) return;

  const base = new Date(borrowDateHidden.value); // yyyy-MM-dd
  if (isNaN(base.getTime())) return;

  const d = new Date(base);
  d.setDate(d.getDate() + currentDurationDays);
  dueDateInput.value = formatDisplay(d); // dd/MM/yyyy
}

/* ============================================================
   LOAD BOOK LIST
============================================================ */
const bookSelect = document.getElementById('bookSelect');
const bookError = document.getElementById('bookError');
const copyError = document.getElementById('copyError');
const copyIdHidden = document.getElementById('copyId');

// hiển thị tiền cọc
const depositPreview = document.getElementById('depositAmountDisplay');
const depositNote = document.getElementById('depositNote');

async function loadBooks() {
  try {
    const res = await apiGet('/books?page=1&limit=200');
    const books = Array.isArray(res) ? res : res.data || res.items || [];

    if (!books.length) {
      bookError.textContent = 'Không có sách nào trong hệ thống.';
      bookError.classList.remove('d-none');
      return;
    }

    bookSelect.innerHTML = `<option value="">-- Chọn sách --</option>`;
    books.forEach((b) => {
      bookSelect.innerHTML += `<option value="${b.id}">${b.title}</option>`;
    });
  } catch (err) {
    console.error(err);
    bookError.textContent = 'Không tải được danh sách sách.';
    bookError.classList.remove('d-none');
  }
}

loadBooks();

/* ============================================================
   CHỌN SÁCH → COPY + DURATION + DEPOSIT + DUE DATE PREVIEW
============================================================ */
bookSelect.addEventListener('change', async () => {
  const bookId = bookSelect.value;

  // Reset copy + due date
  copyIdHidden.value = '';
  copyError.classList.add('d-none');
  copyError.textContent = '';
  currentDurationDays = null;
  if (dueDateInput) dueDateInput.value = '';

  // Reset deposit UI
  if (depositPreview) {
    depositPreview.value = 'Không cần đặt cọc';
  }
  if (depositNote) {
    depositNote.textContent = 'Tiền đặt cọc sẽ được tính dựa trên giá sách và rule trong Settings.';
  }

  if (!bookId) return;

  try {
    const res = await apiGet(`/books/${bookId}?include=copies`);
    const book = res.data || res;
    const copies = Array.isArray(book.copies) ? book.copies : [];

    const available = copies.find((c) => c.status === 'available');

    if (!available) {
      copyError.textContent = 'Sách này chưa có bản copy khả dụng.';
      copyError.classList.remove('d-none');
      return;
    }

    copyIdHidden.value = available.id;

    // 🔥 TÍNH RULE THEO GIÁ (đúng backend)
    const price = Number(book.price ?? 0);
    const rule = calcRuleByPriceFrontend(price);

    // cập nhật số ngày mượn
    currentDurationDays = rule.maxLoanDays;
    updateDueDatePreview();

    // cập nhật UI tiền cọc
    if (depositPreview) {
      if (!rule.requiresDeposit || rule.depositAmount <= 0) {
        depositPreview.value = 'Không cần đặt cọc';
      } else {
        depositPreview.value = `Cần đặt cọc: ${rule.depositAmount.toLocaleString('vi-VN')} đ`;
      }
    }

    if (depositNote) {
      depositNote.textContent =
        'Tiền đặt cọc được ước tính dựa trên giá sách và cấu hình trong Settings.';
    }
  } catch (err) {
    console.error(err);
    copyError.textContent = 'Không tải được bản copy / book.';
    copyError.classList.remove('d-none');
  }
});

/* ============================================================
   SUBMIT TẠO LOAN
============================================================ */
const form = document.getElementById('loanForm');
const btnSubmit = document.getElementById('btnSubmit');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!form.checkValidity()) {
    form.classList.add('was-validated');
    return;
  }

  if (!userId) {
    alert('Missing userId, không thể tạo loan.');
    return;
  }

  const copyIdVal = copyIdHidden.value;
  const copyId = Number(copyIdVal);

  if (!copyId) {
    alert('Không còn bản copy khả dụng cho sách này.');
    return;
  }

  const payload = {
    userId: Number(userId),
    copyId,
    borrowDate: borrowDateHidden.value, // yyyy-MM-dd
    status: 'borrowed',
  };

  btnSubmit.disabled = true;
  btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...';

  try {
    const res = await apiPost('/borrow-records', payload);
    const borrow = res.data || res; // BE trả borrowRecord

    const requiredDeposit = Number(borrow.requiredDeposit || 0);
    const paidDeposit = Number(borrow.paidDeposit || 0);
    const depositStatus = borrow.depositStatus; // 'none' | 'pending' | 'held'...

    const remainDeposit = requiredDeposit - paidDeposit;

    // 🔥 Nếu còn tiền cọc phải thu thì mở modal
    if (remainDeposit > 0 && depositStatus === 'pending') {
      openDepositModal(borrow);
    } else {
      alert('Tạo phiếu mượn thành công!');
      window.location.href = 'librarian-loans.html';
    }
  } catch (err) {
    console.error(err);

    let msg = 'Tạo phiếu mượn thất bại. Vui lòng thử lại.';

    // apiPost() thường throw new Error(bodyText)
    if (err && err.message) {
      try {
        const data = JSON.parse(err.message); // {"success":false,"message":"..."}
        if (data && data.message) {
          msg = data.message; // ← lấy đúng message BE
        }
      } catch (e) {
        // nếu không parse được JSON thì dùng luôn err.message
        msg = err.message || msg;
      }
    }

    alert(msg);
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = '<i class="bi bi-check-circle me-1"></i>Create Loan';
  }
});

// ============================================================
//  DEPOSIT MODAL + AUTO WATCHER
// ============================================================
let depositModalInstance = null;
let currentBorrowId = null;

// watcher state
let depositPollTimer = null;
let depositPaid = false;
let lastDepositAmount = 0;

function stopDepositWatcher() {
  if (depositPollTimer) {
    clearInterval(depositPollTimer);
    depositPollTimer = null;
  }
}

function startDepositWatcher(borrowId, expectedAmount) {
  stopDepositWatcher();
  depositPaid = false;
  lastDepositAmount = expectedAmount || 0;

  const btnConfirm = document.getElementById('btnConfirmDeposit');
  const modalBody = document.querySelector('#depositModal .modal-body');

  if (btnConfirm) {
    btnConfirm.disabled = true;
    btnConfirm.innerHTML =
      '<span class="spinner-border spinner-border-sm me-1"></span>Đang chờ thanh toán...';
  }

  depositPollTimer = setInterval(async () => {
    try {
      const res = await apiGet(`/borrow-records/${borrowId}`);
      const br = res.data || res;
      if (!br) return;

      const required = Number(br.requiredDeposit || br.required_deposit || 0);
      const paid = Number(br.paidDeposit || br.paid_deposit || br.depositPaidAmount || 0);
      const status = br.depositStatus || '';
      const flagPaid = br.isDepositPaid === true || status === 'held';

      const isPaid =
        flagPaid ||
        (required > 0 && paid >= required) ||
        (lastDepositAmount > 0 && paid >= lastDepositAmount);

      if (!isPaid) return;

      depositPaid = true;
      stopDepositWatcher();

      if (modalBody) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-success mt-3';
        alertDiv.textContent =
          'Đã nhận tiền đặt cọc ' +
          (lastDepositAmount || required || paid).toLocaleString('vi-VN') +
          ' đ qua SePay.';
        modalBody.appendChild(alertDiv);
      }

      if (btnConfirm) {
        btnConfirm.disabled = true;
        btnConfirm.innerHTML = '<i class="bi bi-check-circle me-1"></i>Đã thu cọc';
      }

      setTimeout(() => {
        if (depositModalInstance) {
          depositModalInstance.hide();
        }
        window.location.href = 'librarian-loans.html';
      }, 1500);
    } catch (err) {
      console.error('Deposit watcher error:', err);
    }
  }, 4000);
}

// 🔥 AUTO HỦY PHIẾU KHI ĐÓNG MODAL MÀ CHƯA THU CỌC
const depositModalEl = document.getElementById('depositModal');
if (depositModalEl) {
  depositModalEl.addEventListener('hidden.bs.modal', async () => {
    // Không có phiếu nào đang mở → bỏ
    if (!currentBorrowId) return;

    // Đã thu cọc rồi → KHÔNG hủy
    if (depositPaid) {
      currentBorrowId = null;
      return;
    }

    try {
      // dừng watcher nếu có
      stopDepositWatcher();

      // gọi API hủy phiếu
      await apiPost(`/borrow-records/${currentBorrowId}/cancel`, {});
      console.log('Auto cancelled borrow record because deposit modal closed:', currentBorrowId);
    } catch (err) {
      console.error('Auto cancel borrow on modal close failed:', err);
    } finally {
      currentBorrowId = null;
    }
  });
}

function openDepositModal(borrow) {
  currentBorrowId = borrow.id;

  const required = Number(borrow.requiredDeposit || 0);
  const paid = Number(borrow.paidDeposit || 0);
  const amount = Math.max(required - paid, 0); // 💰 chỉ hiển thị phần còn thiếu

  const titles =
    (borrow.details || [])
      .map((d) => d.copy?.book?.title)
      .filter(Boolean)
      .join(', ') || 'các sách trong phiếu này';

  const readerName = document.getElementById('uName')?.textContent || '';

  const amountLabel = document.getElementById('depositAmountLabel');
  const bookLabel = document.getElementById('depositBookLabel');
  const readerLabel = document.getElementById('depositReaderLabel');
  const noteInput = document.getElementById('depositNoteInput');

  if (amountLabel) {
    amountLabel.textContent = amount.toLocaleString('vi-VN') + ' đ';
  }
  if (bookLabel) {
    bookLabel.textContent = titles;
  }
  if (readerLabel) {
    readerLabel.textContent = readerName;
  }
  if (noteInput) {
    noteInput.value = '';
  }

  // reset watcher & button state mỗi lần mở
  stopDepositWatcher();
  depositPaid = false;
  const btnConfirm = document.getElementById('btnConfirmDeposit');
  if (btnConfirm) {
    btnConfirm.disabled = false;
    btnConfirm.innerHTML = '<i class="bi bi-cash-coin me-1"></i>Confirm & Finish';
  }

  // reset QR / link mỗi lần mở modal
  if (depositQrSection) {
    depositQrSection.classList.add('d-none');
  }
  if (depositQrImage) {
    depositQrImage.src = '';
    depositQrImage.style.display = 'none';
  }
  if (depositPayLink) {
    depositPayLink.href = '#';
  }

  if (!depositModalInstance) {
    depositModalInstance = new bootstrap.Modal(document.getElementById('depositModal'));
  }
  depositModalInstance.show();
}

const btnConfirmDeposit = document.getElementById('btnConfirmDeposit');
const depositQrSection = document.getElementById('depositQrSection');
const depositQrImage = document.getElementById('depositQrImage');
const depositPayLink = document.getElementById('depositPayLink');
const btnCancelLoan = document.getElementById('btnCancelLoan');
// các field info ngân hàng
const bankNameEl = document.getElementById('bankName');
const bankAccountEl = document.getElementById('bankAccount');
const transferContentEl = document.getElementById('transferContent');
const btnCopyBankAccount = document.getElementById('btnCopyBankAccount');
const btnCopyContent = document.getElementById('btnCopyContent');

// helper copy
function copyToClipboard(text, label) {
  if (!text) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(
      () => alert(`Đã copy ${label} vào clipboard.`),
      () => alert('Không thể copy. Vui lòng copy tay.'),
    );
  } else {
    alert('Trình duyệt không hỗ trợ copy tự động. Vui lòng copy tay.');
  }
}

if (btnCopyBankAccount) {
  btnCopyBankAccount.addEventListener('click', () => {
    const txt = bankAccountEl?.textContent?.trim() || '';
    copyToClipboard(txt, 'số tài khoản');
  });
}

if (btnCopyContent) {
  btnCopyContent.addEventListener('click', () => {
    const txt = transferContentEl?.textContent?.trim() || '';
    copyToClipboard(txt, 'nội dung chuyển khoản');
  });
}

if (btnConfirmDeposit) {
  btnConfirmDeposit.addEventListener('click', async () => {
    if (!currentBorrowId) return;

    const methodInput = document.querySelector('input[name="depositMethod"]:checked');
    const method = methodInput ? methodInput.value : 'cash'; // 'cash' | 'bank_transfer'
    const note = (document.getElementById('depositNoteInput').value || '').trim();

    // Nếu đã nhận cọc rồi mà librarian vẫn bấm → chỉ đóng modal, không tạo mã mới
    if (method === 'bank_transfer' && depositPaid) {
      if (depositModalInstance) {
        depositModalInstance.hide();
      }
      return;
    }

    btnConfirmDeposit.disabled = true;
    btnConfirmDeposit.innerHTML =
      '<span class="spinner-border spinner-border-sm me-1"></span>Processing...';

    try {
      const res = await apiPost(`/borrow-records/${currentBorrowId}/pay-deposit`, {
        method,
        note,
      });

      // BE trả: { success: true, data: { borrowId, amount, orderId, payUrl, qrData } }
      const body = res.data || res;
      const payData = body.data || body;

      // 🔹 Nếu là chuyển khoản → hiển thị QR / link + info + bật watcher
      if (method === 'bank_transfer') {
        const payUrl = payData.payUrl || null;
        const qrData = payData.qrData || null;
        const payAmount = Number(
          payData.amount ||
            payData.depositAmount ||
            payData.requiredDeposit ||
            payData.required_deposit ||
            0,
        );

        const orderId = payData.orderId || payData.code || payData.description || ''; // DEP-... từ backend
        const bankName = payData.bank || 'TPBank';
        const bankAccount = payData.account || '00000012421';

        if (depositQrSection) {
          depositQrSection.classList.remove('d-none');
        }

        const imgSrc = qrData || payUrl;
        if (imgSrc && depositQrImage) {
          depositQrImage.src = imgSrc;
          depositQrImage.style.display = 'block';
        }

        if (payUrl && depositPayLink) {
          depositPayLink.href = payUrl;
        }

        // set info ngân hàng
        if (bankNameEl) bankNameEl.textContent = bankName;
        if (bankAccountEl) bankAccountEl.textContent = bankAccount;
        if (transferContentEl) transferContentEl.textContent = orderId;

        alert(
          'Đã tạo yêu cầu chuyển khoản.\n' +
            'Vui lòng để độc giả quét QR hoặc chuyển tiền theo thông tin bên cạnh.\n' +
            'Sau khi SePay xác nhận tiền vào, hệ thống sẽ tự cập nhật tiền cọc.',
        );

        // watcher chờ webhook cập nhật tiền cọc
        startDepositWatcher(currentBorrowId, payAmount);

        // KHÔNG enable lại nút trong finally
        return;
      }

      // 🔹 Còn lại (tiền mặt) → flow cũ
      alert('Thu tiền đặt cọc thành công!');
      if (depositModalInstance) {
        depositModalInstance.hide();
      }
      window.location.href = 'librarian-loans.html';
    } catch (err) {
      console.error(err);

      let msg = 'Thanh toán tiền cọc thất bại. Vui lòng thử lại.';

      if (err && err.message) {
        try {
          const data = JSON.parse(err.message); // {"success":false,"message":"..."}
          if (data && data.message) {
            msg = data.message;
          }
        } catch (e) {
          msg = err.message || msg;
        }
      }

      alert(msg);
    } finally {
      // Với bank_transfer, watcher sẽ quản lý nút, không enable lại
      if (method !== 'bank_transfer') {
        btnConfirmDeposit.disabled = false;
        btnConfirmDeposit.innerHTML = '<i class="bi bi-cash-coin me-1"></i>Confirm & Finish';
      }
    }
  });
}

if (btnCancelLoan) {
  btnCancelLoan.addEventListener('click', async () => {
    if (!currentBorrowId) {
      if (depositModalInstance) depositModalInstance.hide();
      return;
    }

    const ok = confirm('Bạn có chắc muốn hủy phiếu mượn này và không thu tiền cọc?');
    if (!ok) return;

    try {
      // gọi API hủy phiếu mượn
      await apiPost(`/borrow-records/${currentBorrowId}/cancel`, {});
      alert('Đã hủy phiếu mượn.');

      if (depositModalInstance) {
        depositModalInstance.hide();
      }
      window.location.href = 'librarian-loans.html';
    } catch (err) {
      console.error('Cancel loan error:', err);
      alert('Hủy phiếu mượn thất bại. Vui lòng thử lại.');
    }
  });
}

/* ============================================================
   THEME TOGGLE + SIDEBAR ACTIVE
============================================================ */
// ✅ Cập nhật icon và label của theme button
function updateThemeUI(theme) {
  const icon = document.getElementById('themeIcon');
  const label = document.getElementById('themeLabel');
  if (icon && label) {
    if (theme === 'dark') {
      icon.className = 'bi bi-sun';
      label.textContent = 'Dark';
    } else {
      icon.className = 'bi bi-moon-stars';
      label.textContent = 'Light';
    }
  }
}

// Load theme đã lưu
(function () {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-bs-theme', saved);
  updateThemeUI(saved);
})();

const btnTheme = document.getElementById('btnTheme');
if (btnTheme) {
  btnTheme.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-bs-theme') || 'light';
    const next = cur === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-bs-theme', next);
    localStorage.setItem('theme', next);
    updateThemeUI(next);
  });
}

// ✅ Active Sidebar: Highlight menu item "Loans" khi ở trang loans hoặc loans-create
(() => {
  const cur = location.pathname.split('/').pop();
  document.querySelectorAll('.admin-nav a').forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (
      (cur === 'librarian-loans-create.html' || cur === 'librarian-loans.html') &&
      href === 'librarian-loans.html'
    ) {
      a.classList.add('active');
    } else if (href.endsWith(cur)) {
      a.classList.add('active');
    } else {
      a.classList.remove('active');
    }
  });
})();
