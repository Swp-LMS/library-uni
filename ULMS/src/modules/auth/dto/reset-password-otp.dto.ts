import { IsEmail, IsString, Length, Matches, MinLength } from 'class-validator';

export class ResetPasswordOtpDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  @IsString()
  @Length(6, 6, { message: 'OTP phải gồm 6 ký tự' })
  @Matches(/^\d{6}$/, { message: 'OTP chỉ gồm 6 chữ số' })
  otp!: string;

  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải ít nhất 6 ký tự' })
  newPassword!: string;

  @IsString()
  @MinLength(6, { message: 'Mật khẩu xác nhận phải ít nhất 6 ký tự' })
  confirmPassword!: string;
}
