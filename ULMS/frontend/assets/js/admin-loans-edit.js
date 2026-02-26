import { apiGet, apiPatch } from './api.js';

const url = new URL(location.href);
const id = url.searchParams.get('id');

const userName = document.getElementById('userName');
const bookName = document.getElementById('bookName');
const loanDate = document.getElementById('loanDate');
const dueDate = document.getElementById('dueDate');
const status = document.getElementById('status');
const errBox = document.getElementById('errBox');
const btnSave = document.getElementById('btnSave');

function fmtInput(d) {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 10);
}

async function loadLoan() {
  try {
    // -------------- FIX ROUTE HERE --------------
    const loan = await apiGet(`/borrow-records/${id}?include=user,details.copy.book`);
    // -------------------------------------------

    errBox.classList.add('d-none');

    userName.value = loan.user?.fullName || loan.user?.email || '';
    bookName.value = loan.details?.[0]?.copy?.book?.title || '(no title)';

    loanDate.value = fmtInput(loan.borrowDate);
    dueDate.value = fmtInput(loan.dueDate);
    status.value = loan.status;
  } catch (e) {
    errBox.classList.remove('d-none');
    errBox.textContent = 'API lỗi—không tải được loan.';
  }
}

btnSave.addEventListener('click', async () => {
  try {
    errBox.classList.add('d-none');

    const payload = {
      borrowDate: loanDate.value,
      dueDate: dueDate.value,
      status: status.value,
    };

    // same fix here if needed
    await apiPatch(`/borrow-records/${id}`, payload);

    alert('Updated!');
    location.href = 'admin-loans.html';
  } catch (e) {
    errBox.classList.remove('d-none');
    errBox.textContent = 'Không thể lưu thay đổi.';
  }
});

loadLoan();
