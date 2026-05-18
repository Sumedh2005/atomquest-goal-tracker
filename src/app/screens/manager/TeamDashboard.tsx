import { useState, useEffect } from 'react';
import { PageLayout } from '../../components/layout/PageLayout';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { IconTrendingUp, IconTrendingDown } from '@tabler/icons-react';

const CURRENT_QUARTER = 'Q1';

// Department color mapping
// Department color mapping
const departmentColors: Record<string, string> = {
  'Engineering': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'Product': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'Marketing': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  'Sales': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300', // Changed to emerald green
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

export function TeamDashboard() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previousMetrics, setPreviousMetrics] = useState({
    teamSize: 0,
    pendingApprovals: 0,
    checkinsDone: 0,
    goalsLocked: 0
  });

  useEffect(() => {
    fetchTeamData();
    fetchPreviousData();
  }, []);

  const fetchPreviousData = async () => {
    try {
      // Get team members from previous period
      const { data: previousMembers } = await supabase
        .from('profiles')
        .select('*')
        .eq('manager_id', user.id);

      if (!previousMembers || previousMembers.length === 0) {
        return;
      }

      const previousMemberIds = previousMembers.map((m: any) => m.id);

      // Get previous goals
      const { data: previousGoalsData } = await supabase
        .from('goals')
        .select('*')
        .in('employee_id', previousMemberIds);

      // Get previous achievements (Q4)
      const previousGoalIds = (previousGoalsData || []).map((g: any) => g.id);
      let previousAchievementsData: any[] = [];
      if (previousGoalIds.length > 0) {
        const { data } = await supabase
          .from('goal_achievements')
          .select('*')
          .eq('quarter', 'Q4')
          .in('goal_id', previousGoalIds);
        previousAchievementsData = data || [];
      }

      const previousApprovedGoals = (previousGoalsData || []).filter(
        (g: any) => g.status === 'approved' || g.status === 'locked'
      );

      const previousSubmittedGoals = (previousGoalsData || []).filter(
        (g: any) => g.status === 'submitted'
      );

      const previousCheckinsDone = previousAchievementsData.filter((a: any) => a.actual_value).length;
      const previousCheckinsCount = previousAchievementsData.length > 0 ? 1 : 0;

      setPreviousMetrics({
        teamSize: previousMembers.length,
        pendingApprovals: previousSubmittedGoals.length,
        checkinsDone: previousCheckinsCount,
        goalsLocked: previousApprovedGoals.length
      });
    } catch (err) {
      console.error('Error fetching previous data:', err);
    }
  };

  const fetchTeamData = async () => {
    try {
      setLoading(true);

      // Get all team members
      const { data: members } = await supabase
        .from('profiles')
        .select('*')
        .eq('manager_id', user.id);

      if (!members || members.length === 0) {
        setTeamMembers([]);
        return;
      }

      const memberIds = members.map((m: any) => m.id);

      // Get all goals for team
      const { data: goalsData } = await supabase
        .from('goals')
        .select('*')
        .in('employee_id', memberIds);

      // Get Q1 achievements
      const goalIds = (goalsData || []).map((g: any) => g.id);
      let achievementsData: any[] = [];
      if (goalIds.length > 0) {
        const { data } = await supabase
          .from('goal_achievements')
          .select('*')
          .eq('quarter', CURRENT_QUARTER)
          .in('goal_id', goalIds);
        achievementsData = data || [];
      }

      // Get checkin comments
      const { data: comments } = await supabase
        .from('checkin_comments')
        .select('*')
        .eq('manager_id', user.id)
        .eq('quarter', CURRENT_QUARTER);

      // Enrich each member
      const enriched = members.map((member: any) => {
        const memberGoals = (goalsData || []).filter(
          (g: any) => g.employee_id === member.id
        );

        const approvedGoals = memberGoals.filter(
          (g: any) => g.status === 'approved' || g.status === 'locked'
        );

        const submittedGoals = memberGoals.filter(
          (g: any) => g.status === 'submitted'
        );

        // Approval status
        let approvalStatus = 'No Goals';
        if (submittedGoals.length > 0) approvalStatus = 'Pending';
        if (approvedGoals.length > 0 && submittedGoals.length === 0) approvalStatus = 'Approved';

        // Check-in status
        const memberGoalIds = approvedGoals.map((g: any) => g.id);
        const memberAchievements = achievementsData.filter(
          (a: any) => memberGoalIds.includes(a.goal_id)
        );
        const hasSubmitted = memberAchievements.some((a: any) => a.actual_value);
        const checkinStatus = hasSubmitted ? 'Submitted' : 'Not Started';

        // Avg score
        const scores = memberAchievements
          .filter((a: any) => a.progress_score !== null)
          .map((a: any) => a.progress_score);
        const avgScore = scores.length > 0
          ? Math.round(scores.reduce((s: number, n: number) => s + n, 0) / scores.length)
          : null;

        return {
          ...member,
          goalCount: memberGoals.length,
          approvalStatus,
          checkinStatus,
          avgScore
        };
      });

      setTeamMembers(enriched);
    } catch (err: any) {
      setError(err.message || 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const teamSize = teamMembers.length;
  const pendingApprovals = teamMembers.filter(m => m.approvalStatus === 'Pending').length;
  const checkinsDone = teamMembers.filter(m => m.checkinStatus === 'Submitted').length;
  const goalsLocked = teamMembers.filter(m => m.approvalStatus === 'Approved').length;

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

  const teamSizeChange = calculateChange(teamSize, previousMetrics.teamSize);
  const pendingChange = calculateChange(pendingApprovals, previousMetrics.pendingApprovals);
  const checkinsChange = calculateChange(checkinsDone, previousMetrics.checkinsDone);
  const goalsLockedChange = calculateChange(goalsLocked, previousMetrics.goalsLocked);

  const getProgressBarColor = (score: number) => {
    if (score >= 90) return 'bg-[#16A34A] dark:bg-[#4ADE80]';
    if (score >= 60) return 'bg-[#F5A800] dark:bg-[#F5A800]';
    return 'bg-[#DC2626] dark:bg-[#EF4444]';
  };

  const metrics = [
    { 
      label: 'Team size', 
      value: teamSize.toString(), 
      highlight: false,
      change: teamSizeChange,
      formatValue: (val: string) => val
    },
    { 
      label: 'Pending approvals', 
      value: pendingApprovals.toString(), 
      highlight: pendingApprovals > 0,
      change: pendingChange,
      formatValue: (val: string) => val
    },
    { 
      label: 'Q1 check-ins done', 
      value: `${checkinsDone}/${teamSize}`, 
      highlight: false,
      change: checkinsChange,
      formatValue: (val: string) => val
    },
    { 
      label: 'Goals locked', 
      value: goalsLocked.toString(), 
      highlight: false,
      change: goalsLockedChange,
      formatValue: (val: string) => val
    }
  ];

  const getApprovalVariant = (status: string) => {
    if (status === 'Approved') return 'success';
    if (status === 'Pending') return 'warning';
    return 'gray';
  };

  const getCheckinVariant = (status: string) => {
    return status === 'Submitted' ? 'success' : 'gray';
  };

  if (loading) {
    return (
      <PageLayout title="Team Dashboard">
        <div className="flex items-center justify-center py-20">
          <div className="text-[14px] text-[#9CA3AF]">Loading team data...</div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title="Team Dashboard">
        <div className="text-[13px] text-[#991B1B] bg-[#FEF2F2] px-4 py-3 rounded-lg">
          {error}
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Team Dashboard">
      {/* Metric Tiles - Same design as employee dashboard */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="bg-white dark:bg-[#242424] border border-[#EBEBE8] dark:border-[#2A2A2A] rounded-[15px] p-4 transition-all duration-200 hover:shadow-sm"
          >
            <div className="text-[11px] font-medium uppercase tracking-wider text-[#6B7280] dark:text-[#555555] mb-1">
              {metric.label}
            </div>
            <div className="flex items-baseline justify-between">
              <div className={`text-[32px] font-semibold tracking-tight ${
                metric.highlight
                  ? 'text-[#92400E] dark:text-[#F5A800]'
                  : 'text-[#1A1A1A] dark:text-[#F5F5F5]'
              }`}>
                {metric.formatValue(metric.value)}
              </div>
              {!metric.change.isNeutral && (
                <div className={`flex items-center gap-0.5 text-[12px] font-medium ${
                  metric.change.isPositive
                    ? 'text-[#16A34A] dark:text-[#4ADE80]'
                    : 'text-[#DC2626] dark:text-[#EF4444]'
                }`}>
                  {metric.change.isPositive ? (
                    <IconTrendingUp size={14} />
                  ) : (
                    <IconTrendingDown size={14} />
                  )}
                  <span>{metric.change.value}%</span>
                </div>
              )}
              {metric.change.isNeutral && (
                <div className="text-[12px] font-medium text-[#9CA3AF] dark:text-[#666666]">
                  No change
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Team Table */}
      {teamMembers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#1A1A1A] border border-[#E8E8E4] dark:border-[#2A2A2A] rounded-[12px]">
          <div className="text-[#9CA3AF] text-[14px]">No team members found</div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1A1A1A] border border-[#E8E8E4] dark:border-[#2A2A2A] rounded-[12px] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#FAFAF8] dark:bg-[#141414]">
              <tr className="border-b border-[#E8E8E4] dark:border-[#2A2A2A]">
                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3">Team Member</th>
                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3">Department</th>
                <th className="text-right text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3">Goals</th>
                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3">Approval Status</th>
                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3">Check-in Status</th>
                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3">Q1 Avg Score</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-[#E8E8E4] dark:border-[#2A2A2A] last:border-0 hover:bg-[#FAFAFA] dark:hover:bg-[#1F1F1F] transition-colors duration-150 cursor-pointer"
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={member.full_name} size="sm" />
                      <span className="text-[14px] text-[#1A1A1A] dark:text-[#F5F5F5]">
                        {member.full_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium ${getDepartmentColor(member.department)}`}>
                      {member.department || 'Not Assigned'}
                    </span>
                  </td>
                  <td className="text-[14px] font-mono text-[#6B7280] dark:text-[#888888] px-6 py-3 text-right tabular-nums">
                    {member.goalCount}
                  </td>
                  <td className="px-6 py-3">
                    <Badge variant={getApprovalVariant(member.approvalStatus)}>
                      {member.approvalStatus}
                    </Badge>
                  </td>
                  <td className="px-6 py-3">
                    <Badge variant={getCheckinVariant(member.checkinStatus)}>
                      {member.checkinStatus}
                    </Badge>
                  </td>
                  <td className="px-6 py-3">
                    {member.avgScore !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-[#E8E8E4] dark:bg-[#2A2A2A] rounded-full overflow-hidden max-w-[80px]">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor(member.avgScore)}`}
                            style={{ width: `${member.avgScore}%` }}
                          />
                        </div>
                        <span className="text-[14px] font-mono text-[#6B7280] dark:text-[#888888] min-w-[40px] tabular-nums">
                          {member.avgScore}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-[14px] text-[#9CA3AF]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageLayout>
  );
}