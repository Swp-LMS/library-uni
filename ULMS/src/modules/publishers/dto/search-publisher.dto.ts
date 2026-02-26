// src/modules/publishers/dto/search-publisher.dto.ts
import { IsOptional, IsString, IsEmail } from 'class-validator';

export class SearchPublisherDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
