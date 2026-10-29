import { apiClient, extractData } from '@/lib/api-client';
import type { Transaction, TransactionFilters, PaginationMeta } from '@/types';

export interface CreateTransactionPayload {
  type: string;
  amount: string;
  description: string;
  transactionDate: string;
  categoryId: string;
  notes?: string;
}

export interface TransactionListResult {
  data: Transaction[];
  meta: PaginationMeta;
}

export const transactionsService = {
  async list(filters: TransactionFilters = {}): Promise<TransactionListResult> {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== undefined && v !== ''),
    );
    const res = await apiClient.get('/transactions', { params });
    return res.data as TransactionListResult;
  },

  async getOne(id: string): Promise<Transaction> {
    const res = await apiClient.get<{ data: Transaction }>(`/transactions/${id}`);
    return extractData(res);
  },

  async create(payload: CreateTransactionPayload): Promise<Transaction> {
    const res = await apiClient.post<{ data: Transaction }>('/transactions', payload);
    return extractData(res);
  },

  async update(id: string, payload: Partial<CreateTransactionPayload>): Promise<Transaction> {
    const res = await apiClient.patch<{ data: Transaction }>(`/transactions/${id}`, payload);
    return extractData(res);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/transactions/${id}`);
  },
};
