import { IsDateString, IsEnum, IsInt, IsOptional, IsNumber } from 'class-validator';
import { BorrowStatus } from '../enums/borrow-status.enum';

export class UpdateBorrowRecordDto {
  @IsOptional()
  @IsInt()
  userId?: number;

  @IsOptional()
  @IsInt()
  copyId?: number;

  @IsOptional()
  @IsInt()
  processedById?: number | null;

  @IsOptional()
  @IsDateString()
  borrowDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsDateString()
  returnDate?: string | null;

  @IsOptional()
  @IsEnum(BorrowStatus)
  status?: BorrowStatus;

  @IsOptional()
  @IsNumber()
  fineAmount?: number;
}
