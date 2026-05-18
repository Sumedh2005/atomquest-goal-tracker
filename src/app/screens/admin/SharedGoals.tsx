import { useState, useEffect, useRef } from 'react';
import { PageLayout } from '../../components/layout/PageLayout';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { IconChevronDown } from '@tabler/icons-react';

const uomOptions = [
  { value: 'numeric_min', label: 'Numeric – Higher is better' },
  { value: 'numeric_max', label: 'Numeric – Lower is better' },
  { value: 'timeline', label: 'Timeline' },
  { value: 'zero_based', label: 'Zero-based' }
];

interface SharedGoalRow {
  id: string;
  title: string;
  target: string;
  department: string | null;
  pushedByName: string;
  linkedCount: number;
}

interface Department {
  value: string;
  label: string;
}

// Department color mapping
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

const getDepartmentColor = (department: string | null) => {
  if (!department) return departmentColors['Default'];
  return departmentColors[department] || departmentColors['Default'];
};

// Custom Dropdown Component
interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label: string;
}

function CustomDropdown({ value, onChange, options, label }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col gap-1" ref={dropdownRef}>
      <label className="text-[12px] font-medium text-[#1A1A1A] dark:text-[#F5F5F5]">
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-9 px-3 rounded-[8px] bg-[#F7F7F5] dark:bg-[#242424] border border-[#EBEBE8] dark:border-[#2A2A2A] text-[14px] text-[#1A1A1A] dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-[#F5A800] focus:border-[#F5A800] transition-all duration-200 flex items-center justify-between"
        >
          <span>{selectedOption?.label || 'Select option'}</span>
          <IconChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#1A1A1A] border border-[#E8E8E4] dark:border-[#2A2A2A] rounded-[8px] shadow-lg overflow-hidden py-1">
            {options.map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className="px-3 py-2.5 text-[14px] text-[#18181B] dark:text-[#E0E0E0] cursor-pointer transition-colors duration-150 hover:bg-[#F4F4F5] dark:hover:bg-[#2A2A2A]"
              >
                {option.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function SharedGoals() {
  const { user } = useAuth();
  const [sharedGoals, setSharedGoals] = useState<SharedGoalRow[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [uom, setUom] = useState('numeric_min');
  const [pushType, setPushType] = useState<'department' | 'individual'>('department');
  const [selectedDept, setSelectedDept] = useState('');

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError('');

      // Fetch shared goals with recipients count
      const { data: goals, error: goalsError } = await supabase
        .from('shared_goals')
        .select('*, shared_goal_recipients(id)')
        .order('created_at', { ascending: false });

      if (goalsError) throw goalsError;

      // Resolve pushedBy names
      const pusherIds = [...new Set((goals || []).map((g: any) => g.pushed_by).filter(Boolean))];
      let pusherMap: Record<string, string> = {};
      if (pusherIds.length > 0) {
        const { data: pushers } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', pusherIds);
        (pushers || []).forEach((p: any) => {
          pusherMap[p.id] = p.full_name;
        });
      }

      const rows: SharedGoalRow[] = (goals || []).map((g: any) => ({
        id: g.id,
        title: g.title,
        target: g.target,
        department: g.department,
        pushedByName: pusherMap[g.pushed_by] || '—',
        linkedCount: g.shared_goal_recipients?.length || 0
      }));

      setSharedGoals(rows);

      // Fetch unique departments from profiles for dropdown
      const { data: profiles } = await supabase
        .from('profiles')
        .select('department')
        .eq('role', 'employee');

      const uniqueDepts = [
        ...new Set((profiles || []).map((p: any) => p.department).filter(Boolean))
      ];
      setDepartments(uniqueDepts.map((d: string) => ({ value: d, label: d })));
      if (uniqueDepts.length > 0) setSelectedDept(uniqueDepts[0]);
    } catch (err: any) {
      setError(err.message || 'Failed to load shared goals');
    } finally {
      setLoading(false);
    }
  };

  const handlePush = async () => {
    if (!user) { setError('User session not found. Please log in again.'); return; }
    if (!title.trim()) { setError('Goal title is required'); return; }
    if (!target.trim()) { setError('Target is required'); return; }
    if (pushType === 'department' && !selectedDept) { setError('Please select a department'); return; }

    try {
      setSaving(true);
      setError('');

      // Insert shared goal
      const { data: newGoal, error: insertError } = await supabase
        .from('shared_goals')
        .insert({
          title,
          target,
          uom_type: uom,
          pushed_by: user.id,
          department: pushType === 'department' ? selectedDept : null
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // If pushing to department, create recipient rows for all employees in that dept
      if (pushType === 'department' && selectedDept) {
        const { data: deptEmployees } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'employee')
          .eq('department', selectedDept);

        if (deptEmployees && deptEmployees.length > 0) {
          const recipients = deptEmployees.map((emp: any) => ({
            shared_goal_id: newGoal.id,
            employee_id: emp.id,
            weightage: 10 // default weightage, employee can adjust
          }));

          const { error: recipientError } = await supabase
            .from('shared_goal_recipients')
            .insert(recipients);

          if (recipientError) throw recipientError;
        }
      }

      setSuccess(`Shared goal pushed to ${pushType === 'department' ? selectedDept : 'selected employees'} successfully`);
      setTitle('');
      setTarget('');
      setUom('numeric_min');
      setTimeout(() => setSuccess(''), 3000);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to push shared goal');
    } finally {
      setSaving(false);
    }
  };

  const pushTypeOptions = [
    { value: 'department', label: 'Department' },
    { value: 'individual', label: 'Individual Employees' }
  ];

  const departmentOptions = departments.map(d => ({ value: d.value, label: d.label }));

  if (loading) {
    return (
      <PageLayout title="Shared Goals">
        <div className="flex items-center justify-center py-20">
          <div className="text-[14px] text-[#9CA3AF]">Loading shared goals...</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Shared Goals">
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

      {/* Create Form */}
      <Card className="mb-6">
        <h2 className="text-[15px] font-medium text-[#1A1A1A] dark:text-[#F5F5F5] mb-4">
          Create Shared Goal
        </h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Input
            label="Goal Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter goal title"
          />
          <Input
            label="Target"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Enter target value"
          />
          
          <CustomDropdown
            label="Unit of Measurement"
            value={uom}
            onChange={setUom}
            options={uomOptions}
          />

          <CustomDropdown
            label="Push to"
            value={pushType}
            onChange={(val) => setPushType(val as 'department' | 'individual')}
            options={pushTypeOptions}
          />

          {pushType === 'department' && (
            <CustomDropdown
              label="Department"
              value={selectedDept}
              onChange={setSelectedDept}
              options={departmentOptions}
            />
          )}
        </div>

        <p className="text-[12px] text-[#6B7280] dark:text-[#888888] mb-4">
          Recipients can adjust weightage only. Title and target are read-only for them.
        </p>
        <Button onClick={handlePush} disabled={saving} className="rounded-full px-6">
          {saving ? 'Pushing...' : 'Push to employees'}
        </Button>
      </Card>

      {/* Existing Shared Goals */}
      <div className="bg-white dark:bg-[#1A1A1A] border border-[#E8E8E4] dark:border-[#2A2A2A] rounded-[12px] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8E8E4] dark:border-[#2A2A2A]">
          <h2 className="text-[15px] font-medium text-[#1A1A1A] dark:text-[#F5F5F5]">
            Existing Shared Goals
          </h2>
        </div>

        {sharedGoals.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-[14px] text-[#9CA3AF]">
            No shared goals yet
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#FAFAF8] dark:bg-[#141414]">
              <tr className="border-b border-[#E8E8E4] dark:border-[#2A2A2A]">
                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3">Title</th>
                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3">Target</th>
                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3">Pushed to</th>
                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3">Pushed by</th>
                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3">Linked Employees</th>
              </tr>
            </thead>
            <tbody>
              {sharedGoals.map((goal) => (
                <tr
                  key={goal.id}
                  className="border-b border-[#E8E8E4] dark:border-[#2A2A2A] last:border-0 hover:bg-[#FAFAFA] dark:hover:bg-[#1F1F1F] transition-colors duration-150"
                >
                  <td className="text-[14px] text-[#1A1A1A] dark:text-[#F5F5F5] px-6 py-3">
                    {goal.title}
                  </td>
                  <td className="text-[14px] font-mono text-[#6B7280] dark:text-[#888888] px-6 py-3">
                    {goal.target}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium ${getDepartmentColor(goal.department)}`}>
                      {goal.department || 'Individual'}
                    </span>
                  </td>
                  <td className="text-[14px] text-[#6B7280] dark:text-[#888888] px-6 py-3">
                    {goal.pushedByName}
                  </td>
                  <td className="text-[14px] font-mono text-[#6B7280] dark:text-[#888888] px-6 py-3 tabular-nums">
                    {goal.linkedCount}
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