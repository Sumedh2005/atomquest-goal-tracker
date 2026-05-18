import { useState, useEffect } from 'react';
import { PageLayout } from '../../components/layout/PageLayout';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const CURRENT_QUARTER = 'Q1';

export function CheckinReview() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [existingComment, setExistingComment] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      setLoading(true);

      const { data: members } = await supabase
        .from('profiles')
        .select('*')
        .eq('manager_id', user.id);

      if (!members) return;

      const memberIds = members.map((m: any) => m.id);

      // Get approved goals for team
      const { data: goalsData } = await supabase
        .from('goals')
        .select('*')
        .in('employee_id', memberIds)
        .in('status', ['approved', 'locked']);

      const goalIds = (goalsData || []).map((g: any) => g.id);

      // Get Q1 achievements
      let achievementsData: any[] = [];
      if (goalIds.length > 0) {
        const { data } = await supabase
          .from('goal_achievements')
          .select('*')
          .eq('quarter', CURRENT_QUARTER)
          .in('goal_id', goalIds);
        achievementsData = data || [];
      }

      // Get existing checkin comments
      const { data: comments } = await supabase
        .from('checkin_comments')
        .select('*')
        .eq('manager_id', user.id)
        .eq('quarter', CURRENT_QUARTER)
        .in('employee_id', memberIds);

      // Enrich members with submission status
      const enriched = members.map((member: any) => {
        const memberGoalIds = (goalsData || [])
          .filter((g: any) => g.employee_id === member.id)
          .map((g: any) => g.id);

        const memberAchievements = achievementsData.filter(
          (a: any) => memberGoalIds.includes(a.goal_id)
        );

        const hasSubmitted = memberAchievements.length > 0 &&
          memberAchievements.some((a: any) => a.actual_value);

        const hasComment = (comments || []).some(
          (c: any) => c.employee_id === member.id
        );

        return {
          ...member,
          q1Status: hasSubmitted ? 'Submitted' : 'Not Submitted',
          hasComment
        };
      });

      setTeamMembers(enriched);
    } catch (err: any) {
      setError(err.message || 'Failed to load team');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMember = async (member: any) => {
    setSelectedMember(member);
    setComment('');
    setSuccess('');
    setError('');

    try {
      // Fetch goals
      const { data: goalsData } = await supabase
        .from('goals')
        .select('*')
        .eq('employee_id', member.id)
        .in('status', ['approved', 'locked'])
        .order('created_at', { ascending: true });

      const goalIds = (goalsData || []).map((g: any) => g.id);

      // Fetch achievements
      let achievementsData: any[] = [];
      if (goalIds.length > 0) {
        const { data } = await supabase
          .from('goal_achievements')
          .select('*')
          .eq('quarter', CURRENT_QUARTER)
          .in('goal_id', goalIds);
        achievementsData = data || [];
      }

      // Fetch existing comment
      const { data: commentData } = await supabase
        .from('checkin_comments')
        .select('*')
        .eq('manager_id', user.id)
        .eq('employee_id', member.id)
        .eq('quarter', CURRENT_QUARTER)
        .single();

      setGoals(goalsData || []);
      setAchievements(achievementsData);
      setExistingComment(commentData?.comment || '');
      setComment(commentData?.comment || '');
    } catch (err) {
      console.error('Error fetching member data:', err);
    }
  };

  const getAchievement = (goalId: string) => {
    return achievements.find(a => a.goal_id === goalId);
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-[#9CA3AF]';
    if (score >= 90) return 'text-[#166534] dark:text-[#4ADE80]';
    if (score >= 60) return 'text-[#92400E] dark:text-[#F5A800]';
    return 'text-[#991B1B] dark:text-[#F87171]';
  };

  const handleSubmitComment = async () => {
    if (!comment.trim()) {
      setError('Please add a comment before submitting');
      return;
    }

    try {
      setSaving(true);
      setError('');

      if (existingComment) {
        await supabase
          .from('checkin_comments')
          .update({ comment, created_at: new Date().toISOString() })
          .eq('manager_id', user.id)
          .eq('employee_id', selectedMember.id)
          .eq('quarter', CURRENT_QUARTER);
      } else {
        await supabase
          .from('checkin_comments')
          .insert({
            manager_id: user.id,
            employee_id: selectedMember.id,
            quarter: CURRENT_QUARTER,
            comment
          });
      }

      setSuccess('Check-in comment submitted successfully!');
      setExistingComment(comment);
      fetchTeam();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit comment');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="Check-in Review">
        <div className="flex items-center justify-center py-20">
          <div className="text-[14px] text-[#9CA3AF]">Loading team...</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Check-in Review">
      {error && (
        <div className="text-[13px] text-[#991B1B] bg-[#FEF2F2] dark:bg-[#2A0000] px-4 py-3 rounded-full mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Left panel — team list */}
        <div className="col-span-1 bg-white dark:bg-[#1A1A1A] border border-[#E8E8E4] dark:border-[#2A2A2A] rounded-[12px] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E8E8E4] dark:border-[#2A2A2A]">
            <h2 className="text-[15px] font-medium text-[#1A1A1A] dark:text-[#F5F5F5]">
              Team Members
            </h2>
          </div>
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className={`px-4 py-3 border-b border-[#E8E8E4] dark:border-[#2A2A2A] last:border-0 cursor-pointer transition-colors ${
                selectedMember?.id === member.id
                  ? 'bg-[#FEF9EC] dark:bg-[#2A2200]'
                  : 'hover:bg-[#FAFAFA] dark:hover:bg-[#1F1F1F]'
              }`}
              onClick={() => handleSelectMember(member)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Avatar name={member.full_name} size="sm" />
                  <span className="text-[14px] text-[#1A1A1A] dark:text-[#F5F5F5]">
                    {member.full_name}
                  </span>
                </div>
                {member.hasComment && (
                  <span className="text-[10px] text-[#166534] dark:text-[#4ADE80]">✓</span>
                )}
              </div>
              <div className="flex gap-2">
                <Badge variant={member.q1Status === 'Submitted' ? 'success' : 'gray'}>
                  {member.q1Status}
                </Badge>
                {member.hasComment && (
                  <Badge variant="success">Reviewed</Badge>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Right panel — goal details */}
        {selectedMember && selectedMember.q1Status === 'Submitted' ? (
          <div className="col-span-2 bg-white dark:bg-[#1A1A1A] border border-[#E8E8E4] dark:border-[#2A2A2A] rounded-[12px] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E8E8E4] dark:border-[#2A2A2A]">
              <h2 className="text-[15px] font-medium text-[#1A1A1A] dark:text-[#F5F5F5]">
                {selectedMember.full_name} — Q1 Goals
              </h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E8E8E4] dark:border-[#2A2A2A]">
                  <th className="text-left text-[11px] font-medium uppercase text-[#9CA3AF] px-4 py-3">Goal</th>
                  <th className="text-left text-[11px] font-medium uppercase text-[#9CA3AF] px-4 py-3">Planned</th>
                  <th className="text-left text-[11px] font-medium uppercase text-[#9CA3AF] px-4 py-3">Actual</th>
                  <th className="text-left text-[11px] font-medium uppercase text-[#9CA3AF] px-4 py-3">Score</th>
                 </tr>
              </thead>
              <tbody>
                {goals.map((goal) => {
                  const achievement = getAchievement(goal.id);
                  return (
                    <tr
                      key={goal.id}
                      className="border-b border-[#E8E8E4] dark:border-[#2A2A2A] last:border-0 hover:bg-[#FAFAFA] dark:hover:bg-[#1F1F1F]"
                    >
                      <td className="text-[14px] text-[#1A1A1A] dark:text-[#F5F5F5] px-4 py-3">
                        {goal.title}
                      </td>
                      <td className="text-[14px] text-[#6B7280] dark:text-[#888888] px-4 py-3">
                        {goal.target}
                      </td>
                      <td className="text-[14px] text-[#6B7280] dark:text-[#888888] px-4 py-3">
                        {achievement?.actual_value || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[13px] font-medium ${getScoreColor(achievement?.progress_score)}`}>
                          {achievement?.progress_score ? `${achievement.progress_score}%` : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-6 py-4 border-t border-[#E8E8E4] dark:border-[#2A2A2A]">
              {success && (
                <div className="text-[13px] text-[#166534] dark:text-[#4ADE80] bg-[#F0FDF4] dark:bg-[#0D2818] px-4 py-3 rounded-full mb-4">
                  {success}
                </div>
              )}
              <Textarea
                label={existingComment ? 'Update check-in comment' : 'Check-in comment'}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Add your structured feedback for this employee..."
              />
              <div className="mt-4">
                <Button 
                  onClick={handleSubmitComment} 
                  disabled={saving}
                  className="rounded-full px-6"
                >
                  {saving ? 'Submitting...' : existingComment ? 'Update comment' : 'Submit comment'}
                </Button>
              </div>
            </div>
          </div>
        ) : selectedMember ? (
          <div className="col-span-2 bg-white dark:bg-[#1A1A1A] border border-[#E8E8E4] dark:border-[#2A2A2A] rounded-[12px] p-8 flex items-center justify-center">
            <p className="text-[14px] text-[#6B7280] dark:text-[#888888]">
              {selectedMember.full_name} has not submitted their Q1 check-in yet.
            </p>
          </div>
        ) : (
          <div className="col-span-2 bg-white dark:bg-[#1A1A1A] border border-[#E8E8E4] dark:border-[#2A2A2A] rounded-[12px] p-8 flex items-center justify-center">
            <p className="text-[14px] text-[#6B7280] dark:text-[#888888]">
              Select a team member to review their check-in
            </p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}