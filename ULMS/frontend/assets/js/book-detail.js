// assets/js/book-detail.js
import { apiGet, apiPost } from './api.js';

export function initBook() {
  const content = document.getElementById('content');
  const params = new URLSearchParams(location.search);
  const id = params.get('id');

  if (!id) {
    content.innerHTML = `<div style="color: #d73a49; padding: 2rem; text-align: center;">Missing id</div>`;
    return;
  }

  const esc = (s = '') =>
    String(s).replace(
      /[&<>"']/g,
      (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m],
    );

  async function load() {
    content.innerHTML = `<div style="text-align: center; padding: 3rem; color: #666;">Loading…</div>`;
    try {
      const res = await apiGet(`/books/${id}`);
      const b = res.data || res;

      content.innerHTML = `
  <style>
    .book-page { background: linear-gradient(135deg, #fafbf8 0%, #f5f7f3 100%); min-height: 100vh; padding: 2rem 0; }
    .book-container { max-width: 1000px; margin: 0 auto; padding: 0 1.5rem; }
    
    .book-header { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; margin-bottom: 3rem; }
    @media (max-width: 768px) { .book-header { grid-template-columns: 1fr; gap: 2rem; } }
    
    .book-cover { position: relative; }
    .book-cover-wrapper { 
      background: white; 
      border-radius: 16px; 
      padding: 1.5rem; 
      box-shadow: 0 8px 32px rgba(0,0,0,0.08);
      display: flex; 
      align-items: center; 
      justify-content: center; 
      aspect-ratio: 3/4;
      overflow: hidden;
    }
    .book-cover-wrapper img { 
      width: 100%; 
      height: 100%; 
      object-fit: cover; 
      border-radius: 12px; 
    }
    .book-cover-placeholder { 
      font-size: 3.5rem; 
      color: #d4c4b8;
    }
    
    .book-info { display: flex; flex-direction: column; justify-content: center; }
    .book-title { 
      font-size: 2.5rem; 
      font-weight: 700; 
      color: #2c2c2c; 
      margin-bottom: 0.5rem; 
      line-height: 1.2;
    }
    .book-author { 
      font-size: 1rem; 
      color: #888; 
      margin-bottom: 2rem; 
      font-weight: 500;
    }
    
    .book-meta { 
      display: flex; 
      flex-direction: column; 
      gap: 1rem; 
      margin-bottom: 2rem;
    }
    .meta-badge { 
      display: inline-flex; 
      align-items: center; 
      gap: 0.5rem; 
      background: white; 
      padding: 0.75rem 1.2rem; 
      border-radius: 8px; 
      font-size: 0.9rem; 
      color: #555; 
      width: fit-content;
      border: 1px solid #e8e3dd;
    }
    .meta-badge strong { color: #2c2c2c; }
    
    .description-section { 
      background: white; 
      padding: 2rem; 
      border-radius: 12px; 
      margin-bottom: 2rem;
      box-shadow: 0 4px 16px rgba(0,0,0,0.04);
    }
    .description-section p { 
      font-size: 1rem; 
      color: #555; 
      line-height: 1.8;
      margin: 0;
    }
    
    .reserve-card { 
      background: white; 
      border-radius: 12px; 
      padding: 2rem; 
      margin-bottom: 2rem;
      box-shadow: 0 4px 16px rgba(0,0,0,0.04);
      border-left: 4px solid #6b9b7f;
    }
    .reserve-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
    .availability { display: flex; flex-direction: column; }
    .availability-label { font-size: 0.85rem; color: #888; margin-bottom: 0.25rem; }
    .availability-count { font-size: 1.5rem; font-weight: 700; color: #6b9b7f; }
    
    .btn-reserve { 
      background: #6b9b7f; 
      color: white; 
      border: none; 
      padding: 0.875rem 2rem; 
      border-radius: 8px; 
      font-size: 1rem; 
      font-weight: 600; 
      cursor: pointer; 
      transition: all 0.3s ease;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    .btn-reserve:hover:not(:disabled) { 
      background: #5a8569; 
      transform: translateY(-2px); 
      box-shadow: 0 8px 16px rgba(107, 155, 127, 0.2);
    }
    .btn-reserve:disabled { 
      background: #ccc; 
      cursor: not-allowed; 
    }
    
    .reserve-status { font-size: 0.9rem; color: #888; margin-top: 1rem; }
    
    .form-section { margin-top: 1.5rem; }
    .form-section label { 
      display: block; 
      font-weight: 600; 
      color: #2c2c2c; 
      margin-bottom: 0.5rem; 
      font-size: 0.95rem;
    }
    .form-section textarea { 
      width: 100%; 
      padding: 0.75rem; 
      border: 1px solid #e8e3dd; 
      border-radius: 6px; 
      font-family: inherit; 
      font-size: 0.9rem; 
      color: #555; 
      resize: vertical;
    }
    .form-section textarea:focus { 
      outline: none; 
      border-color: #6b9b7f; 
      box-shadow: 0 0 0 3px rgba(107, 155, 127, 0.1);
    }
    
    .alert { 
      padding: 1rem; 
      border-radius: 8px; 
      margin-top: 1rem; 
      font-size: 0.95rem;
    }
    .alert-success { 
      background: #e8f5e9; 
      color: #2e7d32; 
      border-left: 4px solid #4caf50;
    }
    .alert-danger { 
      background: #ffebee; 
      color: #c62828; 
      border-left: 4px solid #f44336;
    }
    
    .reviews-section { 
      background: white; 
      border-radius: 12px; 
      padding: 2rem; 
      box-shadow: 0 4px 16px rgba(0,0,0,0.04);
    }
    .reviews-title { 
      font-size: 1.3rem; 
      font-weight: 700; 
      color: #2c2c2c; 
      margin-bottom: 1.5rem; 
      display: flex; 
      align-items: center; 
      gap: 0.5rem;
    }
    
    .review-item { 
      padding: 1rem 0; 
      border-bottom: 1px solid #f0ede8;
    }
    .review-item:last-child { border-bottom: none; }
    .review-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem; }
    .review-author { font-weight: 600; color: #2c2c2c; }
    .review-rating { color: #f7b801; font-size: 0.9rem; }
    .review-date { font-size: 0.8rem; color: #aaa; }
    .review-comment { color: #555; font-size: 0.95rem; margin-top: 0.5rem; line-height: 1.6; }
    
    .review-form { margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #f0ede8; }
    .review-form-title { font-weight: 600; color: #2c2c2c; margin-bottom: 1rem; }
    .rating-options { display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
    .rating-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
    .rating-label input { cursor: pointer; }
    .rating-stars { color: #f7b801; }
    
    .btn-submit { 
      background: #6b9b7f; 
      color: white; 
      border: none; 
      padding: 0.75rem 1.5rem; 
      border-radius: 6px; 
      font-weight: 600; 
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 0.9rem;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    .btn-submit:hover { 
      background: #5a8569; 
      transform: translateY(-2px);
    }
    
    .login-prompt { color: #888; font-size: 0.95rem; }
    .login-prompt a { color: #6b9b7f; text-decoration: none; font-weight: 600; }
    .login-prompt a:hover { text-decoration: underline; }
    
    .empty-state { text-align: center; color: #aaa; padding: 2rem 0; }
    .empty-state-icon { font-size: 2rem; margin-bottom: 0.5rem; }
  </style>

  <div class="book-page">
    <div class="book-container">
      <!-- Book Header Section -->
      <div class="book-header">
        <!-- Book Cover -->
        <div class="book-cover">
          <div class="book-cover-wrapper">
            ${b.imageUrl
          ? `<img src="${esc(b.imageUrl)}" alt="${esc(b.title)}">`
          : `<div class="book-cover-placeholder">📖</div>`
        }
          </div>
        </div>

        <!-- Book Info -->
        <div class="book-info">
          <h1 class="book-title">${esc(b.title)}</h1>
          <p class="book-author">by ${esc(b.author?.name || 'Unknown Author')}${b.publishedYear ? ` • ${esc(b.publishedYear)}` : ''
        }</p>
          
          <div class="book-meta">
            ${b.category?.name
          ? `<div class="meta-badge"><strong>Category:</strong> ${esc(b.category.name)}</div>`
          : ''
        }
            ${b.publisher?.name
          ? `<div class="meta-badge"><strong>Publisher:</strong> ${esc(b.publisher.name)}</div>`
          : ''
        }
            ${b.isbn ? `<div class="meta-badge"><strong>ISBN:</strong> ${esc(b.isbn)}</div>` : ''}
            <div class="meta-badge"><strong>Available:</strong> ${b.totalCopies ?? '—'} copies</div>
          </div>
        </div>
      </div>

      <!-- Description Section -->
      <div class="description-section">
        <p>${esc(b.description || 'No description available.')}</p>
      </div>

      <!-- Reserve Card -->
      <div class="reserve-card">
        <div class="reserve-header">
          <div class="availability">
            <div class="availability-label">Available Copies</div>
            <div class="availability-count">${b.availableCopies ?? '—'}</div>
          </div>
          <button
            id="btnReserve"
            class="btn-reserve"
            data-available="${!!(b.availableCopies && b.availableCopies > 0)}"
            ${!b.availableCopies || b.availableCopies <= 0 ? 'disabled' : ''}>
            <span>📚</span> Reserve Now
          </button>
        </div>
        <div class="reserve-status">
          ${b.availableCopies && b.availableCopies > 0
          ? '✓ Currently available — reserve it now'
          : '⏳ Currently unavailable — we will notify you when ready'
        }
        </div>

        <!-- Note Form -->
        <div class="form-section">
          <label for="reserveNote">Add a note (optional)</label>
          <textarea id="reserveNote" rows="2" placeholder="Your special requests or notes..."></textarea>
        </div>

        <div id="msg"></div>
      </div>

      <!-- Reviews Section -->
      <div class="reviews-section">
        <div class="reviews-title">💬 Reader Reviews</div>
        <div id="reviewsBox"></div>

        <!-- Review Form -->
        ${localStorage.getItem('token')
          ? `
        <div class="review-form">
          <div class="review-form-title">Share your thoughts</div>
          <form id="reviewForm">
            <div class="form-section">
              <label>Rate this book:</label>
              <div class="rating-options">
                ${[1, 2, 3, 4, 5]
            .map(
              (i) => `
                  <label class="rating-label">
                    <input type="radio" name="reviewRating" value="${i}"> 
                    <span class="rating-stars">${'★'.repeat(i)}${'☆'.repeat(5 - i)}</span>
                  </label>
                `,
            )
            .join('')}
              </div>
            </div>
            <div class="form-section">
              <label for="reviewComment">Your review</label>
              <textarea id="reviewComment" rows="3" placeholder="What did you think about this book?"></textarea>
            </div>
            <button type="submit" class="btn-submit"><span>✓</span> Submit Review</button>
            <div id="reviewMsg"></div>
          </form>
        </div>`
          : `<div class="empty-state"><p class="login-prompt">Please <a href="login.html">log in</a> to leave a review.</p></div>`
        }
      </div>

    </div>
  </div>`;

      const btn = document.getElementById('btnReserve');
      if (btn) btn.addEventListener('click', doReserve);

      // 🔹 Sau khi render, kiểm tra membership để bật/tắt nút Reserve
      await checkMembershipForReserve();

      // Load reviews after rendering
      loadReviews();

      // Attach review form handler
      const reviewForm = document.getElementById('reviewForm');
      if (reviewForm) {
        reviewForm.addEventListener('submit', handleReviewSubmit);
      }
    } catch (e) {
      const errMsg = e?.message || String(e);
      content.innerHTML = `<div style="color: #d73a49; padding: 2rem; text-align: center;">Load failed: ${esc(
        errMsg,
      )}</div>`;
    }
  }

  // 🔐 Chỉ cho reserve nếu user đã có membership còn hạn
  async function checkMembershipForReserve() {
    const btn = document.getElementById('btnReserve');
    const msg = document.getElementById('msg');
    if (!btn) return;

    const token = localStorage.getItem('token');

    // Guest: vẫn cho bấm để redirect login, không disable
    if (!token) {
      btn.setAttribute('data-has-membership', 'guest');
      return;
    }

    try {
      const res = await apiGet('/memberships/me');
      const plan = res && res.success ? res.data : null;

      if (!plan) {
        // ❌ Đã login nhưng chưa có gói membership
        btn.disabled = true;
        btn.setAttribute('data-has-membership', 'false');
        btn.innerHTML = `<span>🔒</span> Subscribe to a membership plan to make reservations.`;

        if (msg) {
          msg.innerHTML = `
            <div class="alert alert-danger">
              You already have an account but <strong>have not subscribed to a Membership plan</strong> yet.<br/>
Please choose a membership plan (Basic / Premium / Special) before making a reservation.
            </div>`;
        }
      } else {
        // ✅ Có gói membership
        btn.setAttribute('data-has-membership', 'true');
        // vẫn giữ rule availableCopies: nếu không có copy thì vẫn disabled
        const isAvailable = btn.dataset.available === 'true';
        if (!isAvailable) {
          btn.disabled = true;
        }
      }
    } catch (error) {
      console.error('checkMembershipForReserve error', error);
    }
  }

  async function doReserve() {
    const msg = document.getElementById('msg');
    const btn = document.getElementById('btnReserve');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        location.href = `login.html?next=${encodeURIComponent(
          location.pathname + location.search,
        )}`;
        return;
      }

      // Nếu vì lý do nào đó vẫn click được nhưng đã đánh dấu là không có membership
      if (btn && btn.getAttribute('data-has-membership') === 'false') {
        if (msg) {
          msg.innerHTML = `
            <div class="alert alert-danger">
              You don't have a Membership plan yet. Please subscribe to a plan before making a reservation.
            </div>`;
          setTimeout(() => (msg.innerHTML = ''), 3000);
        }
        return;
      }

      const note = document.getElementById('reserveNote')?.value?.trim() || '';

      btn.disabled = true;
      btn.innerHTML = `<span style="display: inline-block; animation: spin 1s linear infinite;">⏳</span> Reserving...`;

      const result = await apiPost(`/reservations/${id}`, { note });
      const wasAvailable = btn?.dataset?.available === 'true';
      const payload = result?.data?.data || result?.data || result;
      const status =
        payload?.status ??
        payload?.reservation?.status ??
        result?.status ??
        result?.data?.reservation?.status;
      const serverMessage = result?.message ?? result?.data?.message;
      const autoApproved =
        status === 'approved' ||
        wasAvailable ||
        serverMessage?.toLowerCase()?.includes('Reservation approved') ||
        serverMessage?.toLowerCase()?.includes('Your request has been accepted');

      const bookTitle = payload?.book?.title;
      const expireDate = payload?.expiresAt
        ? new Date(payload.expiresAt).toLocaleDateString('vi-VN')
        : null;
      const autoApproveMessage = bookTitle
        ? `The book "${bookTitle}" has been accepted. Please visit the library within 3 days${expireDate ? ` (expires on: ${expireDate}).` : '.'
        }`
        : 'The book is available, so your request has been approved immediately. Please visit the library within 3 days.';

      const finalMessage =
        serverMessage ||
        (autoApproved
          ? autoApproveMessage
          : 'Reservation successful. The librarian will review it and we will notify you.');

      const alertTitle = autoApproved ? 'Book request accepted' : 'Reservation successful';

      if (autoApproved) {
        showBorrowCommitmentPopup({
          message: finalMessage,
          onConfirm: () => {
            // ⭐ Chỉ add vào cart thôi!
            addToCart(payload.book);

            // ❌ Không popup gì ở đây!
          },
        });
      } else {
        showReserveBanner({
          title: 'Reservation pending approval',
          message: finalMessage,
          status: 'pending',
        });
      }

      const noteEl = document.getElementById('reserveNote');
      if (noteEl) noteEl.value = '';

      setTimeout(() => {
        if (msg) msg.innerHTML = '';
        load();
      }, 3000);
    } catch (e) {
      // ✅ Parse error message từ response body nếu có
      let errMsg = '';
      if (e?.body?.message) {
        errMsg = e.body.message;
      } else if (e?.message) {
        errMsg = e.message;
      } else if (typeof e === 'string') {
        errMsg = e;
      } else {
        errMsg = 'An error occurred while making the reservation. Please try again later.';
      }

      // ✅ Làm sạch error message (loại bỏ JSON format nếu có)
      if (errMsg.includes('{') && errMsg.includes('}')) {
        try {
          const parsed = JSON.parse(errMsg);
          errMsg = parsed.message || parsed.error || errMsg;
        } catch {
          // Nếu không parse được, giữ nguyên message
        }
      }

      // ✅ Hiển thị error message thân thiện
      if (msg) {
        msg.innerHTML = `<div class="alert alert-danger">
          <strong>✗ Reservation failed:</strong> ${esc(errMsg)}
        </div>`;
        setTimeout(() => (msg.innerHTML = ''), 5000);
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span>📚</span> Reserve Now`;
      }
    }
  }

  function showReservePopup(message) {
    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1050;padding:1rem;';

    const modal = document.createElement('div');
    modal.style.cssText =
      'background:#fff;border-radius:16px;max-width:420px;width:100%;padding:2rem;box-shadow:0 20px 60px rgba(0,0,0,0.18);text-align:center;animation:popIn 0.25s ease;position:relative;';

    const style = document.createElement('style');
    style.textContent = `
      @keyframes popIn { from {transform:scale(0.9);opacity:0;} to {transform:scale(1);opacity:1;} }
    `;
    document.head.appendChild(style);

    modal.innerHTML = `
      <div style="font-size:3rem;margin-bottom:1rem;">🎉</div>
      <h3 style="margin-bottom:0.75rem;color:#1f2937;">Request approved!</h3>
      <p style="color:#4b5563;margin-bottom:1.5rem;">${esc(message)}</p>
      <button style="background:#6b9b7f;color:#fff;border:none;padding:0.75rem 1.5rem;border-radius:999px;font-weight:600;cursor:pointer;">Đã hiểu</button>
    `;

    const btn = modal.querySelector('button');
    btn.addEventListener('click', () => document.body.removeChild(overlay));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) document.body.removeChild(overlay);
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  // Popup cam kết mượn sách (dài)
  function showBorrowCommitmentPopup({ message, onConfirm }) {
    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1051;padding:1rem;';

    const modal = document.createElement('div');
    modal.style.cssText =
      'background:#fff;border-radius:16px;max-width:560px;width:100%;padding:2rem 2.25rem;box-shadow:0 20px 60px rgba(0,0,0,0.18);position:relative;max-height:90vh;overflow-y:auto;';

    modal.innerHTML = `
      <h3 style="margin-bottom:0.75rem;color:#111827;font-weight:700;font-size:1.3rem;">
        Cam kết khi mượn & nhận sách tại thư viện
      </h3>

      <p style="color:#4b5563;font-size:0.95rem;line-height:1.6;margin-bottom:1rem;">
        Khi xác nhận mượn sách, tôi đồng ý tuân thủ các quy định sau:
      </p>

      <ol style="color:#374151;font-size:0.95rem;line-height:1.7;padding-left:1.1rem;margin-bottom:1rem;">
        <li>
          <strong>Giữ gìn sách cẩn thận</strong>:
          không làm rách, gãy gáy, mất trang, ướt hoặc ghi viết/bôi bẩn trực tiếp lên sách.
        </li>
        <li>
          <strong>Không cho người khác mượn lại</strong>:
          sách được mượn dưới tài khoản của tôi, mọi rủi ro mất/hư hỏng sách tôi hoàn toàn chịu trách nhiệm.
        </li>
        <li>
          <strong>Trả sách đúng hạn</strong>:
          tôi cam kết trả sách đúng hoặc trước ngày đến hạn được hiển thị trong hệ thống / phiếu mượn.
          Nếu cần gia hạn, tôi sẽ chủ động liên hệ thư viện trước ngày đến hạn.
        </li>
        <li>
          <strong>Phí phạt trả trễ hạn</strong>:
          nếu tôi trả sách sau ngày đến hạn, hệ thống sẽ tự động tính
          <em>phí phạt mỗi ngày trễ</em> theo quy định hiện hành của thư viện
          (tùy theo loại sách và gói thành viên).
        </li>
        <li>
          <strong>Trường hợp làm mất hoặc hư hỏng nghiêm trọng</strong>:
          tôi đồng ý bồi thường theo quy định của thư viện (có thể bao gồm: giá trị cuốn sách,
          phí xử lý, hoặc thay thế bằng bản sách mới tương đương).
        </li>
        <li>
          <strong>Xuất trình giấy tờ khi nhận sách</strong>:
          khi đến thư viện, tôi sẽ mang theo thẻ thư viện hoặc giấy tờ xác minh tài khoản mượn.
        </li>
      </ol>

      <div style="background:#f9fafb;border-radius:10px;padding:0.75rem 0.9rem;margin:1rem 0;border:1px solid #e5e7eb;">
        <p style="margin:0;color:#4b5563;font-size:0.9rem;line-height:1.5;">
          <strong>Lưu ý:</strong>
          Hạn trả và số tiền phạt (nếu có) sẽ được cập nhật tự động sau khi thủ thư xác nhận mượn sách.
          Bạn có thể xem trong mục <em>"Khoản phạt / Fines"</em> hoặc hỏi trực tiếp tại quầy.
        </p>
      </div>

      <label style="display:flex;align-items:flex-start;gap:0.5rem;font-size:0.92rem;color:#374151;margin-bottom:1.25rem;cursor:pointer;">
        <input id="borrowCommitCheckbox" type="checkbox" style="margin-top:4px;cursor:pointer;" />
        <span>
          Tôi xác nhận đã đọc, hiểu và <strong>đồng ý với các cam kết mượn sách</strong> của thư viện.
        </span>
      </label>

      <div style="display:flex;justify-content:flex-end;gap:0.75rem;">
        <button id="borrowCommitCancel" type="button"
          style="border-radius:8px;border:1px solid #e5e7eb;background:#f9fafb;padding:0.5rem 1.25rem;font-size:0.9rem;cursor:pointer;color:#4b5563;">
          Hủy
        </button>
        <button id="borrowCommitAgree" type="button"
          style="border-radius:8px;border:none;background:#6b9b7f;padding:0.5rem 1.5rem;font-size:0.9rem;font-weight:600;color:#fff;cursor:pointer;opacity:0.5;pointer-events:none;">
          Đồng ý & tiếp tục
        </button>
      </div>
    `;

    const checkbox = modal.querySelector('#borrowCommitCheckbox');
    const btnAgree = modal.querySelector('#borrowCommitAgree');
    const btnCancel = modal.querySelector('#borrowCommitCancel');

    const close = () => {
      if (overlay.parentNode) {
        document.body.removeChild(overlay);
      }
    };

    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        btnAgree.style.opacity = '1';
        btnAgree.style.pointerEvents = 'auto';
      } else {
        btnAgree.style.opacity = '0.5';
        btnAgree.style.pointerEvents = 'none';
      }
    });

    btnAgree.addEventListener('click', () => {
      if (!checkbox.checked) return;
      close();

      // 🔥 NEW: tự động add vào cart sau khi xác nhận popup cam kết
      addBookToCart();

      if (typeof onConfirm === 'function') {
        onConfirm();
      }
    });

    btnCancel.addEventListener('click', close);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        close();
      }
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  function showReserveBanner({ title, message, status }) {
    const existing = document.getElementById('reserveBanner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'reserveBanner';
    banner.style.cssText =
      'position:fixed;top:1rem;right:1rem;z-index:2000;background:#fff;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,0.12);padding:1rem 1.25rem;max-width:360px;display:flex;gap:0.75rem;border-left:5px solid #6b9b7f;';

    const iconWrap = document.createElement('div');
    iconWrap.style.cssText =
      'width:48px;height:48px;border-radius:12px;background:#e8f5e9;display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0;';
    iconWrap.textContent = status === 'approved' ? '✔️' : '⌛';

    const body = document.createElement('div');
    body.innerHTML = `
      <div style="font-weight:700;margin-bottom:4px;color:#1f2937;">${esc(title)}</div>
      <div style="color:#4b5563;font-size:0.95rem;line-height:1.4;">${esc(message)}</div>
    `;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText =
      'margin-left:auto;font-size:1.25rem;border:none;background:none;color:#94a3b8;cursor:pointer;line-height:1;';
    closeBtn.addEventListener('click', () => banner.remove());

    banner.appendChild(iconWrap);
    banner.appendChild(body);
    banner.appendChild(closeBtn);
    document.body.appendChild(banner);

    setTimeout(() => {
      banner.style.opacity = '0';
      banner.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      banner.style.transform = 'translateY(-10px)';
      setTimeout(() => banner.remove(), 300);
    }, 4000);
  }

  async function loadReviews() {
    const reviewsBox = document.getElementById('reviewsBox');
    reviewsBox.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⏳</div>Loading reviews...</div>`;

    try {
      const res = await apiGet(`/reviews/book/${id}`);
      const reviews = res.data || res;

      if (!reviews.length) {
        reviewsBox.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📚</div>No reviews yet. Be the first to share your thoughts!</div>`;
        return;
      }

      reviewsBox.innerHTML = reviews
        .map(
          (r) => `
        <div class="review-item">
          <div class="review-header">
            <span class="review-author">${esc(r.user?.name || 'Anonymous')}</span>
            <span class="review-rating">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
            <span class="review-date">${new Date(r.createdAt).toLocaleDateString()}</span>
          </div>
          <div class="review-comment">${esc(r.comment || '')}</div>
        </div>
      `,
        )
        .join('');
    } catch (err) {
      reviewsBox.innerHTML = `<div class="empty-state" style="color: #d73a49;">Error loading reviews: ${esc(
        err.message || err,
      )}</div>`;
    }
  }

  async function handleReviewSubmit(e) {
    e.preventDefault();
    const msg = document.getElementById('reviewMsg');
    const comment = document.getElementById('reviewComment').value.trim();
    const rating = document.querySelector('input[name="reviewRating"]:checked')?.value;
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!rating) {
      msg.innerHTML = `<div class="alert alert-danger">Please select a rating.</div>`;
      return;
    }

    try {
      await apiPost(`/reviews`, {
        bookId: Number.parseInt(id),
        userId: Number.parseInt(user.id),
        comment,
        rating: Number.parseInt(rating),
      });
      msg.innerHTML = `<div class="alert alert-success">✓ Review submitted successfully!</div>`;
      document.getElementById('reviewForm').reset();
      loadReviews();
    } catch (err) {
      msg.innerHTML = `<div class="alert alert-danger">Error submitting review: ${esc(
        err.message || err,
      )}</div>`;
    }
    setTimeout(() => (msg.innerHTML = ''), 3000);
  }

  // ======================================================================
  // 🔥 Hàm Add To Cart mới
  async function addBookToCart() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');

    const token = localStorage.getItem('token');

    // Nếu chưa login thì cho add thoải mái
    if (!token) {
      return simpleAdd();
    }

    // Lấy gói membership của user
    let maxBooks = 5;
    try {
      const res = await apiGet('/memberships/me');
      maxBooks = res?.data?.limitBooks ?? res?.data?.borrowLimit ?? 5;
    } catch (e) { }

    if (cart.length >= maxBooks) {
      showReserveBanner({
        title: 'Giỏ hàng đầy',
        message: `Gói của bạn chỉ được mượn tối đa ${maxBooks} cuốn.`,
        status: 'pending',
      });
      return;
    }

    simpleAdd();

    function simpleAdd() {
      const params = new URLSearchParams(location.search);
      const id = Number(params.get('id'));

      const book = {
        id,
        title: document.querySelector('.book-title')?.innerText,
        author: document.querySelector('.book-author')?.innerText.replace('by ', ''),
        imageUrl: document.querySelector('.book-cover-wrapper img')?.src || '',
      };

      if (!cart.some((x) => x.id === id)) {
        cart.push(book);
        localStorage.setItem('cart', JSON.stringify(cart));

        showReserveBanner({
          title: 'Đã thêm vào giỏ hàng',
          message: `Sách "${book.title}" đã được thêm vào giỏ.`,
          status: 'approved',
        });
      }
    }
  }

  load();
}
