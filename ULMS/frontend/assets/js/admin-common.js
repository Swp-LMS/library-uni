// assets/js/admin-common.js
// Admin common (Theme + Logout) — tự chạy khi import

(() => {
  const LOGIN_PAGE = 'login.html';

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

  // Áp dụng theme đã lưu càng sớm càng tốt (trước khi DOMContentLoaded)
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-bs-theme', savedTheme);

  // Cập nhật UI theme sau khi DOM sẵn sàng
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      updateThemeUI(savedTheme);
    });
  } else {
    // DOM đã sẵn sàng, cập nhật ngay
    setTimeout(() => updateThemeUI(savedTheme), 0);
  }

  function ensureLogoutUI() {
    const themeBtn = document.getElementById('btnTheme');
    if (!themeBtn) return; // Trang không có nút Theme thì bỏ qua

    // Chèn nút Logout ngay dưới nút Theme (nếu chưa có)
    const container = themeBtn.closest('div'); // admin-sidebar-footer hoặc div.px-3.pb-3...
    if (container && !document.getElementById('btnLogout')) {
      const btn = document.createElement('button');
      btn.id = 'btnLogout';
      btn.className = 'btn btn-logout-sidebar w-100 d-flex align-items-center gap-2 px-3 py-2';
      btn.innerHTML = '<i class="bi bi-box-arrow-right"></i><span>Logout</span>';

      container.appendChild(btn);
    }

    // Thêm modal xác nhận (nếu chưa có)
    if (!document.getElementById('logoutModal')) {
      const modalHtml = `
        <div class="modal fade" id="logoutModal" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <h6 class="modal-title"><i class="bi bi-box-arrow-right me-1"></i> Confirm logout</h6>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">You’re about to sign out of the Admin Panel.</div>
              <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-danger" id="confirmLogout">Logout</button>
              </div>
            </div>
          </div>
        </div>`;
      document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
  }

  function bindThemeToggle() {
    const btn = document.getElementById('btnTheme');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-bs-theme') || 'light';
      const next = cur === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-bs-theme', next);
      localStorage.setItem('theme', next);
      // Cập nhật icon và label
      updateThemeUI(next);
    });
  }

  function doLogout() {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Nếu bạn lưu thêm key khác (role/refreshToken/...) thì remove ở đây
      // localStorage.removeItem('role');
    } catch (e) {
      console.error(e);
    } finally {
      location.href = LOGIN_PAGE;
    }
  }

  function bindLogout() {
    const btn = document.getElementById('btnLogout');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const modalEl = document.getElementById('logoutModal');
      // Nếu Bootstrap Modal sẵn sàng, mở modal; nếu không, fallback confirm()
      if (modalEl && window.bootstrap?.Modal) {
        const modal = new window.bootstrap.Modal(modalEl);
        modal.show();
      } else {
        if (confirm('Sign out now?')) doLogout();
      }
    });

    // Nút xác nhận trong modal
    const confirmBtn = document.getElementById('confirmLogout');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => doLogout());
    }
  }

  function init() {
    ensureLogoutUI();
    bindThemeToggle();
    bindLogout();
    // Đảm bảo theme UI được cập nhật sau khi DOM sẵn sàng
    const savedTheme = localStorage.getItem('theme') || 'light';
    updateThemeUI(savedTheme);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// ========== Toast helper ==========
window.toast = function (title, body) {
  const areaId = 'toastArea';
  let area = document.getElementById(areaId);
  if (!area) {
    area = document.createElement('div');
    area.id = areaId;
    area.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    document.body.appendChild(area);
  }

  const id = `t${Date.now()}`;
  area.insertAdjacentHTML(
    'beforeend',
    `
      <div id="${id}" class="toast text-bg-dark border-0" role="alert" data-bs-delay="2500">
        <div class="d-flex">
          <div class="toast-body"><strong>${title}:</strong> ${body}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
      </div>`,
  );

  const el = document.getElementById(id);
  bootstrap.Toast.getOrCreateInstance(el).show();
  el.addEventListener('hidden.bs.toast', () => el.remove());
};

// === Sidebar Active State + Toggle ===
function updateActiveState() {
  const currentPage = location.pathname.split('/').pop();

  // ✅ Mở menu Books mặc định nếu đang ở trang Books
  if (
    currentPage === 'admin-books.html' ||
    currentPage === 'admin-book-add.html' ||
    currentPage === 'admin-book-edit.html'
  ) {
    const booksGroup = document.querySelector('.nav-group');
    if (booksGroup) {
      booksGroup.classList.add('open');
    }
  }

  // ✅ Mở menu Settings mặc định nếu đang ở trang Settings
  if (currentPage === 'settings.html' || currentPage === 'admin-memberships.html') {
    const settingsGroups = document.querySelectorAll('.nav-group');
    if (settingsGroups.length > 1) {
      settingsGroups[settingsGroups.length - 1].classList.add('open'); // Settings là group cuối cùng
    }
  }

  // ✅ Active Sidebar: Tự động highlight menu item đang active
  document.querySelectorAll('.admin-nav > a').forEach((a) => {
    const href = a.getAttribute('href') || '';
    // Xử lý đặc biệt cho các trang con
    if (currentPage === 'admin-book-add.html' || currentPage === 'admin-book-edit.html') {
      // Highlight "Books" parent khi ở trang add/edit book
      if (href === 'admin-books.html') {
        a.classList.add('active');
      } else {
        a.classList.remove('active');
      }
    } else if (currentPage === 'admin-loans-edit.html') {
      // Highlight "Loans" khi ở trang edit loan
      if (href === 'admin-loans.html') {
        a.classList.add('active');
      } else {
        a.classList.remove('active');
      }
    } else if (currentPage === 'settings.html' || currentPage === 'admin-memberships.html') {
      // Không highlight menu item chính khi ở trang settings (sẽ highlight parent)
      a.classList.remove('active');
    } else if (href.endsWith(currentPage)) {
      // Highlight menu item nếu href khớp với trang hiện tại
      a.classList.add('active');
    } else {
      a.classList.remove('active');
    }
  });

  // ✅ Highlight nav-parent (Books, Settings) khi ở trang con hoặc trang chính
  // Đầu tiên, remove active từ tất cả nav-parent để tránh conflict
  document.querySelectorAll('.nav-parent').forEach((parent) => {
    parent.classList.remove('active');
  });

  // Sau đó, add active cho nav-parent phù hợp
  document.querySelectorAll('.nav-parent').forEach((parent) => {
    // Lấy tất cả icon, bỏ qua chevron (icon cuối cùng)
    const allIcons = parent.querySelectorAll('i');
    if (allIcons.length === 0) return;

    // Icon chính là icon đầu tiên (không phải chevron)
    const mainIcon = allIcons[0];
    const iconClass = mainIcon.className;

    // Kiểm tra Books parent
    if (iconClass.includes('bi-journal-text')) {
      // Highlight Books parent khi ở trang books, add, hoặc edit
      if (
        currentPage === 'admin-books.html' ||
        currentPage === 'admin-book-add.html' ||
        currentPage === 'admin-book-edit.html'
      ) {
        parent.classList.add('active');
      }
    }
    // Kiểm tra Settings parent
    else if (iconClass.includes('bi-gear')) {
      // Highlight Settings parent khi ở trang settings hoặc memberships
      if (currentPage === 'settings.html' || currentPage === 'admin-memberships.html') {
        parent.classList.add('active');
      }
    }
  });

  // ✅ Highlight sub-menu items (nav-sub a)
  document.querySelectorAll('.nav-sub a').forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (href.endsWith(currentPage)) {
      a.classList.add('active');
    } else {
      a.classList.remove('active');
    }
  });
}

function setupToggleListeners() {
  // ✅ Xử lý toggle menu khi click vào nav-parent
  // Sử dụng event delegation để tránh duplicate listeners
  document.querySelectorAll('.nav-parent').forEach((parent) => {
    // Kiểm tra xem đã có listener chưa
    if (parent.dataset.hasToggleListener === 'true') return;
    parent.dataset.hasToggleListener = 'true';

    parent.addEventListener('click', function (e) {
      // ✅ Chỉ toggle nếu click vào nav-parent, không phải link con trong nav-sub
      const clickedLink = e.target.closest('a');
      // Nếu click vào link con trong nav-sub, bỏ qua (để navigation hoạt động)
      if (clickedLink && clickedLink.closest('.nav-sub')) {
        return; // Cho phép navigation bình thường
      }

      // Nếu click vào icon chevron, cũng toggle menu
      if (e.target.classList.contains('bi-chevron-down')) {
        e.preventDefault();
        e.stopPropagation();
        const group = this.closest('.nav-group');
        if (group) {
          group.classList.toggle('open');
        }
        return;
      }

      // Nếu click vào nav-parent, toggle menu
      e.preventDefault();
      e.stopPropagation();
      const group = this.closest('.nav-group');
      if (group) {
        group.classList.toggle('open');
      }
    });
  });

  // ✅ Ngăn event bubble từ link con (All Books, Add New Book)
  // Đảm bảo click vào link con không làm toggle menu
  document.querySelectorAll('.nav-sub a').forEach((link) => {
    if (link.dataset.hasSubListener === 'true') return;
    link.dataset.hasSubListener = 'true';
    link.addEventListener('click', (e) => {
      // Cho phép navigation bình thường, không toggle menu
      e.stopPropagation();
    });
  });
}

function initSidebarActive() {
  updateActiveState(); // Cập nhật trạng thái active ban đầu
  setupToggleListeners(); // Thiết lập event listeners cho toggle
}

// Chạy ngay khi script load (nếu DOM đã sẵn sàng)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initSidebarActive();
  });
} else {
  // DOM đã sẵn sàng, chạy ngay
  initSidebarActive();
}
