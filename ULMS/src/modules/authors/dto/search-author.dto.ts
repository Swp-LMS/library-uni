// src/modules/authors/dto/search-author.dto.ts
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SearchAuthorDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  biography?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  book?: string;
}
