import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TransactionType } from '@prisma/client';
import { FastifyReply } from 'fastify';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('monthly-summary')
  @ApiOperation({ summary: 'Monthly income/expense summary for a year' })
  @ApiQuery({ name: 'year', type: Number, required: false })
  async getMonthlySummary(
    @CurrentUser() user: JwtPayload,
    @Query('year') year?: string,
  ) {
    const y = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.reportsService.getMonthlySummary(user.sub, y);
  }

  @Get('category-breakdown')
  @ApiOperation({ summary: 'Expense/income breakdown by category for a date range' })
  @ApiQuery({ name: 'dateFrom', required: true, example: '2024-01-01' })
  @ApiQuery({ name: 'dateTo', required: true, example: '2024-12-31' })
  @ApiQuery({ name: 'type', enum: TransactionType, required: false })
  async getCategoryBreakdown(
    @CurrentUser() user: JwtPayload,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('type') type?: TransactionType,
  ) {
    return this.reportsService.getCategoryBreakdown(user.sub, dateFrom, dateTo, type);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Transaction report for a date range' })
  @ApiQuery({ name: 'dateFrom', required: true })
  @ApiQuery({ name: 'dateTo', required: true })
  @ApiQuery({ name: 'type', enum: TransactionType, required: false })
  async getTransactionReport(
    @CurrentUser() user: JwtPayload,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('type') type?: TransactionType,
  ) {
    return this.reportsService.getTransactionReport(user.sub, dateFrom, dateTo, type);
  }

  @Get('export/csv')
  @ApiOperation({ summary: 'Export transactions as CSV' })
  @ApiQuery({ name: 'dateFrom', required: true })
  @ApiQuery({ name: 'dateTo', required: true })
  @ApiQuery({ name: 'type', enum: TransactionType, required: false })
  async exportCsv(
    @CurrentUser() user: JwtPayload,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('type') type?: TransactionType,
    @Res() reply: FastifyReply = {} as FastifyReply,
  ) {
    const csv = await this.reportsService.exportCsv(user.sub, dateFrom, dateTo, type);
    const filename = `fintrack-transactions-${dateFrom}-to-${dateTo}.csv`;
    reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(csv);
  }
}
