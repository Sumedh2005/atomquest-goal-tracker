import { useState, useEffect } from 'react';
import { PageLayout } from '../../components/layout/PageLayout';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface CheckinGoal {
  id: string;
  title: string;
  uom_type: string;
  target: string;
  actual: string;
  status: string;
  score: number | null;
  achievement_id: string | null;
  isShared?: boolean;
}

interface CycleWindow {
  name: string;
  window_open: string;
  deadline: string;
  status: string;
}

const statusOptions = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'on_track', label: 'On Track' },
  { value: 'completed', label: 'Completed' }
];

const uomLabels: Record<string, string> = {
  numeric_min: 'Numeric – Higher is better',
  numeric_max: 'Numeric – Lower is better',
  timeline: 'Timeline',
  zero_based: 'Zero-based'
};

const CURRENT_QUARTER = 'Q1';

function computeScore(uom: string, target: string, actual: string): number | null {
  if (!actual || !target) return null;

  if (uom === 'zero_based') {
    return actual.trim() === '0' ? 100 : 0;
  }

  const targetNum = parseFloat(target.replace(/[^0-9.]/g, ''));
  const actualNum = parseFloat(actual.replace(/[^0-9.]/g, ''));

  if (isNaN(targetNum) || isNaN(actualNum) || targetNum === 0) return null;

  if (uom === 'numeric_min') {
    return Math.min(Math.round((actualNum / targetNum) * 100), 100);
  }

  if (uom === 'numeric_max') {
    return Math.min(Math.round((targetNum / actualNum) * 100), 100);
  }

  return null;
}

export function QuarterlyCheckin() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<CheckinGoal[]>([]);
  const [cycleWindow, setCycleWindow] = useState<CycleWindow | null>(null);
  const [windowOpen, setWindowOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchCycleAndGoals();
  }, []);

  const fetchCycleAndGoals = async () => {
    try {
      setLoading(true);

      // Check active cycle for current quarter
      const { data: cycles } = await supabase
        .from('cycles')
        .select('name, window_open, deadline, status')
        .ilike('name', `%${CURRENT_QUARTER}%`)
        .eq('status', 'active')
        .single();

      if (cycles) {
        setCycleWindow(cycles);
        const now = new Date();
        const open = new Date(cycles.window_open);
        const deadline = new Date(cycles.deadline);
        setWindowOpen(now >= open && now <= deadline);
      } else {
        setCycleWindow(null);
        setWindowOpen(false);
      }

      // Fetch own goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('employee_id', user.id)
        .in('status', ['approved', 'locked'])
        .order('created_at', { ascending: true });

      if (goalsError) throw goalsError;

      // Shared goals
      const { data: sharedRecipients } = await supabase
        .from('shared_goal_recipients')
        .select('id, weightage, shared_goals(id, title, target, uom_type)')
        .eq('employee_id', user.id);

      const sharedAsGoals = (sharedRecipients || []).map((r: any) => ({
        id: r.shared_goals.id,
        title: r.shared_goals.title,
        uom_type: r.shared_goals.uom_type,
        target: r.shared_goals.target,
        isShared: true
      }));

      const allGoals = [
        ...(goalsData || []).map((g: any) => ({ ...g, isShared: false })),
        ...sharedAsGoals
      ];

      const allGoalIds = allGoals.map(g => g.id);

      const { data: achievements } = await supabase
        .from('goal_achievements')
        .select('*')
        .eq('quarter', CURRENT_QUARTER)
        .in('goal_id', allGoalIds.length > 0 ? allGoalIds : ['']);

      const merged = allGoals.map((goal: any) => {
        const achievement = achievements?.find((a: any) => a.goal_id === goal.id);
        return {
          id: goal.id,
          title: goal.title,
          uom_type: goal.uom_type,
          target: goal.target,
          actual: achievement?.actual_value || '',
          status: achievement?.status || 'not_started',
          score: achievement?.progress_score || null,
          achievement_id: achievement?.id || null,
          isShared: goal.isShared
        };
      });

      setGoals(merged);
    } catch (err: any) {
      setError(err.message || 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const updateGoal = (id: string, field: keyof CheckinGoal, value: any) => {
    setGoals(goals.map(g => {
      if (g.id !== id) return g;
      const updated = { ...g, [field]: value };
      if (field === 'actual') {
        updated.score = computeScore(g.uom_type, g.target, value);
      }
      return updated;
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      for (const goal of goals) {
        const score = computeScore(goal.uom_type, goal.target, goal.actual);

        if (goal.achievement_id) {
          await supabase
            .from('goal_achievements')
            .update({
              actual_value: goal.actual,
              status: goal.status,
              progress_score: score,
              updated_at: new Date().toISOString()
            })
            .eq('id', goal.achievement_id);
        } else {
          await supabase
            .from('goal_achievements')
            .insert({
              goal_id: goal.id,
              quarter: CURRENT_QUARTER,
              actual_value: goal.actual,
              status: goal.status,
              progress_score: score
            });
        }
      }

      setSuccess('Check-in saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
      fetchCycleAndGoals();
    } catch (err: any) {
      setError(err.message || 'Failed to save check-in');
    } finally {
      setSaving(false);
    }
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-[#9CA3AF]';
    if (score >= 90) return 'text-[#166534] dark:text-[#4ADE80]';
    if (score >= 60) return 'text-[#92400E] dark:text-[#F5A800]';
    return 'text-[#991B1B] dark:text-[#F87171]';
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });

  if (loading) {
    return (
      <PageLayout title="Q1 check-in" subtitle="Enter your actual achievement for each goal.">
        <div className="flex items-center justify-center py-20">
          <div className="text-[14px] text-[#9CA3AF]">Loading goals...</div>
        </div>
      </PageLayout>
    );
  }

  // Window closed state
  if (!windowOpen) {
    return (
      <PageLayout title="Q1 check-in" subtitle="Enter your actual achievement for each goal.">
        <div className="bg-white dark:bg-[#1A1A1A] border border-[#E8E8E4] dark:border-[#2A2A2A] rounded-[12px] p-12 flex flex-col items-center justify-center text-center">
          <div className="text-[16px] font-medium text-[#1A1A1A] dark:text-[#F5F5F5] mb-2">
            Check-in window is closed
          </div>
          <div className="text-[14px] text-[#6B7280] dark:text-[#888888]">
            {cycleWindow
              ? `The ${cycleWindow.name} window runs from ${formatDate(cycleWindow.window_open)} to ${formatDate(cycleWindow.deadline)}.`
              : 'No active check-in window found. Check back when the window opens.'}
          </div>
          {goals.length > 0 && (
            <div className="mt-6 w-full max-w-2xl">
              <div className="text-[13px] font-medium text-[#9CA3AF] uppercase mb-3">
                Your submitted actuals (read-only)
              </div>
              <div className="bg-white dark:bg-[#1A1A1A] border border-[#E8E8E4] dark:border-[#2A2A2A] rounded-[12px] overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E8E8E4] dark:border-[#2A2A2A]">
                      <th className="text-left text-[11px] font-medium uppercase text-[#9CA3AF] px-4 py-3">Goal</th>
                      <th className="text-left text-[11px] font-medium uppercase text-[#9CA3AF] px-4 py-3">Actual</th>
                      <th className="text-left text-[11px] font-medium uppercase text-[#9CA3AF] px-4 py-3">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {goals.map(goal => (
                      <tr key={goal.id} className="border-b border-[#E8E8E4] dark:border-[#2A2A2A] last:border-0">
                        <td className="text-[14px] text-[#1A1A1A] dark:text-[#F5F5F5] px-4 py-3">{goal.title}</td>
                        <td className="text-[14px] text-[#6B7280] dark:text-[#888888] px-4 py-3">{goal.actual || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[13px] font-medium ${getScoreColor(goal.score)}`}>
                            {goal.score !== null ? `${goal.score}%` : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </PageLayout>
    );
  }

  if (goals.length === 0) {
    return (
      <PageLayout title="Q1 check-in" subtitle="Enter your actual achievement for each goal.">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-[#9CA3AF] text-[14px] mb-2">No approved goals found</div>
          <div className="text-[#9CA3AF] text-[13px]">
            Your goals need to be approved by your manager before you can log check-in data.
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Q1 check-in"
      subtitle={cycleWindow ? `Window closes ${formatDate(cycleWindow.deadline)}` : 'Enter your actual achievement for each goal.'}
      action={<Badge variant="success">Window open</Badge>}
    >
      {error && (
        <div className="text-[13px] text-[#991B1B] bg-[#FEF2F2] dark:bg-[#2A0000] px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="text-[13px] text-[#166534] dark:text-[#4ADE80] bg-[#F0FDF4] dark:bg-[#0D2818] px-4 py-3 rounded-lg mb-4">
          {success}
        </div>
      )}

      <div className="bg-white dark:bg-[#1A1A1A] border border-[#E8E8E4] dark:border-[#2A2A2A] rounded-[12px] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E8E8E4] dark:border-[#2A2A2A]">
              <th className="text-left text-[11px] font-medium uppercase text-[#9CA3AF] px-4 py-3">Goal Title</th>
              <th className="text-left text-[11px] font-medium uppercase text-[#9CA3AF] px-4 py-3">UoM</th>
              <th className="text-left text-[11px] font-medium uppercase text-[#9CA3AF] px-4 py-3">Planned Target</th>
              <th className="text-left text-[11px] font-medium uppercase text-[#9CA3AF] px-4 py-3">Actual Achievement</th>
              <th className="text-left text-[11px] font-medium uppercase text-[#9CA3AF] px-4 py-3">Status</th>
              <th className="text-left text-[11px] font-medium uppercase text-[#9CA3AF] px-4 py-3">Progress Score</th>
            </tr>
          </thead>
          <tbody>
            {goals.map((goal) => (
              <tr
                key={goal.id}
                className="border-b border-[#E8E8E4] dark:border-[#2A2A2A] last:border-0 hover:bg-[#FAFAFA] dark:hover:bg-[#1F1F1F]"
              >
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
                  {uomLabels[goal.uom_type] || goal.uom_type}
                </td>
                <td className="text-[14px] text-[#6B7280] dark:text-[#888888] px-4 py-3">
                  {goal.target}
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={goal.actual}
                    onChange={(e) => updateGoal(goal.id, 'actual', e.target.value)}
                    className="w-full h-8 px-2 rounded-[8px] bg-[#F7F7F5] dark:bg-[#242424] border border-transparent text-[14px] text-[#1A1A1A] dark:text-[#F5F5F5] transition-colors focus:outline-none focus:bg-white dark:focus:bg-[#242424] focus:border-[#F5A800]"
                    placeholder="Enter actual"
                  />
                </td>
                <td className="px-4 py-3 min-w-[140px]">
                  <select
                    value={goal.status}
                    onChange={(e) => updateGoal(goal.id, 'status', e.target.value)}
                    className="w-full h-8 px-2 rounded-[8px] bg-[#F7F7F5] dark:bg-[#242424] border border-transparent text-[14px] text-[#1A1A1A] dark:text-[#F5F5F5] transition-colors focus:outline-none focus:bg-white dark:focus:bg-[#242424] focus:border-[#F5A800]"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[13px] font-medium ${getScoreColor(goal.score)}`}>
                    {goal.score !== null ? `${goal.score}%` : '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-col items-end gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save check-in'}
        </Button>
        <p className="text-[12px] text-[#6B7280] dark:text-[#888888]">
          You can update your actuals until the window closes.
        </p>
      </div>
    </PageLayout>
  );
}