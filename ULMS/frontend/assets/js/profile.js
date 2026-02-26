// assets/js/profile.js
import { apiGet, apiPatch, apiPost, apiPut, apiDelete, BASE_URL } from './api.js';

const ENDPOINTS = {
  PROFILE_GET: '/auth/profile',
  PROFILE_PATCH: '/auth/profile',
  PASS_CHANGE: '/auth/change-password',
  PREF_PATCH: '',
  STATS_GET: '/me/stats',
  DELETE_ME: '',
  AVATAR_UPLOAD: '/auth/profile/avatar',
};

export function initProfile() {
  // ===== Auth guard =====
  if (!localStorage.getItem('token')) {
    location.href = 'login.html?next=profile.html';
    return;
  }

  // ===== DOM elements =====
  const msgProfile = document.getElementById('msgProfile');
  const infoForm = document.getElementById('infoForm');
  const passForm = document.getElementById('passForm');

  const fullNameEl = document.getElementById('fullName');
  const emailEl = document.getElementById('email');
  const phoneEl = document.getElementById('phone');
  const addressEl = document.getElementById('addressProfile');
  const memberCodeEl = document.getElementById('memberCode');

  const statLoans = document.getElementById('statLoans');
  const statResv = document.getElementById('statReservations');
  const statBorrow = document.getElementById('statBorrowed');

  const notifEmail = document.getElementById('notifEmail');
  const notifHolds = document.getElementById('notifHolds');
  const notifNews = document.getElementById('notifNews');
  const btnSaveNotif = document.getElementById('btnSaveNotif');

  // Avatar elements
  const avatarImg = document.getElementById('avatarImg');
  const avatarFile = document.getElementById('avatarFile');
  const btnChangeAvatar = document.getElementById('btnChangeAvatar');

  // ===== helpers =====
  const esc = (s = '') =>
    String(s).replace(
      /[&<>"']/g,
      (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m],
    );

  function showAlert(ok, text) {
    if (!msgProfile) return;
    const cls = ok ? 'alert-success' : 'alert-danger';
    const icon = ok ? 'check-circle' : 'exclamation-triangle';
    msgProfile.innerHTML = `
      <div class="alert ${cls} alert-dismissible fade show" role="alert">
        <i class="bi bi-${icon} me-2"></i>${esc(text)}
        <button class="btn-close" data-bs-dismiss="alert"></button>
      </div>`;
    setTimeout(() => {
      if (msgProfile.innerHTML.includes(text)) {
        msgProfile.innerHTML = '';
      }
    }, 5000);
  }

  function showToast(text, type = 'success') {
    const area = document.getElementById('toastArea');
    if (!area) return;
    const id = 't' + Date.now();
    const bg = type === 'success' ? 'bg-success' : type === 'warning' ? 'bg-warning' : 'bg-danger';
    const txtClass = type === 'warning' ? 'text-dark' : 'text-white';
    const btnCls = type === 'warning' ? '' : 'btn-close-white';
    area.insertAdjacentHTML(
      'beforeend',
      `
      <div id="${id}" class="toast ${bg} ${txtClass}" role="alert">
        <div class="d-flex">
          <div class="toast-body">${esc(text)}</div>
          <button class="btn-close ${btnCls} me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
      </div>`,
    );
    const el = document.getElementById(id);
    if (!el || typeof bootstrap === 'undefined') return;
    const t = new bootstrap.Toast(el, { delay: 3000 });
    t.show();
    el.addEventListener('hidden.bs.toast', () => el.remove());
  }

  let currentUserId = null;

  // ===== load profile + stats + prefs =====
  async function loadProfile() {
    try {
      const response = await apiGet(ENDPOINTS.PROFILE_GET);
      // Tùy apiGet của bạn: nếu nó trả {data: me} thì dùng response.data
      // nếu đã unwrap thì response chính là me. Giữ đúng như bạn đang dùng:
      const me = response.data || response;
      currentUserId = me.id ?? me._id ?? null;

      if (fullNameEl) fullNameEl.value = me.fullName || me.name || '';
      if (emailEl) emailEl.value = me.email || '';
      if (phoneEl) phoneEl.value = me.phone || '';
      if (addressEl) addressEl.value = me.address || '';

      // Avatar profile (không phải ảnh chụp khi register)
      if (avatarImg) {
        const placeholder = 'assets/img/avatar-placeholder.png';
        const src = me.avatarUrl && typeof me.avatarUrl === 'string' ? me.avatarUrl : placeholder;
        avatarImg.src = src;
      }

      // Member code
      if (memberCodeEl) {
        if (me.memberCode) {
          memberCodeEl.textContent = me.memberCode;
        } else if (currentUserId != null) {
          memberCodeEl.textContent = 'U-' + String(currentUserId).padStart(4, '0');
        } else {
          memberCodeEl.textContent = 'Unknown';
        }
      }

      // Stats
      if (ENDPOINTS.STATS_GET) {
        try {
          const stRes = await apiGet(ENDPOINTS.STATS_GET);
          const st = stRes.data || stRes;
          if (statLoans) statLoans.textContent = st.activeLoans ?? 0;
          if (statResv) statResv.textContent = st.reservations ?? 0;
          if (statBorrow) statBorrow.textContent = st.totalBorrowed ?? 0;
        } catch {
          if (statLoans) statLoans.textContent = '0';
          if (statResv) statResv.textContent = '0';
          if (statBorrow) statBorrow.textContent = '0';
        }
      } else {
        if (statLoans) statLoans.textContent = me.stats?.activeLoans ?? 0;
        if (statResv) statResv.textContent = me.stats?.reservations ?? 0;
        if (statBorrow) statBorrow.textContent = me.stats?.totalBorrowed ?? 0;
      }

      // Notification prefs
      if (me.preferences) {
        if (notifEmail) notifEmail.checked = !!me.preferences.emailDueDates;
        if (notifHolds) notifHolds.checked = !!me.preferences.emailHoldsReady;
        if (notifNews) notifNews.checked = !!me.preferences.newsletter;
      } else {
        const lp = JSON.parse(localStorage.getItem('profile_prefs') || '{}');
        if (notifEmail) notifEmail.checked = lp.emailDueDates ?? true;
        if (notifHolds) notifHolds.checked = lp.emailHoldsReady ?? true;
        if (notifNews) notifNews.checked = lp.newsletter ?? false;
      }
    } catch (e) {
      showAlert(false, `Load failed: ${e.message || 'Unknown error'}`);
    }
  }

  // ===== update basic info =====
  if (infoForm) {
    infoForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const payload = {
        fullName: (fullNameEl?.value || '').trim(),
        phone: (phoneEl?.value || '').trim(),
        address: (addressEl?.value || '').trim(),
      };

      try {
        await apiPatch(ENDPOINTS.PROFILE_PATCH, payload);
        showAlert(true, 'Profile updated successfully!');
        showToast('Your profile has been saved.');

        // Sync localStorage
        try {
          const u = JSON.parse(localStorage.getItem('user') || 'null') || {};
          u.fullName = payload.fullName;
          u.phone = payload.phone;
          u.address = payload.address;
          localStorage.setItem('user', JSON.stringify(u));
        } catch {}
      } catch (e) {
        showAlert(false, `Update failed: ${e.message || 'Unknown error'}`);
      }
    });
  }

  // ===== change password =====
  if (passForm) {
    passForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const oldPass = document.getElementById('oldPass')?.value || '';
      const newPass = document.getElementById('newPass')?.value || '';
      const confirm = document.getElementById('confirmPass')?.value || '';

      if (newPass !== confirm) {
        showAlert(false, 'New passwords do not match!');
        return;
      }
      if (!newPass || newPass.length < 6) {
        showAlert(false, 'Password must be at least 6 characters.');
        return;
      }
      try {
        const payload = { oldPassword: oldPass, newPassword: newPass, confirmPassword: confirm };
        await apiPost(ENDPOINTS.PASS_CHANGE, payload);
        showAlert(true, 'Password updated successfully!');
        showToast('Your password has been changed.');
        passForm.reset();
      } catch (e) {
        showAlert(false, `Change password failed: ${e.message || 'Unknown error'}`);
      }
    });
  }

  // ===== save notification preferences =====
  if (btnSaveNotif) {
    btnSaveNotif.addEventListener('click', async () => {
      const prefs = {
        emailDueDates: !!notifEmail?.checked,
        emailHoldsReady: !!notifHolds?.checked,
        newsletter: !!notifNews?.checked,
      };
      try {
        if (ENDPOINTS.PREF_PATCH) {
          await apiPatch(ENDPOINTS.PREF_PATCH, prefs);
        }
        localStorage.setItem('profile_prefs', JSON.stringify(prefs));
        showToast('Notification preferences saved.');
      } catch (e) {
        localStorage.setItem('profile_prefs', JSON.stringify(prefs));
        showToast('Saved locally (server failed).', 'warning');
      }
    });
  }

  // ===== Upload avatar profile (KHÔNG liên quan hình chụp register) =====
  async function uploadAvatar(file) {
    if (!file) return;

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      showAlert(false, 'Avatar is too large. Please choose an image <= 2MB.');
      return;
    }

    const fd = new FormData();
    fd.append('avatar', file);

    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${BASE_URL}${ENDPOINTS.AVATAR_UPLOAD}`, {
        method: 'POST', // ✅ khớp với route BE: router.post('/profile/avatar', ...)
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: fd,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.success === false) {
        throw new Error(data.message || 'Upload avatar failed');
      }

      // BE mình đề xuất trả: { success, message, data: { avatarUrl } }
      const newUrl = (data.data && data.data.avatarUrl) || data.avatarUrl || data.url || null;

      if (newUrl && avatarImg) {
        avatarImg.src = newUrl;

        // cập nhật localStorage user
        try {
          const u = JSON.parse(localStorage.getItem('user') || 'null') || {};
          u.avatarUrl = newUrl;
          localStorage.setItem('user', JSON.stringify(u));
        } catch {}

        showToast('Avatar updated successfully!');
      } else {
        showToast('Avatar uploaded, but cannot read URL from server.', 'warning');
      }
    } catch (e) {
      showAlert(false, e.message || 'Upload avatar failed.');
    }
  }

  // Sự kiện chọn file avatar
  if (btnChangeAvatar && avatarFile) {
    btnChangeAvatar.addEventListener('click', () => {
      avatarFile.click();
    });

    avatarFile.addEventListener('change', () => {
      const file = avatarFile.files && avatarFile.files[0];
      if (!file) return;

      // Preview nhanh
      if (avatarImg) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            avatarImg.src = ev.target.result;
          }
        };
        reader.readAsDataURL(file);
      }

      uploadAvatar(file);
    });
  } else if (avatarFile) {
    // Trường hợp chỉ có input file, không có nút btnChangeAvatar
    avatarFile.addEventListener('change', () => {
      const file = avatarFile.files && avatarFile.files[0];
      if (!file) return;

      if (avatarImg) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            avatarImg.src = ev.target.result;
          }
        };
        reader.readAsDataURL(file);
      }

      uploadAvatar(file);
    });
  }

  // ===== init =====
  loadProfile();
}
