import { BASE_URL } from './api.js';

// ========== helpers chung ==========
const esc = (s = '') =>
  String(s).replace(
    /[&<>"']/g,
    (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m],
  );

function headersJSON() {
  return { 'Content-Type': 'application/json' };
}

async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: headersJSON(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json().catch(() => ({}));
}

function showMsg(el, type, text) {
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type}">${esc(text)}</div>`;
}

function gotoNextOr(pathDefault = 'index.html') {
  const next = new URLSearchParams(location.search).get('next');
  location.href = next || pathDefault;
}

function getQueryParam(name) {
  return new URLSearchParams(location.search).get(name);
}

/* =====================================================================
 * LOGIN
 * ===================================================================== */
export function initLogin() {
  const form = document.getElementById('loginForm');
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const togglePwd = document.getElementById('togglePwd');
  const msg = document.getElementById('msg');

  // 👁 Toggle password
  togglePwd?.addEventListener('click', () => {
    if (!password) return;

    const isHidden = password.type === 'password';
    password.type = isHidden ? 'text' : 'password';

    const icon = togglePwd.querySelector('i');
    if (icon) {
      icon.classList.toggle('bi-eye');
      icon.classList.toggle('bi-eye-slash');
    }
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (msg) msg.innerHTML = '';

    if (!email.value || !password.value) {
      return showMsg(msg, 'warning', 'Please fill all fields.');
    }

    try {
      const data = await post('/auth/login', {
        email: email.value.trim(),
        password: password.value,
      });

      if (!data.access_token) throw new Error('Invalid response');

      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user || {}));

      const role = data.user?.role;
      if (role === 'admin') {
        location.href = 'admin-dashboard.html';
      } else if (role === 'librarian') {
        location.href = 'librarian-dashboard.html';
      } else {
        gotoNextOr('index.html');
      }
    } catch (err) {
      showMsg(msg, 'danger', err.message || 'Login failed');
    }
  });
}

/* =====================================================================
 * REGISTER + CAMERA + FACE CHECK
 * ===================================================================== */
export function initRegister() {
  const form = document.getElementById('registerForm');
  const name = document.getElementById('name');
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const confirm = document.getElementById('confirm');
  const phone = document.getElementById('phone');
  const address = document.getElementById('address');
  const msg = document.getElementById('msg');

  // 📌 Helper: clear message
  const clearMsg = () => {
    if (msg) msg.innerHTML = '';
  };

  // 🧹 Hễ gõ vào bất kỳ input nào thì xóa message cũ
  [name, email, password, confirm, phone, address].forEach((el) => {
    el?.addEventListener('input', clearMsg);
  });

  // 📷 Elements camera
  const video = document.getElementById('regVideo');
  const canvas = document.getElementById('regCanvas');
  const btnStartCam = document.getElementById('btnStartCam');
  const btnCapture = document.getElementById('btnCapture');
  const preview = document.getElementById('regPreview');

  let stream = null;
  let faceBlob = null;
  let faceModelsLoaded = false;
  let faceCheckEnabled = true; // nếu không load được face-api thì sẽ tắt check

  // ========= FACE-API MODEL LOADER =========
  async function ensureFaceModels() {
    // Nếu không có face-api (chưa thêm script CDN) → tắt face check, nhưng vẫn cho đăng ký
    if (typeof window !== 'undefined' && typeof window.faceapi === 'undefined') {
      console.warn('[Register] face-api.js not found. Face check is disabled.');
      faceCheckEnabled = false;
      return;
    }

    if (faceModelsLoaded) return;

    try {
      // Bạn cần phục vụ model trong thư mục /models (tiny_face_detector)
      // Ví dụ: public/models/tiny_face_detector_model-weights_manifest.json
      await window.faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      faceModelsLoaded = true;
      console.log('[Register] Face models loaded.');
    } catch (e) {
      console.error('Load face models error:', e);
      faceCheckEnabled = false;
      if (msg) {
        showMsg(
          msg,
          'warning',
          'Cannot load face detection models. Face verification is temporarily disabled.',
        );
      }
    }
  }

  // Bật camera
  btnStartCam?.addEventListener('click', async () => {
    clearMsg();
    try {
      // cố gắng load model, nếu fail thì faceCheckEnabled=false
      await ensureFaceModels();

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

  // Chụp hình + kiểm tra khuôn mặt
  btnCapture?.addEventListener('click', () => {
    clearMsg();
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
            return showMsg(msg, 'warning', 'No face detected. Please retake a clear face photo.');
          }

          if (detections.length > 1) {
            faceBlob = null;
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
            return showMsg(
              msg,
              'warning',
              'Your face is too small. Please move closer to the camera and retake.',
            );
          }

          // ✅ Passed face check
          faceBlob = blob;
          const url = URL.createObjectURL(blob);
          if (preview) {
            preview.src = url;
            preview.style.display = 'block';
          }
          showMsg(msg, 'success', '✅ Face photo is valid. You can register now.');
        } catch (e) {
          console.error('Face detection error:', e);
          faceBlob = null;
          showMsg(msg, 'danger', 'Face detection failed. Please retake your photo.');
        }
      },
      'image/jpeg',
      0.9,
    );
  });

  // Helper gửi multipart/form-data
  async function postFormData(path, formData) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      body: formData, // KHÔNG set Content-Type
    });

    if (!res.ok) {
      const txt = await res.text();
      try {
        const e = JSON.parse(txt);
        throw new Error(e.message || 'Register failed');
      } catch {
        throw new Error(txt || 'Register failed');
      }
    }

    return res.json().catch(() => ({}));
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMsg();

    // ⚠️ Kiểm tra dữ liệu
    if (!name.value || !email.value || !password.value || !confirm.value) {
      return showMsg(msg, 'warning', 'Please fill all required fields.');
    }

    if (password.value !== confirm.value) {
      return showMsg(msg, 'warning', 'Passwords do not match.');
    }

    if (password.value.length < 6) {
      return showMsg(msg, 'warning', 'Password must be at least 6 characters.');
    }

    // ✅ BẮT BUỘC phải có ảnh face đã pass (hoặc đã được chấp nhận trong chế độ không check)
    if (!faceBlob) {
      return showMsg(msg, 'warning', 'Please capture a valid face photo before registering.');
    }

    try {
      // ✅ Tạo FormData thay vì JSON
      const fd = new FormData();
      fd.append('name', name.value.trim());
      fd.append('email', email.value.trim());
      fd.append('password', password.value);
      if (phone?.value) fd.append('phone', phone.value.trim());
      if (address?.value) fd.append('address', address.value.trim());

      // 📷 đính kèm ảnh (bắt buộc) – Multer .single('avatar') sẽ đọc field này
      fd.append('avatar', faceBlob, 'avatar.jpg');

      const data = await postFormData('/auth/register', fd);

      if (data.success) {
        showMsg(msg, 'success', '🎉 Account created successfully! Please log in.');
        setTimeout(() => {
          sessionStorage.setItem('signup_ok', '1');
          location.href = 'login.html';
        }, 1800);
        return;
      }

      throw new Error(data.message || 'Register failed');
    } catch (err) {
      showMsg(msg, 'danger', err.message || 'Register failed');
    }
  });

  // Khi quay lại từ login (sau signup ok)
  const fromReg = sessionStorage.getItem('signup_ok');
  if (fromReg) {
    sessionStorage.removeItem('signup_ok');
    showMsg(msg, 'success', '✅ Account created successfully. Please log in.');
  }
}

/* =====================================================================
 * FORGOT PASSWORD
 * ===================================================================== */
export function initForgotPassword() {
  const form = document.getElementById('forgotForm');
  const email = document.getElementById('email');
  const msg = document.getElementById('msg');
  const toReset = document.getElementById('toReset');

  const qEmail = getQueryParam('email');
  if (qEmail) email.value = qEmail;

  toReset?.addEventListener('click', (e) => {
    e.preventDefault();
    const url = new URL(toReset.getAttribute('href') || 'reset-password.html', location.href);
    const em = (email.value || '').trim();
    if (em) url.searchParams.set('email', em);
    const next = getQueryParam('next');
    if (next) url.searchParams.set('next', next);
    location.href = url.toString();
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (msg) msg.innerHTML = '';

    const em = (email.value || '').trim();
    if (!em) return showMsg(msg, 'warning', 'Please enter email.');

    try {
      const data = await post('/auth/forgot-password', { email: em });
      showMsg(msg, 'success', data.message || 'If the email is valid, OTP has been sent.');
      setTimeout(() => {
        const url = new URL('reset-password.html', location.href);
        url.searchParams.set('email', em);
        const next = getQueryParam('next');
        if (next) url.searchParams.set('next', next);
        location.href = url.toString();
      }, 1200);
    } catch (err) {
      showMsg(msg, 'danger', err.message || 'Failed to send OTP.');
    }
  });
}

/* =====================================================================
 * RESET PASSWORD
 * ===================================================================== */
export function initResetPassword() {
  const form = document.getElementById('resetForm');
  const email = document.getElementById('email');
  const otp = document.getElementById('otp');
  const newPassword = document.getElementById('newPassword');
  const confirmPassword = document.getElementById('confirmPassword');
  const msg = document.getElementById('msg');

  const qEmail = getQueryParam('email');
  if (qEmail) email.value = qEmail;

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (msg) msg.innerHTML = '';

    const payload = {
      email: (email.value || '').trim(),
      otp: (otp.value || '').trim(),
      newPassword: newPassword.value,
      confirmPassword: confirmPassword.value,
    };

    if (!payload.email || !payload.otp || !payload.newPassword || !payload.confirmPassword) {
      return showMsg(msg, 'warning', 'Please fill all fields.');
    }
    if (payload.newPassword.length < 6) {
      return showMsg(msg, 'warning', 'Password must be at least 6 characters.');
    }
    if (payload.newPassword !== payload.confirmPassword) {
      return showMsg(msg, 'warning', 'Passwords do not match.');
    }

    try {
      const data = await post('/auth/reset-password', payload);
      showMsg(msg, 'success', data.message || 'Password has been reset.');
      setTimeout(() => {
        const next = getQueryParam('next');
        location.href = next || 'login.html';
      }, 1200);
    } catch (err) {
      showMsg(msg, 'danger', err.message || 'Reset password failed.');
    }
  });
}
