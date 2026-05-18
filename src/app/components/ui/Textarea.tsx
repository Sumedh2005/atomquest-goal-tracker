import { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export function Textarea({ label, helperText, error, className = '', ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-[12px] font-medium text-[#1A1A1A] dark:text-[#F5F5F5]">
          {label}
        </label>
      )}
      <textarea
        className={`px-3 py-2 rounded-[8px] bg-[#F7F7F5] dark:bg-[#242424] border border-transparent text-[14px] font-normal text-[#1A1A1A] dark:text-[#F5F5F5] placeholder:text-[#9CA3AF] dark:placeholder:text-[#555555] transition-colors focus:outline-none focus:bg-white dark:focus:bg-[#242424] focus:border-[#F5A800] resize-none ${className}`}
        {...props}
      />
      {helperText && !error && (
        <span className="text-[12px] text-[#6B7280]">{helperText}</span>
      )}
      {error && (
        <span className="text-[12px] text-[#991B1B]">{error}</span>
      )}
    </div>
  );
}
