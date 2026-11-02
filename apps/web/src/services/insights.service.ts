import { apiClient, extractData } from '@/lib/api-client';
import type { MonthlyInsights } from '@/types';

export const insightsService = {
  async getMonthly(month: number, year: number): Promise<MonthlyInsights> {
    const res = await apiClient.get<{ data: MonthlyInsights }>('/insights/monthly', {
      params: { month, year },
    });
    return extractData(res);
  },
};
