import { apiClient, extractData } from '@/lib/api-client';
import type { Category, TransactionType } from '@/types';

export const categoriesService = {
  async list(type?: TransactionType): Promise<Category[]> {
    const res = await apiClient.get<{ data: Category[] }>('/categories', {
      params: type ? { type } : {},
    });
    return extractData(res);
  },

  async create(payload: { name: string; type: TransactionType; color?: string; icon?: string }): Promise<Category> {
    const res = await apiClient.post<{ data: Category }>('/categories', payload);
    return extractData(res);
  },

  async update(id: string, payload: { name?: string; color?: string; icon?: string }): Promise<Category> {
    const res = await apiClient.patch<{ data: Category }>(`/categories/${id}`, payload);
    return extractData(res);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/categories/${id}`);
  },
};
