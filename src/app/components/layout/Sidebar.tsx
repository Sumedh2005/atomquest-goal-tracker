import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { IconMenu2, IconChevronLeft, IconLogout } from '@tabler/icons-react';
import { useSidebar } from '../../contexts/SidebarContext';
import { Avatar } from '../ui/Avatar';
import { signOut } from '../../../lib/auth';

interface NavItem {
  icon: ReactNode;
  label: string;
  descriptor: string;
  path: string;
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

interface SidebarProps {
  sections: NavSection[];
  userName: string;
  userRole: string;
}

export function Sidebar({ sections, userName, userRole }: SidebarProps) {
  const location = useLocation();
  const { isExpanded, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const shouldExpand = isExpanded || (!isExpanded && isHovered);

  return (
    <div
      className={`bg-white dark:bg-[#141414] border-r border-[#E8E8E4] dark:border-[#2A2A2A] flex flex-col transition-all duration-200 ${
        shouldExpand ? 'w-[240px]' : 'w-[56px]'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Toggle Button */}
      <div className="flex items-center justify-center h-16">
        <button
          onClick={toggleSidebar}
          className={`text-[#9CA3AF] dark:text-[#666666] hover:text-[#1A1A1A] dark:hover:text-[#F5F5F5] ${
            shouldExpand ? 'ml-auto mr-3' : ''
          }`}
        >
          {shouldExpand ? <IconChevronLeft size={20} /> : <IconMenu2 size={20} />}
        </button>
      </div>

      {/* Nav Sections */}
      <div className="flex-1 overflow-y-auto">
        {sections.map((section, sectionIdx) => (
          <div key={sectionIdx} className="py-2">
            {section.label && shouldExpand && (
              <div className="px-4 mb-1 mt-2">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#9CA3AF] dark:text-[#444444]">
                  {section.label}
                </span>
              </div>
            )}
            <nav className="flex flex-col">
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center h-12 transition-colors relative ${
                      shouldExpand ? 'px-4 gap-2.5' : 'justify-center'
                    } ${
                      isActive
                        ? 'bg-[#FEF9EC] dark:bg-[#2A2200]'
                        : 'hover:bg-[#F7F7F5] dark:hover:bg-[#1F1F1F]'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#F5A800]" />
                    )}
                    <span
                      className={`flex-shrink-0 ${
                        isActive
                          ? 'text-[#F5A800]'
                          : 'text-[#9CA3AF] dark:text-[#666666]'
                      }`}
                    >
                      {item.icon}
                    </span>
                    {shouldExpand && (
                      <div className="flex flex-col min-w-0">
                        <span
                          className={`text-[13px] leading-tight ${
                            isActive
                              ? 'font-medium text-[#1A1A1A] dark:text-[#F5F5F5]'
                              : 'font-normal text-[#6B7280] dark:text-[#888888]'
                          }`}
                        >
                          {item.label}
                        </span>
                        <span
                          className={`text-[11px] leading-tight ${
                            isActive
                              ? 'text-[#B37800] dark:text-[#F5A800]'
                              : 'text-[#9CA3AF] dark:text-[#555555]'
                          }`}
                        >
                          {item.descriptor}
                        </span>
                      </div>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}

        {/* Cycle Info Card - Expanded Only */}
        {shouldExpand && (
          <div className="mx-3 my-4 bg-[#FAFAF8] dark:bg-[#1F1A00] border border-[#E8E8E4] dark:border-[#2A2200] rounded-lg p-3 border-l-[3px] border-l-[#F5A800]">
            <div className="text-[10px] font-medium uppercase text-[#9CA3AF] dark:text-[#444444] mb-1">
              CURRENT CYCLE
            </div>
            <div className="text-[13px] font-medium text-[#1A1A1A] dark:text-[#F5F5F5] mb-0.5">
              FY 2025–26
            </div>
            <div className="text-[12px] text-[#B37800] dark:text-[#F5A800] mb-0.5">
              Q1 Check-in Open
            </div>
            <div className="text-[11px] text-[#9CA3AF] dark:text-[#555555]">
              Closes 31 July
            </div>
          </div>
        )}
      </div>

      {/* User Profile Block */}
      <div className={`border-t border-[#E8E8E4] dark:border-[#2A2A2A] p-4 ${
        shouldExpand ? '' : 'flex justify-center'
      }`}>
        {shouldExpand ? (
          <div className="flex items-center gap-3">
            <Avatar name={userName} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-[#1A1A1A] dark:text-[#F5F5F5] truncate">
                {userName}
              </div>
              <div className="text-[10px] font-medium uppercase text-[#B37800] dark:text-[#F5A800]">
                {userRole}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
            >
              <IconLogout size={18} />
            </button>
          </div>
        ) : (
          <div className="focus:outline-none">
            <Avatar name={userName} />
          </div>
        )}
      </div>
    </div>
  );
}