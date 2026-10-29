import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMonthlySummary(userId: string, year: number) {
    const results = [];
    for (let month = 1; month <= 12; month++) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const totals = await this.prisma.transaction.groupBy({
        by: ['type'],
        where: {
          userId,
          transactionDate: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
        _count: true,
      });

      let income = new Decimal(0);
      let expense = new Decimal(0);
      let incomeCount = 0;
      let expenseCount = 0;
      for (const row of totals) {
        if (row.type === TransactionType.INCOME) {
          income = row._sum.amount ?? new Decimal(0);
          incomeCount = row._count;
        } else {
          expense = row._sum.amount ?? new Decimal(0);
          expenseCount = row._count;
        }
      }

      results.push({
        month,
        year,
        income: income.toFixed(2),
        expense: expense.toFixed(2),
        net: income.minus(expense).toFixed(2),
        transactionCount: incomeCount + expenseCount,
      });
    }
    return results;
  }

  async getCategoryBreakdown(userId: string, dateFrom: string, dateTo: string, type?: TransactionType) {
    const where: Record<string, unknown> = {
      userId,
      transactionDate: {
        gte: new Date(dateFrom),
        lte: new Date(dateTo),
      },
    };
    if (type) where['type'] = type;

    const breakdown = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where,
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
    });

    const total = breakdown.reduce(
      (acc, row) => acc.plus(row._sum.amount ?? new Decimal(0)),
      new Decimal(0),
    );

    const categoryIds = breakdown.map((r) => r.categoryId);
    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, color: true, icon: true, type: true },
    });
    const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

    return {
      total: total.toFixed(2),
      items: breakdown.map((row) => ({
        category: catMap[row.categoryId],
        amount: (row._sum.amount ?? new Decimal(0)).toFixed(2),
        count: row._count,
        percentage: total.isZero()
          ? 0
          : (row._sum.amount ?? new Decimal(0))
              .div(total)
              .mul(100)
              .toDecimalPlaces(1)
              .toNumber(),
      })),
    };
  }

  async getTransactionReport(
    userId: string,
    dateFrom: string,
    dateTo: string,
    type?: TransactionType,
  ) {
    const where: Record<string, unknown> = {
      userId,
      transactionDate: { gte: new Date(dateFrom), lte: new Date(dateTo) },
    };
    if (type) where['type'] = type;

    const [transactions, totalsAgg] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: { category: { select: { id: true, name: true, color: true, type: true } } },
        orderBy: { transactionDate: 'desc' },
      }),
      this.prisma.transaction.groupBy({
        by: ['type'],
        where,
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    let totalIncome = new Decimal(0);
    let totalExpense = new Decimal(0);
    for (const row of totalsAgg) {
      if (row.type === TransactionType.INCOME) totalIncome = row._sum.amount ?? new Decimal(0);
      else totalExpense = row._sum.amount ?? new Decimal(0);
    }

    return {
      transactions,
      summary: {
        totalIncome: totalIncome.toFixed(2),
        totalExpense: totalExpense.toFixed(2),
        net: totalIncome.minus(totalExpense).toFixed(2),
        count: transactions.length,
      },
    };
  }

  async exportCsv(userId: string, dateFrom: string, dateTo: string, type?: TransactionType): Promise<string> {
    const { transactions } = await this.getTransactionReport(userId, dateFrom, dateTo, type);

    const header = 'Date,Type,Description,Category,Amount,Notes\n';
    const rows = transactions.map((tx) => {
      const date = tx.transactionDate.toISOString().split('T')[0];
      const desc = `"${tx.description.replace(/"/g, '""')}"`;
      const notes = tx.notes ? `"${tx.notes.replace(/"/g, '""')}"` : '';
      return `${date},${tx.type},${desc},"${tx.category.name}",${tx.amount.toString()},${notes}`;
    });

    return header + rows.join('\n');
  }
}
