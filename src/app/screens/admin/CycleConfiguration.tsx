import { useState, useEffect } from 'react';
import { PageLayout } from '../../components/layout/PageLayout';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../../lib/supabase';
import { IconTrash, IconEdit } from '@tabler/icons-react';

interface CyclePhase {
  id: string;
  name: string;
  phase: string;
  window_open: string;
  deadline: string;
  status: 'active' | 'upcoming' | 'closed';
}

interface TempEdit {
  name: string;
  phase: string;
  window_open: string;
  deadline: string;
}

const getStatusVariant = (status: string) => {
  if (status === 'active') return 'success';
  if (status === 'upcoming') return 'warning';
  return 'danger'; // Changed from 'gray' to 'danger' for red color
};

const getStatusLabel = (status: string) => {
  if (status === 'active') return 'Active';
  if (status === 'upcoming') return 'Upcoming';
  return 'Closed';
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

// toISOString for date inputs (yyyy-mm-dd)
const toInputDate = (dateStr: string) => {
  return new Date(dateStr).toISOString().split('T')[0];
};

export function CycleConfiguration() {
  const [phases, setPhases] = useState<CyclePhase[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempEdit, setTempEdit] = useState<TempEdit>({ name: '', phase: '', window_open: '', deadline: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPhase, setNewPhase] = useState<TempEdit>({ name: '', phase: '', window_open: '', deadline: '' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchCycles();
  }, []);

  const fetchCycles = async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('cycles')
        .select('*')
        .order('window_open', { ascending: true });

      if (fetchError) throw fetchError;
      setPhases(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load cycles');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (phase: CyclePhase) => {
    setTempEdit({
      name: phase.name,
      phase: phase.phase,
      window_open: toInputDate(phase.window_open),
      deadline: toInputDate(phase.deadline)
    });
    setEditingId(phase.id);
    setShowAddForm(false);
    setShowDeleteConfirm(null);
  };

  const handleSave = async () => {
    if (!tempEdit.name.trim() || !tempEdit.phase.trim() || !tempEdit.window_open || !tempEdit.deadline) {
      setError('All fields are required');
      return;
    }

    try {
      setSaving(true);
      setError('');

      // Recompute status based on dates
      const now = new Date();
      const open = new Date(tempEdit.window_open);
      const deadline = new Date(tempEdit.deadline);
      let status: CyclePhase['status'] = 'upcoming';
      if (now >= open && now <= deadline) status = 'active';
      else if (now > deadline) status = 'closed';

      const { error: updateError } = await supabase
        .from('cycles')
        .update({
          name: tempEdit.name,
          phase: tempEdit.phase,
          window_open: tempEdit.window_open,
          deadline: tempEdit.deadline,
          status
        })
        .eq('id', editingId);

      if (updateError) throw updateError;

      setSuccess('Phase updated successfully');
      setEditingId(null);
      setTimeout(() => setSuccess(''), 3000);
      fetchCycles();
    } catch (err: any) {
      setError(err.message || 'Failed to update phase');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (phaseId: string) => {
    try {
      setDeleting(phaseId);
      setError('');

      // Check if there are any goal achievements linked to this cycle's quarter
      const phaseToDelete = phases.find(p => p.id === phaseId);
      if (phaseToDelete) {
        const { data: achievementsData, error: achievementsError } = await supabase
          .from('goal_achievements')
          .select('id')
          .eq('quarter', phaseToDelete.phase)
          .limit(1);

        if (achievementsError) throw achievementsError;

        if (achievementsData && achievementsData.length > 0) {
          setError(`Cannot delete cycle "${phaseToDelete.name}" because there are existing achievements for ${phaseToDelete.phase}. Archive it instead.`);
          setShowDeleteConfirm(null);
          return;
        }
      }

      const { error: deleteError } = await supabase
        .from('cycles')
        .delete()
        .eq('id', phaseId);

      if (deleteError) throw deleteError;

      setSuccess('Phase deleted successfully');
      setShowDeleteConfirm(null);
      setTimeout(() => setSuccess(''), 3000);
      fetchCycles();
    } catch (err: any) {
      setError(err.message || 'Failed to delete phase');
    } finally {
      setDeleting(null);
    }
  };

  const handleAddPhase = async () => {
    if (!newPhase.name.trim() || !newPhase.phase.trim() || !newPhase.window_open || !newPhase.deadline) {
      setError('All fields are required');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const now = new Date();
      const open = new Date(newPhase.window_open);
      const deadline = new Date(newPhase.deadline);
      let status: CyclePhase['status'] = 'upcoming';
      if (now >= open && now <= deadline) status = 'active';
      else if (now > deadline) status = 'closed';

      const { error: insertError } = await supabase
        .from('cycles')
        .insert({
          name: newPhase.name,
          phase: newPhase.phase,
          window_open: newPhase.window_open,
          deadline: newPhase.deadline,
          status
        });

      if (insertError) throw insertError;

      setSuccess('Phase added successfully');
      setShowAddForm(false);
      setNewPhase({ name: '', phase: '', window_open: '', deadline: '' });
      setTimeout(() => setSuccess(''), 3000);
      fetchCycles();
    } catch (err: any) {
      setError(err.message || 'Failed to add phase');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="Cycle configuration" subtitle="FY 2025–26.">
        <div className="flex items-center justify-center py-20">
          <div className="text-[14px] text-[#9CA3AF]">Loading cycles...</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Cycle configuration"
      subtitle="FY 2025–26."
      action={
        <Button 
          variant="outlined" 
          onClick={() => { setShowAddForm(true); setEditingId(null); setShowDeleteConfirm(null); }}
          className="rounded-full px-5"
        >
          + Add phase
        </Button>
      }
    >
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

      <div className="bg-white dark:bg-[#1A1A1A] border border-[#E8E8E4] dark:border-[#2A2A2A] rounded-[12px] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#FAFAF8] dark:bg-[#141414]">
            <tr className="border-b border-[#E8E8E4] dark:border-[#2A2A2A]">
              <th className="text-left text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3">Cycle Name</th>
              <th className="text-left text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3">Phase/Quarter</th>
              <th className="text-left text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3">Window Opens</th>
              <th className="text-left text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3">Deadline</th>
              <th className="text-left text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3">Status</th>
              <th className="text-left text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {phases.map((phase) => (
              <>
                {editingId === phase.id ? (
                  <tr key={phase.id} className="border-b border-[#E8E8E4] dark:border-[#2A2A2A] last:border-0 bg-[#FAFAFA] dark:bg-[#1F1F1F]">
                    <td colSpan={6} className="px-6 py-4">
                      <div className="grid grid-cols-4 gap-4 mb-4">
                        <Input
                          label="Cycle name"
                          value={tempEdit.name}
                          onChange={(e) => setTempEdit({ ...tempEdit, name: e.target.value })}
                        />
                        <Input
                          label="Phase/Quarter"
                          value={tempEdit.phase}
                          onChange={(e) => setTempEdit({ ...tempEdit, phase: e.target.value })}
                          placeholder="e.g., Q1, Goal Setting"
                        />
                        <Input
                          label="Window Opens"
                          type="date"
                          value={tempEdit.window_open}
                          onChange={(e) => setTempEdit({ ...tempEdit, window_open: e.target.value })}
                        />
                        <Input
                          label="Deadline"
                          type="date"
                          value={tempEdit.deadline}
                          onChange={(e) => setTempEdit({ ...tempEdit, deadline: e.target.value })}
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <Button onClick={handleSave} disabled={saving} className="rounded-full px-5">
                          {saving ? 'Saving...' : 'Save'}
                        </Button>
                        <Button variant="outlined" onClick={() => { setEditingId(null); setError(''); }} className="rounded-full px-5">
                          Cancel
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={phase.id} className="border-b border-[#E8E8E4] dark:border-[#2A2A2A] last:border-0 hover:bg-[#FAFAFA] dark:hover:bg-[#1F1F1F] transition-colors duration-150">
                    <td className="text-[14px] text-[#1A1A1A] dark:text-[#F5F5F5] px-6 py-3">{phase.name}</td>
                    <td className="text-[14px] text-[#6B7280] dark:text-[#888888] px-6 py-3">{phase.phase}</td>
                    <td className="text-[14px] text-[#6B7280] dark:text-[#888888] px-6 py-3">{formatDate(phase.window_open)}</td>
                    <td className="text-[14px] text-[#6B7280] dark:text-[#888888] px-6 py-3">{formatDate(phase.deadline)}</td>
                    <td className="px-6 py-3">
                      <Badge variant={getStatusVariant(phase.status)}>
                        {getStatusLabel(phase.status)}
                      </Badge>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outlined"
                          className="text-[13px] h-8 px-4 rounded-full flex items-center gap-1"
                          onClick={() => handleEdit(phase)}
                        >
                          <IconEdit size={14} />
                          Edit
                        </Button>
                        {showDeleteConfirm === phase.id ? (
                          <div className="flex items-center gap-2">
                            <Button
                              className="text-[13px] h-8 px-4 rounded-full bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => handleDelete(phase.id)}
                              disabled={deleting === phase.id}
                            >
                              {deleting === phase.id ? 'Deleting...' : 'Confirm'}
                            </Button>
                            <Button
                              variant="outlined"
                              className="text-[13px] h-8 px-4 rounded-full"
                              onClick={() => setShowDeleteConfirm(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outlined"
                            className="text-[13px] h-8 px-4 rounded-full flex items-center gap-1 text-red-600 dark:text-red-400 border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/20"
                            onClick={() => setShowDeleteConfirm(phase.id)}
                          >
                            <IconTrash size={14} />
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}

            {/* Add Phase inline form */}
            {showAddForm && (
              <tr className="border-t border-[#E8E8E4] dark:border-[#2A2A2A] bg-[#FAFAFA] dark:bg-[#1F1F1F]">
                <td colSpan={6} className="px-6 py-4">
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <Input
                      label="Cycle name"
                      value={newPhase.name}
                      onChange={(e) => setNewPhase({ ...newPhase, name: e.target.value })}
                      placeholder="e.g., Q4 Check-in"
                    />
                    <Input
                      label="Phase/Quarter"
                      value={newPhase.phase}
                      onChange={(e) => setNewPhase({ ...newPhase, phase: e.target.value })}
                      placeholder="e.g., Q4, Goal Setting"
                    />
                    <Input
                      label="Window Opens"
                      type="date"
                      value={newPhase.window_open}
                      onChange={(e) => setNewPhase({ ...newPhase, window_open: e.target.value })}
                    />
                    <Input
                      label="Deadline"
                      type="date"
                      value={newPhase.deadline}
                      onChange={(e) => setNewPhase({ ...newPhase, deadline: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Button onClick={handleAddPhase} disabled={saving} className="rounded-full px-5">
                      {saving ? 'Adding...' : 'Add phase'}
                    </Button>
                    <Button variant="outlined" onClick={() => { setShowAddForm(false); setNewPhase({ name: '', phase: '', window_open: '', deadline: '' }); setError(''); }} className="rounded-full px-5">
                      Cancel
                    </Button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PageLayout>
  );
}