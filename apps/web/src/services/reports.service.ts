import { apiClient, extractData } from '@/lib/api-client';
import type { MonthlyReport, TransactionType } from '@/types';

export const reportsService = {
  async getMonthlySummary(year: number): Promise<MonthlyReport[]> {
    const res = await apiClient.get<{ data: MonthlyReport[] }>('/reports/monthly-summary', {
      params: { year },
    });
    return extractData(res);
  },

  async getCategoryBreakdown(dateFrom: string, dateTo: string, type?: TransactionType) {
    const res = await apiClient.get('/reports/category-breakdown', {
      params: { dateFrom, dateTo, ...(type && { type }) },
    });
    return extractData(res);
  },

  async getTransactionReport(dateFrom: string, dateTo: string, type?: TransactionType) {
    const res = await apiClient.get('/reports/transactions', {
      params: { dateFrom, dateTo, ...(type && { type }) },
    });
    return extractData(res);
  },

  getCsvExportUrl(dateFrom: string, dateTo: string, type?: TransactionType): string {
    const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
    const params = new URLSearchParams({ dateFrom, dateTo });
    if (type) params.set('type', type);
    return `${base}/reports/export/csv?${params}`;
  },
};
