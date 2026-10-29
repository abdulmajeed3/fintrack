import {
  IsString,
  IsEnum,
  IsUUID,
  IsOptional,
  MinLength,
  MaxLength,
  IsDateString,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType } from '@prisma/client';

export class CreateTransactionDto {
  @ApiProperty({ enum: TransactionType })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ example: '123.45', description: 'Positive decimal amount' })
  @IsString()
  @Matches(/^\d+(\.\d{1,4})?$/, { message: 'Amount must be a positive decimal number' })
  amount: string;

  @ApiProperty({ example: 'Grocery shopping at Walmart' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  description: string;

  @ApiProperty({ example: '2024-01-15', description: 'Transaction date (YYYY-MM-DD)' })
  @IsDateString()
  transactionDate: string;

  @ApiProperty({ description: 'Category UUID' })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({ example: 'Weekly grocery run' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
