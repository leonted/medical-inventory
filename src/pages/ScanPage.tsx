import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Item, Category } from '../types';
import { ArrowDownCircle, ArrowUpCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ScanPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [type, setType] = useState<'in' | 'out'>('out');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    api.getItem(Number(id)).then(async (it: Item) => {
      setItem(it);
      const cats = await api.getCategories();
      setCategory(cats.find((c: Category) => c.id === it.categoryId) || null);
    }).catch(() => toast.error('資材が見つかりません'));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    setSaving(true);
    try {
      await api.addTransaction({ itemId: item.id, type, quantity: Number(quantity), reason: reason || 'QRスキャン', notes: null });
      setDone(true);
      const updated = await api.getItem(item.id);
      setItem(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '記録に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (!item) return <div className="min-h-screen flex items-center justify-center text-gray-400">読み込み中...</div>;

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">記録完了</h2>
          <p className="text-gray-600 mb-1">{item.name}</p>
          <p className="text-gray-500 text-sm mb-6">
            {type === 'in' ? '入庫' : '出庫'}: {quantity}{item.unit} → 現在庫: <strong>{item.stock}{item.unit}</strong>
          </p>
          <div className="space-y-3">
            <button onClick={() => { setDone(false); setQuantity('1'); setReason(''); }} className="btn-primary w-full">
              続けて記録する
            </button>
            <button onClick={() => navigate('/dashboard')} className="btn-secondary w-full">
              ダッシュボードへ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
        <div className="bg-blue-600 p-5 text-white">
          <p className="text-sm opacity-80 mb-1">{category?.icon} {category?.name}</p>
          <h1 className="text-lg font-bold leading-tight">{item.name}</h1>
          <p className="text-sm mt-2 opacity-80">現在庫: <span className="font-bold text-white">{item.stock}{item.unit}</span></p>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">入庫 / 出庫</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setType('in')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors ${type === 'in' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}`}>
                <ArrowDownCircle className="w-5 h-5" /> 入庫
              </button>
              <button type="button" onClick={() => setType('out')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors ${type === 'out' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500'}`}>
                <ArrowUpCircle className="w-5 h-5" /> 出庫
              </button>
            </div>
          </div>

          <div>
            <label className="label">数量（{item.unit}）</label>
            <input type="number" min="1" required className="input text-2xl text-center font-bold" value={quantity} onChange={e => setQuantity(e.target.value)} />
          </div>

          <div>
            <label className="label">理由</label>
            <select className="input" value={reason} onChange={e => setReason(e.target.value)}>
              <option value="">その他</option>
              <option>接種使用</option>
              <option>処置使用</option>
              <option>調剤払い出し</option>
              <option>定期発注</option>
              <option>補充</option>
            </select>
          </div>

          <button type="submit" disabled={saving} className={`w-full py-4 font-bold rounded-xl text-white transition-colors ${type === 'in' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-500 hover:bg-orange-600'} disabled:opacity-50`}>
            {saving ? '記録中...' : `${type === 'in' ? '入庫' : '出庫'}を記録`}
          </button>
        </form>
      </div>
    </div>
  );
}
