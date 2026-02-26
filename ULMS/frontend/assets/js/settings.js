// assets/js/admin-settings.js (hoặc tương đương)
import { apiGet, apiPatch } from './api.js';

function guardRole() {
  const t = localStorage.getItem('token');
  const u = JSON.parse(localStorage.getItem('user') || 'null');
  // if (!t || !u || !['admin', 'librarian'].includes(u.role)) location.href = 'login.html';
}

const esc = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function toast(title, body) {
  const area = document.getElementById('toastArea');
  const id = `t${Date.now()}`;
  area.insertAdjacentHTML(
    'beforeend',
    `
    <div id="${id}" class="toast text-bg-dark border-0" role="alert" data-bs-delay="2000">
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

export function initSettings() {
  guardRole();

  const form = document.getElementById('settingsForm');

  // ====== COMMON FIELDS ======
  const maxBooks = document.getElementById('maxBooks');
  const finePerDay = document.getElementById('finePerDay');
  const holdExpireDays = document.getElementById('holdExpireDays');
  const notes = document.getElementById('notes');
  const btnReload = document.getElementById('btnReload');

  // ====== OPTIONAL: RULE THEO GIÁ (nếu có input trong HTML) ======
  const lowPriceMax = document.getElementById('lowPriceMax');
  const midPriceMax = document.getElementById('midPriceMax');

  const lowLoanDays = document.getElementById('lowLoanDays');
  const midLoanDays = document.getElementById('midLoanDays');
  const highLoanDays = document.getElementById('highLoanDays');

  const lowDeposit = document.getElementById('lowDeposit');
  const midDeposit = document.getElementById('midDeposit');
  const highDeposit = document.getElementById('highDeposit');

  btnReload.addEventListener('click', load);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      // ===== CẤU HÌNH CHUNG =====
      maxBooksPerUser: Number(maxBooks.value) || 0,
      finePerDay: Number(finePerDay.value) || 0,
      holdExpireDays: Number(holdExpireDays.value) || 0,
      notes: notes.value.trim(),

      // ===== RULE THEO GIÁ (chỉ gửi nếu có input) =====
      ...(lowPriceMax && { lowPriceMax: Number(lowPriceMax.value) || 0 }),
      ...(midPriceMax && { midPriceMax: Number(midPriceMax.value) || 0 }),

      ...(lowLoanDays && { lowLoanDays: Number(lowLoanDays.value) || 0 }),
      ...(midLoanDays && { midLoanDays: Number(midLoanDays.value) || 0 }),
      ...(highLoanDays && { highLoanDays: Number(highLoanDays.value) || 0 }),

      ...(lowDeposit && { lowDeposit: Number(lowDeposit.value) || 0 }),
      ...(midDeposit && { midDeposit: Number(midDeposit.value) || 0 }),
      ...(highDeposit && { highDeposit: Number(highDeposit.value) || 0 }),
    };

    try {
      await apiPatch('/admin/settings', payload);
      toast('Success', 'Settings saved');
    } catch (err) {
      console.error(err);
      toast('Error', err.message || 'Save failed');
    }
  });

  async function load() {
    try {
      const s = await apiGet('/admin/settings');

      // ===== CẤU HÌNH CHUNG =====
      maxBooks.value = s.maxBooksPerUser ?? 5;
      finePerDay.value = s.finePerDay ?? 1000;
      holdExpireDays.value = s.holdExpireDays ?? 3;
      notes.value = s.notes ?? '';

      // ===== RULE THEO GIÁ (nếu có field) =====
      if (lowPriceMax) lowPriceMax.value = s.lowPriceMax ?? 200000;
      if (midPriceMax) midPriceMax.value = s.midPriceMax ?? 500000;

      if (lowLoanDays) lowLoanDays.value = s.lowLoanDays ?? 7;
      if (midLoanDays) midLoanDays.value = s.midLoanDays ?? 14;
      if (highLoanDays) highLoanDays.value = s.highLoanDays ?? 30;

      if (lowDeposit) lowDeposit.value = s.lowDeposit ?? 0;
      if (midDeposit) midDeposit.value = s.midDeposit ?? 50000;
      if (highDeposit) highDeposit.value = s.highDeposit ?? 200000;
    } catch (err) {
      console.error('Load settings error:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      toast('Error', `Load settings failed: ${errorMsg}`);
    }
  }

  load();
}
