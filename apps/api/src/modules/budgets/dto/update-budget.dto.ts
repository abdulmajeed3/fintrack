import { IsString, IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBudgetDto {
  @ApiPropertyOptional({ example: '750.00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,4})?$/, { message: 'Amount must be a positive decimal' })
  amount?: string;
}
