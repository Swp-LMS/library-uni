// assets/js/librarian-book-edit.js
// All logic (API calls, event listeners, file uploads) tương tự admin-edit,
// chỉ chỉnh path cho Librarian

import { apiGet, apiPut, apiUpload } from './api.js';

// Toast notification system
function createToastContainer() {
  if (document.getElementById('toastContainer')) return;
  const container = document.createElement('div');
  container.id = 'toastContainer';
  container.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 400px;
  `;
  document.body.appendChild(container);
}

function toast(title, msg, type = 'info') {
  createToastContainer();
  const container = document.getElementById('toastContainer');

  const bgColor = type === 'success' ? '#00ffaaff' : type === 'error' ? '#ef4444' : '#3b82f6';
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';

  const toastEl = document.createElement('div');
  toastEl.style.cssText = `
    background-color: ${bgColor};
    color: white;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: slideIn 0.3s ease-out;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
  `;

  toastEl.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 4px;">${icon} ${title}</div>
    <div style="font-size: 13px; opacity: 0.95;">${msg}</div>
  `;

  container.appendChild(toastEl);
  setTimeout(() => {
    toastEl.style.animation = 'slideOut 0.3s ease-out forwards';
    setTimeout(() => toastEl.remove(), 300);
  }, 4000);
}

// Add animation + page styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(400px); opacity: 0; }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  * {
    box-sizing: border-box;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    background: linear-gradient(135deg, #ffffffff 0%, #ffffffff 100%);
    min-height: 100vh;
    margin: 0;
    padding: 40px 20px;
  }
  .page-header {
    background: white;
    padding: 40px;
    border-radius: 20px;
    margin-bottom: 32px;
    box-shadow: 0 8px 32px rgba(91, 33, 182, 0.08);
    animation: fadeIn 0.5s ease-out;
    border-left: 6px solid #7c3aed;
  }
  .page-header h1 {
    margin: 0;
    font-size: 36px;
    font-weight: 800;
    color: #2d1b4e;
    letter-spacing: -0.5px;
  }
  .page-header p {
    margin: 12px 0 0 0;
    color: #9ca3af;
    font-size: 15px;
    font-weight: 500;
  }
  .form-container {
    background: white;
    border-radius: 20px;
    padding: 48px;
    box-shadow: 0 12px 40px rgba(91, 33, 182, 0.12);
    max-width: 900px;
    margin: 0 auto;
    animation: fadeIn 0.6s ease-out 0.1s both;
  }
  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 28px;
    margin-bottom: 36px;
  }
  .form-group {
    display: flex;
    flex-direction: column;
  }
  .form-group.full {
    grid-column: 1 / -1;
  }
  .form-group label {
    font-weight: 700;
    color: #2d1b4e;
    margin-bottom: 10px;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .form-group input,
  .form-group select,
  .form-group textarea {
    padding: 14px 18px;
    border: 2px solid #f0e9e0;
    border-radius: 12px;
    font-size: 15px;
    font-family: inherit;
    transition: all 0.3s ease;
    background: #fafbf8;
  }
  .form-group input:hover,
  .form-group select:hover,
  .form-group textarea:hover {
    border-color: #e8dfd5;
    background: #ffffff;
  }
  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #7c3aed;
    box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.08);
    background: white;
  }
  .form-group textarea {
    resize: vertical;
    min-height: 130px;
    font-family: inherit;
  }
  .image-upload-section {
    grid-column: 1 / -1;
    display: flex;
    gap: 40px;
    align-items: center;
    padding: 36px;
    background: linear-gradient(135deg, #faf8f3 0%, #f5e6d3 100%);
    border-radius: 16px;
    border: 2px solid #e8dfd5;
    transition: all 0.3s ease;
  }
  .image-upload-section:hover {
    border-color: #7c3aed;
    background: linear-gradient(135deg, #f9f5f0 0%, #fce4d6 100%);
    box-shadow: 0 8px 24px rgba(124, 58, 237, 0.1);
  }
  #preview {
    flex-shrink: 0;
    width: 200px;
    height: 280px;
    background: linear-gradient(135deg, #f0e9e0 0%, #e8dfd5 100%);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #9ca3af;
    cursor: pointer;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.3s ease;
    overflow: hidden;
    text-align: center;
    padding: 16px;
    text-shadow: 0 1px 2px rgba(0,0,0,0.05);
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  }
  #preview:hover {
    background: linear-gradient(135deg, #e8dfd5 0%, #d9cdc0 100%);
    transform: translateY(-3px);
    box-shadow: 0 12px 28px rgba(124, 58, 237, 0.15);
  }
  #preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 14px;
  }
  .upload-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 8px;
  }
  .upload-info h3 {
    margin: 0;
    color: #2d1b4e;
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -0.3px;
  }
  .upload-info p {
    margin: 0;
    color: #9ca3af;
    font-size: 14px;
    line-height: 1.7;
  }
  #uploader {
    display: none;
  }
  .form-actions {
    display: flex;
    gap: 16px;
    justify-content: flex-end;
    margin-top: 40px;
    padding-top: 32px;
    border-top: 2px solid #ffffffff;
  }
  button {
    padding: 14px 32px;
    border: none;
    border-radius: 12px;
    font-weight: 700;
    cursor: pointer;
    font-size: 15px;
    transition: all 0.3s ease;
    letter-spacing: 0.3px;
  }
  .btn-submit {
    background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
    color: white;
    box-shadow: 0 8px 20px rgba(124, 58, 237, 0.3);
  }
  .btn-submit:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 28px rgba(124, 58, 237, 0.4);
  }
  .btn-submit:active {
    transform: translateY(-1px);
  }
  .btn-cancel {
    background: #ffffffff;
    color: #6b7280;
    border: 2px solid #ffffffff;
  }
  .btn-cancel:hover {
    background: #e8dfd5;
    border-color: #d9cdc0;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  }
  .btn-cancel:active {
    transform: translateY(0);
  }
  @media (max-width: 640px) {
    body {
      padding: 20px 12px;
    }
    .form-grid {
      grid-template-columns: 1fr;
      gap: 20px;
    }
    .image-upload-section {
      flex-direction: column;
      gap: 20px;
      padding: 20px;
    }
    #preview {
      width: 100%;
      height: 200px;
    }
    .form-container {
      padding: 24px;
    }
    .page-header {
      padding: 24px;
    }
    .page-header h1 {
      font-size: 28px;
    }
  }
`;
document.head.appendChild(style);

// ==== Auth guard cho Librarian ====
function guardRole() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!token || !user || !['admin', 'librarian'].includes(user.role)) {
    location.href = 'login.html?next=librarian-books.html';
  }
}

// ==== Helper fillSelect ====
async function fillSelect(sel, path) {
  const res = await apiGet(path);

  // Hỗ trợ: [], {items:[]}, {data:[..]} hoặc {data:{items:[..]}}
  let raw = res;
  if (raw && typeof raw === 'object' && 'data' in raw) {
    raw = raw.data;
  }

  let items;
  if (Array.isArray(raw)) {
    items = raw;
  } else if (raw && Array.isArray(raw.items)) {
    items = raw.items;
  } else {
    items = [];
  }

  sel.innerHTML = '<option value="">-- Select --</option>';
  items.forEach((it) => {
    sel.insertAdjacentHTML('beforeend', `<option value="${it.id}">${it.name}</option>`);
  });
}

// =========================================================
// 🧩 INIT LIBRARIAN EDIT PAGE
// =========================================================
export async function initLibrarianBookEditPage() {
  guardRole();

  // Vẽ layout full page
  document.body.innerHTML = `
    <div class="page-header">
      <h1>Edit Book (Librarian)</h1>
      <p>Update book information and cover image</p>
    </div>
    
    <div class="form-container">
      <form id="editBookForm">
        <div class="form-grid">
          <div class="form-group">
            <label for="title">Book Title *</label>
            <input type="text" id="title" required />
          </div>
          
          <div class="form-group">
            <label for="publishedYear">Published Year</label>
            <input type="number" id="publishedYear" />
          </div>
          
          <div class="form-group">
            <label for="authorId">Author *</label>
            <select id="authorId" required></select>
          </div>
          
          <div class="form-group">
            <label for="categoryId">Category *</label>
            <select id="categoryId" required></select>
          </div>
          
          <div class="form-group">
            <label for="publisherId">Publisher</label>
            <select id="publisherId"></select>
          </div>
          
          <div class="form-group">
            <label for="totalCopies">Total Copies</label>
            <input type="number" id="totalCopies" />
          </div>

          <div class="form-group">
            <label for="price">Price (VND)</label>
            <input type="number" id="price" min="0" />
          </div>
          
          <div class="form-group">
            <label for="status">Status</label>
            <select id="status">
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>
          
          <div class="form-group full">
            <label for="description">Description</label>
            <textarea id="description"></textarea>
          </div>
          
          <div class="form-group full image-upload-section">
            <div id="preview">Click to select image</div>
            <div class="upload-info">
              <h3>Book Cover Image</h3>
              <p>Click the cover image to upload a new one. Supported formats: JPG, PNG. Maximum size: 2MB.</p>
            </div>
            <input type="file" id="uploader" accept="image/*" />
          </div>
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn-cancel" onclick="location.href='librarian-books.html'">
            Cancel
          </button>
          <button type="submit" class="btn-submit">Save Changes</button>
        </div>
      </form>
    </div>
  `;

  const form = document.getElementById('editBookForm');
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) {
    toast('Error', 'Missing book ID', 'error');
    setTimeout(() => (location.href = 'librarian-books.html'), 2000);
    return;
  }

  const titleEl = document.getElementById('title');
  const descriptionEl = document.getElementById('description');
  const publishedYearEl = document.getElementById('publishedYear');
  const totalCopiesEl = document.getElementById('totalCopies');
  const priceEl = document.getElementById('price'); // 🔥 đã có thật trong DOM
  const authorSel = document.getElementById('authorId');
  const categorySel = document.getElementById('categoryId');
  const publisherSel = document.getElementById('publisherId');
  const statusEl = document.getElementById('status');
  const preview = document.getElementById('preview');
  const uploader = document.getElementById('uploader');
  let selectedFile = null;

  await Promise.all([
    fillSelect(authorSel, '/authors?limit=1000'),
    fillSelect(categorySel, '/categories?limit=1000'),
    fillSelect(publisherSel, '/publishers?limit=1000'),
  ]);

  // Load book
  try {
    const res = await apiGet(`/books/${id}`);
    const b = res.data || res;

    titleEl.value = b.title || '';
    descriptionEl.value = b.description || '';
    publishedYearEl.value = b.publishedYear || '';
    totalCopiesEl.value = b.totalCopies || 0;
    priceEl.value = b.price ?? 0;
    authorSel.value = b.author?.id || b.authorId || '';
    categorySel.value = b.category?.id || b.categoryId || '';
    publisherSel.value = b.publisher?.id || b.publisherId || '';
    statusEl.value = b.status || 'available';

    preview.innerHTML = b.imageUrl ? `<img src="${b.imageUrl}" />` : 'Click to select image';
  } catch (err) {
    console.error('❌ Lỗi khi load sách:', err);
    toast('Error', err.message || 'Cannot load book', 'error');
  }

  // Upload ảnh
  preview.addEventListener('click', () => uploader.click());
  uploader.addEventListener('change', () => {
    const file = uploader.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast('Error', 'Ảnh tối đa 2MB', 'error');
      return;
    }
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.innerHTML = `<img src="${e.target.result}" />`;
    };
    reader.readAsDataURL(file);
  });

  // Submit form
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const price = Number(priceEl.value);
    if (!Number.isFinite(price) || price < 0) {
      toast('Error', 'Price must be a number ≥ 0', 'error');
      return;
    }

    const payload = {
      title: titleEl.value.trim(),
      description: descriptionEl.value.trim() || null,
      publishedYear: Number(publishedYearEl.value) || null,
      totalCopies: Number(totalCopiesEl.value) || 0,
      price,
      authorId: Number(authorSel.value) || null,
      categoryId: Number(categorySel.value) || null,
      publisherId: Number(publisherSel.value) || null,
      status: statusEl.value || 'available',
    };

    try {
      await apiPut(`/books/${id}`, payload);
      toast('Success', 'Book updated', 'success');

      if (selectedFile) {
        await apiUpload(`/upload/books/${id}/images`, selectedFile);
        toast('Success', 'Image uploaded', 'success');
      }

      setTimeout(() => (location.href = 'librarian-books.html'), 1500);
    } catch (err) {
      console.error('❌ Update failed:', err);
      toast('Error', err.message || 'Update failed', 'error');
    }
  });
}

// Tự động chạy khi file được import bằng <script type="module">
initLibrarianBookEditPage();
