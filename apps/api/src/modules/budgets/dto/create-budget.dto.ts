import { IsUUID, IsString, IsInt, Min, Max, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateBudgetDto {
  @ApiProperty({ description: 'Expense category UUID' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: '500.00', description: 'Monthly budget amount (positive)' })
  @IsString()
  @Matches(/^\d+(\.\d{1,4})?$/, { message: 'Amount must be a positive decimal' })
  amount: string;

  @ApiProperty({ example: 1, minimum: 1, maximum: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({ example: 2024 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;
}
