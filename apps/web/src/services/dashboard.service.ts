import { apiClient, extractData } from '@/lib/api-client';
import type { DashboardSummary } from '@/types';

export const dashboardService = {
  async getSummary(month: number, year: number): Promise<DashboardSummary> {
    const res = await apiClient.get<{ data: DashboardSummary }>('/dashboard', {
      params: { month, year },
    });
    return extractData(res);
  },
};
