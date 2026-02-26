import { IsDateString, IsEnum, IsInt, IsOptional, IsNumber } from 'class-validator';
import { BorrowStatus } from '../enums/borrow-status.enum';

export class CreateBorrowRecordDto {
  @IsInt()
  userId!: number;

  @IsInt()
  copyId!: number;

  @IsDateString()
  borrowDate!: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsOptional()
  @IsDateString()
  returnDate?: string;

  @IsOptional()
  @IsEnum(BorrowStatus)
  status?: BorrowStatus;

  @IsOptional()
  @IsNumber()
  fineAmount?: number;

  // ✅ Thêm trường này để TypeScript không báo lỗi
  @IsOptional()
  @IsInt()
  processedById?: number;
}
