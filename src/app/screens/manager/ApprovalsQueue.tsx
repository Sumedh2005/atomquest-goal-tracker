import { useState, useEffect } from 'react';
import { PageLayout } from '../../components/layout/PageLayout';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const uomLabels: Record<string, string> = {
  numeric_min: 'Numeric – Higher is better',
  numeric_max: 'Numeric – Lower is better',
  timeline: 'Timeline',
  zero_based: 'Zero-based'
};

export function ApprovalsQueue() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [showComment, setShowComment] = useState(false);
  const [editedGoals, setEditedGoals] = useState<Record<string, any[]>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);

      // Get employees managed by this manager
      const { data: teamMembers } = await supabase
        .from('profiles')
        .select('*')
        .eq('manager_id', user.id);

      if (!teamMembers || teamMembers.length === 0) {
        setEmployees([]);
        return;
      }

      const teamIds = teamMembers.map((m: any) => m.id);

      // Get submitted goals for these employees
      const { data: goalsData } = await supabase
        .from('goals')
        .select('*')
        .in('employee_id', teamIds)
        .eq('status', 'submitted')
        .order('created_at', { ascending: true });

      // Group goals by employee
      const employeesWithGoals = teamMembers
        .map((member: any) => {
          const memberGoals = (goalsData || []).filter(
            (g: any) => g.employee_id === member.id
          );
          return { ...member, goals: memberGoals };
        })
        .filter((e: any) => e.goals.length > 0);

      setEmployees(employeesWithGoals);
    } catch (err: any) {
      setError(err.message || 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
    setShowComment(false);
    setComment('');

    if (expandedId !== id) {
      const employee = employees.find(e => e.id === id);
      if (employee) {
        setEditedGoals({
          ...editedGoals,
          [id]: employee.goals.map((g: any) => ({
            id: g.id,
            target: g.target,
            weightage: g.weightage
          }))
        });
      }
    }
  };

  const updateGoalField = (
    employeeId: string,
    goalIndex: number,
    field: 'target' | 'weightage',
    value: string
  ) => {
    setEditedGoals({
      ...editedGoals,
      [employeeId]: editedGoals[employeeId].map((g, i) =>
        i === goalIndex
          ? { ...g, [field]: field === 'weightage' ? parseInt(value) || 0 : value }
          : g
      )
    });
  };

  const getTotalWeightage = (employeeId: string) => {
    return (editedGoals[employeeId] || []).reduce(
      (sum, g) => sum + (g.weightage || 0), 0
    );
  };

  const handleApprove = async (employeeId: string) => {
    const edited = editedGoals[employeeId] || [];
    const total = getTotalWeightage(employeeId);

    if (total !== 100) {
      setError('Total weightage must equal 100% before approving');
      return;
    }

    try {
      setSaving(true);
      setError('');

      // Update each goal with edited values and lock status
      for (const goal of edited) {
        await supabase
          .from('goals')
          .update({
            target: goal.target,
            weightage: goal.weightage,
            status: 'approved',
            updated_at: new Date().toISOString()
          })
          .eq('id', goal.id);

        // Log to audit trail
        await supabase.from('audit_logs').insert({
          action: 'Goals approved by manager',
          performed_by: user.id,
          employee_affected: employeeId,
          field_changed: 'status',
          old_value: 'submitted',
          new_value: 'approved'
        });
      }

      setSuccess('Goals approved and locked successfully!');
      setExpandedId(null);
      setTimeout(() => setSuccess(''), 3000);
      fetchPendingApprovals();
    } catch (err: any) {
      setError(err.message || 'Failed to approve goals');
    } finally {
      setSaving(false);
    }
  };

  const handleReturn = async (employeeId: string) => {
    if (!comment.trim()) {
      setError('Please add a comment before returning for rework');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const employee = employees.find(e => e.id === employeeId);
      const goalIds = employee?.goals.map((g: any) => g.id) || [];

      // Update all goals to returned status
      await supabase
        .from('goals')
        .update({
          status: 'returned',
          updated_at: new Date().toISOString()
        })
        .in('id', goalIds);

      // Log to audit trail
      await supabase.from('audit_logs').insert({
        action: 'Goals returned for rework',
        performed_by: user.id,
        employee_affected: employeeId,
        field_changed: 'status',
        old_value: 'submitted',
        new_value: 'returned'
      });

      setSuccess('Goals returned for rework');
      setExpandedId(null);
      setComment('');
      setShowComment(false);
      setTimeout(() => setSuccess(''), 3000);
      fetchPendingApprovals();
    } catch (err: any) {
      setError(err.message || 'Failed to return goals');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="Pending approvals" subtitle="Loading...">
        <div className="flex items-center justify-center py-20">
          <div className="text-[14px] text-[#9CA3AF]">Loading approvals...</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Pending approvals"
      subtitle={`${employees.length} goal sheet${employees.length !== 1 ? 's' : ''} awaiting your review.`}
    >
      {error && (
        <div className="text-[13px] text-[#991B1B] bg-[#FEF2F2] dark:bg-[#2A0000] px-4 py-3 rounded-full mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="text-[13px] text-[#166534] dark:text-[#4ADE80] bg-[#F0FDF4] dark:bg-[#0D2818] px-4 py-3 rounded-full mb-4">
          {success}
        </div>
      )}

      {employees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-[#1A1A1A] border border-[#E8E8E4] dark:border-[#2A2A2A] rounded-[12px]">
          <div className="text-[#9CA3AF] text-[14px] mb-2">No pending approvals</div>
          <div className="text-[#9CA3AF] text-[13px]">
            All goal sheets have been reviewed.
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1A1A1A] border border-[#E8E8E4] dark:border-[#2A2A2A] rounded-[12px] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E8E8E4] dark:border-[#2A2A2A]">
                <th className="text-left text-[11px] font-medium uppercase text-[#9CA3AF] px-4 py-3">Employee</th>
                <th className="text-left text-[11px] font-medium uppercase text-[#9CA3AF] px-4 py-3">Department</th>
                <th className="text-left text-[11px] font-medium uppercase text-[#9CA3AF] px-4 py-3">Goals Submitted</th>
                <th className="text-left text-[11px] font-medium uppercase text-[#9CA3AF] px-4 py-3">Submitted Date</th>
                <th className="text-left text-[11px] font-medium uppercase text-[#9CA3AF] px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <>
                  <tr
                    key={employee.id}
                    className="border-b border-[#E8E8E4] dark:border-[#2A2A2A] hover:bg-[#FAFAFA] dark:hover:bg-[#1F1F1F]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={employee.full_name} size="sm" />
                        <span className="text-[14px] text-[#1A1A1A] dark:text-[#F5F5F5]">
                          {employee.full_name}
                        </span>
                      </div>
                    </td>
                    <td className="text-[14px] text-[#6B7280] dark:text-[#888888] px-4 py-3">
                      {employee.department}
                    </td>
                    <td className="text-[14px] text-[#6B7280] dark:text-[#888888] px-4 py-3">
                      {employee.goals.length}
                    </td>
                    <td className="text-[14px] text-[#6B7280] dark:text-[#888888] px-4 py-3">
                      {new Date(employee.goals[0]?.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="outlined"
                        onClick={() => toggleExpanded(employee.id)}
                        className="text-[13px] h-8 px-4 rounded-full flex items-center gap-1"
                      >
                        {expandedId === employee.id ? (
                          <>Review <ChevronUp size={14} /></>
                        ) : (
                          <>Review <ChevronDown size={14} /></>
                        )}
                      </Button>
                    </td>
                  </tr>

                  {expandedId === employee.id && (
                    <tr key={`${employee.id}-expanded`}>
                      <td colSpan={5} className="p-6 bg-[#FAFAFA] dark:bg-[#1F1F1F]">
                        <div className="bg-white dark:bg-[#1A1A1A] border border-[#E8E8E4] dark:border-[#2A2A2A] rounded-[8px] overflow-hidden mb-4">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-[#E8E8E4] dark:border-[#2A2A2A] bg-[#F7F7F5] dark:bg-[#242424]">
                                <th className="text-left text-[11px] font-medium uppercase text-[#9CA3AF] px-3 py-2">Goal Title</th>
                                <th className="text-left text-[11px] font-medium uppercase text-[#9CA3AF] px-3 py-2">Thrust Area</th>
                                <th className="text-left text-[11px] font-medium uppercase text-[#9CA3AF] px-3 py-2">UoM</th>
                                <th className="text-left text-[11px] font-medium uppercase text-[#9CA3AF] px-3 py-2">Target</th>
                                <th className="text-left text-[11px] font-medium uppercase text-[#9CA3AF] px-3 py-2">Weightage</th>
                               </tr>
                            </thead>
                            <tbody>
                              {employee.goals.map((goal: any, index: number) => {
                                const edited = (editedGoals[employee.id] || [])[index] || {
                                  target: goal.target,
                                  weightage: goal.weightage
                                };
                                return (
                                  <tr
                                    key={goal.id}
                                    className="border-b border-[#E8E8E4] dark:border-[#2A2A2A] last:border-0"
                                  >
                                    <td className="text-[13px] text-[#1A1A1A] dark:text-[#F5F5F5] px-3 py-2">
                                      {goal.title}
                                    </td>
                                    <td className="text-[13px] text-[#6B7280] dark:text-[#888888] px-3 py-2">
                                      {goal.thrust_area}
                                    </td>
                                    <td className="text-[13px] text-[#6B7280] dark:text-[#888888] px-3 py-2">
                                      {uomLabels[goal.uom_type] || goal.uom_type}
                                    </td>
                                    <td className="px-3 py-2">
                                      <input
                                        type="text"
                                        value={edited.target}
                                        onChange={(e) => updateGoalField(employee.id, index, 'target', e.target.value)}
                                        className="w-full text-[13px] text-[#1A1A1A] dark:text-[#F5F5F5] bg-[#F7F7F5] dark:bg-[#242424] px-2 py-1 rounded-full border-0 focus:outline-none focus:ring-1 focus:ring-[#F5A800]"
                                      />
                                    </td>
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="number"
                                          min="10"
                                          max="100"
                                          value={edited.weightage}
                                          onChange={(e) => updateGoalField(employee.id, index, 'weightage', e.target.value)}
                                          className="w-16 text-[13px] text-[#1A1A1A] dark:text-[#F5F5F5] bg-[#F7F7F5] dark:bg-[#242424] px-2 py-1 rounded-full border-0 focus:outline-none focus:ring-1 focus:ring-[#F5A800]"
                                        />
                                        <span className="text-[13px] text-[#6B7280]">%</span>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr className={`${
                                getTotalWeightage(employee.id) === 100
                                  ? 'bg-[#F0FDF4] dark:bg-[#0D2818]'
                                  : 'bg-[#FFFBEB] dark:bg-[#2A1800]'
                              }`}>
                                <td colSpan={4} className="text-right text-[13px] font-medium text-[#1A1A1A] dark:text-[#F5F5F5] px-3 py-2">
                                  Total:
                                </td>
                                <td className={`text-[13px] font-medium px-3 py-2 ${
                                  getTotalWeightage(employee.id) === 100
                                    ? 'text-[#166534] dark:text-[#4ADE80]'
                                    : 'text-[#92400E] dark:text-[#F5A800]'
                                }`}>
                                  {getTotalWeightage(employee.id)}%
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                        {showComment && (
                          <div className="mb-4">
                            <Textarea
                              label="Comment for rework"
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              rows={3}
                              placeholder="Provide feedback for the employee..."
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-3">
                          <Button
                            variant="outlined"
                            onClick={() => {
                              setShowComment(!showComment);
                              if (showComment && comment) {
                                handleReturn(employee.id);
                              }
                            }}
                            className="text-[#92400E] dark:text-[#F5A800] border-[#F5A800] rounded-full px-5"
                            disabled={saving}
                          >
                            {showComment ? 'Submit rework' : 'Return for rework'}
                          </Button>
                          <Button
                            onClick={() => handleApprove(employee.id)}
                            disabled={saving || getTotalWeightage(employee.id) !== 100}
                            className="bg-[#166534] hover:bg-[#14532D] text-white border-0 rounded-full px-5"
                          >
                            {saving ? 'Saving...' : 'Approve & lock'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageLayout>
  );
}