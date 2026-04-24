import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { IncidentReport, IncidentBase } from '../types';
import { useAuth } from '../hooks/useAuth';
import { Search, Filter, ExternalLink, BarChart2 } from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  submitted:          { label: '未確認', color: 'bg-red-100 text-red-700' },
  rmg_checked:        { label: 'RMG確認済', color: 'bg-yellow-100 text-yellow-700' },
  shozokucho_checked: { label: '所属長確認済', color: 'bg-blue-100 text-blue-700' },
  approved:           { label: '本部承認済', color: 'bg-green-100 text-green-700' },
};

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  incident:  { label: 'インシデント', color: 'bg-red-50 text-red-700' },
  near_miss: { label: 'ヒヤリハット', color: 'bg-yellow-50 text-yellow-700' },
  complaint: { label: 'クレーム', color: 'bg-blue-50 text-blue-700' },
};

export default function IncidentListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [bases, setBases] = useState<IncidentBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', reportType: '', baseId: '', from: '', to: '' });

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filters.status) params.status = filters.status;
      if (filters.reportType) params.reportType = filters.reportType;
      if (filters.baseId) params.baseId = filters.baseId;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      const data = await api.getIncidents(Object.keys(params).length ? params : undefined);
      setReports(data);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.getIncidentBases().then(setBases).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [filters]);

  const canSeePatient = user && ['admin', 'honbu', 'shozokucho', 'rmg', 'mg'].includes(user.role);
  const pendingCount = reports.filter(r => r.status !== 'approved').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">インシデント・ヒヤリハット・クレーム一覧</h1>
          {pendingCount > 0 && (
            <p className="text-sm text-red-600 mt-0.5">未承認 {pendingCount} 件があります</p>
          )}
        </div>
        <button
          onClick={() => navigate('/incidents/stats')}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <BarChart2 className="w-4 h-4" />月次集計・統計
        </button>
      </div>

      {/* フィルター */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
          <Filter className="w-4 h-4" />絞り込み
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="label text-xs">ステータス</label>
            <select className="input text-sm" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
              <option value="">すべて</option>
              {Object.entries(STATUS_LABELS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">種別</label>
            <select className="input text-sm" value={filters.reportType} onChange={e => setFilters(f => ({ ...f, reportType: e.target.value }))}>
              <option value="">すべて</option>
              {Object.entries(TYPE_LABELS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">拠点</label>
            <select className="input text-sm" value={filters.baseId} onChange={e => setFilters(f => ({ ...f, baseId: e.target.value }))}>
              <option value="">すべて</option>
              {bases.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">発生日（開始）</label>
            <input type="date" className="input text-sm" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* 一覧 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">読み込み中...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Search className="w-10 h-10 mx-auto mb-2 opacity-30" />
          該当する報告がありません
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <div
              key={r.id}
              onClick={() => navigate(`/incidents/${r.id}`)}
              className="bg-white rounded-xl border border-gray-100 p-4 cursor-pointer hover:border-blue-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_LABELS[r.reportType]?.color}`}>
                      {TYPE_LABELS[r.reportType]?.label}
                    </span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_LABELS[r.status]?.color}`}>
                      {STATUS_LABELS[r.status]?.label}
                    </span>
                    {r.severity && <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">Lv.{r.severity}</span>}
                  </div>
                  <p className="text-sm text-gray-800 font-medium line-clamp-2">{r.situation}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
                    <span>{r.occurrenceDate}</span>
                    <span>{r.baseName}</span>
                    <span>{r.department}</span>
                    {canSeePatient && <span className="text-gray-600">利用者：{r.patientName}</span>}
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-300 shrink-0 mt-1" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
