// src/modules/users/dto/update-user.dto.ts
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

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  // ====== Membership / plan ======
  @IsOptional()
  @IsInt()
  planId?: number;

  @IsOptional()
  @IsDateString()
  planExpiresAt?: string;

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
