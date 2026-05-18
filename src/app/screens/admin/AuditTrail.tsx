import { useState, useEffect } from 'react';
import { PageLayout } from '../../components/layout/PageLayout';
import { Edit, Trash2, Lock, Unlock, Settings } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface AuditEntry {
  id: string;
  action: string;
  performed_by: string;
  role: string;
  employee_affected: string;
  field_changed: string;
  old_value: string;
  new_value: string;
  created_at: string;
  performerName?: string;
  performerRole?: string;
  employeeName?: string;
}

const getIcon = (action: string) => {
  if (action.toLowerCase().includes('lock')) return <Lock size={16} />;
  if (action.toLowerCase().includes('unlock')) return <Unlock size={16} />;
  if (action.toLowerCase().includes('delet') || action.toLowerCase().includes('remov')) return <Trash2 size={16} />;
  if (action.toLowerCase().includes('approv')) return <Settings size={16} />;
  return <Edit size={16} />;
};

const getActionColor = (action: string) => {
  if (action.toLowerCase().includes('lock')) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  if (action.toLowerCase().includes('unlock')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  if (action.toLowerCase().includes('delet') || action.toLowerCase().includes('remov')) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  if (action.toLowerCase().includes('approv')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
};

const formatChange = (entry: AuditEntry) => {
  if (entry.old_value && entry.new_value) {
    return `${entry.field_changed}: ${entry.old_value} → ${entry.new_value}`;
  }
  if (entry.new_value) return entry.new_value;
  if (entry.old_value) return entry.old_value;
  return '—';
};

const formatTimestamp = (ts: string) => {
  return new Date(ts).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export function AuditTrail() {
  const [allEntries, setAllEntries] = useState<AuditEntry[]>([]);
  const [filtered, setFiltered] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [allEntries, search, dateFrom, dateTo]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: logs, error: logsError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;
      if (!logs || logs.length === 0) {
        setAllEntries([]);
        setFiltered([]);
        return;
      }

      // Collect all unique profile IDs (performers + affected employees)
      const profileIds = [
        ...new Set([
          ...logs.map((l: any) => l.performed_by),
          ...logs.map((l: any) => l.employee_affected)
        ].filter(Boolean))
      ];

      let profileMap: Record<string, { full_name: string; role: string }> = {};
      if (profileIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .in('id', profileIds);

        (profiles || []).forEach((p: any) => {
          profileMap[p.id] = { full_name: p.full_name, role: p.role };
        });
      }

      const enriched: AuditEntry[] = logs.map((log: any) => ({
        ...log,
        performerName: profileMap[log.performed_by]?.full_name || 'Unknown',
        performerRole: profileMap[log.performed_by]?.role || log.role || '',
        employeeName: profileMap[log.employee_affected]?.full_name || '—'
      }));

      setAllEntries(enriched);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...allEntries];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(e =>
        e.employeeName?.toLowerCase().includes(q) ||
        e.performerName?.toLowerCase().includes(q)
      );
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter(e => new Date(e.created_at) >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(e => new Date(e.created_at) <= to);
    }

    setFiltered(result);
  };

  if (loading) {
    return (
      <PageLayout title="Audit Trail">
        <div className="flex items-center justify-center py-20">
          <div className="text-[14px] text-[#9CA3AF]">Loading audit trail...</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Audit Trail">
      {error && (
        <div className="text-[13px] text-[#991B1B] dark:text-[#F87171] bg-[#FEF2F2] dark:bg-[#2A0000] px-4 py-3 rounded-full mb-4">
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white dark:bg-[#1A1A1A] border border-[#E8E8E4] dark:border-[#2A2A2A] rounded-[12px] p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search employee or performer..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 px-3 rounded-[8px] bg-[#F7F7F5] dark:bg-[#242424] border border-[#EBEBE8] dark:border-[#2A2A2A] text-[14px] text-[#1A1A1A] dark:text-[#F5F5F5] placeholder-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-[#F5A800] focus:border-[#F5A800] transition-all duration-200"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="h-9 px-3 rounded-[8px] bg-[#F7F7F5] dark:bg-[#242424] border border-[#EBEBE8] dark:border-[#2A2A2A] text-[14px] text-[#1A1A1A] dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-[#F5A800] focus:border-[#F5A800] transition-all duration-200"
            />
            <span className="text-[#6B7280] dark:text-[#888888] text-[13px]">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="h-9 px-3 rounded-[8px] bg-[#F7F7F5] dark:bg-[#242424] border border-[#EBEBE8] dark:border-[#2A2A2A] text-[14px] text-[#1A1A1A] dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-[#F5A800] focus:border-[#F5A800] transition-all duration-200"
            />
          </div>
        </div>
      </div>

      {/* Log Entries - Separate Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-[#1A1A1A] border border-[#E8E8E4] dark:border-[#2A2A2A] rounded-[12px] flex flex-col items-center justify-center py-16 text-center">
          <div className="text-[#9CA3AF] text-[14px] mb-1">No audit entries found</div>
          <div className="text-[#9CA3AF] text-[13px]">
            Try adjusting your search or date range.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((entry) => (
            <div
              key={entry.id}
              className="bg-white dark:bg-[#1A1A1A] border border-[#E8E8E4] dark:border-[#2A2A2A] rounded-[12px] p-4 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-full ${getActionColor(entry.action)}`}>
                  {getIcon(entry.action)}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                        {entry.action}
                      </span>
                      <span className="text-[13px] text-[#6B7280] dark:text-[#888888]">
                        · {entry.employeeName}
                      </span>
                    </div>
                    <span className="text-[12px] text-[#9CA3AF] whitespace-nowrap ml-4">
                      {formatTimestamp(entry.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wider">
                      {entry.performerRole}
                    </span>
                    <span className="text-[13px] text-[#6B7280] dark:text-[#888888]">
                      {entry.performerName}
                    </span>
                  </div>
                  <div className="text-[13px] text-[#6B7280] dark:text-[#888888] font-mono bg-[#F7F7F5] dark:bg-[#242424] px-3 py-2 rounded-[8px] mt-2">
                    {formatChange(entry)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
}