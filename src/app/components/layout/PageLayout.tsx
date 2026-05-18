import { ReactNode } from 'react';

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}

export function PageLayout({ title, subtitle, children, action }: PageLayoutProps) {
  return (
    <div className="flex-1 bg-[#F7F7F5] dark:bg-[#0F0F0F] overflow-auto">
      <div className="max-w-[1100px] mx-auto p-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-[20px] font-medium text-[#1A1A1A] dark:text-[#F5F5F5] mb-1">{title}</h1>
            {subtitle && (
              <p className="text-[14px] text-[#6B7280] dark:text-[#A0A0A0]">{subtitle}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}
