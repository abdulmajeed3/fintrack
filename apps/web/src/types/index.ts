export type TransactionType = 'INCOME' | 'EXPENSE';
export type Currency = 'USD' | 'CAD' | 'GBP' | 'PKR' | 'EUR';

export interface User {
  id: string;
  email: string;
  name: string;
  currency: Currency;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: TransactionType;
  color: string | null;
  icon: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  categoryId: string;
  type: TransactionType;
  amount: string;
  description: string;
  transactionDate: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  category: Pick<Category, 'id' | 'name' | 'color' | 'icon' | 'type'>;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  amount: string;
  month: number;
  year: number;
  createdAt: string;
  updatedAt: string;
  category: Pick<Category, 'id' | 'name' | 'color' | 'icon' | 'type'>;
  spent?: string;
  remaining?: string;
  percentage?: number;
  isOverBudget?: boolean;
  isNearLimit?: boolean;
  isAlert?: boolean;
  isWarning?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  totals?: {
    income: string;
    expense: string;
    net: string;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  requestId?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}

export interface DashboardSummary {
  summary: {
    monthlyIncome: string;
    monthlyExpense: string;
    monthlyNet: string;
    overallBalance: string;
    month: number;
    year: number;
  };
  recentTransactions: Transaction[];
  expenseBreakdown: Array<{
    category: Pick<Category, 'id' | 'name' | 'color' | 'icon'>;
    amount: string;
    percentage: number;
  }>;
  monthlyTrend: Array<{
    month: number;
    year: number;
    income: string;
    expense: string;
    net: string;
  }>;
  budgetProgress: Budget[];
}

export interface MonthlyReport {
  month: number;
  year: number;
  income: string;
  expense: string;
  net: string;
  transactionCount: number;
}

export interface InsightsCategoryItem {
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

export interface InsightsSuggestion {
  type: 'success' | 'warning' | 'danger' | 'tip';
  title: string;
  description: string;
}

export interface MonthlyInsights {
  currentMonth: { month: number; year: number; income: string; expense: string; net: string; expenseCount: number };
  previousMonth: { month: number; year: number; income: string; expense: string; net: string; expenseCount: number };
  comparison: { expenseChange: string; expenseChangePercent: number | null; savingsRate: number | null };
  categoryBreakdown: InsightsCategoryItem[];
  topCategory: InsightsCategoryItem | null;
  suggestions: InsightsSuggestion[];
}

export interface TransactionFilters {
  type?: TransactionType;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: 'date' | 'amount';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
