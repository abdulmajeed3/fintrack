import { PrismaClient, TransactionType, Currency } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  // Income categories
  { name: 'Salary', type: TransactionType.INCOME, color: '#10b981', icon: 'briefcase' },
  { name: 'Freelance', type: TransactionType.INCOME, color: '#3b82f6', icon: 'laptop' },
  { name: 'Business', type: TransactionType.INCOME, color: '#8b5cf6', icon: 'building' },
  { name: 'Other Income', type: TransactionType.INCOME, color: '#6b7280', icon: 'plus-circle' },
  // Expense categories
  { name: 'Food', type: TransactionType.EXPENSE, color: '#f59e0b', icon: 'utensils' },
  { name: 'Transport', type: TransactionType.EXPENSE, color: '#ef4444', icon: 'car' },
  { name: 'Housing', type: TransactionType.EXPENSE, color: '#ec4899', icon: 'home' },
  { name: 'Shopping', type: TransactionType.EXPENSE, color: '#f97316', icon: 'shopping-bag' },
  { name: 'Health', type: TransactionType.EXPENSE, color: '#14b8a6', icon: 'heart' },
  { name: 'Utilities', type: TransactionType.EXPENSE, color: '#6366f1', icon: 'zap' },
  { name: 'Entertainment', type: TransactionType.EXPENSE, color: '#a855f7', icon: 'film' },
  { name: 'Other Expense', type: TransactionType.EXPENSE, color: '#9ca3af', icon: 'more-horizontal' },
];

async function createDefaultCategories(userId: string) {
  const categories = await Promise.all(
    DEFAULT_CATEGORIES.map((cat) =>
      prisma.category.create({
        data: {
          userId,
          name: cat.name,
          type: cat.type,
          color: cat.color,
          icon: cat.icon,
          isDefault: true,
        },
      }),
    ),
  );
  return categories;
}

async function main() {
  console.log('Seeding database...');

  // Create demo user
  const passwordHash = await argon2.hash('Demo@123456');
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@fintrack.dev' },
    update: {},
    create: {
      email: 'demo@fintrack.dev',
      name: 'Demo User',
      passwordHash,
      currency: Currency.USD,
    },
  });
  console.log('Created demo user:', demoUser.email);

  // Check if categories already exist
  const existingCategories = await prisma.category.findMany({ where: { userId: demoUser.id } });
  let categories = existingCategories;
  if (existingCategories.length === 0) {
    categories = await createDefaultCategories(demoUser.id);
    console.log(`Created ${categories.length} default categories`);
  }

  const catMap = Object.fromEntries(categories.map((c) => [c.name, c]));

  // Seed some demo transactions for the past 3 months
  const now = new Date();
  const transactions = [
    // Current month income
    { type: TransactionType.INCOME, amount: '5500.00', description: 'Monthly Salary', categoryName: 'Salary', daysAgo: 1 },
    { type: TransactionType.INCOME, amount: '850.00', description: 'Freelance project', categoryName: 'Freelance', daysAgo: 5 },
    // Current month expenses
    { type: TransactionType.EXPENSE, amount: '1200.00', description: 'Rent payment', categoryName: 'Housing', daysAgo: 2 },
    { type: TransactionType.EXPENSE, amount: '320.50', description: 'Grocery shopping', categoryName: 'Food', daysAgo: 3 },
    { type: TransactionType.EXPENSE, amount: '45.00', description: 'Uber rides', categoryName: 'Transport', daysAgo: 4 },
    { type: TransactionType.EXPENSE, amount: '89.99', description: 'Netflix + Spotify', categoryName: 'Entertainment', daysAgo: 6 },
    { type: TransactionType.EXPENSE, amount: '150.00', description: 'Electricity bill', categoryName: 'Utilities', daysAgo: 7 },
    { type: TransactionType.EXPENSE, amount: '220.00', description: 'Clothing purchase', categoryName: 'Shopping', daysAgo: 8 },
    // Last month
    { type: TransactionType.INCOME, amount: '5500.00', description: 'Monthly Salary', categoryName: 'Salary', daysAgo: 35 },
    { type: TransactionType.EXPENSE, amount: '1200.00', description: 'Rent payment', categoryName: 'Housing', daysAgo: 33 },
    { type: TransactionType.EXPENSE, amount: '280.75', description: 'Grocery shopping', categoryName: 'Food', daysAgo: 36 },
    { type: TransactionType.EXPENSE, amount: '130.00', description: 'Doctor visit', categoryName: 'Health', daysAgo: 40 },
    { type: TransactionType.EXPENSE, amount: '60.00', description: 'Gas', categoryName: 'Transport', daysAgo: 42 },
    // Two months ago
    { type: TransactionType.INCOME, amount: '5500.00', description: 'Monthly Salary', categoryName: 'Salary', daysAgo: 65 },
    { type: TransactionType.INCOME, amount: '500.00', description: 'Side project', categoryName: 'Freelance', daysAgo: 68 },
    { type: TransactionType.EXPENSE, amount: '1200.00', description: 'Rent payment', categoryName: 'Housing', daysAgo: 63 },
    { type: TransactionType.EXPENSE, amount: '310.00', description: 'Grocery shopping', categoryName: 'Food', daysAgo: 66 },
    { type: TransactionType.EXPENSE, amount: '195.00', description: 'New shoes', categoryName: 'Shopping', daysAgo: 70 },
  ];

  let txCount = 0;
  for (const tx of transactions) {
    const cat = catMap[tx.categoryName];
    if (!cat) continue;
    const txDate = new Date(now);
    txDate.setDate(txDate.getDate() - tx.daysAgo);
    const existingTx = await prisma.transaction.findFirst({
      where: { userId: demoUser.id, description: tx.description, amount: tx.amount },
    });
    if (!existingTx) {
      await prisma.transaction.create({
        data: {
          userId: demoUser.id,
          categoryId: cat.id,
          type: tx.type,
          amount: tx.amount,
          description: tx.description,
          transactionDate: txDate,
        },
      });
      txCount++;
    }
  }
  console.log(`Created ${txCount} demo transactions`);

  // Seed budgets for current month
  const expenseCategories = categories.filter((c) => c.type === TransactionType.EXPENSE);
  const budgetAmounts: Record<string, string> = {
    Food: '400.00',
    Transport: '150.00',
    Housing: '1200.00',
    Shopping: '300.00',
    Health: '200.00',
    Utilities: '200.00',
    Entertainment: '100.00',
    'Other Expense': '100.00',
  };

  let budgetCount = 0;
  for (const cat of expenseCategories) {
    const budgetAmount = budgetAmounts[cat.name];
    if (!budgetAmount) continue;
    const existing = await prisma.budget.findFirst({
      where: { userId: demoUser.id, categoryId: cat.id, month: now.getMonth() + 1, year: now.getFullYear() },
    });
    if (!existing) {
      await prisma.budget.create({
        data: {
          userId: demoUser.id,
          categoryId: cat.id,
          amount: budgetAmount,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        },
      });
      budgetCount++;
    }
  }
  console.log(`Created ${budgetCount} demo budgets`);

  console.log('\nSeed complete!');
  console.log('Demo credentials:');
  console.log('  Email: demo@fintrack.dev');
  console.log('  Password: Demo@123456');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
