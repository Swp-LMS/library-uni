// assets/js/google-face.js
import { BASE_URL } from './api.js';

// ===== Helpers =====
const esc = (s = '') =>
  String(s).replace(
    /[&<>"']/g,
    (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m],
  );

function showMsg(el, type, text) {
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type} py-2 mb-2">${esc(text)}</div>`;
}

function getQueryParam(name) {
  return new URLSearchParams(location.search).get(name);
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

// ===== MAIN =====
export function initGoogleFace() {
  const msg = document.getElementById('msg');

  // token từ callback Google + fallback localStorage
  const token = getQueryParam('token') || localStorage.getItem('token') || '';
  const next = getQueryParam('next') || '';

  if (!token) {
    showMsg(msg, 'danger', 'Missing token from Google sign-in. Please login again using Google.');
    return;
  }

  // Lưu token để các trang khác dùng
  localStorage.setItem('token', token);

  // DOM
  const video = document.getElementById('gfVideo');
  const canvas = document.getElementById('gfCanvas');
  const btnStartCam = document.getElementById('gfBtnStartCam');
  const btnCapture = document.getElementById('gfBtnCapture');
  const btnSave = document.getElementById('gfBtnSave');
  const preview = document.getElementById('gfPreview');
  const previewPlaceholder = document.getElementById('gfPreviewPlaceholder');

  let stream = null;
  let faceBlob = null;
  let faceModelsLoaded = false;
  let faceCheckEnabled = true; // y như register

  // ========== FACE-API MODEL LOADER (y như bên register) ==========
  async function ensureFaceModels() {
    // Nếu không có face-api → tắt face check, nhưng vẫn cho chụp
    if (typeof window !== 'undefined' && typeof window.faceapi === 'undefined') {
      console.warn('[GoogleFace] face-api.js not found. Face check is disabled.');
      faceCheckEnabled = false;
      return;
    }

    if (faceModelsLoaded) return;

    try {
      await window.faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      faceModelsLoaded = true;
      console.log('[GoogleFace] Face models loaded.');
    } catch (e) {
      console.error('[GoogleFace] Load face models error:', e);
      faceCheckEnabled = false;
      showMsg(
        msg,
        'warning',
        'Cannot load face detection models. Face verification is temporarily disabled.',
      );
    }
  }

  // ========== Fetch profile (nếu đã có faceUrl thì cho vào luôn) ==========
  async function loadProfileAndMaybeSkip() {
    try {
      const res = await fetch(`${BASE_URL}/auth/profile`, {
        headers: authHeaders(token),
      });
      if (!res.ok) throw new Error('Failed to load profile');
      const data = await res.json();

      const user = data.data || data.user || data;
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));

        // Nếu đã có faceUrl rồi thì cho vào web luôn
        if (user.faceUrl) {
          const dest = next || 'index.html';
          location.href = dest;
          return true;
        }
      }
      return false;
    } catch (e) {
      console.warn('[GoogleFace] load profile error:', e);
      return false;
    }
  }

  loadProfileAndMaybeSkip();

  // ========== CAMERA ==========

  btnStartCam?.addEventListener('click', async () => {
    if (msg) msg.innerHTML = '';
    try {
      // cố gắng load model, nếu fail thì faceCheckEnabled=false
      await ensureFaceModels();

      // tắt stream cũ nếu có
      stream?.getTracks()?.forEach((t) => t.stop());

      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (video) {
        video.srcObject = stream;
      }
      if (btnCapture) btnCapture.disabled = false;
    } catch (err) {
      console.error(err);
      alert('Cannot access camera: ' + (err.message || err));
    }
  });

  // ========== CAPTURE (COPPY Y HỆT ĐĂNG KÝ, CHỈ THÊM BẬT/TẮT NÚT SAVE) ==========
  btnCapture?.addEventListener('click', () => {
    if (msg) msg.innerHTML = '';
    if (!video || !canvas) return;
    if (!video.videoWidth || !video.videoHeight) {
      return showMsg(msg, 'warning', 'Camera is not ready yet.');
    }

    // Vẽ frame lên canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;

        // Nếu không bật faceCheck (không có face-api hoặc load model fail) → nhận luôn
        if (!faceCheckEnabled) {
          faceBlob = blob;
          const url = URL.createObjectURL(blob);
          if (preview) {
            preview.src = url;
            preview.style.display = 'block';
          }
          if (previewPlaceholder) previewPlaceholder.style.display = 'none';
          btnSave && (btnSave.disabled = false);
          showMsg(
            msg,
            'warning',
            'Face verification is disabled. Photo captured but not verified.',
          );
          return;
        }

        try {
          const img = await window.faceapi.bufferToImage(blob);
          const detections = await window.faceapi.detectAllFaces(
            img,
            new window.faceapi.TinyFaceDetectorOptions({
              inputSize: 256,
              scoreThreshold: 0.5,
            }),
          );

          if (!detections.length) {
            faceBlob = null;
            btnSave && (btnSave.disabled = true);
            return showMsg(msg, 'warning', 'No face detected. Please retake a clear face photo.');
          }

          if (detections.length > 1) {
            faceBlob = null;
            btnSave && (btnSave.disabled = true);
            return showMsg(
              msg,
              'warning',
              'More than one face detected. Please capture only one person.',
            );
          }

          const box = detections[0].box;
          const minFaceWidth = canvas.width * 0.25;
          const minFaceHeight = canvas.height * 0.25;
          if (box.width < minFaceWidth || box.height < minFaceHeight) {
            faceBlob = null;
            btnSave && (btnSave.disabled = true);
            return showMsg(
              msg,
              'warning',
              'Your face is too small. Please move closer to the camera and retake.',
            );
          }

          // ✅ Passed face check (y hệt register)
          faceBlob = blob;
          const url = URL.createObjectURL(blob);
          if (preview) {
            preview.src = url;
            preview.style.display = 'block';
          }
          if (previewPlaceholder) previewPlaceholder.style.display = 'none';
          btnSave && (btnSave.disabled = false);

          showMsg(msg, 'success', '✅ Face photo is valid. Click "Save & Continue".');
        } catch (e) {
          console.error('Face detection error:', e);
          faceBlob = null;
          btnSave && (btnSave.disabled = true);
          showMsg(msg, 'danger', 'Face detection failed. Please retake your photo.');
        }
      },
      'image/jpeg',
      0.9,
    );
  });

  // ========== SAVE (GỬI LÊN BACKEND /auth/face-scan) ==========
  btnSave?.addEventListener('click', async () => {
    if (!faceBlob) {
      return showMsg(msg, 'warning', 'Please capture a valid face photo first.');
    }

    try {
      const fd = new FormData();
      // field "avatar" – dùng lại multer avatarUpload.single('avatar')
      fd.append('avatar', faceBlob, 'face.jpg');

      const res = await fetch(`${BASE_URL}/auth/face-scan`, {
        method: 'POST',
        headers: authHeaders(token),
        body: fd,
      });

      if (!res.ok) {
        const txt = await res.text();
        try {
          const e = JSON.parse(txt);
          throw new Error(e.message || 'Save face failed');
        } catch {
          throw new Error(txt || 'Save face failed');
        }
      }

      const data = await res.json().catch(() => ({}));
      const user = data.data || data.user || {};
      if (user && user.id) {
        const old = JSON.parse(localStorage.getItem('user') || 'null') || {};
        localStorage.setItem('user', JSON.stringify({ ...old, ...user }));
      }

      showMsg(msg, 'success', '✅ Face saved. Redirecting...');
      setTimeout(() => {
        const dest = next || 'index.html';
        location.href = dest;
      }, 1000);
    } catch (err) {
      console.error(err);
      showMsg(msg, 'danger', err.message || 'Save face failed.');
    }
  });
}
