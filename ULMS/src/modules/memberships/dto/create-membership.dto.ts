import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateMembershipDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(0)
  price!: number;

  @IsInt()
  @Min(0)
  maxBooks!: number;

  @IsInt()
  @Min(1)
  durationDays!: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
