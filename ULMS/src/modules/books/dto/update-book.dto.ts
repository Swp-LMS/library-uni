import { IsInt, IsOptional, IsString, Min, MaxLength, IsEnum } from 'class-validator';
import { BookStatus } from '../enums/book-status.enum';

export class UpdateBookDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  publishedYear?: number;

  // 👇 Dùng để điều chỉnh số lượng copies (KHÔNG map vào entity Book)
  @IsOptional()
  @IsInt()
  @Min(0) // cho phép set 0 để xoá hết copies nếu cần
  totalCopies?: number;

  @IsInt()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsEnum(BookStatus)
  status?: BookStatus;

  @IsOptional()
  @IsInt()
  authorId?: number;

  @IsOptional()
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsInt()
  publisherId?: number;

  // (optional) nếu muốn cho phép sửa mô tả
  @IsOptional()
  @IsString()
  description?: string;
}
