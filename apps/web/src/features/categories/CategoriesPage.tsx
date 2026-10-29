import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Tag, Pencil, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { categoriesService } from '@/services/categories.service';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { extractError } from '@/lib/api-client';
import type { Category, TransactionType } from '@/types';

const schema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(['INCOME', 'EXPENSE']),
  color: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function CategoryForm({
  isOpen,
  onClose,
  category,
}: {
  isOpen: boolean;
  onClose: () => void;
  category?: Category | null;
}) {
  const qc = useQueryClient();
  const [serverError, setServerError] = useState('');
  const isEdit = !!category;

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: (category?.type ?? 'EXPENSE') as 'INCOME' | 'EXPENSE',
      name: category?.name ?? '',
      color: category?.color ?? '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      isEdit
        ? categoriesService.update(category!.id, { name: data.name, color: data.color ?? undefined })
        : categoriesService.create({ name: data.name, type: data.type as TransactionType, color: data.color ?? undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      onClose();
      reset();
    },
    onError: (err) => setServerError(extractError(err)),
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Category' : 'New Category'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button form="cat-form" type="submit" isLoading={isSubmitting || mutation.isPending}>
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      {serverError && (
        <div className="mb-3 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
          {serverError}
        </div>
      )}
      <form id="cat-form" onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <Input label="Name" placeholder="e.g. Groceries" error={errors.name?.message} {...register('name')} />
        {!isEdit && (
          <Select
            label="Type"
            options={[{ value: 'EXPENSE', label: 'Expense' }, { value: 'INCOME', label: 'Income' }]}
            error={errors.type?.message}
            {...register('type')}
          />
        )}
        <Input label="Color (optional)" type="color" className="h-10 cursor-pointer" {...register('color')} />
      </form>
    </Modal>
  );
}

export function CategoriesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesService.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setDeleting(null); },
    onError: (err) => setDeleteError(extractError(err)),
  });

  const income = categories?.filter((c) => c.type === 'INCOME') ?? [];
  const expenses = categories?.filter((c) => c.type === 'EXPENSE') ?? [];

  const CategoryRow = ({ cat }: { cat: Category }) => (
    <div className="flex items-center gap-3 p-3 rounded-md hover:bg-gray-50 group">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: cat.color ? `${cat.color}20` : '#f3f4f6' }}>
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color ?? '#6b7280' }} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{cat.name}</p>
        {cat.isDefault && <span className="text-xs text-gray-400">Default</span>}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => { setEditing(cat); setShowForm(true); }}
          className="p-1.5 text-gray-400 hover:text-primary-600 rounded"
          aria-label="Edit"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={() => { setDeleting(cat); setDeleteError(''); }}
          className="p-1.5 text-gray-400 hover:text-red-600 rounded"
          aria-label="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500">Organize your transactions by category</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="h-4 w-4" /> New Category
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="animate-pulse flex gap-3 items-center">
                  <div className="w-8 h-8 bg-gray-200 rounded-full" />
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 p-4 border-b border-gray-100">
              <Badge variant="income">Income</Badge>
              <span className="text-sm text-gray-500">{income.length} categories</span>
            </div>
            <div className="p-2">
              {income.length ? income.map((c) => <CategoryRow key={c.id} cat={c} />) : (
                <p className="text-sm text-gray-400 p-4 text-center">No income categories</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 p-4 border-b border-gray-100">
              <Badge variant="expense">Expense</Badge>
              <span className="text-sm text-gray-500">{expenses.length} categories</span>
            </div>
            <div className="p-2">
              {expenses.length ? expenses.map((c) => <CategoryRow key={c.id} cat={c} />) : (
                <p className="text-sm text-gray-400 p-4 text-center">No expense categories</p>
              )}
            </div>
          </div>
        </div>
      )}

      <CategoryForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        category={editing}
      />

      <ConfirmDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        title="Delete Category"
        message={`Delete "${deleting?.name}"? This will fail if there are transactions using this category.`}
        isLoading={deleteMutation.isPending}
        confirmLabel="Delete"
      />
      {deleteError && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-3 max-w-sm shadow">
          <p className="text-sm text-red-700">{deleteError}</p>
          <button onClick={() => setDeleteError('')} className="text-xs text-red-500 mt-1 hover:underline">Dismiss</button>
        </div>
      )}
    </div>
  );
}
