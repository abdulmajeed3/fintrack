import { IsString, IsOptional, MinLength, MaxLength, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '@prisma/client';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ enum: Currency, example: 'USD' })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;
}
