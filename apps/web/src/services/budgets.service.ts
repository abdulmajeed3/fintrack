import { apiClient, extractData } from '@/lib/api-client';
import type { Budget } from '@/types';

export const budgetsService = {
  async list(month: number, year: number): Promise<Budget[]> {
    const res = await apiClient.get<{ data: Budget[] }>('/budgets', {
      params: { month, year },
    });
    return extractData(res);
  },

  async create(payload: { categoryId: string; amount: string; month: number; year: number }): Promise<Budget> {
    const res = await apiClient.post<{ data: Budget }>('/budgets', payload);
    return extractData(res);
  },

  async update(id: string, amount: string): Promise<Budget> {
    const res = await apiClient.patch<{ data: Budget }>(`/budgets/${id}`, { amount });
    return extractData(res);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/budgets/${id}`);
  },
};
