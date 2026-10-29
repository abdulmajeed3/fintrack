import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { QueryClient } from '@tanstack/react-query';
import { AuthProvider } from '@/app/auth-context';
import { LoginPage } from './LoginPage';
import { vi } from 'vitest';

vi.mock('@/services/auth.service', () => ({
  authService: {
    login: vi.fn(),
    getMe: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  },
}));

vi.mock('@/lib/api-client', () => ({
  tokenStore: {
    getRefresh: vi.fn().mockReturnValue(null),
    setAccess: vi.fn(),
    setRefresh: vi.fn(),
    clearAll: vi.fn(),
  },
  extractError: (err: unknown) => (err instanceof Error ? err.message : 'Error'),
}));

function renderLogin() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>,
  );
}

describe('LoginPage', () => {
  it('renders email and password fields', () => {
    renderLogin();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('shows validation error for invalid email', async () => {
    renderLogin();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'not-an-email' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pw' } });
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }).closest('form')!);
    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
  });

  it('shows error when password is empty', async () => {
    renderLogin();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@test.com' } });
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }).closest('form')!);
    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('renders demo credentials hint', () => {
    renderLogin();
    expect(screen.getByText(/demo credentials/i)).toBeInTheDocument();
  });

  it('has a link to registration page', () => {
    renderLogin();
    expect(screen.getByRole('link', { name: /create one/i })).toBeInTheDocument();
  });
});
