import { BASE_URL } from './api.js';

export function renderNavbar() {
  // ===== Theme từ localStorage =====
  const saved = localStorage.getItem('theme');
  if (saved) document.documentElement.setAttribute('data-bs-theme', saved);

  // ===== Đăng nhập hiện tại =====
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const role = user?.role;

  // ===== Active tab theo file hiện tại =====
  const current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  const isActive = (file) => {
    const fileLower = file.toLowerCase();

    // ✅ Riêng Books: active cả khi ở my-book.html *và* index.html
    if (fileLower === 'my-book.html') {
      return current === 'my-book.html' || current === 'index.html' ? 'active' : '';
    }

    return current === fileLower ? 'active' : '';
  };

  // 🚫 ===== ẨN NAVBAR TRÊN CÁC TRANG AUTH =====
  const authPages = ['login.html', 'register.html', 'forgot-password.html'];
  if (authPages.includes(current)) {
    const mount = document.getElementById('app-navbar');
    if (mount) mount.innerHTML = '';
    return;
  }

  // ===== Link dành cho user đã đăng nhập =====
  const userLinks = token
    ? `
      <li class="nav-item"><a class="nav-link ${isActive('my-membership.html')}" href="my-membership.html">My Membership</a></li>
      <li class="nav-item"><a class="nav-link ${isActive('my-loans.html')}" href="my-loans.html">My Loans</a></li>
      <li class="nav-item"><a class="nav-link ${isActive('my-reservations.html')}" href="my-reservations.html">My Reservations</a></li>

      <li class="nav-item"><a class="nav-link ${isActive('profile.html')}" href="profile.html">My Profile</a></li>
    `
    : '';

  // ===== Link Admin/Librarian =====
  const adminLink =
    token && (role === 'admin' || role === 'librarian')
      ? `
      <li class="nav-item">
        <a class="nav-link ${isActive('admin-dashboard.html')}" href="admin-dashboard.html">Admin</a>
      </li>
    `
      : '';

  // ===== Khối Auth + Chuông thông báo =====
  const authBlock = token
    ? `
      <li class="nav-item dropdown me-2">
        <button class="btn btn-outline-secondary btn-sm position-relative"
                id="btnNoti" data-bs-toggle="dropdown" aria-expanded="false" title="Notifications">
          <i class="bi bi-bell"></i>
          <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none"
                id="notiBadge">0</span>
        </button>
        <div class="dropdown-menu dropdown-menu-end p-0"
             style="min-width:340px;max-height:360px;overflow:auto">
          <div class="d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
            <strong>Thông báo</strong>
            <button class="btn btn-link btn-sm" id="btnMarkAll">Mark all as read</button>
          </div>
          <div id="notiList" class="list-group list-group-flush"></div>
          <div class="text-center py-2 border-top">
            <a href="notifications.html" class="small">View all</a>
          </div>
        </div>
      </li>
      <li class="nav-item me-2">
        <span class="navbar-text">Hi, ${user?.fullName || user?.name || user?.email || 'User'}</span>
      </li>
      <li class="nav-item">
        <button id="btnLogout" class="btn btn-outline-danger btn-sm">Logout</button>
      </li>
    `
    : `
      <li class="nav-item"><a class="btn btn-outline-secondary btn-sm" href="login.html">Login</a></li>
      <li class="nav-item"><a class="btn btn-primary btn-sm" href="register.html">Register</a></li>
    `;

  // ===== Render Navbar =====
  const html = `
  <nav class="navbar navbar-expand-lg bg-body-tertiary border-bottom">
    <div class="container">
      <a class="navbar-brand fw-bold brand-main" href="index.html">Library</a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#topnav">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div id="topnav" class="collapse navbar-collapse">
        <ul class="navbar-nav me-auto">
          <li class="nav-item">
  <a
    class="btn btn-primary btn-sm px-3 nav-books-link ${isActive('my-book.html')}"
    href="my-book.html"
  >
    <i class="bi bi-book-half me-1"></i>
    Books
  </a>
</li>
          ${adminLink}
          ${userLinks}
        </ul>

        <ul class="navbar-nav ms-auto align-items-center gap-2">
          <li class="nav-item">
            <button id="btnTheme" class="btn btn-outline-secondary btn-sm" title="Toggle theme">
              <i class="bi bi-moon-stars"></i>
            </button>
          </li>
          ${authBlock}
        </ul>
      </div>
    </div>
  </nav>
  `;

  const mount = document.getElementById('app-navbar');
  mount?.insertAdjacentHTML('afterbegin', html);

  // ===== Logout =====
  document.getElementById('btnLogout')?.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    location.href = 'index.html';
  });

  // ===== Toggle theme =====
  document.getElementById('btnTheme')?.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-bs-theme') || 'light';
    const next = cur === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-bs-theme', next);
    localStorage.setItem('theme', next);
  });

  // ===== Thông báo (dropdown) =====
  if (token) {
    const API = `${BASE_URL}/notifications`;
    const badge = document.getElementById('notiBadge');
    const list = document.getElementById('notiList');
    const btnMarkAll = document.getElementById('btnMarkAll');
    const btnNoti = document.getElementById('btnNoti');

    const fetchOpts = {
      headers: {
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      cache: 'no-store',
    };

    const escapeHtml = (s = '') =>
      s.replace(
        /[&<>"']/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
      );

    const renderItem = (n) => {
      const time = new Date(n.createdAt).toLocaleString();
      return `
        <div class="list-group-item d-flex gap-2 align-items-start">
          <div class="mt-1"><i class="bi ${n.isRead ? 'bi-bell' : 'bi-bell-fill'}"></i></div>
          <div class="flex-grow-1">
            <div class="fw-semibold">${escapeHtml(n.title || 'Thông báo')}</div>
            <div class="small text-muted">${escapeHtml(n.message || '')}</div>
            <div class="small text-muted">${time}</div>
          </div>
          ${!n.isRead ? `<button class="btn btn-link btn-sm" data-read="${n.id}">Mark all as read</button>` : ''}
        </div>`;
    };

    async function fetchUnreadCount() {
      try {
        const res = await fetch(`${API}?unread=true`, fetchOpts);
        if (!res.ok) return;
        const json = await res.json();
        const unread = json?.data || [];
        if (unread.length > 0) {
          badge?.classList.remove('d-none');
          if (badge) badge.textContent = unread.length > 99 ? '99+' : String(unread.length);
        } else {
          badge?.classList.add('d-none');
        }
      } catch {}
    }

    async function fetchNotifications() {
      try {
        const res = await fetch(API, fetchOpts);
        if (!res.ok) {
          if (list)
            list.innerHTML = `<div class="p-3 text-muted small text-center">Tải dữ liệu thất bại.</div>`;
          return;
        }
        const json = await res.json();
        const items = json?.data || [];
        if (list) {
          list.innerHTML = items.length
            ? items.slice(0, 10).map(renderItem).join('')
            : `<div class="p-3 text-muted small text-center">Chưa có thông báo.</div>`;
        }
        list?.querySelectorAll('[data-read]').forEach((btn) => {
          btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-read');
            await fetch(`${API}/${id}/read`, { method: 'PATCH', ...fetchOpts });
            await fetchNotifications();
            await fetchUnreadCount();
          });
        });
      } catch {
        if (list)
          list.innerHTML = `<div class="p-3 text-muted small text-center">Tải dữ liệu thất bại.</div>`;
      }
    }

    btnMarkAll?.addEventListener('click', async () => {
      await fetch(`${API}/read-all`, { method: 'PATCH', ...fetchOpts });
      await fetchNotifications();
      await fetchUnreadCount();
    });

    btnNoti?.addEventListener('shown.bs.dropdown', fetchNotifications);

    fetchUnreadCount();
    setInterval(fetchUnreadCount, 30000);
  }
}
