import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { insightsService } from '@/services/insights.service';
import { useAuth } from '@/app/auth-context';
import { formatCurrency, formatMonthYear, cn } from '@/lib/utils';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import type { InsightsSuggestion } from '@/types';

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#f97316'];

function SuggestionCard({ s }: { s: InsightsSuggestion }) {
  const config = {
    success: {
      bg: 'bg-green-50 border-green-200',
      text: 'text-green-700',
      title: 'text-green-800',
      Icon: CheckCircle,
      iconColor: 'text-green-500',
    },
    warning: {
      bg: 'bg-yellow-50 border-yellow-200',
      text: 'text-yellow-700',
      title: 'text-yellow-800',
      Icon: AlertTriangle,
      iconColor: 'text-yellow-500',
    },
    danger: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-700',
      title: 'text-red-800',
      Icon: AlertCircle,
      iconColor: 'text-red-500',
    },
    tip: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-700',
      title: 'text-blue-800',
      Icon: Info,
      iconColor: 'text-blue-500',
    },
  }[s.type];

  return (
    <div className={cn('rounded-lg border p-4 flex gap-3', config.bg)}>
      <config.Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', config.iconColor)} />
      <div>
        <p className={cn('text-sm font-semibold', config.title)}>{s.title}</p>
        <p className={cn('text-sm mt-0.5', config.text)}>{s.description}</p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && (
        <div className="flex items-center gap-1 mt-1">
          {trend === 'up' && <TrendingUp className="h-3.5 w-3.5 text-red-500" />}
          {trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-green-500" />}
          {trend === 'neutral' && <Minus className="h-3.5 w-3.5 text-gray-400" />}
          <span
            className={cn(
              'text-xs font-medium',
              trend === 'up' ? 'text-red-600' : trend === 'down' ? 'text-green-600' : 'text-gray-500',
            )}
          >
            {sub}
          </span>
        </div>
      )}
    </div>
  );
}

export function InsightsPage() {
  const { user } = useAuth();
  const currency = user?.currency ?? 'USD';
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ['insights', month, year],
    queryFn: () => insightsService.getMonthly(month, year),
  });

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  // Horizontal bar chart data (top 7 categories, current vs previous)
  const chartData = (data?.categoryBreakdown ?? []).slice(0, 7).map((c) => ({
    name: c.name.length > 14 ? c.name.slice(0, 12) + '…' : c.name,
    'This Month': parseFloat(c.amount),
    'Last Month': parseFloat(c.previousAmount),
  }));

  // Pie chart data
  const pieData = (data?.categoryBreakdown ?? []).slice(0, 7).map((c, i) => ({
    name: c.name,
    value: parseFloat(c.amount),
    color: c.color ?? CHART_COLORS[i % CHART_COLORS.length],
  }));

  // Stat card values
  const currentExpense = data?.currentMonth.expense ?? '0';
  const previousExpense = data?.previousMonth.expense ?? '0';
  const changePercent = data?.comparison.expenseChangePercent;
  const savingsRate = data?.comparison.savingsRate;

  const changeTrend =
    changePercent === null || changePercent === undefined
      ? 'neutral'
      : changePercent > 0
      ? 'up'
      : changePercent < 0
      ? 'down'
      : 'neutral';

  const savingsTrend =
    savingsRate === null || savingsRate === undefined
      ? 'neutral'
      : savingsRate >= 20
      ? 'down'
      : savingsRate < 10
      ? 'up'
      : 'neutral';

  const hasData = (data?.currentMonth.expenseCount ?? 0) > 0;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-primary-600" />
            Smart Expense Insights
          </h1>
          <p className="text-sm text-gray-500">Spending analysis, trends and saving suggestions</p>
        </div>

        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
          <button onClick={prevMonth} className="text-gray-500 hover:text-gray-800" aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium w-36 text-center">{formatMonthYear(month, year)}</span>
          <button onClick={nextMonth} className="text-gray-500 hover:text-gray-800" aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stat cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="This Month Expenses"
            value={formatCurrency(currentExpense, currency)}
          />
          <StatCard
            label="Previous Month"
            value={formatCurrency(previousExpense, currency)}
          />
          <StatCard
            label="Month-over-Month"
            value={
              changePercent === null || changePercent === undefined
                ? '—'
                : `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%`
            }
            sub={
              changePercent !== null && changePercent !== undefined
                ? changePercent > 0
                  ? 'Spending increased'
                  : changePercent < 0
                  ? 'Spending decreased'
                  : 'No change'
                : undefined
            }
            trend={changeTrend}
          />
          <StatCard
            label="Savings Rate"
            value={savingsRate === null || savingsRate === undefined ? '—' : `${savingsRate.toFixed(1)}%`}
            sub={
              savingsRate !== null && savingsRate !== undefined
                ? savingsRate >= 20
                  ? 'On track'
                  : savingsRate < 10
                  ? 'Below target'
                  : 'Moderate'
                : undefined
            }
            trend={savingsTrend}
          />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !hasData && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Lightbulb className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No expense data for {formatMonthYear(month, year)}</p>
          <p className="text-gray-400 text-sm mt-1">Add expense transactions to see your insights.</p>
        </div>
      )}

      {/* Charts */}
      {!isLoading && hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Horizontal bar chart: current vs previous */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Category Comparison</h2>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 44)}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => formatCurrency(String(v), currency)}
                  />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [formatCurrency(String(value), currency), name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="This Month" fill="#6366f1" radius={[0, 3, 3, 0]} />
                  <Bar dataKey="Last Month" fill="#e5e7eb" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">No category data</p>
            )}
          </div>

          {/* Pie chart: expense breakdown */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Expense Breakdown</h2>
            {pieData.length > 0 ? (
              <div className="flex flex-col gap-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(String(value), currency), 'Amount']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1">
                  {(data?.categoryBreakdown ?? []).slice(0, 7).map((c, i) => (
                    <div key={c.categoryId} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: c.color ?? CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                        <span className="text-gray-700 truncate max-w-[140px]">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-gray-500">{c.percentage.toFixed(1)}%</span>
                        <span className="font-medium text-gray-900 w-20 text-right">
                          {formatCurrency(c.amount, currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">No data</p>
            )}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {!isLoading && hasData && (data?.suggestions ?? []).length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary-600" />
            Saving Suggestions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(data?.suggestions ?? []).map((s, i) => (
              <SuggestionCard key={i} s={s} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
