import { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  helperText?: string;
  error?: string;
}

export function Select({ label, options, helperText, error, className = '', ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-[12px] font-medium text-[#1A1A1A] dark:text-[#F5F5F5]">
          {label}
        </label>
      )}
      <select
        className={`h-9 px-3 rounded-[8px] bg-[#F7F7F5] dark:bg-[#242424] border border-transparent text-[14px] font-normal text-[#1A1A1A] dark:text-[#F5F5F5] transition-colors focus:outline-none focus:bg-white dark:focus:bg-[#242424] focus:border-[#F5A800] ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helperText && !error && (
        <span className="text-[12px] text-[#6B7280]">{helperText}</span>
      )}
      {error && (
        <span className="text-[12px] text-[#991B1B]">{error}</span>
      )}
    </div>
  );
}
