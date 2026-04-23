import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Item, Category, Location } from '../types';
import { Plus, Search, Filter, QrCode, Edit2, Trash2, X, Upload, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const EMPTY_FORM = { name: '', categoryId: '', locationId: '', stock: '', minStock: '10', unit: '個', lotNumber: '', expiryDate: '', manufacturer: '', price: '', notes: '', isActive: 'true' };

function QRModal({ item, onClose }: { item: Item; onClose: () => void }) {
  const [qr, setQr] = useState<string>('');
  useEffect(() => {
    api.getQR(item.id).then(r => setQr(r.qr));
  }, [item.id]);
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-800">QRコード</h3>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-gray-600 mb-4">{item.name}</p>
        {qr ? <img src={qr} alt="QR" className="w-full" /> : <div className="h-48 flex items-center justify-center text-gray-400">生成中...</div>}
        <button onClick={() => { const a = document.createElement('a'); a.href = qr; a.download = `qr-${item.id}.png`; a.click(); }} className="btn-primary w-full mt-4">
          印刷用に保存
        </button>
      </div>
    </div>
  );
}

function ItemModal({ item, categories, locations, onClose, onSaved }: {
  item: Item | null; categories: Category[]; locations: Location[];
  onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState<typeof EMPTY_FORM>(item ? {
    name: item.name, categoryId: String(item.categoryId), locationId: String(item.locationId),
    stock: String(item.stock), minStock: String(item.minStock), unit: item.unit,
    lotNumber: item.lotNumber || '', expiryDate: item.expiryDate || '',
    manufacturer: item.manufacturer || '', price: String(item.price || ''), notes: item.notes || '',
    isActive: String(item.isActive !== false),
  } : EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });
      if (imageFile) fd.append('image', imageFile);
      if (item) await api.updateItem(item.id, fd);
      else await api.addItem(fd);
      toast.success(item ? '更新しました' : '登録しました');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg my-4">
        <div className="flex justify-between items-center p-5 border-b">
          <h3 className="font-bold text-gray-800">{item ? '資材を編集' : '新規資材を登録'}</h3>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">品名 <span className="text-red-500">*</span></label>
            <input className="input" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="例: インフルエンザワクチン" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">カテゴリ <span className="text-red-500">*</span></label>
              <select className="input" required value={form.categoryId} onChange={e => set('categoryId', e.target.value)}>
                <option value="">選択してください</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">保管場所</label>
              <select className="input" value={form.locationId} onChange={e => set('locationId', e.target.value)}>
                <option value="">選択してください</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">現在庫数</label>
              <input type="number" min="0" className="input" value={form.stock} onChange={e => set('stock', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="label">最低在庫数</label>
              <input type="number" min="0" className="input" value={form.minStock} onChange={e => set('minStock', e.target.value)} placeholder="10" />
            </div>
            <div>
              <label className="label">単位</label>
              <input className="input" value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="個" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">ロット番号</label>
              <input className="input" value={form.lotNumber} onChange={e => set('lotNumber', e.target.value)} placeholder="LOT-..." />
            </div>
            <div>
              <label className="label">使用期限</label>
              <input type="date" className="input" value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">メーカー</label>
              <input className="input" value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} />
            </div>
            <div>
              <label className="label">単価（円）</label>
              <input type="number" min="0" className="input" value={form.price} onChange={e => set('price', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">備考</label>
            <textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-700">季節外（シーズン外）</p>
              <p className="text-xs text-gray-400">オンにすると在庫アラートから除外されます</p>
            </div>
            <button
              type="button"
              onClick={() => set('isActive', form.isActive === 'true' ? 'false' : 'true')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive === 'false' ? 'bg-gray-300' : 'bg-blue-600'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.isActive === 'false' ? 'translate-x-1' : 'translate-x-6'}`} />
            </button>
          </div>
          <div>
            <label className="label">画像</label>
            <label className="flex items-center gap-2 cursor-pointer border border-dashed border-gray-300 rounded-lg p-3 hover:bg-gray-50">
              <Upload className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">{imageFile ? imageFile.name : '画像を選択（任意）'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={e => setImageFile(e.target.files?.[0] || null)} />
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">キャンセル</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? '保存中...' : '保存する'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [locFilter, setLocFilter] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [editItem, setEditItem] = useState<Item | null | undefined>(undefined);
  const [qrItem, setQrItem] = useState<Item | null>(null);

  const load = () => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (catFilter) params.categoryId = catFilter;
    if (locFilter) params.locationId = locFilter;
    api.getItems(params).then(setItems);
  };

  useEffect(() => {
    api.getCategories().then(setCategories);
    api.getLocations().then(setLocations);
  }, []);

  useEffect(() => { load(); }, [search, catFilter, locFilter]);

  const handleDelete = async (item: Item) => {
    if (!confirm(`「${item.name}」を削除しますか？`)) return;
    await api.deleteItem(item.id);
    toast.success('削除しました');
    load();
  };

  const getCat = (id: number) => categories.find(c => c.id === id);
  const getLoc = (id: number) => locations.find(l => l.id === id);

  const isLow = (item: Item) => item.isActive !== false && item.stock <= item.minStock;
  const displayed = items.filter(i => showInactive ? i.isActive === false : i.isActive !== false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">在庫一覧</h1>
        <button onClick={() => setEditItem(null)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> 新規登録
        </button>
      </div>

      {/* Filters */}
      <div className="card py-3 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="品名で検索..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-40" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">すべてのカテゴリ</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <select className="input sm:w-40" value={locFilter} onChange={e => setLocFilter(e.target.value)}>
          <option value="">すべての場所</option>
          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <button
          onClick={() => setShowInactive(v => !v)}
          className={`text-sm px-3 py-2 rounded-lg border transition-colors whitespace-nowrap ${showInactive ? 'bg-gray-200 text-gray-700 border-gray-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
        >
          {showInactive ? '通常表示に戻す' : '季節外を表示'}
        </button>
      </div>

      <p className="text-sm text-gray-500">{displayed.length}件の資材{showInactive ? '（季節外）' : ''}</p>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {displayed.map(item => {
          const cat = getCat(item.categoryId);
          const loc = getLoc(item.locationId);
          const low = isLow(item);
          return (
            <div key={item.id} className={`bg-white rounded-xl border ${item.isActive === false ? 'border-gray-200 opacity-60' : low ? 'border-orange-200' : 'border-gray-100'} shadow-sm overflow-hidden hover:shadow-md transition-shadow`}>
              {/* Image */}
              <div className="aspect-video bg-gray-50 flex items-center justify-center relative">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">{cat?.icon || '📦'}</span>
                )}
                {item.isActive === false && (
                  <div className="absolute top-2 left-2">
                    <span className="text-xs bg-gray-500 text-white px-1.5 py-0.5 rounded-full">季節外</span>
                  </div>
                )}
                {low && item.isActive !== false && (
                  <div className="absolute top-2 right-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-gray-800 leading-tight mb-2 line-clamp-2">{item.name}</p>
                {cat && (
                  <span className="inline-block text-xs px-2 py-0.5 rounded-full mb-2" style={{ backgroundColor: `${cat.color}15`, color: cat.color }}>
                    {cat.name}
                  </span>
                )}
                {loc && <p className="text-xs text-gray-400 mb-2">📍 {loc.name}</p>}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">在庫数</span>
                  <span className={`text-base font-bold ${low ? 'text-orange-600' : 'text-green-600'}`}>
                    {item.stock} <span className="text-xs font-normal text-gray-400">{item.unit}</span>
                  </span>
                </div>
                {item.expiryDate && (
                  <p className="text-xs text-gray-400 mt-1">期限: {item.expiryDate}</p>
                )}
                {/* Actions */}
                <div className="flex items-center gap-1 mt-3 pt-2 border-t border-gray-50">
                  <button onClick={() => setQrItem(item)} className="flex-1 flex items-center justify-center gap-1 py-1 text-xs text-gray-400 hover:text-blue-600 transition-colors" title="QRコード">
                    <QrCode className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setEditItem(item)} className="flex-1 flex items-center justify-center gap-1 py-1 text-xs text-gray-400 hover:text-blue-600 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(item)} className="flex-1 flex items-center justify-center gap-1 py-1 text-xs text-gray-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editItem !== undefined && (
        <ItemModal
          item={editItem}
          categories={categories}
          locations={locations}
          onClose={() => setEditItem(undefined)}
          onSaved={() => { setEditItem(undefined); load(); }}
        />
      )}

      {qrItem && <QRModal item={qrItem} onClose={() => setQrItem(null)} />}
    </div>
  );
}
