// src/modules/auth/auth.service.ts
import bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../../../ormconfig';
import { User } from '@/modules/users/entities/User';
import { UserRole } from '@/modules/users/enums/user.enum';
import { jwtConfig } from '@/config/jwt';
import { cacheManager } from '@/utils/cache';
import zxcvbn from 'zxcvbn';
import { RegisterDto } from '@/modules/auth/dto/register-auth.dto';
import { LoginPayload, JwtUser, ForgotPasswordPayload } from '@/modules/auth/types/auth.types';
import { sendPasswordOtpMail } from '@/mail/mail.service';

type GoogleProfile = {
  googleId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
};

export class AuthService {
  private readonly userRepo = AppDataSource.getRepository(User);

  // ────────────────────────────────────────────────────────────────────────────────
  // Basic Auth
  // ────────────────────────────────────────────────────────────────────────────────
  // faceUrl = ảnh chụp lúc đăng ký
  // faceUrl = ảnh chụp lúc đăng ký
  async register(dto: RegisterDto) {
    const { name, email, password, role, phone, address } = dto;
    const normEmail = email.trim().toLowerCase();

    if (await this.userRepo.findOne({ where: { email: normEmail } })) {
      throw new Error('Email đã tồn tại');
    }
    if (await this.userRepo.findOne({ where: { name } })) {
      throw new Error('Tên đăng nhập đã tồn tại');
    }

    // 🔐 Check độ mạnh mật khẩu bằng zxcvbn
    const pwdResult = zxcvbn(password, [name, normEmail]);
    // score: 0–4 (0 rất yếu, 4 rất mạnh)
    if (pwdResult.score < 3) {
      // bạn có thể return feedback chi tiết cho FE nếu muốn
      throw new Error(
        'Mật khẩu quá yếu. Vui lòng dùng mật khẩu khó đoán hơn (ít nhất 8 ký tự, có chữ hoa, chữ thường, số hoặc ký tự đặc biệt).',
      );
    }

    const hashed = await bcrypt.hash(password, Number(process.env.BCRYPT_SALT_ROUNDS || 10));

    const entity = this.userRepo.create({
      name,
      email: normEmail,
      password: hashed,
      phone,
      address,
      role: role ?? UserRole.STUDENT,
      faceUrl: null,
    });

    const saved = await this.userRepo.save(entity);

    return {
      id: saved.id,
      name: saved.name,
      email: saved.email,
      role: saved.role,
      phone: saved.phone,
      address: saved.address,
      avatarUrl: saved.avatarUrl ?? null,
      faceUrl: saved.faceUrl ?? null,
    };
  }

  // ✅ Set faceUrl theo userId (dùng cho register thường)
  async setFaceByUserId(userId: number, faceUrl: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new Error('User không tồn tại');

    user.faceUrl = faceUrl;
    const saved = await this.userRepo.save(user);

    return {
      id: saved.id,
      faceUrl: saved.faceUrl,
    };
  }
  async login({ email, password }: LoginPayload) {
    const normEmail = email.trim().toLowerCase();
    const user = await this.userRepo.findOne({ where: { email: normEmail } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new Error('Sai email hoặc mật khẩu');
    }

    const payload = { sub: user.id, jti: uuidv4(), role: user.role, email: user.email };
    const accessToken = jwt.sign(
      payload as object,
      jwtConfig.secret as Secret,
      {
        expiresIn: jwtConfig.expiresIn,
      } as SignOptions,
    );

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl ?? null,
        planId: user.planId,
        planExpiresAt: user.planExpiresAt,
      },
    };
  }

  async getProfile(jwtUser: JwtUser) {
    // có thể trả cả avatarUrl và faceUrl, FE sẽ tự chọn dùng avatarUrl
    return this.userRepo.findOne({ where: { id: jwtUser.sub } });
  }

  async updateProfile(
    jwtUser: JwtUser,
    payload: { fullName?: string; name?: string; phone?: string; address?: string },
  ) {
    const user = await this.userRepo.findOne({ where: { id: jwtUser.sub } });
    if (!user) {
      throw new Error('User không tồn tại');
    }

    const newName = payload.fullName ?? payload.name;
    if (typeof newName === 'string' && newName.trim()) {
      user.name = newName.trim();
    }

    if (typeof payload.phone === 'string') {
      user.phone = payload.phone.trim();
    }

    if (typeof payload.address === 'string') {
      user.address = payload.address.trim();
    }

    const saved = await this.userRepo.save(user);

    return {
      id: saved.id,
      name: saved.name,
      email: saved.email,
      phone: saved.phone,
      address: saved.address,
      role: saved.role,
      avatarUrl: saved.avatarUrl ?? null,
    };
  }

  // ✅ Update avatar profile (user upload bất kỳ ảnh nào)
  async updateAvatar(jwtUser: JwtUser, avatarUrl: string) {
    const user = await this.userRepo.findOne({ where: { id: jwtUser.sub } });
    if (!user) {
      throw new Error('User không tồn tại');
    }

    user.avatarUrl = avatarUrl;
    const saved = await this.userRepo.save(user);

    return {
      id: saved.id,
      avatarUrl: saved.avatarUrl,
    };
  }

  // ✅ Update face (ảnh khuôn mặt sau khi đăng ký Google)
  async updateFace(jwtUser: JwtUser, faceUrl: string) {
    const user = await this.userRepo.findOne({ where: { id: jwtUser.sub } });
    if (!user) {
      throw new Error('User không tồn tại');
    }

    user.faceUrl = faceUrl;
    const saved = await this.userRepo.save(user);

    return {
      id: saved.id,
      faceUrl: saved.faceUrl,
    };
  }

  logout(token: string) {
    const decoded = jwt.verify(token, jwtConfig.secret as Secret) as jwt.JwtPayload;

    const jti = decoded.jti;
    const exp = decoded.exp;

    if (!jti || !exp) throw new Error('Token không hợp lệ');

    // TTL = thời gian còn lại của token, để tiết kiệm bộ nhớ
    const ttl = exp - Math.floor(Date.now() / 1000);

    // 🔥 Lưu KEY dạng revoked:<jti>
    cacheManager.set(`revoked:${jti}`, true, ttl);

    return { success: true, message: 'Token revoked successfully' };
  }

  // ────────────────────────────────────────────────────────────────────────────────
  // Forgot / Reset password (OTP qua email)
  // ────────────────────────────────────────────────────────────────────────────────
  async forgotPassword({ email }: ForgotPasswordPayload) {
    const normEmail = email.trim().toLowerCase();
    const user = await this.userRepo.findOne({ where: { email: normEmail } });

    const token = crypto.randomUUID();
    const ttl = 15 * 60; // 15 phút
    if (user) cacheManager.set(`pwdreset:${token}`, String(user.id), ttl);

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    return {
      message: 'Nếu email hợp lệ, đường dẫn đặt lại đã được gửi.',
      ...(process.env.NODE_ENV !== 'production' ? { token, reset_url: resetUrl } : {}),
    };
  }

  async requestPasswordOtp(email: string) {
    const normEmail = email.trim().toLowerCase();
    const user = await this.userRepo.findOne({ where: { email: normEmail } });

    if (user) {
      const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
      const ttl = 10 * 60; // 10 phút

      const hashedOtp = await bcrypt.hash(otp, Number(process.env.BCRYPT_SALT_ROUNDS || 10));

      cacheManager.set(`pwdotp:${normEmail}`, hashedOtp, ttl);
      await sendPasswordOtpMail({ to: normEmail, name: user.name, otp });
    }

    return { success: true, message: 'Nếu email hợp lệ, mã OTP đã được gửi.' };
  }

  async resetPasswordWithOtp(params: { email: string; otp: string; newPassword: string }) {
    const normEmail = params.email.trim().toLowerCase();

    const hashedOtp = cacheManager.get(`pwdotp:${normEmail}`);
    if (!hashedOtp) throw new Error('OTP không hợp lệ hoặc đã hết hạn');

    const ok = await bcrypt.compare(params.otp, String(hashedOtp));
    if (!ok) throw new Error('OTP không đúng');

    const user = await this.userRepo.findOne({ where: { email: normEmail } });
    if (!user) throw new Error('User không tồn tại');

    // 🔐 Check zxcvbn cho mật khẩu mới
    const pwdResult = zxcvbn(params.newPassword, [user.name, normEmail]);
    if (pwdResult.score < 3) {
      throw new Error(
        'Mật khẩu mới quá yếu. Vui lòng chọn mật khẩu khó đoán hơn (ít nhất 8 ký tự, có chữ hoa, chữ thường, số hoặc ký tự đặc biệt).',
      );
    }

    const hashed = await bcrypt.hash(
      params.newPassword,
      Number(process.env.BCRYPT_SALT_ROUNDS || 10),
    );

    user.password = hashed;
    await this.userRepo.save(user);

    cacheManager.del(`pwdotp:${normEmail}`);

    return { success: true, message: 'Đặt lại mật khẩu thành công' };
  }

  // ────────────────────────────────────────────────────────────────────────────────
  // Google Sign-In
  // ────────────────────────────────────────────────────────────────────────────────
  // src/modules/auth/auth.service.ts

  async signInWithGoogle(profile: GoogleProfile) {
    const normEmail = profile.email.trim().toLowerCase();

    let user =
      (await this.userRepo.findOne({ where: { googleId: profile.googleId } })) ||
      (await this.userRepo.findOne({ where: { email: normEmail } }));

    if (user) {
      if (!user.googleId) user.googleId = profile.googleId;
      if (profile.avatarUrl && !user.avatarUrl) user.avatarUrl = profile.avatarUrl;
      if (profile.name && !user.name) user.name = profile.name;
      user = await this.userRepo.save(user);
    } else {
      const randomPwd = await bcrypt.hash(
        crypto.randomBytes(16).toString('hex'),
        Number(process.env.BCRYPT_SALT_ROUNDS || 10),
      );

      const created = this.userRepo.create({
        name: profile.name || normEmail.split('@')[0],
        email: normEmail,
        password: randomPwd,
role: UserRole.STUDENT,
        googleId: profile.googleId,
        avatarUrl: profile.avatarUrl || null,
        faceUrl: null, // ❗ Google đăng ký lần đầu chưa có face
      });

      user = await this.userRepo.save(created);
    }

    const payload = { sub: user.id, jti: uuidv4(), role: user.role, email: user.email };
    const accessToken = jwt.sign(
      payload as object,
      jwtConfig.secret as Secret,
      {
        expiresIn: jwtConfig.expiresIn,
      } as SignOptions,
    );

    // 👇 TRẢ THÊM faceUrl
    return {
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl ?? null,
        faceUrl: user.faceUrl ?? null,
      },
    };
  }
}
