import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { transactionsService } from '@/services/transactions.service';
import { categoriesService } from '@/services/categories.service';
import { extractError } from '@/lib/api-client';
import { toISODateString } from '@/lib/utils';
import type { Transaction } from '@/types';
import { useState } from 'react';

const schema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.string().regex(/^\d+(\.\d{1,4})?$/, 'Enter a valid positive amount').refine(
    (v) => parseFloat(v) > 0,
    { message: 'Amount must be greater than zero' },
  ),
  description: z.string().min(1, 'Description is required').max(255),
  transactionDate: z.string().min(1, 'Date is required'),
  categoryId: z.string().uuid('Select a category'),
  notes: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  transaction?: Transaction | null;
}

export function TransactionFormModal({ isOpen, onClose, transaction }: Props) {
  const qc = useQueryClient();
  const [serverError, setServerError] = useState('');
  const isEdit = !!transaction;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'EXPENSE',
      transactionDate: toISODateString(new Date()),
    },
  });

  const selectedType = watch('type');

  useEffect(() => {
    if (transaction) {
      reset({
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        transactionDate: transaction.transactionDate.split('T')[0],
        categoryId: transaction.categoryId,
        notes: transaction.notes ?? '',
      });
    } else {
      reset({
        type: 'EXPENSE',
        amount: '',
        description: '',
        transactionDate: toISODateString(new Date()),
        categoryId: '',
        notes: '',
      });
    }
    setServerError('');
  }, [transaction, reset, isOpen]);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesService.list(),
  });

  const filteredCategories = (categories ?? []).filter((c) => c.type === selectedType);

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      isEdit
        ? transactionsService.update(transaction!.id, data)
        : transactionsService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
    onError: (err) => setServerError(extractError(err)),
  });

  const onSubmit = (data: FormValues) => {
    setServerError('');
    mutation.mutate(data);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Transaction' : 'Add Transaction'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="transaction-form"
            isLoading={isSubmitting || mutation.isPending}
          >
            {isEdit ? 'Save Changes' : 'Add Transaction'}
          </Button>
        </>
      }
    >
      {serverError && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{serverError}</p>
        </div>
      )}
      <form id="transaction-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Select
          label="Type"
          options={[
            { value: 'EXPENSE', label: 'Expense' },
            { value: 'INCOME', label: 'Income' },
          ]}
          error={errors.type?.message}
          {...register('type')}
        />
        <Input
          label="Amount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          error={errors.amount?.message}
          {...register('amount')}
        />
        <Input
          label="Description"
          placeholder="e.g. Grocery shopping"
          error={errors.description?.message}
          {...register('description')}
        />
        <Input
          label="Date"
          type="date"
          error={errors.transactionDate?.message}
          {...register('transactionDate')}
        />
        <Select
          label="Category"
          options={filteredCategories.map((c) => ({ value: c.id, label: c.name }))}
          placeholder="Select a category"
          error={errors.categoryId?.message}
          {...register('categoryId')}
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
          <textarea
            className="input min-h-[80px] resize-none"
            placeholder="Any additional notes..."
            {...register('notes')}
          />
        </div>
      </form>
    </Modal>
  );
}
