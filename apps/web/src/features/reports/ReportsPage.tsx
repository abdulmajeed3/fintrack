import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Download } from 'lucide-react';
import { reportsService } from '@/services/reports.service';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/app/auth-context';
import { formatCurrency, getMonthDateRange, MONTH_NAMES } from '@/lib/utils';
import type { TransactionType } from '@/types';

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function ReportsPage() {
  const { user } = useAuth();
  const currency = user?.currency ?? 'USD';
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [breakdownType, setBreakdownType] = useState<TransactionType>('EXPENSE');

  const { dateFrom, dateTo } = getMonthDateRange(1, year);
  const yearEnd = `${year}-12-31`;

  const { data: monthly, isLoading: loadingMonthly } = useQuery({
    queryKey: ['reports', 'monthly', year],
    queryFn: () => reportsService.getMonthlySummary(year),
  });

  const { data: breakdown, isLoading: loadingBreakdown } = useQuery({
    queryKey: ['reports', 'breakdown', year, breakdownType],
    queryFn: () => reportsService.getCategoryBreakdown(dateFrom, yearEnd, breakdownType),
  });

  const yearOptions = Array.from({ length: 5 }, (_, i) => ({
    value: String(now.getFullYear() - i),
    label: String(now.getFullYear() - i),
  }));

  const trendData = monthly?.map((m) => ({
    name: MONTH_ABBR[m.month - 1],
    income: parseFloat(m.income),
    expense: parseFloat(m.expense),
  }));

  const pieData = (breakdown as any)?.items?.map((item: any) => ({
    name: item.category.name,
    value: parseFloat(item.amount),
    color: item.category.color ?? '#6b7280',
  }));

  const totalIncome = monthly?.reduce((s, m) => s + parseFloat(m.income), 0) ?? 0;
  const totalExpense = monthly?.reduce((s, m) => s + parseFloat(m.expense), 0) ?? 0;

  const csvUrl = reportsService.getCsvExportUrl(`${year}-01-01`, yearEnd);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500">Analyse your financial activity</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            options={yearOptions}
            value={String(year)}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
          />
          <a href={csvUrl} download>
            <Button variant="secondary" size="sm">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </a>
        </div>
      </div>

      {/* Annual summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-gray-500">Total Income {year}</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalIncome.toString(), currency)}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Total Expenses {year}</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalExpense.toString(), currency)}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Net {year}</p>
          <p className={`text-2xl font-bold mt-1 ${totalIncome - totalExpense >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {formatCurrency((totalIncome - totalExpense).toString(), currency)}
          </p>
        </Card>
      </div>

      {/* Monthly trend */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Income vs Expenses {year}</CardTitle>
        </CardHeader>
        {loadingMonthly ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse bg-gray-200 w-full h-full rounded" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={trendData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v: number) => formatCurrency(v.toString(), currency)}
                contentStyle={{ fontSize: 12, borderRadius: 6 }}
              />
              <Bar dataKey="income" fill="#16a34a" radius={[3, 3, 0, 0]} name="Income" />
              <Bar dataKey="expense" fill="#dc2626" radius={[3, 3, 0, 0]} name="Expenses" />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Category breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown {year}</CardTitle>
          <Select
            options={[
              { value: 'EXPENSE', label: 'Expenses' },
              { value: 'INCOME', label: 'Income' },
            ]}
            value={breakdownType}
            onChange={(e) => setBreakdownType(e.target.value as TransactionType)}
          />
        </CardHeader>
        {loadingBreakdown ? (
          <div className="h-64 animate-pulse bg-gray-200 rounded" />
        ) : pieData?.length ? (
          <div className="flex flex-col lg:flex-row items-center gap-6">
            <ResponsiveContainer width="100%" height={240} className="max-w-xs">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value">
                  {pieData.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => formatCurrency(v.toString(), currency)}
                  contentStyle={{ fontSize: 12, borderRadius: 6 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 w-full space-y-2">
              {(breakdown as any)?.items?.map((item: any) => (
                <div key={item.category.id} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.category.color ?? '#6b7280' }} />
                  <span className="text-sm text-gray-700 flex-1">{item.category.name}</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(item.amount, currency)}</span>
                  <span className="text-xs text-gray-400 w-10 text-right">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-sm text-gray-400">
            No data for this period
          </div>
        )}
      </Card>
    </div>
  );
}
