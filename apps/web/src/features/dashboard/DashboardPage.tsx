import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Wallet, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import { dashboardService } from '@/services/dashboard.service';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { CardSkeleton, TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { TransactionBadge } from '@/components/ui/Badge';
import { useAuth } from '@/app/auth-context';
import { formatCurrency, formatDate, formatMonthYear } from '@/lib/utils';
import type { Budget } from '@/types';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function SummaryCard({
  title,
  amount,
  currency,
  icon: Icon,
  colorClass,
  subtext,
}: {
  title: string;
  amount: string;
  currency: string;
  icon: React.ElementType;
  colorClass: string;
  subtext?: string;
}) {
  const num = parseFloat(amount);
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${num < 0 ? 'text-red-600' : colorClass}`}>
            {formatCurrency(amount, currency)}
          </p>
          {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
        </div>
        <div className={`p-2 rounded-lg ${colorClass === 'text-green-600' ? 'bg-green-50' : colorClass === 'text-red-600' ? 'bg-red-50' : 'bg-blue-50'}`}>
          <Icon className={`h-5 w-5 ${colorClass}`} />
        </div>
      </div>
    </Card>
  );
}

function BudgetProgressBar({ budget, currency }: { budget: Budget; currency: string }) {
  const pct = budget.percentage ?? 0;
  const isOver = budget.isOverBudget;
  const isNear = budget.isNearLimit;

  const barColor = isOver ? 'bg-red-500' : isNear ? 'bg-yellow-500' : 'bg-primary-500';
  const textColor = isOver ? 'text-red-600' : isNear ? 'text-yellow-600' : 'text-gray-700';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: budget.category.color ?? '#6b7280' }}
          />
          <span className="font-medium text-gray-800 truncate">{budget.category.name}</span>
        </div>
        <span className={`text-xs font-medium ${textColor}`}>
          {formatCurrency(budget.spent ?? '0', currency)} / {formatCurrency(budget.amount, currency)}
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className={`${barColor} h-2 rounded-full transition-all`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      {isOver && (
        <p className="text-xs text-red-600">Over budget by {formatCurrency(Math.abs(parseFloat(budget.remaining ?? '0')).toString(), currency)}</p>
      )}
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const currency = user?.currency ?? 'USD';

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', month, year],
    queryFn: () => dashboardService.getSummary(month, year),
  });

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const trendChartData = data?.monthlyTrend.map((d) => ({
    name: MONTH_NAMES[d.month - 1],
    income: parseFloat(d.income),
    expense: parseFloat(d.expense),
  }));

  const pieData = data?.expenseBreakdown.map((b) => ({
    name: b.category.name,
    value: parseFloat(b.amount),
    color: b.category.color ?? '#6b7280',
  }));

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Failed to load dashboard. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Track your financial overview</p>
        </div>

        {/* Month selector */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
          <button
            onClick={prevMonth}
            className="text-gray-500 hover:text-gray-800 p-0.5 rounded"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-gray-800 w-36 text-center">
            {formatMonthYear(month, year)}
          </span>
          <button
            onClick={nextMonth}
            className="text-gray-500 hover:text-gray-800 p-0.5 rounded"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Monthly Income"
            amount={data?.summary.monthlyIncome ?? '0'}
            currency={currency}
            icon={TrendingUp}
            colorClass="text-green-600"
            subtext="This month"
          />
          <SummaryCard
            title="Monthly Expenses"
            amount={data?.summary.monthlyExpense ?? '0'}
            currency={currency}
            icon={TrendingDown}
            colorClass="text-red-600"
            subtext="This month"
          />
          <SummaryCard
            title="Net Balance"
            amount={data?.summary.monthlyNet ?? '0'}
            currency={currency}
            icon={DollarSign}
            colorClass={parseFloat(data?.summary.monthlyNet ?? '0') >= 0 ? 'text-green-600' : 'text-red-600'}
            subtext="Income − Expenses"
          />
          <SummaryCard
            title="Overall Balance"
            amount={data?.summary.overallBalance ?? '0'}
            currency={currency}
            icon={Wallet}
            colorClass={parseFloat(data?.summary.overallBalance ?? '0') >= 0 ? 'text-primary-600' : 'text-red-600'}
            subtext="All time"
          />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income vs Expense chart */}
        <Card className="lg:col-span-2 p-4">
          <CardHeader>
            <CardTitle>Monthly Trend</CardTitle>
            <span className="text-xs text-gray-500">Last 6 months</span>
          </CardHeader>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="animate-pulse bg-gray-200 w-full h-full rounded" />
            </div>
          ) : trendChartData && trendChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trendChartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value.toString(), currency)}
                  contentStyle={{ fontSize: 12, borderRadius: 6 }}
                />
                <Bar dataKey="income" fill="#16a34a" radius={[3, 3, 0, 0]} name="Income" />
                <Bar dataKey="expense" fill="#dc2626" radius={[3, 3, 0, 0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">
              No transaction data for this period
            </div>
          )}
        </Card>

        {/* Expense breakdown pie chart */}
        <Card className="p-4">
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
          </CardHeader>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="animate-pulse bg-gray-200 w-full h-full rounded" />
            </div>
          ) : pieData && pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value.toString(), currency)}
                  contentStyle={{ fontSize: 12, borderRadius: 6 }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span className="text-xs">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">
              No expense data for this month
            </div>
          )}
        </Card>
      </div>

      {/* Bottom row: Recent transactions + Budget progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent transactions */}
        <Card padding={false}>
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-900">Recent Transactions</h3>
          </div>
          {isLoading ? (
            <div className="p-4"><TableSkeleton rows={5} /></div>
          ) : data?.recentTransactions.length ? (
            <div className="divide-y divide-gray-50">
              {data.recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                  <div
                    className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tx.category.color ? `${tx.category.color}20` : '#f3f4f6' }}
                  >
                    <span className="text-sm">
                      {tx.type === 'INCOME' ? '↑' : '↓'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{tx.description}</p>
                    <p className="text-xs text-gray-500">{tx.category.name} · {formatDate(tx.transactionDate)}</p>
                  </div>
                  <span className={`text-sm font-semibold flex-shrink-0 ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-400">No transactions yet</p>
            </div>
          )}
        </Card>

        {/* Budget progress */}
        <Card padding={false}>
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-900">Budget Progress</h3>
            <p className="text-xs text-gray-500 mt-0.5">{formatMonthYear(month, year)}</p>
          </div>
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-1">
                  <div className="animate-pulse bg-gray-200 h-4 w-1/2 rounded" />
                  <div className="animate-pulse bg-gray-200 h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          ) : data?.budgetProgress.length ? (
            <div className="p-4 space-y-4">
              {data.budgetProgress.slice(0, 6).map((budget) => (
                <BudgetProgressBar key={budget.id} budget={budget} currency={currency} />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-400">No budgets set for this month</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
