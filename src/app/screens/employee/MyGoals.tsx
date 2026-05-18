import { useState, useEffect } from 'react';
import { PageLayout } from '../../components/layout/PageLayout';
import { Lock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const uomLabels: Record<string, string> = {
  numeric_min: 'Numeric – Higher is better',
  numeric_max: 'Numeric – Lower is better',
  timeline: 'Timeline',
  zero_based: 'Zero-based'
};

interface GoalRow {
  id: string;
  title: string;
  thrust_area: string;
  uom_type: string;
  target: string;
  weightage: number;
  status: string;
  isShared: boolean;
}

export function MyGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      setLoading(true);

      const { data: ownGoals, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('employee_id', user.id)
        .in('status', ['submitted', 'approved', 'locked'])
        .order('created_at', { ascending: true });

      if (goalsError) throw goalsError;

      const { data: sharedRecipients, error: sharedError } = await supabase
        .from('shared_goal_recipients')
        .select('id, weightage, shared_goals(id, title, target, uom_type)')
        .eq('employee_id', user.id);

      if (sharedError) throw sharedError;

      const ownRows: GoalRow[] = (ownGoals || []).map((g: any) => ({
        ...g,
        isShared: false
      }));

      const sharedRows: GoalRow[] = (sharedRecipients || []).map((r: any) => ({
        id: r.shared_goals.id,
        title: r.shared_goals.title,
        thrust_area: 'Shared',
        uom_type: r.shared_goals.uom_type,
        target: r.shared_goals.target,
        weightage: r.weightage,
        status: 'approved',
        isShared: true
      }));

      setGoals([...ownRows, ...sharedRows]);
    } catch (err: any) {
      setError(err.message || 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const totalWeightage = goals.reduce((sum, g) => sum + g.weightage, 0);
  const isLocked = goals.some(g => !g.isShared && (g.status === 'locked' || g.status === 'approved'));

  if (loading) {
    return (
      <PageLayout title="My Goals">
        <div className="flex items-center justify-center py-20">
          <div className="text-[14px] text-[#9CA3AF]">Loading goals...</div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title="My Goals">
        <div className="text-[13px] text-[#991B1B] dark:text-[#F87171] bg-[#FEF2F2] dark:bg-[#2A0000] px-4 py-3 rounded-lg">
          {error}
        </div>
      </PageLayout>
    );
  }

  if (goals.length === 0) {
    return (
      <PageLayout title="My Goals">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-[#9CA3AF] text-[14px] mb-2">No goals found</div>
          <div className="text-[#9CA3AF] text-[13px]">
            Go to Create Goals to add and submit your goals for approval.
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="My Goals">
      {isLocked && (
        <div className="bg-[#F0FDF4] dark:bg-[#0D2818] border border-[#D1FAE5] dark:border-[#166534] rounded-[8px] p-4 flex items-center gap-3 mb-6">
          <Lock size={16} className="text-[#166534] dark:text-[#4ADE80]" />
          <span className="text-[14px] text-[#166534] dark:text-[#4ADE80]">
            Your goals have been approved and are now locked. Contact your admin for any changes.
          </span>
        </div>
      )}

      {goals.some(g => !g.isShared && g.status === 'submitted') && (
        <div className="bg-[#FFFBEB] dark:bg-[#2A1800] border border-[#FDE68A] dark:border-[#92400E] rounded-[8px] p-4 flex items-center gap-3 mb-6">
          <span className="text-[14px] text-[#92400E] dark:text-[#F5A800]">
            Your goals have been submitted and are awaiting manager approval.
          </span>
        </div>
      )}

      <div className="bg-white dark:bg-[#1A1A1A] border border-[#E8E8E4] dark:border-[#2A2A2A] rounded-[12px] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E8E8E4] dark:border-[#2A2A2A]">
              <th className="text-left text-[11px] font-medium uppercase text-[#9CA3AF] px-4 py-3">#</th>
              <th className="text-left text-[11px] font-medium uppercase text-[#9CA3AF] px-4 py-3">Goal Title</th>
              <th className="text-left text-[11px] font-medium uppercase text-[#9CA3AF] px-4 py-3">Thrust Area</th>
              <th className="text-left text-[11px] font-medium uppercase text-[#9CA3AF] px-4 py-3">UoM</th>
              <th className="text-left text-[11px] font-medium uppercase text-[#9CA3AF] px-4 py-3">Target</th>
              <th className="text-left text-[11px] font-medium uppercase text-[#9CA3AF] px-4 py-3">Weightage</th>
              <th className="text-left text-[11px] font-medium uppercase text-[#9CA3AF] px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {goals.map((goal, index) => (
              <tr
                key={goal.id}
                className="border-b border-[#E8E8E4] dark:border-[#2A2A2A] last:border-0 hover:bg-[#FAFAFA] dark:hover:bg-[#1F1F1F]"
              >
                <td className="text-[14px] text-[#6B7280] px-4 py-3">{index + 1}</td>
                <td className="text-[14px] text-[#1A1A1A] dark:text-[#F5F5F5] px-4 py-3">
                  <div className="flex items-center gap-2">
                    {goal.title}
                    {goal.isShared && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#FEF9EC] dark:bg-[#2A2200] text-[#F5A800] border border-[#F5A800]/30">
                        Shared
                      </span>
                    )}
                  </div>
                </td>
                <td className="text-[14px] text-[#6B7280] dark:text-[#888888] px-4 py-3">
                  {goal.thrust_area}
                </td>
                <td className="text-[14px] text-[#6B7280] dark:text-[#888888] px-4 py-3">
                  {uomLabels[goal.uom_type] || goal.uom_type}
                </td>
                <td className="text-[14px] text-[#6B7280] dark:text-[#888888] px-4 py-3">
                  {goal.target}
                </td>
                <td className="text-[14px] text-[#6B7280] dark:text-[#888888] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-[#E8E8E4] dark:bg-[#2A2A2A] rounded-full overflow-hidden max-w-[60px]">
                      <div
                        className="h-full bg-[#F5A800]"
                        style={{ width: `${goal.weightage}%` }}
                      />
                    </div>
                    <span>{goal.weightage}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[12px] font-medium px-2 py-1 rounded-full ${
                    goal.status === 'approved' || goal.status === 'locked'
                      ? 'bg-[#F0FDF4] text-[#166534] dark:bg-[#0D2818] dark:text-[#4ADE80]'
                      : goal.status === 'submitted'
                      ? 'bg-[#FFFBEB] text-[#92400E] dark:bg-[#2A1800] dark:text-[#F5A800]'
                      : 'bg-[#F3F4F6] text-[#6B7280] dark:bg-[#242424] dark:text-[#666666]'
                  }`}>
                    {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#F7F7F5] dark:bg-[#242424]">
              <td colSpan={5} className="text-right text-[14px] font-medium text-[#1A1A1A] dark:text-[#F5F5F5] px-4 py-3">
                Total weightage:
              </td>
              <td colSpan={2} className={`text-[14px] font-medium px-4 py-3 ${
                totalWeightage === 100
                  ? 'text-[#166534] dark:text-[#4ADE80]'
                  : 'text-[#92400E] dark:text-[#F5A800]'
              }`}>
                {totalWeightage}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </PageLayout>
  );
}