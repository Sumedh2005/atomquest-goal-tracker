import { useState, useEffect } from 'react';
import { PageLayout } from '../../components/layout/PageLayout';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { IconTrendingUp, IconTrendingDown, IconUsers, IconFileCheck, IconClock, IconUserCheck, IconChecklist, IconChartBar } from '@tabler/icons-react';

const CURRENT_QUARTER = 'Q1';

interface EmployeeRow {
  id: string;
  name: string;
  department: string;
  manager: string;
  managerId: string;
  approvalStatus: 'Approved' | 'Pending';
  checkinStatus: 'Submitted' | 'Not Started';
  isLocked: boolean;
}

interface ChartEntry {
  department: string;
  completion: number;
}

// Department color mapping - same as TeamDashboard
const departmentColors: Record<string, string> = {
  'Engineering': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'Product': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'Marketing': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  'Sales': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  'HR': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  'Finance': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'Operations': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  'Design': 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
  'Legal': 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300',
  'Customer Success': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  'Default': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
};

const getDepartmentColor = (department: string) => {
  return departmentColors[department] || departmentColors['Default'];
};

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-[#1A1A1A] border border-[#E8E8E4] dark:border-[#2A2A2A] rounded-[8px] p-3 shadow-lg">
        <p className="text-[13px] font-medium text-[#1A1A1A] dark:text-[#F5F5F5] mb-1">
          {label}
        </p>
        <p className="text-[12px] text-[#F5A800] font-semibold">
          Completion: {payload[0].value}%
        </p>
        <div className="w-full h-1.5 bg-[#E8E8E4] dark:bg-[#2A2A2A] rounded-full overflow-hidden mt-2">
          <div 
            className="h-full bg-[#F5A800] rounded-full"
            style={{ width: `${payload[0].value}%` }}
          />
        </div>
      </div>
    );
  }
  return null;
};

export function OrganizationDashboard() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [chartData, setChartData] = useState<ChartEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previousMetrics, setPreviousMetrics] = useState({
    totalEmployees: 0,
    sheetsSubmitted: 0,
    pendingApprovals: 0,
    managersWithPending: 0,
    checkinPct: 0,
    overallCompletion: 0
  });

  // Metrics derived from employees
  const totalEmployees = employees.length;
  const sheetsSubmitted = employees.filter(e =>
    e.approvalStatus === 'Approved' || e.approvalStatus === 'Pending'
  ).length;
  const pendingApprovals = employees.filter(e => e.approvalStatus === 'Pending').length;
  const managersWithPending = new Set(
    employees.filter(e => e.approvalStatus === 'Pending').map(e => e.managerId)
  ).size;
  const checkinsDone = employees.filter(e => e.checkinStatus === 'Submitted').length;
  const checkinPct = totalEmployees > 0
    ? Math.round((checkinsDone / totalEmployees) * 100)
    : 0;
  const approvedCount = employees.filter(e => e.approvalStatus === 'Approved').length;
  const overallCompletion = totalEmployees > 0
    ? Math.round((approvedCount / totalEmployees) * 100)
    : 0;

  // Calculate percentage changes
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return { value: current > 0 ? 100 : 0, isPositive: current > 0 };
    const change = ((current - previous) / previous) * 100;
    return { 
      value: Math.abs(Math.round(change)), 
      isPositive: change > 0,
      isNeutral: change === 0
    };
  };

  const totalEmployeesChange = calculateChange(totalEmployees, previousMetrics.totalEmployees);
  const sheetsSubmittedChange = calculateChange(sheetsSubmitted, previousMetrics.sheetsSubmitted);
  const pendingApprovalsChange = calculateChange(pendingApprovals, previousMetrics.pendingApprovals);
  const managersPendingChange = calculateChange(managersWithPending, previousMetrics.managersWithPending);
  const checkinPctChange = calculateChange(checkinPct, previousMetrics.checkinPct);
  const overallCompletionChange = calculateChange(overallCompletion, previousMetrics.overallCompletion);

  // Dynamic color schemes based on rules
  const getCardColors = (label: string, value: number) => {
    switch(label) {
      case 'Total Employees':
        return {
          bg: 'bg-blue-50 dark:bg-blue-950/20',
          border: 'border-blue-200 dark:border-blue-900',
          iconBg: 'bg-blue-100 dark:bg-blue-900/40',
          iconColor: 'text-blue-600 dark:text-blue-400',
          valueColor: 'text-blue-700 dark:text-blue-300'
        };
      
      case 'Pending Approvals':
      case 'Managers with Pending':
        // Yellow if pending > 0, Green if 0
        if (value === 0) {
          return {
            bg: 'bg-emerald-50 dark:bg-emerald-950/20',
            border: 'border-emerald-200 dark:border-emerald-900',
            iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            valueColor: 'text-emerald-700 dark:text-emerald-300'
          };
        } else {
          return {
            bg: 'bg-amber-50 dark:bg-amber-950/20',
            border: 'border-amber-200 dark:border-amber-900',
            iconBg: 'bg-amber-100 dark:bg-amber-900/40',
            iconColor: 'text-amber-600 dark:text-amber-400',
            valueColor: 'text-amber-700 dark:text-amber-300'
          };
        }
      
      case 'Overall Completion Rate':
        // Green if >= 50, Yellow if 30-50, Red if < 30
        if (value >= 50) {
          return {
            bg: 'bg-emerald-50 dark:bg-emerald-950/20',
            border: 'border-emerald-200 dark:border-emerald-900',
            iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            valueColor: 'text-emerald-700 dark:text-emerald-300'
          };
        } else if (value >= 30) {
          return {
            bg: 'bg-amber-50 dark:bg-amber-950/20',
            border: 'border-amber-200 dark:border-amber-900',
            iconBg: 'bg-amber-100 dark:bg-amber-900/40',
            iconColor: 'text-amber-600 dark:text-amber-400',
            valueColor: 'text-amber-700 dark:text-amber-300'
          };
        } else {
          return {
            bg: 'bg-red-50 dark:bg-red-950/20',
            border: 'border-red-200 dark:border-red-900',
            iconBg: 'bg-red-100 dark:bg-red-900/40',
            iconColor: 'text-red-600 dark:text-red-400',
            valueColor: 'text-red-700 dark:text-red-300'
          };
        }
      
      case 'Sheets Submitted':
      case 'Q1 Check-ins Done %':
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-900/20',
          border: 'border-gray-200 dark:border-gray-800',
          iconBg: 'bg-gray-100 dark:bg-gray-800/40',
          iconColor: 'text-gray-600 dark:text-gray-400',
          valueColor: 'text-gray-700 dark:text-gray-300'
        };
    }
  };

  // Icon mapping
  const getCardIcon = (label: string) => {
    const icons: Record<string, React.ReactNode> = {
      'Total Employees': <IconUsers size={20} />,
      'Sheets Submitted': <IconFileCheck size={20} />,
      'Pending Approvals': <IconClock size={20} />,
      'Managers with Pending': <IconUserCheck size={20} />,
      'Q1 Check-ins Done %': <IconChecklist size={20} />,
      'Overall Completion Rate': <IconChartBar size={20} />
    };
    return icons[label] || <IconChartBar size={20} />;
  };

  const metrics = [
    { label: 'Total Employees', value: totalEmployees.toString(), numericValue: totalEmployees, change: totalEmployeesChange, formatValue: (val: string) => val },
    { label: 'Sheets Submitted', value: sheetsSubmitted.toString(), numericValue: sheetsSubmitted, change: sheetsSubmittedChange, formatValue: (val: string) => val },
    { label: 'Pending Approvals', value: pendingApprovals.toString(), numericValue: pendingApprovals, change: pendingApprovalsChange, formatValue: (val: string) => val },
    { label: 'Managers with Pending', value: managersWithPending.toString(), numericValue: managersWithPending, change: managersPendingChange, formatValue: (val: string) => val },
    { label: 'Q1 Check-ins Done %', value: `${checkinPct}%`, numericValue: checkinPct, change: checkinPctChange, formatValue: (val: string) => val },
    { label: 'Overall Completion Rate', value: `${overallCompletion}%`, numericValue: overallCompletion, change: overallCompletionChange, formatValue: (val: string) => val }
  ];

  useEffect(() => {
    fetchData();
    fetchPreviousData();
  }, []);

  const fetchPreviousData = async () => {
    try {
      // Fetch previous period data (Q4)
      const { data: previousProfiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'employee');

      if (!previousProfiles || previousProfiles.length === 0) return;

      const previousEmployeeIds = previousProfiles.map((p: any) => p.id);

      const { data: previousGoalsData } = await supabase
        .from('goals')
        .select('*')
        .in('employee_id', previousEmployeeIds)
        .not('status', 'eq', 'draft');

      const previousGoalIds = (previousGoalsData || []).map((g: any) => g.id);

      let previousAchievementsData: any[] = [];
      if (previousGoalIds.length > 0) {
        const { data } = await supabase
          .from('goal_achievements')
          .select('goal_id, actual_value')
          .eq('quarter', 'Q4')
          .in('goal_id', previousGoalIds);
        previousAchievementsData = data || [];
      }

      const previousRows = previousProfiles.map((profile: any) => {
        const empGoals = (previousGoalsData || []).filter((g: any) => g.employee_id === profile.id);
        const hasApproved = empGoals.some((g: any) => g.status === 'approved' || g.status === 'locked');
        const empGoalIds = empGoals.map((g: any) => g.id);
        const empAchievements = previousAchievementsData.filter((a: any) => empGoalIds.includes(a.goal_id));
        const hasCheckin = empAchievements.some((a: any) => a.actual_value);

        return {
          approvalStatus: hasApproved ? 'Approved' : 'Pending',
          checkinStatus: hasCheckin ? 'Submitted' : 'Not Started'
        };
      });

      const prevTotalEmployees = previousProfiles.length;
      const prevSheetsSubmitted = previousRows.filter(e => 
        e.approvalStatus === 'Approved' || e.approvalStatus === 'Pending'
      ).length;
      const prevPendingApprovals = previousRows.filter(e => e.approvalStatus === 'Pending').length;
      const prevManagersWithPending = new Set(
        previousProfiles.filter((_, idx) => previousRows[idx].approvalStatus === 'Pending').map(p => p.manager_id)
      ).size;
      const prevCheckinsDone = previousRows.filter(e => e.checkinStatus === 'Submitted').length;
      const prevCheckinPct = prevTotalEmployees > 0 ? Math.round((prevCheckinsDone / prevTotalEmployees) * 100) : 0;
      const prevApprovedCount = previousRows.filter(e => e.approvalStatus === 'Approved').length;
      const prevOverallCompletion = prevTotalEmployees > 0 ? Math.round((prevApprovedCount / prevTotalEmployees) * 100) : 0;

      setPreviousMetrics({
        totalEmployees: prevTotalEmployees,
        sheetsSubmitted: prevSheetsSubmitted,
        pendingApprovals: prevPendingApprovals,
        managersWithPending: prevManagersWithPending,
        checkinPct: prevCheckinPct,
        overallCompletion: prevOverallCompletion
      });
    } catch (err) {
      console.error('Error fetching previous data:', err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      // All employees
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'employee');

      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) {
        setEmployees([]);
        setChartData([]);
        return;
      }

      const employeeIds = profiles.map((p: any) => p.id);

      // Resolve manager names
      const managerIds = [...new Set(profiles.map((p: any) => p.manager_id).filter(Boolean))];
      let managerMap: Record<string, string> = {};
      if (managerIds.length > 0) {
        const { data: managers } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', managerIds);
        (managers || []).forEach((m: any) => {
          managerMap[m.id] = m.full_name;
        });
      }

      // Goals for all employees
      const { data: goalsData } = await supabase
        .from('goals')
        .select('*')
        .in('employee_id', employeeIds)
        .not('status', 'eq', 'draft');

      const goalIds = (goalsData || []).map((g: any) => g.id);

      // Q1 achievements
      let achievementsData: any[] = [];
      if (goalIds.length > 0) {
        const { data } = await supabase
          .from('goal_achievements')
          .select('goal_id, actual_value')
          .eq('quarter', CURRENT_QUARTER)
          .in('goal_id', goalIds);
        achievementsData = data || [];
      }

      // Build employee rows
      const rows: EmployeeRow[] = profiles.map((profile: any) => {
        const empGoals = (goalsData || []).filter((g: any) => g.employee_id === profile.id);
        const hasApproved = empGoals.some((g: any) =>
          g.status === 'approved' || g.status === 'locked'
        );
        const hasPending = empGoals.some((g: any) => g.status === 'submitted');
        const isLocked = empGoals.some((g: any) => g.status === 'locked');

        const empGoalIds = empGoals.map((g: any) => g.id);
        const empAchievements = achievementsData.filter((a: any) =>
          empGoalIds.includes(a.goal_id)
        );
        const hasCheckin = empAchievements.some((a: any) => a.actual_value);

        return {
          id: profile.id,
          name: profile.full_name,
          department: profile.department || '—',
          manager: managerMap[profile.manager_id] || '—',
          managerId: profile.manager_id || '',
          approvalStatus: hasApproved ? 'Approved' : 'Pending',
          checkinStatus: hasCheckin ? 'Submitted' : 'Not Started',
          isLocked
        };
      });

      setEmployees(rows);

      // Build chart data — checkin completion % per department
      const deptMap: Record<string, { total: number; done: number }> = {};
      rows.forEach(emp => {
        if (!deptMap[emp.department]) deptMap[emp.department] = { total: 0, done: 0 };
        deptMap[emp.department].total += 1;
        if (emp.checkinStatus === 'Submitted') deptMap[emp.department].done += 1;
      });

      const chart: ChartEntry[] = Object.entries(deptMap).map(([dept, { total, done }]) => ({
        department: dept,
        completion: Math.round((done / total) * 100)
      }));

      setChartData(chart);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async (employeeId: string) => {
    try {
      setUnlocking(employeeId);
      setError('');

      const { error: updateError } = await supabase
        .from('goals')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('employee_id', employeeId)
        .eq('status', 'locked');

      if (updateError) throw updateError;

      // Audit log
      await supabase.from('audit_logs').insert({
        action: 'Goals unlocked for revision',
        performed_by: user.id,
        employee_affected: employeeId,
        field_changed: 'status',
        old_value: 'locked',
        new_value: 'approved'
      });

      setSuccess('Goals unlocked successfully');
      setTimeout(() => setSuccess(''), 3000);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to unlock goals');
    } finally {
      setUnlocking(null);
    }
  };

  if (loading) {
    return (
      <PageLayout title="Organization Dashboard">
        <div className="flex items-center justify-center py-20">
          <div className="text-[14px] text-[#9CA3AF]">Loading dashboard...</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Organization Dashboard">
      {error && (
        <div className="text-[13px] text-[#991B1B] dark:text-[#F87171] bg-[#FEF2F2] dark:bg-[#2A0000] px-4 py-3 rounded-full mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="text-[13px] text-[#166534] dark:text-[#4ADE80] bg-[#F0FDF4] dark:bg-[#0D2818] px-4 py-3 rounded-full mb-4">
          {success}
        </div>
      )}

      {/* Metric Tiles - Dynamic colors based on rules */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {metrics.map((metric) => {
          const colors = getCardColors(metric.label, metric.numericValue);
          const icon = getCardIcon(metric.label);
          return (
            <div
              key={metric.label}
              className={`${colors.bg} ${colors.border} border rounded-[15px] p-4 transition-all duration-200 hover:shadow-md`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={`${colors.iconBg} p-2 rounded-full`}>
                  <div className={colors.iconColor}>
                    {icon}
                  </div>
                </div>
                {!metric.change.isNeutral && (
                  <div className={`flex items-center gap-0.5 text-[11px] font-medium ${
                    metric.change.isPositive
                      ? 'text-[#16A34A]'
                      : 'text-[#DC2626]'
                  }`}>
                    {metric.change.isPositive ? (
                      <IconTrendingUp size={12} />
                    ) : (
                      <IconTrendingDown size={12} />
                    )}
                    <span>{metric.change.value}%</span>
                  </div>
                )}
                {metric.change.isNeutral && (
                  <div className="text-[11px] font-medium text-[#9CA3AF]">
                    No change
                  </div>
                )}
              </div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-[#6B7280] dark:text-[#555555] mb-1">
                {metric.label}
              </div>
              <div className={`text-[32px] font-semibold tracking-tight ${colors.valueColor}`}>
                {metric.formatValue(metric.value)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bar Chart - Slim bars with capsule rounded tops and custom tooltip */}
      <div className="bg-white dark:bg-[#1A1A1A] border border-[#E8E8E4] dark:border-[#2A2A2A] rounded-[12px] p-6 mb-6">
        <h2 className="text-[15px] font-medium text-[#1A1A1A] dark:text-[#F5F5F5] mb-4">
          Check-in Completion by Department
        </h2>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-[14px] text-[#9CA3AF]">
            No department data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} barGap={8} barCategoryGap={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E4" vertical={false} />
              <XAxis 
                dataKey="department" 
                tick={{ fontSize: 12, fill: '#6B7280' }} 
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#6B7280' }} 
                domain={[0, 100]} 
                axisLine={false}
                tickLine={false}
                width={35}
              />
              <Tooltip 
                content={<CustomTooltip />}
                cursor={{ fill: '#F5A80010' }}
              />
              <Bar 
                dataKey="completion" 
                fill="#F5A800" 
                radius={[8, 8, 1, 1]} 
                barSize={32}
                background={{ fill: '#F3F4F6' }}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* All Employees Table */}
      <div className="bg-white dark:bg-[#1A1A1A] border border-[#E8E8E4] dark:border-[#2A2A2A] rounded-[12px] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8E8E4] dark:border-[#2A2A2A]">
          <h2 className="text-[15px] font-medium text-[#1A1A1A] dark:text-[#F5F5F5]">
            All Employees
          </h2>
        </div>
        {employees.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-[14px] text-[#9CA3AF]">
            No employees found
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#FAFAF8] dark:bg-[#141414]">
              <tr className="border-b border-[#E8E8E4] dark:border-[#2A2A2A]">
                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3">Name</th>
                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3">Department</th>
                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3">Manager</th>
                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3">Approval Status</th>
                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3">Check-in Status</th>
                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr
                  key={employee.id}
                  className="border-b border-[#E8E8E4] dark:border-[#2A2A2A] last:border-0 hover:bg-[#FAFAFA] dark:hover:bg-[#1F1F1F] transition-colors duration-150"
                >
                  <td className="text-[14px] text-[#1A1A1A] dark:text-[#F5F5F5] px-6 py-3">
                    {employee.name}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium ${getDepartmentColor(employee.department)}`}>
                      {employee.department}
                    </span>
                  </td>
                  <td className="text-[14px] text-[#6B7280] dark:text-[#888888] px-6 py-3">
                    {employee.manager}
                  </td>
                  <td className="px-6 py-3">
                    <Badge variant={employee.approvalStatus === 'Approved' ? 'success' : 'warning'}>
                      {employee.approvalStatus}
                    </Badge>
                  </td>
                  <td className="px-6 py-3">
                    <Badge variant={employee.checkinStatus === 'Submitted' ? 'success' : 'gray'}>
                      {employee.checkinStatus}
                    </Badge>
                  </td>
                  <td className="px-6 py-3">
                    {employee.isLocked && (
                      <Button
                        variant="outlined"
                        className="text-[13px] h-8 px-4 rounded-full"
                        onClick={() => handleUnlock(employee.id)}
                        disabled={unlocking === employee.id}
                      >
                        {unlocking === employee.id ? 'Unlocking...' : 'Unlock Goals'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PageLayout>
  );
}