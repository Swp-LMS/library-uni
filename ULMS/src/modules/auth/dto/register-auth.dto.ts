import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsIn,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { UserRole } from '@/modules/users/enums/user.enum';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @MinLength(6)
  password!: string;

  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  @Length(9, 15, { message: 'Số điện thoại phải từ 9–15 ký tự' })
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsIn(Object.values(UserRole)) // ✅ tự lấy từ enum
  role?: UserRole = UserRole.STUDENT; // ✅ default student
}
