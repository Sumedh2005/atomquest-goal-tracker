import { useState, useEffect, useRef } from 'react';
import { PageLayout } from '../../components/layout/PageLayout';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Download, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { IconChevronDown as IconChevronDownNew } from '@tabler/icons-react';

const CURRENT_QUARTER = 'Q1';

interface GoalRow {
  title: string;
  score: number | null;
}

interface EmployeeRow {
  id: string;
  name: string;
  department: string;
  manager: string;
  goalCount: number;
  q1AvgScore: number | null;
  checkinStatus: 'Submitted' | 'Not Submitted';
  goals: GoalRow[];
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

const getDepartmentColor = (department: string) => {
  return departmentColors[department] || departmentColors['Default'];
};

// Custom Dropdown Component
interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

function CustomDropdown({ value, onChange, options, placeholder = 'Select option' }: CustomDropdownProps) {
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
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 px-3 rounded-[8px] bg-[#F7F7F5] dark:bg-[#242424] border border-[#EBEBE8] dark:border-[#2A2A2A] text-[14px] text-[#1A1A1A] dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-[#F5A800] focus:border-[#F5A800] transition-all duration-200 flex items-center justify-between gap-2 min-w-[140px]"
      >
        <span className="truncate">{selectedOption?.label || placeholder}</span>
        <IconChevronDownNew size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
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
              className="px-3 py-2 text-[14px] text-[#18181B] dark:text-[#E0E0E0] cursor-pointer transition-colors duration-150 hover:bg-[#F4F4F5] dark:hover:bg-[#2A2A2A]"
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AchievementReport() {
  const [allEmployees, setAllEmployees] = useState<EmployeeRow[]>([]);
  const [filtered, setFiltered] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter state
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState(CURRENT_QUARTER);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchReport();
  }, [selectedQuarter]);

  useEffect(() => {
    applyFilters();
  }, [allEmployees, selectedDept, selectedStatus, search]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch all employees (role = employee)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'employee');

      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) {
        setAllEmployees([]);
        setFiltered([]);
        return;
      }

      // Unique departments for filter dropdown
      const uniqueDepts = [...new Set(profiles.map((p: any) => p.department).filter(Boolean))];
      setDepartments(uniqueDepts);

      const employeeIds = profiles.map((p: any) => p.id);

      // Fetch manager names
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

      // Fetch approved/locked goals for all employees
      const { data: goalsData } = await supabase
        .from('goals')
        .select('*')
        .in('employee_id', employeeIds)
        .in('status', ['approved', 'locked']);

      const goalIds = (goalsData || []).map((g: any) => g.id);

      // Fetch achievements for selected quarter
      let achievementsData: any[] = [];
      if (goalIds.length > 0) {
        const { data } = await supabase
          .from('goal_achievements')
          .select('*')
          .eq('quarter', selectedQuarter)
          .in('goal_id', goalIds);
        achievementsData = data || [];
      }

      // Build employee rows
      const rows: EmployeeRow[] = profiles.map((profile: any) => {
        const empGoals = (goalsData || []).filter(
          (g: any) => g.employee_id === profile.id
        );
        const empGoalIds = empGoals.map((g: any) => g.id);
        const empAchievements = achievementsData.filter(
          (a: any) => empGoalIds.includes(a.goal_id)
        );

        const hasSubmitted =
          empAchievements.length > 0 &&
          empAchievements.some((a: any) => a.actual_value);

        const scores = empAchievements
          .map((a: any) => a.progress_score)
          .filter((s: any) => s !== null && s !== undefined);

        const avgScore =
          scores.length > 0
            ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
            : null;

        const goalRows: GoalRow[] = empGoals.map((g: any) => {
          const ach = empAchievements.find((a: any) => a.goal_id === g.id);
          return {
            title: g.title,
            score: ach?.progress_score ?? null
          };
        });

        return {
          id: profile.id,
          name: profile.full_name,
          department: profile.department || '—',
          manager: managerMap[profile.manager_id] || '—',
          goalCount: empGoals.length,
          q1AvgScore: avgScore,
          checkinStatus: hasSubmitted ? 'Submitted' : 'Not Submitted',
          goals: goalRows
        };
      });

      setAllEmployees(rows);
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...allEmployees];

    if (selectedDept) {
      result = result.filter(e => e.department === selectedDept);
    }
    if (selectedStatus === 'submitted') {
      result = result.filter(e => e.checkinStatus === 'Submitted');
    } else if (selectedStatus === 'pending') {
      result = result.filter(e => e.checkinStatus === 'Not Submitted');
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(e => e.name.toLowerCase().includes(q));
    }

    setFiltered(result);
  };

  const getScoreVariant = (score: number | null) => {
    if (!score) return 'gray';
    if (score >= 90) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
  };

  // --- CSV Export ---
  const exportCSV = () => {
    const headers = ['Employee Name', 'Department', 'Manager', 'Goal Count', `${selectedQuarter} Avg Score`, 'Check-in Status'];
    const rows = filtered.map(e => [
      e.name,
      e.department,
      e.manager,
      e.goalCount,
      e.q1AvgScore !== null ? `${e.q1AvgScore}%` : '—',
      e.checkinStatus
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GoalTrack_${selectedQuarter}_Report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Prepare dropdown options
  const departmentOptions = [
    { value: '', label: 'All Departments' },
    ...departments.map(dept => ({ value: dept, label: dept }))
  ];

  const quarterOptions = [
    { value: 'Q1', label: 'Q1' },
    { value: 'Q2', label: 'Q2' },
    { value: 'Q3', label: 'Q3' },
    { value: 'Q4', label: 'Q4' }
  ];

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'pending', label: 'Not Submitted' }
  ];

  if (loading) {
    return (
      <PageLayout title="Achievement Report">
        <div className="flex items-center justify-center py-20">
          <div className="text-[14px] text-[#9CA3AF]">Loading report...</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Achievement Report">
      {error && (
        <div className="text-[13px] text-[#991B1B] dark:text-[#F87171] bg-[#FEF2F2] dark:bg-[#2A0000] px-4 py-3 rounded-full mb-4">
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white dark:bg-[#1A1A1A] border border-[#E8E8E4] dark:border-[#2A2A2A] rounded-[12px] p-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            <CustomDropdown
              value={selectedDept}
              onChange={setSelectedDept}
              options={departmentOptions}
              placeholder="All Departments"
            />

            <CustomDropdown
              value={selectedQuarter}
              onChange={setSelectedQuarter}
              options={quarterOptions}
              placeholder="Select Quarter"
            />

            <CustomDropdown
              value={selectedStatus}
              onChange={setSelectedStatus}
              options={statusOptions}
              placeholder="All Status"
            />

            <input
              type="text"
              placeholder="Search employee..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 px-3 rounded-[8px] bg-[#F7F7F5] dark:bg-[#242424] border border-[#EBEBE8] dark:border-[#2A2A2A] text-[14px] text-[#1A1A1A] dark:text-[#F5F5F5] placeholder-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-[#F5A800] focus:border-[#F5A800] transition-all duration-200 flex-1 min-w-[160px]"
            />
          </div>

          <div>
            <Button
              onClick={exportCSV}
              className="flex items-center gap-2 text-[13px] bg-[#F5A800] hover:bg-[#E09600] text-[#1A1A1A] rounded-full px-5"
            >
              <Download size={15} />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white dark:bg-[#1A1A1A] border border-[#E8E8E4] dark:border-[#2A2A2A] rounded-[12px] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-[#9CA3AF] text-[14px] mb-1">No results found</div>
            <div className="text-[#9CA3AF] text-[13px]">
              Try adjusting your filters or search query.
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#FAFAF8] dark:bg-[#141414]">
              <tr className="border-b border-[#E8E8E4] dark:border-[#2A2A2A]">
                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3">Employee Name</th>
                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3">Department</th>
                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3">Manager</th>
                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3">Goal Count</th>
                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3">{selectedQuarter} Avg Score</th>
                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3">Check-in Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((employee) => (
                <>
                  <tr
                    key={employee.id}
                    className="border-b border-[#E8E8E4] dark:border-[#2A2A2A] hover:bg-[#FAFAFA] dark:hover:bg-[#1F1F1F] transition-colors duration-150 cursor-pointer"
                    onClick={() =>
                      setExpandedId(expandedId === employee.id ? null : employee.id)
                    }
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
                    <td className="text-[14px] font-mono text-[#6B7280] dark:text-[#888888] px-6 py-3 tabular-nums">
                      {employee.goalCount}
                    </td>
                    <td className="px-6 py-3">
                      {employee.q1AvgScore !== null ? (
                        <Badge variant={getScoreVariant(employee.q1AvgScore)}>
                          {employee.q1AvgScore}%
                        </Badge>
                      ) : (
                        <span className="text-[#9CA3AF]">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={employee.checkinStatus === 'Submitted' ? 'success' : 'gray'}>
                        {employee.checkinStatus}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-right text-[#6B7280] dark:text-[#888888]">
                      {employee.goals.length > 0 && (
                        expandedId === employee.id
                          ? <ChevronUp size={16} />
                          : <ChevronDown size={16} />
                      )}
                    </td>
                  </tr>

                  {expandedId === employee.id && employee.goals.length > 0 && (
                    <tr key={`${employee.id}-expanded`}>
                      <td colSpan={7} className="px-6 py-4 bg-[#FAFAFA] dark:bg-[#1F1F1F]">
                        <div className="bg-white dark:bg-[#1A1A1A] border border-[#E8E8E4] dark:border-[#2A2A2A] rounded-[8px] overflow-hidden">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-[#E8E8E4] dark:border-[#2A2A2A] bg-[#F7F7F5] dark:bg-[#242424]">
                                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-3 py-2">
                                  Goal Title
                                </th>
                                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-3 py-2">
                                  Score
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {employee.goals.map((goal, idx) => (
                                <tr
                                  key={idx}
                                  className="border-b border-[#E8E8E4] dark:border-[#2A2A2A] last:border-0"
                                >
                                  <td className="text-[13px] text-[#1A1A1A] dark:text-[#F5F5F5] px-3 py-2">
                                    {goal.title}
                                  </td>
                                  <td className="px-3 py-2">
                                    {goal.score !== null ? (
                                      <Badge variant={getScoreVariant(goal.score)}>
                                        {goal.score}%
                                      </Badge>
                                    ) : (
                                      <span className="text-[#9CA3AF] text-[13px]">—</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PageLayout>
  );
}