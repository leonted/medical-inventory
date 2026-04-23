import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Item, Category, ItemLot } from '../types';
import { ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, X } from 'lucide-react';
import toast from 'react-hot-toast';

const REASONS_IN = ['定期発注', '補充', '返品入庫', '棚卸調整', 'その他'];
const REASONS_OUT = ['拠点用', '委託巡回用', '企業巡回用', '廃棄', '貸出', 'その他'];

export default function TransactionsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [destinations, setDestinations] = useState<{ id: number; name: string }[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [type, setType] = useState<'in' | 'out'>('out');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [destination, setDestination] = useState('');
  const [destCustom, setDestCustom] = useState('');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [lots, setLots] = useState<ItemLot[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getItems().then(setItems);
    api.getCategories().then(setCategories);
    api.getDestinations().then(setDestinations);
  }, []);

  const filtered = items.filter(i => i.name.includes(search) && i.isActive !== false);
  const getCat = (id: number) => categories.find(c => c.id === id);

  const selectItem = (item: Item) => {
    setSelectedItem(item);
    setSelectedLotId(null);
    api.getLots(item.id).then(setLots);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return toast.error('資材を選択してください');
    if (!quantity || Number(quantity) <= 0) return toast.error('数量を入力してください');
    const selectedLot = lots.find(l => l.id === selectedLotId);
    if (type === 'out' && lots.length > 0 && !selectedLotId) {
      return toast.error('出庫するロットを選択してください');
    }
    const availableStock = selectedLot ? selectedLot.stock : selectedItem.stock;
    if (type === 'out' && Number(quantity) > availableStock) {
      return toast.error(`在庫が不足しています（選択ロット在庫: ${availableStock}${selectedItem.unit}）`);
    }
    setSaving(true);
    try {
      const resolvedDest = type === 'out' ? (destination === '__custom__' ? destCustom : destination) : undefined;
      await api.addTransaction({ itemId: selectedItem.id, type, quantity: Number(quantity), reason: reason || 'その他', notes, destination: resolvedDest, createdAt: new Date(txDate).toISOString(), lotId: selectedLotId || undefined });
      toast.success(`${type === 'in' ? '入庫' : '出庫'}を記録しました`);
      const updated = await api.getItem(selectedItem.id);
      setSelectedItem(updated);
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
      setQuantity('');
      setNotes('');
      setReason('');
      setDestination('');
      setDestCustom('');
      setTxDate(new Date().toISOString().slice(0, 16));
      setSelectedLotId(null);
      api.getLots(selectedItem.id).then(setLots);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '記録に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">入出庫記録</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Item selection */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-700">① 資材を選ぶ</h2>
          <input
            className="input"
            placeholder="品名で検索..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="max-h-80 overflow-y-auto space-y-1 border border-gray-100 rounded-lg p-2">
            {filtered.map(item => {
              const cat = getCat(item.categoryId);
              const isSelected = selectedItem?.id === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => selectItem(item)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    isSelected ? 'border-blue-400 bg-blue-50' : 'border-transparent hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-400">{cat?.icon} {cat?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${item.stock <= item.minStock ? 'text-orange-600' : 'text-green-600'}`}>
                        {item.stock}
                      </p>
                      <p className="text-xs text-gray-400">{item.unit}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Transaction form */}
        <div className="card">
          <h2 className="font-semibold text-gray-700 mb-4">② 入出庫を記録</h2>
          {selectedItem ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Selected item info */}
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-800">{selectedItem.name}</p>
                    <p className="text-sm text-gray-500">現在庫: <span className="font-bold text-gray-700">{selectedItem.stock}{selectedItem.unit}</span></p>
                  </div>
                  <button type="button" onClick={() => setSelectedItem(null)} className="text-gray-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="label">日時</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={txDate}
                  max={new Date().toISOString().slice(0, 16)}
                  onChange={e => setTxDate(e.target.value)}
                />
              </div>

              {/* Type */}
              <div>
                <label className="label">入庫 / 出庫</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setType('in')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors ${type === 'in' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}`}>
                    <ArrowDownCircle className="w-5 h-5" />
                    <span className="font-medium">入庫</span>
                  </button>
                  <button type="button" onClick={() => setType('out')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors ${type === 'out' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500'}`}>
                    <ArrowUpCircle className="w-5 h-5" />
                    <span className="font-medium">出庫</span>
                  </button>
                </div>
              </div>

              {/* Lot selection */}
              {lots.length > 0 && (
                <div>
                  <label className="label">ロット選択{type === 'out' && <span className="text-red-500"> *</span>}</label>
                  <div className="space-y-2">
                    {lots.map(lot => {
                      const days = lot.expiryDate ? Math.ceil((new Date(lot.expiryDate).getTime() - Date.now()) / 86400000) : null;
                      const expColor = days === null ? 'text-gray-400' : days < 30 ? 'text-red-600' : days < 90 ? 'text-orange-500' : 'text-gray-500';
                      return (
                        <button
                          key={lot.id}
                          type="button"
                          onClick={() => setSelectedLotId(lot.id === selectedLotId ? null : lot.id)}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${selectedLotId === lot.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-bold text-gray-800">{lot.lotNumber}</p>
                              <p className={`text-xs ${expColor}`}>期限: {lot.expiryDate || '未設定'}{days !== null && ` (残${days}日)`}</p>
                            </div>
                            <span className={`text-sm font-bold ${lot.stock === 0 ? 'text-gray-300' : 'text-green-600'}`}>{lot.stock}{selectedItem.unit}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="label">数量（{selectedItem.unit}）</label>
                <input
                  type="number"
                  min="1"
                  required
                  className="input text-lg"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  placeholder="0"
                />
                {type === 'out' && selectedLotId && Number(quantity) > (lots.find(l => l.id === selectedLotId)?.stock ?? 0) && (
                  <p className="text-red-500 text-xs mt-1">このロットの在庫が不足しています</p>
                )}
                {type === 'out' && lots.length === 0 && Number(quantity) > selectedItem.stock && (
                  <p className="text-red-500 text-xs mt-1">在庫が不足しています</p>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="label">理由</label>
                <select className="input" value={reason} onChange={e => setReason(e.target.value)}>
                  <option value="">選択してください</option>
                  {(type === 'in' ? REASONS_IN : REASONS_OUT).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* Destination (出庫のみ) */}
              {type === 'out' && (
                <div className="space-y-2">
                  <label className="label">出庫場所</label>
                  <select className="input" value={destination} onChange={e => setDestination(e.target.value)}>
                    <option value="">選択してください</option>
                    {destinations.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                    <option value="__custom__">その他（手入力）</option>
                  </select>
                  {destination === '__custom__' && (
                    <input
                      className="input"
                      placeholder="出庫場所を入力..."
                      value={destCustom}
                      onChange={e => setDestCustom(e.target.value)}
                      autoFocus
                    />
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="label">備考（任意）</label>
                <textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="詳細や患者IDなど" />
              </div>

              <button type="submit" disabled={saving} className={`w-full py-3 font-medium rounded-lg transition-colors ${type === 'in' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'} disabled:opacity-50`}>
                {saving ? '記録中...' : `${type === 'in' ? '入庫' : '出庫'}を記録する`}
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400">
              <div className="text-center">
                <ArrowLeftRight className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>左のリストから資材を選んでください</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

