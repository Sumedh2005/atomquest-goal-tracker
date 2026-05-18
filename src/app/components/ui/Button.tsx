import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outlined' | 'text';
  children: ReactNode;
}

export function Button({ variant = 'primary', children, className = '', disabled, ...props }: ButtonProps) {
  const baseStyles = 'h-9 px-4 rounded-[8px] text-[14px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'bg-[#F5A800] text-[#1A1A1A] hover:bg-[#D4900A]',
    outlined: 'bg-transparent dark:bg-[#2A2A2A] border border-[#E8E8E4] dark:border-[#3A3A3A] text-[#1A1A1A] dark:text-[#F5F5F5] hover:bg-[#FEF9EC] dark:hover:bg-[#333333]',
    text: 'bg-transparent text-[#B37800] dark:text-[#F5A800] hover:bg-[#FEF9EC] dark:hover:bg-[#2A2200]'
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
