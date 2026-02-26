// frontend/assets/js/notifications.js
const API = 'http://localhost:3000/api/notifications';

function escapeHtml(s = '') {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}

async function fetchJSON(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...(options.headers || {}), Authorization: `Bearer ${token}` };
  const res = await fetch(url, { ...options, headers });
  return res.ok ? res.json() : { success: false, data: [] };
}

// Gắn hành vi cho cái chuông (dropdown)
export async function initNotiBell() {
  const bell = document.getElementById('btnNoti');
  const menu = document.getElementById('notiDropdown');
  const badge = document.getElementById('notiBadge');

  if (!bell || !menu) return;

  // Tải danh sách & render
  async function loadNotis() {
    const { data = [] } = await fetchJSON(`${API}?unread=true`);
    // badge
    const count = data.length;
    badge.classList.toggle('d-none', count === 0);
    badge.textContent = count > 9 ? '9+' : String(count);

    // nội dung dropdown (tối đa 6 cái)
    const items = (await fetchJSON(API)).data || [];
    if (!items.length) {
      menu.innerHTML = `<div class="dropdown-item text-muted small">No notifications</div>
                        <div class="dropdown-divider"></div>
                        <a class="dropdown-item small text-primary" href="notifications.html">View all</a>`;
      return;
    }
    menu.innerHTML =
      items
        .slice(0, 6)
        .map(
          (n) => `
      <button class="dropdown-item text-wrap ${n.isRead ? '' : 'fw-semibold'}" data-read="${n.id}">
        ${escapeHtml(n.title || 'Notification')}
        <div class="small text-muted">${escapeHtml(n.message || '')}</div>
      </button>
    `,
        )
        .join('') +
      `
      <div class="dropdown-divider"></div>
      <div class="d-flex justify-content-between align-items-center px-2 pb-2">
        <button class="btn btn-link btn-sm p-0" id="notiMarkAll">Mark all read</button>
        <a class="small" href="notifications.html">View all</a>
      </div>
    `;

    // click 1 item -> mark read
    menu.querySelectorAll('[data-read]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-read');
        await fetchJSON(`${API}/${id}/read`, { method: 'PATCH' });
        await loadNotis();
      });
    });

    // mark all
    menu.querySelector('#notiMarkAll')?.addEventListener('click', async () => {
      await fetchJSON(`${API}/read-all`, { method: 'PATCH' });
      await loadNotis();
    });
  }

  // mở dropdown thì refresh
  bell.addEventListener('click', async () => {
    await loadNotis();
  });

  // load lần đầu (để hiện badge)
  await loadNotis();
}
