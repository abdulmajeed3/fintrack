import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, extractData, extractError } from '@/lib/api-client';
import { useAuth } from '@/app/auth-context';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { User } from '@/types';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  currency: z.enum(['USD', 'CAD', 'GBP', 'PKR', 'EUR']),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password required'),
  newPassword: z.string().min(8, 'Min 8 characters').regex(/[A-Z]/).regex(/[a-z]/).regex(/\d/),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ProfileValues = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

export function SettingsPage() {
  const { user, setUser } = useAuth();
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '', currency: user?.currency ?? 'USD' },
  });

  const passwordForm = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileValues) => {
      const res = await apiClient.patch<{ data: User }>('/profile', data);
      return extractData(res);
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      setProfileSuccess('Profile updated successfully');
      setProfileError('');
      setTimeout(() => setProfileSuccess(''), 3000);
    },
    onError: (err) => { setProfileError(extractError(err)); setProfileSuccess(''); },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordValues) => {
      await apiClient.put('/profile/password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
    },
    onSuccess: () => {
      setPasswordSuccess('Password changed. You may need to log in again on other devices.');
      setPasswordError('');
      passwordForm.reset();
      setTimeout(() => setPasswordSuccess(''), 5000);
    },
    onError: (err) => { setPasswordError(extractError(err)); setPasswordSuccess(''); },
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Manage your profile and account preferences</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        {profileSuccess && (
          <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-200 text-sm text-green-700">
            {profileSuccess}
          </div>
        )}
        {profileError && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
            {profileError}
          </div>
        )}
        <form onSubmit={profileForm.handleSubmit((d) => updateProfileMutation.mutate(d))} className="space-y-4">
          <Input
            label="Full name"
            error={profileForm.formState.errors.name?.message}
            {...profileForm.register('name')}
          />
          <div>
            <Select
              label="Display currency"
              options={[
                { value: 'USD', label: 'USD — US Dollar' },
                { value: 'CAD', label: 'CAD — Canadian Dollar' },
                { value: 'GBP', label: 'GBP — British Pound' },
                { value: 'EUR', label: 'EUR — Euro' },
                { value: 'PKR', label: 'PKR — Pakistani Rupee' },
              ]}
              {...profileForm.register('currency')}
            />
            <p className="text-xs text-gray-400 mt-1">
              Changing currency affects display only. Cannot be changed after transactions are recorded.
            </p>
          </div>
          <div className="flex justify-end">
            <Button type="submit" isLoading={updateProfileMutation.isPending}>
              Save Profile
            </Button>
          </div>
        </form>
      </Card>

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between py-1.5">
            <span className="text-gray-500">Email</span>
            <span className="text-gray-900 font-medium">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-gray-500">Member since</span>
            <span className="text-gray-900">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</span>
          </div>
        </div>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        {passwordSuccess && (
          <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-200 text-sm text-green-700">
            {passwordSuccess}
          </div>
        )}
        {passwordError && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
            {passwordError}
          </div>
        )}
        <form onSubmit={passwordForm.handleSubmit((d) => changePasswordMutation.mutate(d))} className="space-y-4">
          <Input
            label="Current password"
            type="password"
            error={passwordForm.formState.errors.currentPassword?.message}
            {...passwordForm.register('currentPassword')}
          />
          <Input
            label="New password"
            type="password"
            helperText="Min 8 chars with uppercase, lowercase, and number"
            error={passwordForm.formState.errors.newPassword?.message}
            {...passwordForm.register('newPassword')}
          />
          <Input
            label="Confirm new password"
            type="password"
            error={passwordForm.formState.errors.confirmPassword?.message}
            {...passwordForm.register('confirmPassword')}
          />
          <div className="flex justify-end">
            <Button type="submit" isLoading={changePasswordMutation.isPending}>
              Change Password
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
