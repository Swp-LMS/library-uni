// src/modules/auth/auth.controller.ts
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login-auth.dto';
import { RegisterDto } from './dto/register-auth.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordOtpDto } from './dto/reset-password-otp.dto';
import { validateDto } from '@/utils/validateDto';
import { JwtUser } from './types/auth.types';
import { googleAuthUrl, googleClient } from '@/config/google';
import { CloudinaryService } from '@/cloudinary/cloudinary.service';
import zxcvbn from 'zxcvbn';

const authService = new AuthService();

/** POST /api/auth/login */
export const login = async (req: Request, res: Response) => {
  try {
    const dto = await validateDto(LoginDto, req.body);
    const result = await authService.login(dto);
    return res.status(200).json({ success: true, ...result });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 401;
    const message = err instanceof Error ? err.message : 'Đăng nhập thất bại';
    return res.status(status).json({ success: false, message });
  }
};

/** POST /api/auth/register */
export const register = async (req: Request, res: Response) => {
  try {
    const file = (req as Request & { file?: Express.Multer.File }).file;

    // 🚨 BẮT BUỘC PHẢI CÓ ẢNH KHUÔN MẶT
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chụp ảnh khuôn mặt khi đăng ký.',
      });
    }

    const dto = await validateDto(RegisterDto, req.body);

    // 1️⃣ Tạo user trước (chưa có faceUrl)
    const created = await authService.register(dto); // { id, name, email, ... }

    // 2️⃣ Upload ảnh lên Cloudinary theo userId
    const folder = `library/faces/${created.id}`;
    const publicId = `face-register-${created.id}-${Date.now()}`;
    const uploadResult = await CloudinaryService.uploadBuffer(file.buffer, folder, publicId);

    // 3️⃣ Cập nhật faceUrl trong DB
    const faceInfo = await authService.setFaceByUserId(created.id, uploadResult.secure_url);

    return res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      data: {
        ...created,
        faceUrl: faceInfo.faceUrl,
      },
    });
  } catch (err: any) {
    console.error('❌ [Register Error]', err);

    // class-validator errors
    if (Array.isArray(err) && err[0]?.constraints) {
      const messages = err
        .map((e) => Object.values(e.constraints ?? {}))
        .flat()
        .join(', ');
      return res.status(400).json({ success: false, message: messages });
    }

    const status = err.status ?? 400;
    const message = err.message ?? 'Đăng ký thất bại';
    return res.status(status).json({ success: false, message });
  }
};

/** GET /api/auth/profile (Bearer) */
export const profile = async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as Request & { user: JwtUser }).user;
    const me = await authService.getProfile(jwtUser);

    if (!me) {
      return res.status(404).json({ success: false, message: 'User không tồn tại' });
    }

    return res.json({ success: true, data: me });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : 'Lỗi lấy profile';
    return res.status(status).json({ success: false, message });
  }
};

/** PATCH /api/auth/profile (Bearer) */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as Request & { user: JwtUser }).user;
    const { fullName, name, phone, address } = req.body;

    const result = await authService.updateProfile(jwtUser, {
      fullName,
      name,
      phone,
      address,
    });

    return res.json({
      success: true,
      message: 'Cập nhật profile thành công',
      data: result,
    });
  } catch (err: unknown) {
    console.error('❌ [UpdateProfile Error]', err);
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : 'Cập nhật profile thất bại';
    return res.status(status).json({ success: false, message });
  }
};

/** PATCH /api/auth/profile/avatar (Bearer) */
export const updateAvatar = async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as Request & { user: JwtUser }).user;
    const file = (req as Request & { file?: Express.Multer.File }).file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Không có file avatar được gửi lên.',
      });
    }

    if (!file.buffer) {
      return res.status(400).json({ success: false, message: 'Dữ liệu ảnh không hợp lệ.' });
    }

    const publicId = `avatar-${jwtUser.sub}-${Date.now()}`;
    const result = await CloudinaryService.uploadBuffer(file.buffer, 'library/avatars', publicId);

    const avatarUrl = result.secure_url;
    const updated = await authService.updateAvatar(jwtUser, avatarUrl);

    return res.status(200).json({
      success: true,
      message: 'Cập nhật avatar thành công',
      avatarUrl: updated.avatarUrl,
      data: updated,
    });
  } catch (err: any) {
    console.error('❌ [UpdateAvatar Error]', err);
    const status = err.status ?? 400;
    const message = err.message ?? 'Cập nhật avatar thất bại';
    return res.status(status).json({ success: false, message });
  }
};

/** POST /api/auth/face-scan (Bearer) - lưu ảnh khuôn mặt sau Google login */
export const uploadFaceScan = async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as Request & { user: JwtUser }).user;
    const file = (req as Request & { file?: Express.Multer.File }).file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Không có file khuôn mặt được gửi lên.',
      });
    }

    const folder = `library/faces/${jwtUser.sub}`;
    const publicId = `face-${jwtUser.sub}-${Date.now()}`;

    const result = await CloudinaryService.uploadBuffer(file.buffer, folder, publicId);

    const updated = await authService.updateFace(jwtUser, result.secure_url);

    return res.status(200).json({
      success: true,
      message: 'Lưu ảnh khuôn mặt thành công',
      faceUrl: updated.faceUrl,
      data: updated,
    });
  } catch (err: any) {
    console.error('❌ [UploadFaceScan Error]', err);
    const status = err.status ?? 400;
    const message = err.message ?? 'Lưu ảnh khuôn mặt thất bại';
    return res.status(status).json({ success: false, message });
  }
};

/** POST /api/auth/upload-avatar (Bearer) – alias, nếu bạn dùng route này */
export const uploadAvatar = async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as Request & { user: JwtUser }).user;
    const file = (req as Request & { file?: Express.Multer.File }).file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn ảnh.' });
    }

    if (!file.buffer) {
      return res.status(400).json({ success: false, message: 'Dữ liệu ảnh không hợp lệ.' });
    }

    const publicId = `avatar-upload-${jwtUser.sub}-${Date.now()}`;
    const result = await CloudinaryService.uploadBuffer(file.buffer, 'library/avatars', publicId);

    const avatarUrl = result.secure_url;
    const updated = await authService.updateAvatar(jwtUser, avatarUrl);

    return res.json({
      success: true,
      message: 'Cập nhật ảnh đại diện thành công',
      data: updated,
    });
  } catch (err: any) {
    console.error('❌ [UploadAvatar Error]', err);
    const status = err.status ?? 400;
    const message = err.message ?? 'Cập nhật ảnh đại diện thất bại';
    return res.status(status).json({ success: false, message });
  }
};

/** POST /api/auth/logout (Bearer) */
export const logout = (req: Request, res: Response) => {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authorization header không hợp lệ' });
    }
    const token = header.slice(7).trim();
    authService.logout(token);
    return res.json({ success: true, message: 'Đã đăng xuất' });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : 'Lỗi đăng xuất';
    return res.status(status).json({ success: false, message });
  }
};

/** POST /api/auth/forgot-password (gửi OTP) */
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const dto = await validateDto(ForgotPasswordDto, req.body);
    const result = await authService.requestPasswordOtp(dto.email);
    return res.status(200).json(result);
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : 'Gửi OTP thất bại';
    return res.status(status).json({ success: false, message });
  }
};

/** POST /api/auth/reset-password (OTP) */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const dto = await validateDto(ResetPasswordOtpDto, req.body);

    if (dto.newPassword !== dto.confirmPassword) {
      return res.status(400).json({ success: false, message: 'Mật khẩu xác nhận không khớp' });
    }

    const result = await authService.resetPasswordWithOtp({
      email: dto.email,
      otp: dto.otp,
      newPassword: dto.newPassword,
    });

    return res.status(200).json(result);
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : 'Đặt lại mật khẩu thất bại';
    return res.status(status).json({ success: false, message });
  }
};

/** GET /api/auth/google — bắt đầu OAuth */
export const googleStart = async (req: Request, res: Response) => {
  const next = typeof req.query.next === 'string' ? req.query.next : undefined;
  const url = googleAuthUrl(next);
  return res.redirect(url);
};

/** GET /api/auth/google/callback */
export const googleCallback = async (req: Request, res: Response) => {
  try {
    const code = String(req.query.code || '');
    if (!code) return res.status(400).send('Missing code');

    const { tokens } = await googleClient.getToken(code);
    const r = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const info: any = await r.json();

    const result = await authService.signInWithGoogle({
      googleId: info.id,
      email: info.email,
      name: info.name,
      avatarUrl: info.picture,
    });

    const base = process.env.FRONTEND_URL || 'http://127.0.0.1:5500';

    const needFaceCapture = !result.user.faceUrl;
    const landingPath = needFaceCapture ? '/google-face.html' : '/google-landing.html';

    const url = new URL(landingPath, base);
    const next = typeof req.query.state === 'string' ? req.query.state : undefined;
    if (next) url.searchParams.set('next', next);

    url.searchParams.set('token', result.access_token);
    return res.redirect(url.toString());
  } catch (e) {
    console.error('Google callback error:', e);
    return res.status(400).send('Google login failed');
  }
};

/** (Optional) POST /api/auth/check-password-strength */
export const checkPasswordStrength = async (req: Request, res: Response) => {
  try {
    const { password, email, name } = req.body as {
      password?: string;
      email?: string;
      name?: string;
    };

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }

    const normEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const displayName = typeof name === 'string' ? name.trim() : '';

    const result = zxcvbn(password, [normEmail, displayName]);

    return res.status(200).json({
      success: true,
      data: {
        score: result.score, // 0–4
        crack_times_display: result.crack_times_display,
        feedback: result.feedback,
        password_length: password.length,
      },
    });
  } catch (err: unknown) {
    console.error('❌ [CheckPasswordStrength Error]', err);
    const status = (err as { status?: number }).status ?? 400;
    const message =
      err instanceof Error ? err.message : 'Kiểm tra độ mạnh mật khẩu thất bại';
    return res.status(status).json({ success: false, message });
  }
};
