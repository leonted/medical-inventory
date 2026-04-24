import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { IncidentReport } from '../types';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle2, RotateCcw, User } from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string; color: string; next: string }> = {
  submitted:          { label: '未確認（RMG/MG待ち）', color: 'bg-red-100 text-red-700', next: 'RMG/MGが確認してください' },
  rmg_checked:        { label: 'RMG確認済（所属長待ち）', color: 'bg-yellow-100 text-yellow-700', next: '所属長が確認してください' },
  shozokucho_checked: { label: '所属長確認済（本部待ち）', color: 'bg-blue-100 text-blue-700', next: '本部が最終承認してください' },
  approved:           { label: '本部承認済（完了）', color: 'bg-green-100 text-green-700', next: '' },
};

const TYPE_LABELS: Record<string, string> = {
  incident: 'インシデント', near_miss: 'ヒヤリハット', complaint: 'クレーム',
};

const STEP_LABELS: Record<string, string> = {
  rmg: 'RMG/MG', shozokucho: '所属長', honbu: '本部',
};

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [report, setReport] = useState<IncidentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [approving, setApproving] = useState(false);

  const load = async () => {
    try {
      const data = await api.getIncident(Number(id));
      setReport(data);
    } catch {
      toast.error('報告が見つかりません');
      navigate('/incidents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  // このユーザーが今承認できるかどうか
  const canApprove = () => {
    if (!report || !user) return false;
    if (user.role === 'admin') return report.status !== 'approved';
    if ((user.role === 'rmg' || user.role === 'mg') && report.status === 'submitted') return true;
    if (user.role === 'shozokucho' && report.status === 'rmg_checked') return true;
    if (user.role === 'honbu' && report.status === 'shozokucho_checked') return true;
    return false;
  };

  const handleAction = async (action: 'approved' | 'returned') => {
    if (!report) return;
    if (action === 'returned' && !comment.trim()) {
      toast.error('差し戻しのコメントを入力してください');
      return;
    }
    setApproving(true);
    try {
      await api.approveIncident(report.id, { action, comment });
      toast.success(action === 'approved' ? '承認しました' : '差し戻しました');
      load();
      setComment('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作に失敗しました');
    } finally {
      setApproving(false);
    }
  };

  if (loading) return <div className="text-center py-16 text-gray-400">読み込み中...</div>;
  if (!report) return null;

  const statusInfo = STATUS_LABELS[report.status];
  const canSeePatient = user && ['admin', 'honbu', 'shozokucho', 'rmg', 'mg'].includes(user.role);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <button onClick={() => navigate('/incidents')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowLeft className="w-4 h-4" />一覧に戻る
      </button>

      {/* ステータス */}
      <div className={`rounded-xl p-4 flex items-center justify-between flex-wrap gap-2 ${statusInfo.color}`}>
        <div>
          <div className="font-bold">{statusInfo.label}</div>
          {statusInfo.next && <div className="text-sm opacity-75 mt-0.5">{statusInfo.next}</div>}
        </div>
        <div className="text-right text-xs opacity-60">報告番号 #{report.id}</div>
      </div>

      {/* 基本情報 */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
        <h2 className="font-bold text-gray-800 border-b pb-2">基本情報</h2>
        <InfoRow label="種別" value={TYPE_LABELS[report.reportType]} />
        <InfoRow label="発生日時" value={`${report.occurrenceDate}${report.occurrenceTime ? ' ' + report.occurrenceTime : ''}`} />
        <InfoRow label="拠点" value={report.baseName} />
        <InfoRow label="部署" value={report.department} />
        {canSeePatient && <InfoRow label="利用者名" value={report.patientName} highlight />}
        {report.severity && <InfoRow label="重大度" value={`レベル ${report.severity}`} />}
      </div>

      {/* SBAR */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h2 className="font-bold text-gray-800 border-b pb-2">SBAR</h2>
        <SBARBlock label="S：状況" value={report.situation} color="bg-red-50 border-red-100" />
        <SBARBlock label="B：背景" value={report.background} color="bg-yellow-50 border-yellow-100" />
        <SBARBlock label="A：評価" value={report.assessment} color="bg-blue-50 border-blue-100" />
        <SBARBlock label="R：提案" value={report.recommendation} color="bg-green-50 border-green-100" />
      </div>

      {/* 承認履歴 */}
      {report.approvals && report.approvals.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <h2 className="font-bold text-gray-800 border-b pb-2">承認履歴</h2>
          {report.approvals.map(a => (
            <div key={a.id} className="flex items-start gap-3">
              <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${a.action === 'approved' ? 'bg-green-100' : 'bg-orange-100'}`}>
                {a.action === 'approved'
                  ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                  : <RotateCcw className="w-4 h-4 text-orange-600" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-gray-800">{STEP_LABELS[a.step]}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${a.action === 'approved' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {a.action === 'approved' ? '承認' : '差し戻し'}
                  </span>
                  <span className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleString('ja-JP')}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                  <User className="w-3 h-3" />{a.approverName}
                </div>
                {a.comment && <p className="text-sm text-gray-600 mt-1 bg-gray-50 rounded-lg p-2">{a.comment}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 承認・差し戻しアクション */}
      {canApprove() && (
        <div className="bg-white rounded-xl border border-blue-100 p-5 space-y-4">
          <h2 className="font-bold text-gray-800">承認・差し戻し</h2>
          <div>
            <label className="label">コメント（差し戻し時は必須）</label>
            <textarea
              className="input resize-none min-h-[80px]"
              placeholder="コメントを入力..."
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handleAction('returned')}
              disabled={approving}
              className="btn-secondary flex items-center gap-2 flex-1"
            >
              <RotateCcw className="w-4 h-4" />差し戻し
            </button>
            <button
              onClick={() => handleAction('approved')}
              disabled={approving}
              className="btn-primary flex items-center gap-2 flex-1"
            >
              <CheckCircle2 className="w-4 h-4" />承認する
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value?: string; highlight?: boolean }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-gray-500 w-24 shrink-0">{label}</span>
      <span className={`font-medium ${highlight ? 'text-blue-700' : 'text-gray-800'}`}>{value || '—'}</span>
    </div>
  );
}

function SBARBlock({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div className="text-sm font-bold text-gray-700 mb-1">{label}</div>
      <p className={`text-sm text-gray-700 whitespace-pre-wrap border rounded-xl p-3 ${color}`}>{value}</p>
    </div>
  );
}
