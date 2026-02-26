// src/modules/memberships/dto/update-membership.dto.ts
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateMembershipDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  maxBooks?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  durationDays?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
