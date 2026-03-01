import { UserRole } from '@/modules/users/enums/user.enum';

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
};

export type JwtUser = {
  id: number;
  sub: number;
  email?: string;
  role: UserRole;
  jti?: string;
};

export type ForgotPasswordPayload = { email: string };

export type ResetPasswordOtpPayload = {
  email: string;
  otp: string;
  newPassword: string;
};
