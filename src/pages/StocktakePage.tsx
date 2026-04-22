import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Stocktake } from '../types';
import { Plus, ClipboardCheck, ChevronDown, ChevronUp, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

function StocktakeDetail({ st, onRefresh }: { st: Stocktake; onRefresh: () => void }) {
  const [entries, setEntries] = useState(st.entries.map(e => ({ ...e })));
  const [saving, setSaving] = useState(false);

  const setActual = (idx: number, val: string) => {
    setEntries(prev => prev.map((e, i) => i === idx ? { ...e, actualStock: val === '' ? null : Number(val) } : e));
  };

  const saveEntries = async () => {
    setSaving(true);
    try {
      await api.updateStocktake(st.id, { entries });
      toast.success('保存しました');
      onRefresh();
    } catch {
      toast.error('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const adjustAll = async () => {
    if (!confirm('差異のある品目を全て調整しますか？在庫数が実地数に更新されます。')) return;
    const indexes = entries.map((e, i) => i).filter(i => entries[i].actualStock !== null && !entries[i].adjusted);
    setSaving(true);
    try {
      await api.adjustStocktake(st.id, indexes);
      toast.success('棚卸調整が完了しました');
      onRefresh();
    } catch {
      toast.error('調整に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const print = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const rows = entries.map(e => `
      <tr>
        <td>${e.itemName}</td>
        <td style="text-align:right">${e.systemStock}</td>
        <td style="text-align:right">${e.actualStock ?? ''}</td>
        <td style="text-align:right;color:${(e.difference ?? 0) !== 0 ? 'red' : 'black'}">${e.difference ?? ''}</td>
        <td>${e.adjusted ? '済' : ''}</td>
      </tr>`).join('');
    win.document.write(`
      <html><head><title>${st.title}</title>
      <style>body{font-family:sans-serif;font-size:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px 8px}th{background:#f5f5f5}</style>
      </head><body>
      <h2>${st.title}</h2>
      <p>実施日: ${new Date(st.createdAt).toLocaleDateString('ja-JP')} / 担当: ${st.userName}</p>
      <table><thead><tr><th>品名</th><th>システム在庫</th><th>実地在庫</th><th>差異</th><th>調整</th></tr></thead>
      <tbody>${rows}</tbody></table>
      </body></html>`);
    win.print();
  };

  const hasUnadjusted = entries.some(e => e.actualStock !== null && e.actualStock !== e.systemStock && !e.adjusted);

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2 text-gray-500">品名</th>
              <th className="text-right px-3 py-2 text-gray-500">システム在庫</th>
              <th className="text-right px-3 py-2 text-gray-500 w-28">実地在庫</th>
              <th className="text-right px-3 py-2 text-gray-500">差異</th>
              <th className="px-3 py-2 text-gray-500">状態</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {entries.map((e, i) => {
              const diff = e.actualStock !== null ? e.actualStock - e.systemStock : null;
              return (
                <tr key={i} className={diff !== null && diff !== 0 ? 'bg-red-50' : ''}>
                  <td className="px-3 py-2 font-medium text-gray-800">{e.itemName}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{e.systemStock}</td>
                  <td className="px-3 py-2">
                    {st.status === 'open' && !e.adjusted ? (
                      <input
                        type="number" min="0"
                        className="w-full border border-gray-300 rounded px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={e.actualStock ?? ''}
                        onChange={ev => setActual(i, ev.target.value)}
                      />
                    ) : (
                      <span className="block text-right">{e.actualStock ?? '-'}</span>
                    )}
                  </td>
                  <td className={`px-3 py-2 text-right font-medium ${diff !== null && diff !== 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {diff !== null ? (diff > 0 ? `+${diff}` : diff) : '-'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {e.adjusted ? <span className="text-xs text-green-600 font-medium">調整済</span> : <span className="text-xs text-gray-300">-</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {st.status === 'open' && (
        <div className="flex gap-3 mt-4">
          <button onClick={print} className="btn-secondary flex items-center gap-2 text-sm">
            <Printer className="w-4 h-4" /> 印刷
          </button>
          <button onClick={saveEntries} disabled={saving} className="btn-secondary text-sm">
            {saving ? '保存中...' : '入力を保存'}
          </button>
          {hasUnadjusted && (
            <button onClick={adjustAll} disabled={saving} className="btn-primary text-sm flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4" /> 差異を調整して完了
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function StocktakePage() {
  const [stocktakes, setStocktakes] = useState<Stocktake[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');

  const load = () => api.getStocktakes().then(setStocktakes);
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const st = await api.addStocktake({ title: title || undefined });
      toast.success('棚卸を開始しました');
      setTitle('');
      load();
      setExpanded(st.id);
    } catch {
      toast.error('作成に失敗しました');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">棚卸管理</h1>

      {/* New stocktake */}
      <div className="card">
        <h2 className="font-semibold text-gray-700 mb-3">新規棚卸を開始</h2>
        <div className="flex gap-3">
          <input
            className="input flex-1"
            placeholder={`例: 2025年4月 棚卸`}
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <button onClick={handleCreate} disabled={creating} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> {creating ? '作成中...' : '開始'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">開始すると、現在の全登録資材のシステム在庫数が取得されます。実地在庫を入力して差異を確認してください。</p>
      </div>

      {/* List */}
      <div className="space-y-3">
        {stocktakes.map(st => (
          <div key={st.id} className="card">
            <button
              className="w-full flex items-center justify-between"
              onClick={() => setExpanded(expanded === st.id ? null : st.id)}
            >
              <div className="flex items-center gap-3">
                <ClipboardCheck className={`w-5 h-5 ${st.status === 'open' ? 'text-blue-600' : 'text-green-600'}`} />
                <div className="text-left">
                  <p className="font-medium text-gray-800">{st.title}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(st.createdAt).toLocaleDateString('ja-JP')} · {st.userName} · {st.entries.length}品目
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${st.status === 'open' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                  {st.status === 'open' ? '進行中' : '完了'}
                </span>
                {expanded === st.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </button>
            {expanded === st.id && <StocktakeDetail st={st} onRefresh={load} />}
          </div>
        ))}

        {stocktakes.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>棚卸履歴がありません</p>
          </div>
        )}
      </div>
    </div>
  );
}
