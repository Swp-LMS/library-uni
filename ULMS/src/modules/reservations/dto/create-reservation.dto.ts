import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsDateString,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateReservationDto {
  @IsNumber({}, { message: 'bookId phải là số hợp lệ' })
  @IsNotEmpty({ message: 'bookId là bắt buộc' })
  bookId!: number;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'expiresAt phải đúng định dạng ISO date (VD: 2025-10-26T10:00:00Z)' },
  )
  expiresAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Ghi chú không được vượt quá 255 ký tự' })
  note?: string;
}
