// assets/js/api.js

export const BASE_URL = 'http://localhost:3000/api'; // sửa lại nếu backend đổi port hoặc domain

function headers(isJSON = true) {
  const h = {};
  const token = localStorage.getItem('token');
  if (isJSON) h['Content-Type'] = 'application/json';
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

/**
 * Common JSON error handler
 */
async function handleResponse(res) {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    try {
      const j = JSON.parse(text || '{}');
      const err = new Error(j.message || text || `HTTP ${res.status}`);
      // @ts-ignore
      err.status = res.status;
      // @ts-ignore
      err.body = j;
      throw err;
    } catch {
      const err = new Error(text || `HTTP ${res.status}`);
      // @ts-ignore
      err.status = res.status;
      throw err;
    }
  }
  return res.json();
}

/**
 * GET — always disable cache to prevent 304 Not Modified
 */
export async function apiGet(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: headers(false),
    cache: 'no-store', // 🔒 tránh 304 không có body
  });
  return handleResponse(res);
}

/**
 * POST (JSON)
 */
export async function apiPost(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: headers(true),
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

/**
 * PATCH (JSON)
 */
export async function apiPatch(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: headers(true),
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

/**
 * PUT (JSON)
 */
export async function apiPut(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: headers(true),
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

/**
 * DELETE
 */
export async function apiDelete(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: headers(false),
  });
  return res.ok ? res.json().catch(() => ({})) : handleResponse(res);
}

/**
 * FILE UPLOAD (1 file) — dùng cho:
 * - Upload ảnh sách:  POST /upload/books/:id/images
 * - Import CSV/Excel: POST /books/import
 */
export async function apiUpload(path, file, fieldName = 'file') {
  const fd = new FormData();
  fd.append(fieldName, file);

  const token = localStorage.getItem('token');
  const h = {};
  if (token) h['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: h, // ❌ không set Content-Type, để browser tự set multipart/form-data
    body: fd,
  });

  return handleResponse(res);
}

/**
 * OPTIONAL: POST FormData (nếu sau này cần gửi nhiều field)
 * vd: apiPostFormData('/books/import', fd)
 */
export async function apiPostFormData(path, formData) {
  const token = localStorage.getItem('token');
  const h = {};
  if (token) h['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: h,
    body: formData,
  });

  return handleResponse(res);
}
