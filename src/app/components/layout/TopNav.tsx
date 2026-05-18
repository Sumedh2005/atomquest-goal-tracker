import { IconMoon, IconSun } from '@tabler/icons-react';
import { Avatar } from '../ui/Avatar';
import { useTheme } from '../../contexts/ThemeContext';

interface TopNavProps {
  userName: string;
  userRole: string;
  cycleName: string;
}

export function TopNav({ userName, userRole, cycleName }: TopNavProps) {
  const { isDarkMode, toggleDarkMode } = useTheme();

  return (
    <div className="h-16 bg-white dark:bg-[#141414] border-b border-[#E8E8E4] dark:border-[#2A2A2A] flex items-center justify-between px-6">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-[#F5A800] rounded-[55px] flex items-center justify-center text-[#1A1A1A] font-medium text-[14px]">
          AT
        </div>
        <span className="font-medium text-[16px] text-[#1A1A1A] dark:text-[#F5F5F5]">
          AtomTrack
        </span>
      </div>

      <div className="flex-1 flex justify-center">
        <span className="text-[14px] text-[#6B7280] dark:text-[#666666]">{cycleName}</span>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleDarkMode}
          aria-label="Toggle dark mode"
          className="w-8 h-8 flex items-center justify-center rounded-[8px] text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#F5F5F5] hover:bg-[#F7F7F5] dark:hover:bg-[#1F1F1F] transition-colors"
        >
          {isDarkMode ? <IconSun size={18} /> : <IconMoon size={18} />}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[14px] font-medium text-[#1A1A1A] dark:text-[#F5F5F5]">
              {userName}
            </span>
            <span className="text-[11px] font-medium uppercase text-[#B37800] dark:text-[#F5A800]">
              {userRole}
            </span>
          </div>
          <Avatar name={userName} />
        </div>
      </div>
    </div>
  );
}