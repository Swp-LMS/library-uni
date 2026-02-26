import { IsInt, IsOptional, IsString, Min, MaxLength, IsIn } from 'class-validator';
import { BookStatus } from '../enums/book-status.enum';

export class CreateBookDto {
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsInt()
  @Min(0)
  publishedYear!: number;

  @IsOptional()
  @IsIn([BookStatus.AVAILABLE, BookStatus.UNAVAILABLE])
  status?: BookStatus;

  @IsInt()
  @Min(1)
  totalCopies!: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsInt()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsInt()
  authorId?: number;

  @IsOptional()
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsInt()
  publisherId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
