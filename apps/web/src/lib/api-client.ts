import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Token storage — uses memory for access token, sessionStorage as fallback
let accessToken: string | null = null;

export const tokenStore = {
  getAccess: () => accessToken,
  setAccess: (token: string) => { accessToken = token; },
  getRefresh: () => {
    try { return sessionStorage.getItem('ft_rt'); } catch { return null; }
  },
  setRefresh: (token: string) => {
    try { sessionStorage.setItem('ft_rt', token); } catch {}
  },
  clearAll: () => {
    accessToken = null;
    try { sessionStorage.removeItem('ft_rt'); } catch {}
  },
};

// Attach access token to every request
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

function processFailQueue(error: unknown, token: string | null) {
  failQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failQueue = [];
}

// Auto-refresh on 401
apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = tokenStore.getRefresh();
      if (!refreshToken) {
        tokenStore.clearAll();
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failQueue.push({ resolve, reject });
        }).then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const newAccess: string = data.data?.accessToken ?? data.accessToken;
        const newRefresh: string = data.data?.refreshToken ?? data.refreshToken;
        tokenStore.setAccess(newAccess);
        tokenStore.setRefresh(newRefresh);
        processFailQueue(null, newAccess);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processFailQueue(refreshError, null);
        tokenStore.clearAll();
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

export function extractData<T>(response: { data: { data: T } }): T {
  return response.data.data;
}

export function extractError(error: unknown): string {
  if (error instanceof AxiosError) {
    const errData = error.response?.data as { error?: { message?: string }; message?: string } | undefined;
    return errData?.error?.message ?? errData?.message ?? error.message ?? 'An error occurred';
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}
