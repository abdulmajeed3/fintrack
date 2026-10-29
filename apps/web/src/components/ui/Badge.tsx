import React from 'react';
import { cn } from '@/lib/utils';
import type { TransactionType } from '@/types';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'income' | 'expense' | 'default' | 'warning';
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  const variants = {
    income: 'bg-green-100 text-green-800',
    expense: 'bg-red-100 text-red-800',
    default: 'bg-gray-100 text-gray-800',
    warning: 'bg-yellow-100 text-yellow-800',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function TransactionBadge({ type }: { type: TransactionType }) {
  return (
    <Badge variant={type === 'INCOME' ? 'income' : 'expense'}>
      {type === 'INCOME' ? 'Income' : 'Expense'}
    </Badge>
  );
}
