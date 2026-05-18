import { ReactNode } from 'react';

interface BadgeProps {
  variant: 'success' | 'warning' | 'danger' | 'gray';
  children: ReactNode;
  className?: string;
}

export function Badge({ variant, children, className = '' }: BadgeProps) {
  const variantStyles = {
    success: 'bg-[#F0FDF4] dark:bg-[#0D2818] text-[#166534] dark:text-[#4ADE80]',
    warning: 'bg-[#FEF9EC] dark:bg-[#2A1800] text-[#92400E] dark:text-[#F5A800]',
    danger: 'bg-[#FEF2F2] dark:bg-[#2A1800] text-[#991B1B] dark:text-[#F87171]',
    gray: 'bg-[#F3F4F6] dark:bg-[#242424] text-[#6B7280] dark:text-[#666666]'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-[20px] text-[12px] font-medium ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}
