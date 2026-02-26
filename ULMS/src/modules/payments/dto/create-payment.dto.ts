import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaymentMethod } from '../enums/payment-method.enum';

export class CreatePaymentDto {
  @IsInt()
  @Min(1)
  fineId!: number; // tạo payment cho fine nào

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount?: number; // thường sẽ = fine.amount, có thể cho override

  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
