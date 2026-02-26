import { IsOptional, IsEnum, IsString, IsDateString, IsInt } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ReservationStatus } from '../enums/reservation-status.enum';

export class SearchReservation {
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  @IsOptional()
  @IsString()
  bookTitle?: string;

  @IsOptional()
  @IsString()
  userName?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' || value == null ? undefined : value))
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer number' })
  page?: number;

  @IsOptional()
  @Transform(({ value }) => (value === '' || value == null ? undefined : value))
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer number' })
  limit?: number;
}
