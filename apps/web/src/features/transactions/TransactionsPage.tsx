import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { transactionsService } from '@/services/transactions.service';
import { categoriesService } from '@/services/categories.service';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TransactionBadge } from '@/components/ui/Badge';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { ConfirmDialog } from '@/components/ui/Modal';
import { TransactionFormModal } from './TransactionFormModal';
import { useAuth } from '@/app/auth-context';
import { formatCurrency, formatDate } from '@/lib/utils';
import { extractError } from '@/lib/api-client';
import type { Transaction, TransactionType } from '@/types';

export function TransactionsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const currency = user?.currency ?? 'USD';

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | ''>('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const filters = {
    search: search || undefined,
    type: typeFilter || undefined,
    categoryId: categoryFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    limit: 20,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => transactionsService.list(filters),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesService.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => transactionsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setDeletingTx(null);
    },
    onError: (err) => setDeleteError(extractError(err)),
  });

  const totals = data?.meta?.totals;
  const pagination = data?.meta;

  const categoryOptions = (categories ?? []).map((c) => ({
    value: c.id,
    label: c.name,
  }));

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-sm text-gray-500">Manage your income and expenses</p>
        </div>
        <Button onClick={() => { setEditingTx(null); setShowForm(true); }}>
          <Plus className="h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      {/* Totals */}
      {totals && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-50 rounded-lg p-3 border border-green-100">
            <p className="text-xs text-green-600 font-medium">Income</p>
            <p className="text-lg font-bold text-green-700">{formatCurrency(totals.income, currency)}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 border border-red-100">
            <p className="text-xs text-red-600 font-medium">Expenses</p>
            <p className="text-lg font-bold text-red-700">{formatCurrency(totals.expense, currency)}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <p className="text-xs text-blue-600 font-medium">Net</p>
            <p className={`text-lg font-bold ${parseFloat(totals.net) >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
              {formatCurrency(totals.net, currency)}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search description..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-9 w-full"
          />
        </div>
        <Select
          options={[
            { value: 'INCOME', label: 'Income' },
            { value: 'EXPENSE', label: 'Expense' },
          ]}
          placeholder="All types"
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value as TransactionType | ''); setPage(1); }}
        />
        <Select
          options={categoryOptions}
          placeholder="All categories"
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
        />
        <div className="flex gap-2">
          <input
            type="date"
            className="input flex-1 text-xs"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            aria-label="From date"
          />
          <input
            type="date"
            className="input flex-1 text-xs"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            aria-label="To date"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-4"><TableSkeleton /></div>
        ) : !data?.data.length ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-sm">No transactions found</p>
            <Button
              variant="ghost"
              className="mt-3 text-primary-600"
              onClick={() => { setEditingTx(null); setShowForm(true); }}
            >
              Add your first transaction
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.data.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {formatDate(tx.transactionDate)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{tx.description}</div>
                        {tx.notes && <div className="text-xs text-gray-400 truncate max-w-xs">{tx.notes}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {tx.category.color && (
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tx.category.color }} />
                          )}
                          <span className="text-gray-700">{tx.category.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <TransactionBadge type={tx.type} />
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setEditingTx(tx); setShowForm(true); }}
                            className="text-gray-400 hover:text-primary-600 p-1 rounded transition-colors text-xs font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => { setDeletingTx(tx); setDeleteError(''); }}
                            className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors text-xs font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, pagination.total)} of {pagination.total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage(p => p - 1)}
                    disabled={!pagination.hasPrevPage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-gray-600">{page} / {pagination.totalPages}</span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={!pagination.hasNextPage}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <TransactionFormModal
          isOpen={showForm}
          onClose={() => { setShowForm(false); setEditingTx(null); }}
          transaction={editingTx}
        />
      )}

      <ConfirmDialog
        isOpen={!!deletingTx}
        onClose={() => setDeletingTx(null)}
        onConfirm={() => deletingTx && deleteMutation.mutate(deletingTx.id)}
        title="Delete Transaction"
        message={`Delete "${deletingTx?.description}"? This cannot be undone.`}
        isLoading={deleteMutation.isPending}
        confirmLabel="Delete"
      />
    </div>
  );
}
