import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { BudgetsService } from '../budgets/budgets.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly budgetsService: BudgetsService,
  ) {}

  async getSummary(userId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Monthly totals
    const monthlyTotals = await this.prisma.transaction.groupBy({
      by: ['type'],
      where: {
        userId,
        transactionDate: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    let monthlyIncome = new Decimal(0);
    let monthlyExpense = new Decimal(0);
    for (const row of monthlyTotals) {
      if (row.type === TransactionType.INCOME) monthlyIncome = row._sum.amount ?? new Decimal(0);
      else monthlyExpense = row._sum.amount ?? new Decimal(0);
    }
    const monthlyNet = monthlyIncome.minus(monthlyExpense);

    // Overall account balance (all time)
    const allTimeTotals = await this.prisma.transaction.groupBy({
      by: ['type'],
      where: { userId },
      _sum: { amount: true },
    });
    let allTimeIncome = new Decimal(0);
    let allTimeExpense = new Decimal(0);
    for (const row of allTimeTotals) {
      if (row.type === TransactionType.INCOME) allTimeIncome = row._sum.amount ?? new Decimal(0);
      else allTimeExpense = row._sum.amount ?? new Decimal(0);
    }
    const overallBalance = allTimeIncome.minus(allTimeExpense);

    // Recent 5 transactions
    const recentTransactions = await this.prisma.transaction.findMany({
      where: { userId },
      include: { category: { select: { name: true, color: true, icon: true } } },
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
      take: 5,
    });

    // Expense breakdown by category for the month
    const categoryBreakdown = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: TransactionType.EXPENSE,
        transactionDate: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 10,
    });

    const categoryIds = categoryBreakdown.map((r) => r.categoryId);
    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, color: true, icon: true },
    });
    const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

    const expenseBreakdown = categoryBreakdown.map((row) => ({
      category: catMap[row.categoryId] ?? { id: row.categoryId, name: 'Unknown', color: null, icon: null },
      amount: (row._sum.amount ?? new Decimal(0)).toFixed(2),
      percentage: monthlyExpense.isZero()
        ? 0
        : (row._sum.amount ?? new Decimal(0))
            .div(monthlyExpense)
            .mul(100)
            .toDecimalPlaces(1)
            .toNumber(),
    }));

    // Monthly income vs expense for last 6 months (chart data)
    const chartData = await this.getMonthlyTrend(userId, 6);

    // Budget progress for current month
    const budgetProgress = await this.budgetsService.findAll(userId, month, year);

    return {
      summary: {
        monthlyIncome: monthlyIncome.toFixed(2),
        monthlyExpense: monthlyExpense.toFixed(2),
        monthlyNet: monthlyNet.toFixed(2),
        overallBalance: overallBalance.toFixed(2),
        month,
        year,
      },
      recentTransactions,
      expenseBreakdown,
      monthlyTrend: chartData,
      budgetProgress,
    };
  }

  async getMonthlyTrend(userId: string, months: number) {
    const result: Array<{ month: number; year: number; income: string; expense: string; net: string }> = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const startDate = new Date(y, m - 1, 1);
      const endDate = new Date(y, m, 0);

      const totals = await this.prisma.transaction.groupBy({
        by: ['type'],
        where: {
          userId,
          transactionDate: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      });

      let income = new Decimal(0);
      let expense = new Decimal(0);
      for (const row of totals) {
        if (row.type === TransactionType.INCOME) income = row._sum.amount ?? new Decimal(0);
        else expense = row._sum.amount ?? new Decimal(0);
      }

      result.push({
        month: m,
        year: y,
        income: income.toFixed(2),
        expense: expense.toFixed(2),
        net: income.minus(expense).toFixed(2),
      });
    }

    return result;
  }
}
