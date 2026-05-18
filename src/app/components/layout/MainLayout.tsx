import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopNav } from './TopNav';
import { Sidebar } from './Sidebar';
import {
  IconHome,
  IconTarget,
  IconCheckbox,
  IconUsers,
  IconSettings,
  IconFileText,
  IconAward,
  IconHistory
} from '@tabler/icons-react';
import { useAuth } from '../../contexts/AuthContext';

interface MainLayoutProps {
  children: ReactNode;
  userRole: 'Employee' | 'Manager' | 'Admin';
}

export function MainLayout({ children, userRole }: MainLayoutProps) {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const employeeNav = [
    {
      items: [
        {
          icon: <IconHome size={20} />,
          label: 'Dashboard',
          descriptor: 'Your goals at a glance',
          path: '/employee/dashboard'
        },
        {
          icon: <IconTarget size={20} />,
          label: 'My Goals',
          descriptor: 'View and manage goals',
          path: '/employee/my-goals'
        },
        {
          icon: <IconFileText size={20} />,
          label: 'Create Goals',
          descriptor: 'Add and submit your goals',
          path: '/employee/create-goals'
        },
        {
          icon: <IconCheckbox size={20} />,
          label: 'Check-in',
          descriptor: 'Log quarterly progress',
          path: '/employee/checkin'
        }
      ]
    }
  ];

  const managerNav = [
    {
      label: 'MANAGER',
      items: [
        {
          icon: <IconUsers size={20} />,
          label: 'Team Dashboard',
          descriptor: 'Overview of your team',
          path: '/manager/team-dashboard'
        },
        {
          icon: <IconFileText size={20} />,
          label: 'Approvals',
          descriptor: 'Review submitted goals',
          path: '/manager/approvals'
        },
        {
          icon: <IconCheckbox size={20} />,
          label: 'Check-in Review',
          descriptor: 'Log team check-in comments',
          path: '/manager/checkin-review'
        }
      ]
    }
  ];

  const adminNav = [
    {
      items: [
        {
          icon: <IconUsers size={20} />,
          label: 'Organization',
          descriptor: 'Org-wide completion view',
          path: '/admin/organization'
        },
        {
          icon: <IconSettings size={20} />,
          label: 'Cycle Config',
          descriptor: 'Manage goal setting windows',
          path: '/admin/cycle-config'
        },
        {
          icon: <IconTarget size={20} />,
          label: 'Shared Goals',
          descriptor: 'Push KPIs to employees',
          path: '/admin/shared-goals'
        },
        {
          icon: <IconAward size={20} />,
          label: 'Reports',
          descriptor: 'Export achievement data',
          path: '/admin/reports'
        },
        {
          icon: <IconHistory size={20} />,
          label: 'Audit Trail',
          descriptor: 'Post-lock change history',
          path: '/admin/audit-trail'
        }
      ]
    }
  ];

  // Redirect if no user after loading
  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const navSections = userRole === 'Admin' ? adminNav : userRole === 'Manager' ? managerNav : employeeNav;
  
  const displayRole = userRole.charAt(0).toUpperCase() + userRole.slice(1);
  const displayName = loading ? 'Loading...' : (user?.full_name || user?.email?.split('@')[0] || 'User');

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F7F7F5] dark:bg-[#0F0F0F]">
        <div className="text-[14px] text-[#9CA3AF]">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col">
      <TopNav
        userName={displayName}
        userRole={displayRole}
        cycleName="FY 2025–26 · Q1 Check-in Open"
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          sections={navSections}
          userName={displayName}
          userRole={displayRole}
        />
        {children}
      </div>
    </div>
  );
}