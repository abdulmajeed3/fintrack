import { apiClient, extractData, tokenStore } from '@/lib/api-client';
import type { User, AuthTokens } from '@/types';

export interface LoginPayload { email: string; password: string; }
export interface RegisterPayload { name: string; email: string; password: string; }
export interface AuthResult { user: User; accessToken: string; refreshToken: string; }

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResult> {
    const res = await apiClient.post<{ data: AuthResult }>('/auth/login', payload);
    const result = extractData(res);
    tokenStore.setAccess(result.accessToken);
    tokenStore.setRefresh(result.refreshToken);
    return result;
  },

  async register(payload: RegisterPayload): Promise<AuthResult> {
    const res = await apiClient.post<{ data: AuthResult }>('/auth/register', payload);
    const result = extractData(res);
    tokenStore.setAccess(result.accessToken);
    tokenStore.setRefresh(result.refreshToken);
    return result;
  },

  async logout(): Promise<void> {
    const refreshToken = tokenStore.getRefresh();
    try {
      await apiClient.post('/auth/logout', { refreshToken });
    } finally {
      tokenStore.clearAll();
    }
  },

  async getMe(): Promise<User> {
    const res = await apiClient.get<{ data: User }>('/profile');
    return extractData(res);
  },
};
