// assets/js/cart.js
import { apiPost, apiGet } from './api.js';

export function initCart() {
  const listEl = document.getElementById('cartList');
  const emptyEl = document.getElementById('cartEmpty');
  const btnBorrow = document.getElementById('borrowBtn');
  const msgEl = document.getElementById('cartMsg');

  let cart = JSON.parse(localStorage.getItem('cart') || '[]');

  // RENDER CART
  function render() {
    cart = JSON.parse(localStorage.getItem('cart') || '[]');

    if (!cart.length) {
      listEl.innerHTML = '';
      emptyEl.style.display = 'block';
      btnBorrow.disabled = true;
      return;
    }

    emptyEl.style.display = 'none';
    btnBorrow.disabled = false;

    listEl.innerHTML = cart
      .map(
        (b, index) => `
      <div class="cart-item">
        <img src="${b.imageUrl || 'https://via.placeholder.com/120x160'}" />
        
        <div class="flex-grow-1">
          <div class="cart-title">${b.title}</div>
          <div class="cart-author">${b.author || 'Unknown'}</div>
        </div>

        <button class="cart-btn-remove" data-i="${index}">×</button>
      </div>
    `,
      )
      .join('');

    // Gán sự kiện xóa
    listEl.querySelectorAll('.cart-btn-remove').forEach((btn) => {
      btn.addEventListener('click', () => removeItem(btn.dataset.i));
    });
  }

  // REMOVE ITEM
  function removeItem(i) {
    cart.splice(i, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    render();
  }

  // CHECK MEMBERSHIP LIMIT
  async function checkLimit() {
    const token = localStorage.getItem('token');
    if (!token) {
      btnBorrow.disabled = true;
      return;
    }

    try {
      const res = await apiGet('/memberships/me');
      const plan = res?.data;

      const maxBooks = plan?.limitBooks ?? plan?.borrowLimit ?? 5;

      if (cart.length > maxBooks) {
        msgEl.innerHTML = `
          <div class="alert alert-danger">
            You can borrow up to <b>${maxBooks}</b> books only.
          </div>
        `;
        btnBorrow.disabled = true;
      } else {
        msgEl.innerHTML = '';
        btnBorrow.disabled = cart.length === 0;
      }
    } catch (err) {
      console.error(err);
    }
  }

  // BORROW SUBMIT
  btnBorrow.addEventListener('click', () => {
    msgEl.innerHTML = `
    <div class="alert alert-success">
      ✔ Yêu cầu mượn đã được gửi! Vui lòng đến thư viện để xác nhận.
    </div>
  `;

    // Hiển thị popup giống ảnh bạn đưa
    showBorrowSentPopup();

    // Xóa giỏ hàng
    localStorage.removeItem('cart');

    // Điều hướng sau 1.5s
    setTimeout(() => (location.href = 'my-reservations.html'), 1500);
  });

  function showBorrowSentPopup() {
    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed; inset:0; background:rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; z-index:2000;';

    const box = document.createElement('div');
    box.style.cssText =
      'width:420px; background:white; padding:2rem; border-radius:16px; text-align:center;';

    box.innerHTML = `
    <div style="font-size:3rem;">🎉</div>
    <h3 style="color:#1f2937;">Yêu cầu mượn đã được gửi!</h3>
    <p style="color:#4b5563;">
      Thủ thư sẽ kiểm tra và xác nhận yêu cầu mượn của bạn.<br/>
      Vui lòng đến thư viện để hoàn tất thủ tục.
    </p>
    <button id="okBorrow" style="
      margin-top:1rem; padding:0.7rem 1.4rem; background:#6b9b7f; color:white;
      border:none; border-radius:8px; font-weight:600; cursor:pointer;
    ">
      Đã hiểu
    </button>
  `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    box.querySelector('#okBorrow').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });
  }

  render();
  checkLimit();
}
