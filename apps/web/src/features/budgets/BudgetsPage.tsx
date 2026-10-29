import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronLeft, ChevronRight, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { budgetsService } from '@/services/budgets.service';
import { categoriesService } from '@/services/categories.service';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { extractError } from '@/lib/api-client';
import { formatCurrency, formatMonthYear } from '@/lib/utils';
import { useAuth } from '@/app/auth-context';
import type { Budget } from '@/types';

const schema = z.object({
  categoryId: z.string().uuid('Select a category'),
  amount: z.string().regex(/^\d+(\.\d{1,4})?$/).refine((v) => parseFloat(v) > 0, 'Amount must be positive'),
});
type FormValues = z.infer<typeof schema>;

function BudgetCard({ budget, currency, onEdit, onDelete }: {
  budget: Budget;
  currency: string;
  onEdit: (b: Budget) => void;
  onDelete: (b: Budget) => void;
}) {
  const pct = Math.min(budget.percentage ?? 0, 100);
  const isOver = budget.isOverBudget;
  const isNear = budget.isNearLimit;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: budget.category.color ?? '#6b7280' }} />
          <h3 className="font-semibold text-gray-900 text-sm">{budget.category.name}</h3>
          {isOver && (
            <AlertTriangle className="h-4 w-4 text-red-500" aria-label="Over budget" />
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onEdit(budget)} className="p-1 text-gray-400 hover:text-primary-600 rounded" aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => onDelete(budget)} className="p-1 text-gray-400 hover:text-red-600 rounded" aria-label="Delete">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Spent: <span className={isOver ? 'text-red-600 font-medium' : 'text-gray-700'}>{formatCurrency(budget.spent ?? '0', currency)}</span></span>
          <span>Budget: <span className="text-gray-700">{formatCurrency(budget.amount, currency)}</span></span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all ${isOver ? 'bg-red-500' : isNear ? 'bg-yellow-500' : 'bg-primary-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs">
          <span className={`font-medium ${isOver ? 'text-red-600' : 'text-gray-600'}`}>
            {isOver ? 'Over by ' : 'Remaining: '}
            {formatCurrency(Math.abs(parseFloat(budget.remaining ?? '0')).toString(), currency)}
          </span>
          <span className={`font-medium ${isOver ? 'text-red-600' : isNear ? 'text-yellow-600' : 'text-primary-600'}`}>
            {(budget.percentage ?? 0).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}

export function BudgetsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const currency = user?.currency ?? 'USD';
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [deleting, setDeleting] = useState<Budget | null>(null);
  const [serverError, setServerError] = useState('');

  const { data: budgets, isLoading } = useQuery({
    queryKey: ['budgets', month, year],
    queryFn: () => budgetsService.list(month, year),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories', 'EXPENSE'],
    queryFn: () => categoriesService.list('EXPENSE'),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const createMutation = useMutation({
    mutationFn: (data: FormValues) =>
      editing
        ? budgetsService.update(editing.id, data.amount)
        : budgetsService.create({ ...data, month, year }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setShowForm(false);
      setEditing(null);
      reset();
    },
    onError: (err) => setServerError(extractError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => budgetsService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budgets'] }); setDeleting(null); },
  });

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const usedCategoryIds = new Set((budgets ?? []).map((b) => b.categoryId));
  const availableCategories = (categories ?? []).filter((c) => !usedCategoryIds.has(c.id));

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
          <p className="text-sm text-gray-500">Set monthly spending limits by category</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
            <button onClick={prevMonth} className="text-gray-500 hover:text-gray-800" aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium w-36 text-center">{formatMonthYear(month, year)}</span>
            <button onClick={nextMonth} className="text-gray-500 hover:text-gray-800" aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <Button onClick={() => { setEditing(null); setShowForm(true); reset(); setServerError(''); }}>
            <Plus className="h-4 w-4" /> Add Budget
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
        </div>
      ) : !budgets?.length ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">No budgets for {formatMonthYear(month, year)}</p>
          <Button variant="ghost" className="mt-3 text-primary-600" onClick={() => setShowForm(true)}>
            Set your first budget
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((b) => (
            <BudgetCard
              key={b.id}
              budget={b}
              currency={currency}
              onEdit={(b) => { setEditing(b); reset({ categoryId: b.categoryId, amount: b.amount }); setShowForm(true); setServerError(''); }}
              onDelete={setDeleting}
            />
          ))}
        </div>
      )}

      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        title={editing ? 'Edit Budget' : 'New Budget'}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
            <Button form="budget-form" type="submit" isLoading={isSubmitting || createMutation.isPending}>
              {editing ? 'Save' : 'Create Budget'}
            </Button>
          </>
        }
      >
        {serverError && (
          <div className="mb-3 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
            {serverError}
          </div>
        )}
        <form id="budget-form" onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          {!editing && (
            <Select
              label="Category"
              options={availableCategories.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Select expense category"
              error={errors.categoryId?.message}
              {...register('categoryId')}
            />
          )}
          {editing && (
            <p className="text-sm text-gray-600">Category: <strong>{editing.category.name}</strong></p>
          )}
          <Input
            label="Budget Amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            error={errors.amount?.message}
            {...register('amount')}
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        title="Delete Budget"
        message={`Delete budget for "${deleting?.category.name}"?`}
        isLoading={deleteMutation.isPending}
        confirmLabel="Delete"
      />
    </div>
  );
}
