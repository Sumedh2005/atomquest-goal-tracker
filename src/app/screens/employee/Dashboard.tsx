import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'
import { PageLayout } from '../../components/layout/PageLayout';
import { Badge } from '../../components/ui/Badge';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { IconTrendingUp, IconTrendingDown } from '@tabler/icons-react';

const CURRENT_QUARTER = 'Q1';

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [goals, setGoals] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [previousMetrics, setPreviousMetrics] = useState({
    totalGoals: 0,
    totalWeightage: 0,
    approvedGoals: 0,
    updatedGoals: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    fetchPreviousData();
  }, []);

  const fetchPreviousData = async () => {
    try {
      // Fetch previous quarter's goals and achievements
      const { data: previousGoalsData } = await supabase
        .from('goals')
        .select('*')
        .eq('employee_id', user.id)
        .not('status', 'eq', 'draft');

      const previousGoalIds = (previousGoalsData || []).map((g: any) => g.id);

      let previousAchievementsData: any[] = [];
      if (previousGoalIds.length > 0) {
        const { data } = await supabase
          .from('goal_achievements')
          .select('*')
          .eq('quarter', 'Q4') // Previous quarter (adjust based on your data)
          .in('goal_id', previousGoalIds);
        previousAchievementsData = data || [];
      }

      const previousUpdatedGoals = previousAchievementsData.filter(a => a.actual_value).length;
      const previousApprovedGoals = (previousGoalsData || []).filter(g =>
        g.status === 'approved' || g.status === 'locked'
      ).length;
      const previousTotalWeightage = (previousGoalsData || []).reduce((sum, g) => sum + g.weightage, 0);

      setPreviousMetrics({
        totalGoals: previousGoalsData?.length || 0,
        totalWeightage: previousTotalWeightage,
        approvedGoals: previousApprovedGoals,
        updatedGoals: previousUpdatedGoals
      });
    } catch (err) {
      console.error('Error fetching previous data:', err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: goalsData } = await supabase
        .from('goals')
        .select('*')
        .eq('employee_id', user.id)
        .not('status', 'eq', 'draft')
        .order('created_at', { ascending: true });

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

      setGoals(goalsData || []);
      setAchievements(achievementsData);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalGoals = goals.length;
  const totalWeightage = goals.reduce((sum, g) => sum + g.weightage, 0);
  const approvedGoals = goals.filter(g =>
    g.status === 'approved' || g.status === 'locked'
  ).length;
  const updatedGoals = achievements.filter(a => a.actual_value).length;

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

  const goalsChange = calculateChange(totalGoals, previousMetrics.totalGoals);
  const weightageChange = calculateChange(totalWeightage, previousMetrics.totalWeightage);
  const approvedChange = calculateChange(approvedGoals, previousMetrics.approvedGoals);
  const updatedChange = calculateChange(updatedGoals, previousMetrics.updatedGoals);

  const getAchievement = (goalId: string) => {
    return achievements.find(a => a.goal_id === goalId);
  };

  const getScoreVariant = (score: number | null) => {
    if (!score) return 'gray';
    if (score >= 90) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
  };

  const getStatusVariant = (status: string) => {
    if (status === 'completed') return 'success';
    if (status === 'on_track') return 'warning';
    return 'gray';
  };

  const getStatusLabel = (status: string) => {
    if (status === 'completed') return 'Completed';
    if (status === 'on_track') return 'On Track';
    return 'Not Started';
  };

  const metrics = [
    { 
      label: 'Total Goals', 
      value: totalGoals.toString(),
      change: goalsChange,
      formatValue: (val: string) => val
    },
    {
      label: 'Weightage',
      value: `${totalWeightage}%`,
      status: totalWeightage === 100 ? 'success' : '',
      change: weightageChange,
      formatValue: (val: string) => val
    },
    { 
      label: 'Approved Goals', 
      value: approvedGoals.toString(),
      change: approvedChange,
      formatValue: (val: string) => val
    },
    {
      label: 'Q1 Updated',
      value: totalGoals > 0 ? `${updatedGoals} of ${totalGoals}` : '0',
      change: updatedChange,
      formatValue: (val: string) => val
    }
  ];

  if (loading) {
    return (
      <PageLayout title="Dashboard">
        <div className="flex items-center justify-center py-20">
          <div className="text-[14px] text-[#9CA3AF]">Loading dashboard...</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Dashboard">
      {/* Metric Tiles */}
      {/* Metric Tiles */}
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
          metric.status === 'success'
            ? 'text-[#166534] dark:text-[#4ADE80]'
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

      {/* Check-in Banner */}
     {/* Check-in Banner */}
<div className="bg-white dark:bg-[#1F1A00] border border-[#EBEBE8] dark:border-[#2A2200] rounded-[15px] p-4 flex items-center justify-between mb-6 transition-all duration-200 hover:shadow-sm">
  <div className="flex items-center gap-3">
    <div className="relative flex h-2 w-2">
      <span className="animate-ping absolute h-full w-full rounded-full bg-[#F5A800] opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F5A800]"></span>
    </div>
    <span className="text-[14px] text-[#1A1A1A] dark:text-[#F5A800]">
      Q1 check-in window is open — update your achievements before 31 July.
    </span>
  </div>
  <button
    onClick={() => navigate('/employee/checkin')}
    className="px-4 py-2 bg-[#F5A800] hover:bg-[#E09600] text-[#1A1A1A] text-[13px] font-medium rounded-[55px] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
  >
    Go to check-in →
  </button>
</div>

      {/* Goal Progress Table */}
      <div className="bg-white dark:bg-[#1A1A1A] border border-[#E8E8E4] dark:border-[#2A2A2A] rounded-[12px] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8E8E4] dark:border-[#242424]">
          <h2 className="text-[15px] font-medium text-[#1A1A1A] dark:text-[#F5F5F5]">
            Goal Progress
          </h2>
        </div>

        {goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-[#9CA3AF] text-[14px] mb-2">No goals yet</div>
            <div className="text-[#9CA3AF] text-[13px]">
              Create and submit your goals to get started.
            </div>
            <button
              onClick={() => navigate('/employee/create-goals')}
              className="mt-4 text-[13px] text-[#F5A800] hover:underline"
            >
              Create goals →
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#FAFAF8] dark:bg-[#141414]">
              <tr className="border-b border-[#E8E8E4] dark:border-[#242424]">
                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3">
                  Goal
                </th>
                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3">
                  Thrust Area
                </th>
                <th className="text-right text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3">
                  Target
                </th>
                <th className="text-right text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3 whitespace-nowrap">
                  Q1 Actual
                </th>
                <th className="text-center text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3">
                  Score
                </th>
                <th className="text-center text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {goals.map((goal) => {
                const achievement = getAchievement(goal.id);
                return (
                  <tr
                    key={goal.id}
                    className="border-b border-[#E8E8E4] dark:border-[#242424] last:border-0 hover:bg-[#FAFAFA] dark:hover:bg-[#1F1F1F] transition-colors duration-150"
                  >
                    <td className="text-[14px] text-[#1A1A1A] dark:text-[#E0E0E0] px-6 py-3">
                      {goal.title}
                    </td>
                    <td className="text-[14px] text-[#6B7280] dark:text-[#888888] px-6 py-3">
                      {goal.thrust_area}
                    </td>
                    <td className="text-[14px] font-mono text-[#6B7280] dark:text-[#888888] px-6 py-3 text-right tabular-nums">
                      {goal.target}
                    </td>
                    <td className="text-[14px] font-mono text-[#6B7280] dark:text-[#888888] px-6 py-3 text-right tabular-nums">
                      {achievement?.actual_value || '—'}
                    </td>
                    <td className="text-[14px] px-6 py-3 text-center">
                      {achievement?.progress_score ? (
                        <Badge variant={getScoreVariant(achievement.progress_score)}>
                          {achievement.progress_score}%
                        </Badge>
                      ) : (
                        <span className="text-[#9CA3AF]">—</span>
                      )}
                    </td>
                    <td className="text-[14px] px-6 py-3 text-center">
                      <Badge variant={getStatusVariant(achievement?.status || 'not_started')}>
                        {getStatusLabel(achievement?.status || 'not_started')}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </PageLayout>
  );
}