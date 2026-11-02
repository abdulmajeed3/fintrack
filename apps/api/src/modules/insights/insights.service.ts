import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

interface MonthTotals {
  income: Decimal;
  expense: Decimal;
  net: Decimal;
  expenseCount: number;
}

interface CatData {
  categoryId: string;
  name: string;
  color: string | null;
  amount: Decimal;
  percentage: number;
  count: number;
}

interface CatComparison {
  categoryId: string;
  name: string;
  color: string | null;
  amount: string;
  previousAmount: string;
  change: string;
  changePercent: number | null;
  percentage: number;
  count: number;
}

@Injectable()
export class InsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMonthlyInsights(userId: string, month: number, year: number) {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    const [current, previous, catCurrent, catPrev] = await Promise.all([
      this.getMonthTotals(userId, month, year),
      this.getMonthTotals(userId, prevMonth, prevYear),
      this.getCategoryBreakdown(userId, month, year),
      this.getCategoryBreakdown(userId, prevMonth, prevYear),
    ]);

    const prevCatMap = new Map(catPrev.map((c) => [c.categoryId, c]));

    const categoryBreakdown: CatComparison[] = catCurrent.map((cat) => {
      const prev = prevCatMap.get(cat.categoryId);
      const prevAmount = prev?.amount ?? new Decimal(0);
      const change = cat.amount.minus(prevAmount);
      const changePercent = prevAmount.isZero()
        ? null
        : change.div(prevAmount).mul(100).toDecimalPlaces(1).toNumber();
      return {
        categoryId: cat.categoryId,
        name: cat.name,
        color: cat.color,
        amount: cat.amount.toFixed(2),
        previousAmount: prevAmount.toFixed(2),
        change: change.toFixed(2),
        changePercent,
        percentage: cat.percentage,
        count: cat.count,
      };
    });

    const expenseChange = current.expense.minus(previous.expense);
    const expenseChangePercent = previous.expense.isZero()
      ? null
      : expenseChange.div(previous.expense).mul(100).toDecimalPlaces(1).toNumber();

    const savingsRate = current.income.isZero()
      ? null
      : current.income
          .minus(current.expense)
          .div(current.income)
          .mul(100)
          .toDecimalPlaces(1)
          .toNumber();

    const topCategory = categoryBreakdown[0] ?? null;
    const suggestions = this.generateSuggestions(current, previous, categoryBreakdown, savingsRate);

    return {
      currentMonth: {
        month,
        year,
        income: current.income.toFixed(2),
        expense: current.expense.toFixed(2),
        net: current.net.toFixed(2),
        expenseCount: current.expenseCount,
      },
      previousMonth: {
        month: prevMonth,
        year: prevYear,
        income: previous.income.toFixed(2),
        expense: previous.expense.toFixed(2),
        net: previous.net.toFixed(2),
        expenseCount: previous.expenseCount,
      },
      comparison: {
        expenseChange: expenseChange.toFixed(2),
        expenseChangePercent,
        savingsRate,
      },
      categoryBreakdown,
      topCategory,
      suggestions,
    };
  }

  private async getMonthTotals(userId: string, month: number, year: number): Promise<MonthTotals> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const totals = await this.prisma.transaction.groupBy({
      by: ['type'],
      where: { userId, transactionDate: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
      _count: true,
    });

    let income = new Decimal(0);
    let expense = new Decimal(0);
    let expenseCount = 0;
    for (const row of totals) {
      if (row.type === TransactionType.INCOME) {
        income = row._sum.amount ?? new Decimal(0);
      } else {
        expense = row._sum.amount ?? new Decimal(0);
        expenseCount = row._count;
      }
    }
    return { income, expense, net: income.minus(expense), expenseCount };
  }

  private async getCategoryBreakdown(userId: string, month: number, year: number): Promise<CatData[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const breakdown = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: TransactionType.EXPENSE,
        transactionDate: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
    });

    if (breakdown.length === 0) return [];

    const total = breakdown.reduce(
      (acc, row) => acc.plus(row._sum.amount ?? new Decimal(0)),
      new Decimal(0),
    );

    const cats = await this.prisma.category.findMany({
      where: { id: { in: breakdown.map((r) => r.categoryId) } },
      select: { id: true, name: true, color: true },
    });
    const catMap = Object.fromEntries(cats.map((c) => [c.id, c]));

    return breakdown.map((row) => {
      const amount = row._sum.amount ?? new Decimal(0);
      return {
        categoryId: row.categoryId,
        name: catMap[row.categoryId]?.name ?? 'Unknown',
        color: catMap[row.categoryId]?.color ?? null,
        amount,
        percentage: total.isZero()
          ? 0
          : amount.div(total).mul(100).toDecimalPlaces(1).toNumber(),
        count: row._count,
      };
    });
  }

  private generateSuggestions(
    current: MonthTotals,
    previous: MonthTotals,
    breakdown: CatComparison[],
    savingsRate: number | null,
  ): Array<{ type: 'success' | 'warning' | 'danger' | 'tip'; title: string; description: string }> {
    const suggestions: Array<{
      type: 'success' | 'warning' | 'danger' | 'tip';
      title: string;
      description: string;
    }> = [];

    if (current.expenseCount === 0) {
      suggestions.push({
        type: 'tip',
        title: 'No expenses recorded',
        description: 'Add your expense transactions to get personalised insights.',
      });
      return suggestions;
    }

    if (!current.income.isZero() && current.expense.gt(current.income)) {
      suggestions.push({
        type: 'danger',
        title: 'Spending exceeds income',
        description: `You spent ${current.expense.minus(current.income).toFixed(2)} more than you earned this month. Review your largest expenses.`,
      });
    } else if (savingsRate !== null && savingsRate < 10 && savingsRate >= 0) {
      suggestions.push({
        type: 'warning',
        title: 'Low savings rate',
        description: `You saved only ${savingsRate.toFixed(0)}% of your income this month. Aim for at least 20%.`,
      });
    } else if (savingsRate !== null && savingsRate >= 20) {
      suggestions.push({
        type: 'success',
        title: 'Great savings rate!',
        description: `You saved ${savingsRate.toFixed(0)}% of your income this month. Keep up the habit.`,
      });
    }

    const expenseChange = current.expense.minus(previous.expense);
    if (!previous.expense.isZero()) {
      const pct = expenseChange.div(previous.expense).mul(100).toDecimalPlaces(1).toNumber();
      if (pct >= 20) {
        suggestions.push({
          type: 'warning',
          title: `Expenses up ${pct.toFixed(0)}% vs last month`,
          description: `Your total expenses rose by ${expenseChange.toFixed(2)} compared to last month. Check which categories spiked.`,
        });
      } else if (pct <= -10) {
        suggestions.push({
          type: 'success',
          title: `Expenses down ${Math.abs(pct).toFixed(0)}% vs last month`,
          description: `You reduced spending by ${Math.abs(expenseChange.toNumber()).toFixed(2)} this month. Great work!`,
        });
      }
    }

    if (breakdown.length > 0 && breakdown[0].percentage >= 40) {
      suggestions.push({
        type: 'tip',
        title: `High concentration in ${breakdown[0].name}`,
        description: `${breakdown[0].name} accounts for ${breakdown[0].percentage.toFixed(0)}% of your expenses. Consider whether this aligns with your goals.`,
      });
    }

    const spikes = breakdown.filter(
      (c) => c.changePercent !== null && c.changePercent >= 30,
    );
    if (spikes.length > 0) {
      const top = spikes[0];
      suggestions.push({
        type: 'warning',
        title: `${top.name} spending spiked`,
        description: `Your ${top.name} expenses increased by ${top.changePercent!.toFixed(0)}% compared to last month (${top.previousAmount} → ${top.amount}).`,
      });
    }

    const reductions = breakdown.filter(
      (c) =>
        c.changePercent !== null &&
        c.changePercent <= -20 &&
        parseFloat(c.previousAmount) > 0,
    );
    if (reductions.length > 0) {
      const top = reductions[0];
      suggestions.push({
        type: 'success',
        title: `${top.name} spending reduced`,
        description: `You reduced ${top.name} expenses by ${Math.abs(top.changePercent!).toFixed(0)}% vs last month. Nice saving!`,
      });
    }

    return suggestions.slice(0, 4);
  }
}
