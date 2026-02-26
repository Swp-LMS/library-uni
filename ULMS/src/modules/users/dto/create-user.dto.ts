// src/modules/users/dto/create-user.dto.ts
import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsDateString,
} from 'class-validator';
import { UserRole } from '../enums/user.enum';

export class CreateUserDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole; // mặc định READERS nếu không truyền

  // ====== Membership / plan ======
  @IsOptional()
  @IsInt()
  planId?: number;

  @IsOptional()
  @IsDateString()
  planExpiresAt?: string; // nếu entity dùng Date thì TypeORM tự parse

  @IsOptional()
  @IsBoolean()
  hasUsedBasicTrial?: boolean;

  @IsOptional()
  @IsBoolean()
  hasUsedUpgradePromo?: boolean;

  // ====== Blacklist ======
  @IsOptional()
  @IsBoolean()
  isBlacklisted?: boolean;
}
