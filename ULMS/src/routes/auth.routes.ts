// src/routes/auth.routes.ts
import { Router } from 'express';
import { avatarUpload } from '@/config/upload';
import { uploadAvatar } from '@/modules/auth/auth.controller';
import {
  register,
  login,
  profile,
  updateProfile,
  logout,
  forgotPassword,
  resetPassword,
  googleStart,
  googleCallback,
  updateAvatar,
  uploadFaceScan,
} from '@/modules/auth/auth.controller';
import { jwtAuthMiddleware as requireAuth } from '@/modules/auth/jwtAuthMiddleware';

const router = Router();

// Đăng ký: dùng camera gửi field "avatar", nhưng backend lưu vào faceUrl
router.post('/register', avatarUpload.single('avatar'), register);

// Login
router.post('/login', login);

// Profile
router.get('/profile', requireAuth, profile);
router.patch('/profile', requireAuth, updateProfile);

// Avatar profile: upload file bất kỳ
router.patch('/profile/avatar', requireAuth, avatarUpload.single('avatar'), updateAvatar);
router.post('/profile/avatar', requireAuth, avatarUpload.single('avatar'), uploadAvatar);

// Logout
router.post('/logout', requireAuth, logout);

// Forgot / Reset password
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Google OAuth
router.get('/google', googleStart);
router.get('/google/callback', googleCallback);

// Face scan sau Google login
router.post('/face-scan', requireAuth, avatarUpload.single('avatar'), uploadFaceScan);

export default router;
