import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, month: number, year: number) {
    const budgets = await this.prisma.budget.findMany({
      where: { userId, month, year },
      include: { category: true },
      orderBy: { category: { name: 'asc' } },
    });

    // Calculate spending for each budget from actual transactions
    const enriched = await Promise.all(
      budgets.map(async (budget) => {
        const spent = await this.getSpentAmount(userId, budget.categoryId, month, year);
        const spentDecimal = new Decimal(spent);
        const budgetDecimal = budget.amount;
        const remaining = budgetDecimal.minus(spentDecimal);
        const percentage = budgetDecimal.isZero()
          ? 0
          : spentDecimal.div(budgetDecimal).mul(100).toDecimalPlaces(1).toNumber();

        return {
          ...budget,
          spent: spentDecimal.toFixed(2),
          remaining: remaining.toFixed(2),
          percentage,
          isOverBudget: spentDecimal.gt(budgetDecimal),
          isNearLimit: percentage >= 80 && !spentDecimal.gt(budgetDecimal),
        };
      }),
    );

    return enriched;
  }

  async findOne(userId: string, budgetId: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id: budgetId, userId },
      include: { category: true },
    });
    if (!budget) throw new NotFoundException('Budget not found');
    return budget;
  }

  async create(userId: string, dto: CreateBudgetDto) {
    const amount = new Decimal(dto.amount);
    if (amount.lte(0)) throw new BadRequestException('Budget amount must be positive');

    // Validate category belongs to user and is an expense category
    const category = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, userId },
    });
    if (!category) throw new NotFoundException('Category not found');
    if (category.type !== TransactionType.EXPENSE) {
      throw new BadRequestException('Budgets can only be created for expense categories');
    }

    // Enforce one budget per user/category/month/year
    const existing = await this.prisma.budget.findFirst({
      where: { userId, categoryId: dto.categoryId, month: dto.month, year: dto.year },
    });
    if (existing) {
      throw new ConflictException(
        `A budget for "${category.name}" in ${dto.year}-${String(dto.month).padStart(2, '0')} already exists`,
      );
    }

    return this.prisma.budget.create({
      data: { userId, ...dto },
      include: { category: true },
    });
  }

  async update(userId: string, budgetId: string, dto: UpdateBudgetDto) {
    await this.findOne(userId, budgetId);

    if (dto.amount !== undefined) {
      const amount = new Decimal(dto.amount);
      if (amount.lte(0)) throw new BadRequestException('Budget amount must be positive');
    }

    return this.prisma.budget.update({
      where: { id: budgetId },
      data: { ...(dto.amount && { amount: dto.amount }) },
      include: { category: true },
    });
  }

  async delete(userId: string, budgetId: string) {
    await this.findOne(userId, budgetId);
    await this.prisma.budget.delete({ where: { id: budgetId } });
    return { message: 'Budget deleted successfully' };
  }

  async getSpentAmount(userId: string, categoryId: string, month: number, year: number): Promise<string> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // last day of month

    const result = await this.prisma.transaction.aggregate({
      where: {
        userId,
        categoryId,
        type: TransactionType.EXPENSE,
        transactionDate: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    return (result._sum.amount ?? new Decimal(0)).toFixed(2);
  }
}
