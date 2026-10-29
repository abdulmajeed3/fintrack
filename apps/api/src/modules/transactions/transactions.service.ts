import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../database/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { ListTransactionsDto } from './dto/list-transactions.dto';
import { buildPaginationMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, query: ListTransactionsDto) {
    const {
      page = 1,
      limit = 20,
      type,
      categoryId,
      dateFrom,
      dateTo,
      search,
      sortBy = 'date',
      sortOrder = 'desc',
    } = query;

    const where: Record<string, unknown> = { userId };
    if (type) where['type'] = type;
    if (categoryId) {
      // Validate category belongs to user
      const cat = await this.prisma.category.findFirst({ where: { id: categoryId, userId } });
      if (!cat) throw new BadRequestException('Invalid category');
      where['categoryId'] = categoryId;
    }
    if (dateFrom || dateTo) {
      where['transactionDate'] = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      };
    }
    if (search) {
      where['description'] = { contains: search, mode: 'insensitive' };
    }

    const orderBy =
      sortBy === 'amount'
        ? { amount: sortOrder }
        : { transactionDate: sortOrder };

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: { category: { select: { id: true, name: true, color: true, icon: true, type: true } } },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    // Calculate totals for the filtered period using decimal arithmetic via DB
    const totalsAgg = await this.prisma.transaction.groupBy({
      by: ['type'],
      where,
      _sum: { amount: true },
    });

    const totals = { income: '0.00', expense: '0.00', net: '0.00' };
    for (const row of totalsAgg) {
      const sum = (row._sum.amount ?? new Decimal(0)).toFixed(2);
      if (row.type === 'INCOME') totals.income = sum;
      else totals.expense = sum;
    }
    totals.net = new Decimal(totals.income).minus(new Decimal(totals.expense)).toFixed(2);

    return {
      data: transactions,
      meta: { ...buildPaginationMeta(page, limit, total), totals },
    };
  }

  async findOne(userId: string, id: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, userId },
      include: { category: true },
    });
    if (!transaction) throw new NotFoundException('Transaction not found');
    return transaction;
  }

  async create(userId: string, dto: CreateTransactionDto) {
    // Validate amount is positive
    const amount = new Decimal(dto.amount);
    if (amount.lte(0)) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    // Validate category ownership and type match
    const category = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, userId },
    });
    if (!category) throw new NotFoundException('Category not found');
    if (category.type !== dto.type) {
      throw new BadRequestException(
        `Category type "${category.type}" does not match transaction type "${dto.type}"`,
      );
    }

    return this.prisma.transaction.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        transactionDate: new Date(dto.transactionDate),
        notes: dto.notes,
      },
      include: { category: true },
    });
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    const transaction = await this.findOne(userId, id);

    if (dto.amount !== undefined) {
      const amount = new Decimal(dto.amount);
      if (amount.lte(0)) throw new BadRequestException('Amount must be greater than zero');
    }

    const newType = dto.type ?? transaction.type;
    const newCategoryId = dto.categoryId ?? transaction.categoryId;

    if (dto.categoryId || dto.type) {
      const category = await this.prisma.category.findFirst({
        where: { id: newCategoryId, userId },
      });
      if (!category) throw new NotFoundException('Category not found');
      if (category.type !== newType) {
        throw new BadRequestException(
          `Category type "${category.type}" does not match transaction type "${newType}"`,
        );
      }
    }

    return this.prisma.transaction.update({
      where: { id },
      data: {
        ...(dto.type && { type: dto.type }),
        ...(dto.amount && { amount: dto.amount }),
        ...(dto.description && { description: dto.description }),
        ...(dto.transactionDate && { transactionDate: new Date(dto.transactionDate) }),
        ...(dto.categoryId && { categoryId: dto.categoryId }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: { category: true },
    });
  }

  async delete(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.transaction.delete({ where: { id } });
    return { message: 'Transaction deleted successfully' };
  }
}
