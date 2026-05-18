import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'
import { PageLayout } from '../../components/layout/PageLayout';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { Trash2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { IconChevronDown } from '@tabler/icons-react';

interface Goal {
  id: string;
  thrustArea: string;
  uom: string;
  title: string;
  description: string;
  target: string;
  weightage: number;
}

const thrustAreas = [
  { value: 'Sales', label: 'Sales' },
  { value: 'Operations', label: 'Operations' },
  { value: 'Product', label: 'Product' },
  { value: 'Safety', label: 'Safety' },
  { value: 'Customer Success', label: 'Customer Success' },
  { value: 'Innovation', label: 'Innovation' },
  { value: 'Growth', label: 'Growth' },
  { value: 'L&D', label: 'L&D' },
  { value: 'Finance', label: 'Finance' },
  { value: 'HR', label: 'HR' }
];

const uomOptions = [
  { value: 'numeric_min', label: 'Numeric – Higher is better' },
  { value: 'numeric_max', label: 'Numeric – Lower is better' },
  { value: 'timeline', label: 'Timeline' },
  { value: 'zero_based', label: 'Zero-based' }
];

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
          <span className="truncate">{selectedOption?.label || 'Select option'}</span>
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
                className="px-3 py-2 text-[14px] text-[#18181B] dark:text-[#E0E0E0] cursor-pointer transition-colors duration-150 hover:bg-[#F4F4F5] dark:hover:bg-[#2A2A2A]"
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

export function CreateGoalSheet() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: '1',
      thrustArea: 'Sales',
      uom: 'numeric_min',
      title: '',
      description: '',
      target: '',
      weightage: 100
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const totalWeightage = goals.reduce((sum, goal) => sum + (goal.weightage || 0), 0);
  const isValid = totalWeightage === 100;
  const canAddMore = goals.length < 8;
  
  // Check if all required fields are filled
  const allFieldsFilled = goals.every(goal => 
    goal.title.trim() !== '' && 
    goal.target.trim() !== ''
  );

  const addGoal = () => {
    if (canAddMore) {
      const remainingWeightage = 100 - totalWeightage;
      const newWeightage = Math.min(remainingWeightage, 10);
      
      setGoals([
        ...goals,
        {
          id: Date.now().toString(),
          thrustArea: 'Sales',
          uom: 'numeric_min',
          title: '',
          description: '',
          target: '',
          weightage: newWeightage
        }
      ]);
    }
  };

  const removeGoal = (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  const updateGoal = (id: string, field: keyof Goal, value: any) => {
    setGoals(goals.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const getWeightageColor = (index: number) => {
    const shades = ['#F5A800', '#F7B933', '#F9CA66', '#FBDB99', '#FDECCC'];
    return shades[index % shades.length];
  };

  const validateGoals = () => {
    for (const goal of goals) {
      if (!goal.title.trim()) {
        setError('Please enter a title for all goals');
        return false;
      }
      if (!goal.target.trim()) {
        setError('Please enter a target for all goals');
        return false;
      }
      if (goal.weightage < 10) {
        setError('Each goal must have at least 10% weightage');
        return false;
      }
    }
    if (totalWeightage !== 100) {
      setError('Total weightage must equal 100%');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateGoals()) return;

    try {
      setLoading(true);
      setError('');

      const goalsToInsert = goals.map(goal => ({
        employee_id: user.id,
        title: goal.title,
        description: goal.description,
        thrust_area: goal.thrustArea,
        uom_type: goal.uom,
        target: goal.target,
        weightage: goal.weightage,
        status: 'submitted'
      }));

      const { error: insertError } = await supabase
        .from('goals')
        .insert(goalsToInsert);

      if (insertError) throw insertError;

      setSuccess('Goals submitted for approval!');
      setTimeout(() => {
        navigate('/employee/my-goals');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit goals');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout
      title="Create goal sheet"
      subtitle="FY 2025–26 · Goal setting window closes 31 May."
    >
      <div className="flex flex-col gap-4">
        {goals.map((goal, index) => (
          <Card key={goal.id}>
            <div className="flex items-start justify-between mb-4">
              <span className="text-[13px] text-[#9CA3AF]">#{index + 1}</span>
              {goals.length > 1 && (
                <button
                  onClick={() => removeGoal(goal.id)}
                  className="text-[#6B7280] hover:text-[#991B1B] transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <CustomDropdown
                label="Thrust Area"
                options={thrustAreas}
                value={goal.thrustArea}
                onChange={(value) => updateGoal(goal.id, 'thrustArea', value)}
              />
              <CustomDropdown
                label="Unit of Measurement"
                options={uomOptions}
                value={goal.uom}
                onChange={(value) => updateGoal(goal.id, 'uom', value)}
              />
              <div className="col-span-2">
                <Input
                  label="Goal Title"
                  value={goal.title}
                  onChange={(e) => updateGoal(goal.id, 'title', e.target.value)}
                  placeholder="e.g. Increase quarterly sales revenue"
                />
              </div>
              <div className="col-span-2">
                <Textarea
                  label="Description"
                  value={goal.description}
                  onChange={(e) => updateGoal(goal.id, 'description', e.target.value)}
                  rows={3}
                  placeholder="Describe the goal and how it will be measured…"
                />
              </div>
              <Input
                label="Target Value"
                value={goal.target}
                onChange={(e) => updateGoal(goal.id, 'target', e.target.value)}
                placeholder="e.g. ₹50L or 30 Jun 2026"
              />
              <Input
                label="Weightage %"
                type="number"
                min="10"
                max="100"
                value={goal.weightage}
                onChange={(e) => updateGoal(goal.id, 'weightage', parseInt(e.target.value) || 0)}
                error={goal.weightage < 10 && goal.weightage > 0 ? 'Minimum weightage is 10%' : undefined}
                placeholder="Min 10%"
              />
            </div>
          </Card>
        ))}

        {/* Weightage Summary */}
        <div className="mt-4">
          <div className="mb-2 text-[11px] font-medium uppercase text-[#9CA3AF] dark:text-[#555555]">
            Weightage Summary
          </div>
          <div className="h-2 bg-[#E8E8E4] dark:bg-[#2A2A2A] rounded-full overflow-hidden flex mb-2">
            {goals.map((goal, index) => (
              <div
                key={goal.id}
                style={{
                  width: `${goal.weightage}%`,
                  backgroundColor: getWeightageColor(index)
                }}
              />
            ))}
          </div>
          <div className="flex items-center justify-between text-[12px] mb-2">
            <div className="flex gap-4 flex-wrap">
              {goals.map((goal, index) => (
                <span key={goal.id} className="text-[#6B7280] dark:text-[#888888]">
                  Goal {index + 1}: {goal.weightage}%
                </span>
              ))}
            </div>
            <span
              className={`font-medium ${
                totalWeightage === 100
                  ? 'text-[#166534] dark:text-[#4ADE80]'
                  : totalWeightage > 100
                  ? 'text-[#991B1B] dark:text-[#F87171]'
                  : 'text-[#92400E] dark:text-[#F5A800]'
              }`}
            >
              Total: {totalWeightage}%
            </span>
          </div>
          {!isValid && (
            <div className="text-[12px] text-[#92400E] dark:text-[#F5A800]">
              Total weightage must equal 100% before submitting
            </div>
          )}
        </div>

        <button
          onClick={addGoal}
          disabled={!canAddMore}
          className="text-[14px] text-[#F5A800] hover:text-[#D4900A] disabled:text-[#9CA3AF] disabled:cursor-not-allowed text-left"
        >
          {canAddMore ? '+ Add another goal' : 'Maximum 8 goals reached'}
        </button>

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

        {/* Bottom Action Bar - Submit only */}
        <div className="mt-8 pt-6 border-t border-[#E8E8E4] dark:border-[#2A2A2A] flex items-center justify-end sticky bottom-0 bg-transparent pb-4">
          <div className="relative group">
            <Button
              disabled={!isValid || loading || !allFieldsFilled}
              onClick={handleSubmit}
              className="rounded-full px-6"
            >
              {loading ? 'Submitting...' : 'Submit for approval'}
            </Button>
            {(!isValid || !allFieldsFilled) && (
              <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-[#1A1A1A] dark:bg-[#F5F5F5] text-white dark:text-[#1A1A1A] text-[12px] px-3 py-2 rounded-lg whitespace-nowrap">
                {!allFieldsFilled 
                  ? 'Please fill all goal titles and targets' 
                  : 'Total weightage must equal 100%'}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}