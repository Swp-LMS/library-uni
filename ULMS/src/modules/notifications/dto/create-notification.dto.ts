import { IsInt, IsOptional, IsString, MaxLength, IsEnum } from 'class-validator';
import { NotiType } from '../enums/notification-type.enum';

export class CreateNotificationDto {
  @IsInt()
  userId!: number;

  @IsString()
  @MaxLength(255)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsEnum(NotiType)
  type?: NotiType;
}
