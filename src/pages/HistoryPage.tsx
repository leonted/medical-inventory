import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Transaction } from '../types';
import { Search, TrendingUp, TrendingDown, Download, UserCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function HistoryPage() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (typeFilter) params.type = typeFilter;
    if (from) params.from = from;
    if (to) params.to = to + 'T23:59:59Z';
    api.getTransactions(params).then(setTxs).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search, typeFilter, from, to]);

  const handleDelete = async (id: number) => {
    if (!confirm('この履歴を削除しますか？')) return;
    await api.deleteTransaction(id);
    toast.success('削除しました');
    load();
  };

  const exportCSV = () => {
    const header = 'ID,日時,品名,種別,数量,単位,担当者,理由,ロット,出庫場所,備考';
    const rows = txs.map(t =>
      [t.id, new Date(t.createdAt).toLocaleString('ja-JP'), t.itemName, t.type === 'in' ? '入庫' : '出庫', t.quantity, t.itemUnit, t.userName, t.reason, t.lotNumber || '', t.destination || '', t.notes || ''].join(',')
    );
    const csv = '\uFEFF' + [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `入出庫履歴_${new Date().toLocaleDateString('ja-JP').replace(/\//g, '-')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">入出庫履歴</h1>
        <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" /> CSV出力
        </button>
      </div>

      {/* Filters */}
      <div className="card py-3 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="品名・担当者で検索..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-32" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">すべて</option>
          <option value="in">入庫のみ</option>
          <option value="out">出庫のみ</option>
        </select>
        <input type="date" className="input sm:w-36" value={from} onChange={e => setFrom(e.target.value)} placeholder="開始日" />
        <input type="date" className="input sm:w-36" value={to} onChange={e => setTo(e.target.value)} placeholder="終了日" />
      </div>

      <p className="text-sm text-gray-500">{txs.length}件の履歴</p>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">日時</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">品名</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">種別</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">数量</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">担当者</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">理由</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium hidden sm:table-cell">ロット</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium hidden md:table-cell">出庫場所</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium hidden lg:table-cell">備考</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">読み込み中...</td></tr>
              ) : txs.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">履歴がありません</td></tr>
              ) : txs.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(tx.createdAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{tx.itemName}</p>
                  </td>
                  <td className="px-4 py-3">
                    {tx.type === 'in' ? (
                      <span className="badge-in"><TrendingUp className="w-3 h-3 mr-1 inline" />入庫</span>
                    ) : (
                      <span className="badge-out"><TrendingDown className="w-3 h-3 mr-1 inline" />出庫</span>
                    )}
                  </td>
                  <td className={`px-4 py-3 text-right font-bold ${tx.type === 'in' ? 'text-blue-600' : 'text-orange-600'}`}>
                    {tx.type === 'in' ? '+' : '-'}{tx.quantity} {tx.itemUnit}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0">
                        {tx.userName?.charAt(0) || '?'}
                      </div>
                      <span className="text-gray-800 font-medium text-xs whitespace-nowrap">{tx.userName || '-'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{tx.reason}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {tx.lotNumber ? <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-mono">{tx.lotNumber}</span> : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{tx.destination || '-'}</td>
                  <td className="px-4 py-3 text-gray-400 hidden lg:table-cell">{tx.notes || '-'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(tx.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
