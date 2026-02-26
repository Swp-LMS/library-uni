import { IsNotEmpty, IsOptional, IsString, MaxLength, IsInt, Min, Max } from 'class-validator';

export class CreateAuthorDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  biography?: string;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(new Date().getFullYear())
  birthYear?: number;
}
