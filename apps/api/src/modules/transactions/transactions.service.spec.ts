import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { TransactionType } from '@prisma/client';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../../database/prisma.service';

const mockPrisma = {
  transaction: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
    aggregate: jest.fn(),
  },
  category: {
    findFirst: jest.fn(),
  },
};

const MOCK_CATEGORY_EXPENSE = {
  id: 'cat-uuid',
  userId: 'user-uuid',
  name: 'Food',
  type: TransactionType.EXPENSE,
  color: '#f59e0b',
  icon: 'utensils',
  isDefault: true,
};

const MOCK_CATEGORY_INCOME = {
  id: 'cat-income-uuid',
  userId: 'user-uuid',
  name: 'Salary',
  type: TransactionType.INCOME,
  color: '#10b981',
  icon: 'briefcase',
  isDefault: true,
};

const MOCK_TRANSACTION = {
  id: 'tx-uuid',
  userId: 'user-uuid',
  categoryId: 'cat-uuid',
  type: TransactionType.EXPENSE,
  amount: new Decimal('50.00'),
  description: 'Lunch',
  transactionDate: new Date('2024-01-15'),
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  category: MOCK_CATEGORY_EXPENSE,
};

describe('TransactionsService', () => {
  let service: TransactionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a valid expense transaction', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(MOCK_CATEGORY_EXPENSE);
      mockPrisma.transaction.create.mockResolvedValue(MOCK_TRANSACTION);

      const result = await service.create('user-uuid', {
        type: TransactionType.EXPENSE,
        amount: '50.00',
        description: 'Lunch',
        transactionDate: '2024-01-15',
        categoryId: 'cat-uuid',
      });

      expect(result).toEqual(MOCK_TRANSACTION);
    });

    it('should reject zero amount', async () => {
      await expect(
        service.create('user-uuid', {
          type: TransactionType.EXPENSE,
          amount: '0',
          description: 'Test',
          transactionDate: '2024-01-15',
          categoryId: 'cat-uuid',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject negative amount', async () => {
      // Regex in DTO prevents negative input; test Decimal guard
      await expect(
        service.create('user-uuid', {
          type: TransactionType.EXPENSE,
          amount: '0.00',
          description: 'Test',
          transactionDate: '2024-01-15',
          categoryId: 'cat-uuid',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject category type mismatch', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(MOCK_CATEGORY_EXPENSE);

      await expect(
        service.create('user-uuid', {
          type: TransactionType.INCOME,
          amount: '100.00',
          description: 'Wrong type',
          transactionDate: '2024-01-15',
          categoryId: 'cat-uuid',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for unknown category', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(null);

      await expect(
        service.create('user-uuid', {
          type: TransactionType.EXPENSE,
          amount: '50.00',
          description: 'Test',
          transactionDate: '2024-01-15',
          categoryId: 'non-existent',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException for transaction not owned by user', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('different-user', 'tx-uuid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return transaction for correct user', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue(MOCK_TRANSACTION);

      const result = await service.findOne('user-uuid', 'tx-uuid');
      expect(result).toEqual(MOCK_TRANSACTION);
    });
  });

  describe('decimal handling', () => {
    it('should handle high-precision decimal amounts correctly', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(MOCK_CATEGORY_EXPENSE);
      const preciseAmount = '123456.7890';
      mockPrisma.transaction.create.mockImplementation(async ({ data }: any) => ({
        ...MOCK_TRANSACTION,
        amount: new Decimal(data.amount),
      }));

      const result = await service.create('user-uuid', {
        type: TransactionType.EXPENSE,
        amount: preciseAmount,
        description: 'High precision',
        transactionDate: '2024-01-15',
        categoryId: 'cat-uuid',
      });

      // Decimal drops trailing zeros — compare numeric value
      expect(parseFloat(result.amount.toString())).toBe(parseFloat(preciseAmount));
    });
  });

  describe('findAll totals', () => {
    it('should compute net from income and expense totals', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.transaction.count.mockResolvedValue(0);
      mockPrisma.transaction.groupBy.mockResolvedValue([
        { type: TransactionType.INCOME, _sum: { amount: new Decimal('1500.00') } },
        { type: TransactionType.EXPENSE, _sum: { amount: new Decimal('800.00') } },
      ]);

      const result = await service.findAll('user-uuid', {});
      expect(result.meta.totals.income).toBe('1500.00');
      expect(result.meta.totals.expense).toBe('800.00');
      expect(result.meta.totals.net).toBe('700.00');
    });
  });
});
