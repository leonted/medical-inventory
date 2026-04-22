import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Category, Location } from '../types';
import { Plus, Edit2, Trash2, X, Check, Tag, MapPin, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const COLORS = ['#2563eb','#16a34a','#7c3aed','#ea580c','#0891b2','#65a30d','#dc2626','#d97706','#9333ea','#0f766e'];
const ICONS = ['💉','🩺','💊','🩹','🔬','🧤','🧪','📦','🌡️','🩻','🩼','⚕️'];

function CategorySection() {
  const [cats, setCats] = useState<Category[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', color: COLORS[0], icon: ICONS[0] });
  const [adding, setAdding] = useState(false);

  const load = () => api.getCategories().then(setCats);
  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.name) return;
    await api.addCategory(form);
    setForm({ name: '', color: COLORS[0], icon: ICONS[0] });
    setAdding(false);
    toast.success('カテゴリを追加しました');
    load();
  };

  const handleUpdate = async (id: number) => {
    await api.updateCategory(id, form);
    setEditId(null);
    toast.success('更新しました');
    load();
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    await api.deleteCategory(id);
    toast.success('削除しました');
    load();
  };

  const startEdit = (cat: Category) => {
    setEditId(cat.id);
    setForm({ name: cat.name, color: cat.color, icon: cat.icon });
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-gray-700">カテゴリ</h2>
        </div>
        <button onClick={() => setAdding(true)} className="btn-primary text-sm flex items-center gap-1 py-1.5">
          <Plus className="w-4 h-4" /> 追加
        </button>
      </div>

      {adding && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg space-y-3">
          <input className="input" placeholder="カテゴリ名" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
          <div>
            <p className="text-xs text-gray-500 mb-2">アイコン</p>
            <div className="flex flex-wrap gap-2">
              {ICONS.map(icon => (
                <button key={icon} type="button" onClick={() => setForm(f => ({ ...f, icon }))}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center border-2 ${form.icon === icon ? 'border-blue-500 bg-white' : 'border-transparent hover:bg-white'}`}>
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-2">カラー</p>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(color => (
                <button key={color} type="button" onClick={() => setForm(f => ({ ...f, color }))}
                  style={{ backgroundColor: color }}
                  className={`w-7 h-7 rounded-full border-2 ${form.color === color ? 'border-gray-800 scale-110' : 'border-transparent'} transition-transform`} />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setAdding(false)} className="btn-secondary text-sm flex-1">キャンセル</button>
            <button onClick={handleAdd} className="btn-primary text-sm flex-1">追加する</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {cats.map(cat => (
          <div key={cat.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg">
            {editId === cat.id ? (
              <div className="flex-1 space-y-2">
                <input className="input text-sm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                <div className="flex flex-wrap gap-1">
                  {ICONS.map(icon => (
                    <button key={icon} type="button" onClick={() => setForm(f => ({ ...f, icon }))}
                      className={`w-8 h-8 rounded text-base flex items-center justify-center ${form.icon === icon ? 'bg-blue-100' : 'hover:bg-gray-100'}`}>
                      {icon}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1">
                  {COLORS.map(color => (
                    <button key={color} type="button" onClick={() => setForm(f => ({ ...f, color }))}
                      style={{ backgroundColor: color }}
                      className={`w-6 h-6 rounded-full border-2 ${form.color === color ? 'border-gray-700' : 'border-transparent'}`} />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditId(null)} className="p-1 text-gray-400"><X className="w-4 h-4" /></button>
                  <button onClick={() => handleUpdate(cat.id)} className="p-1 text-green-600"><Check className="w-4 h-4" /></button>
                </div>
              </div>
            ) : (
              <>
                <span className="text-xl">{cat.icon}</span>
                <span className="text-sm font-medium text-gray-800 flex-1">{cat.name}</span>
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
                <button onClick={() => startEdit(cat)} className="p-1 text-gray-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(cat.id, cat.name)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LocationSection() {
  const [locs, setLocs] = useState<Location[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [adding, setAdding] = useState(false);

  const load = () => api.getLocations().then(setLocs);
  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.name) return;
    await api.addLocation(form);
    setForm({ name: '', description: '' });
    setAdding(false);
    toast.success('保管場所を追加しました');
    load();
  };

  const handleUpdate = async (id: number) => {
    await api.updateLocation(id, form);
    setEditId(null);
    toast.success('更新しました');
    load();
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    await api.deleteLocation(id);
    toast.success('削除しました');
    load();
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-green-600" />
          <h2 className="font-semibold text-gray-700">保管場所</h2>
        </div>
        <button onClick={() => setAdding(true)} className="btn-primary text-sm flex items-center gap-1 py-1.5">
          <Plus className="w-4 h-4" /> 追加
        </button>
      </div>

      {adding && (
        <div className="mb-4 p-4 bg-green-50 rounded-lg space-y-3">
          <input className="input" placeholder="場所名（例: 処置室A）" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
          <input className="input" placeholder="説明（任意）" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="flex gap-2">
            <button onClick={() => setAdding(false)} className="btn-secondary text-sm flex-1">キャンセル</button>
            <button onClick={handleAdd} className="btn-primary text-sm flex-1">追加する</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {locs.map(loc => (
          <div key={loc.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg">
            {editId === loc.id ? (
              <div className="flex-1 space-y-2">
                <input className="input text-sm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                <input className="input text-sm" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="説明" />
                <div className="flex gap-2">
                  <button onClick={() => setEditId(null)} className="p-1 text-gray-400"><X className="w-4 h-4" /></button>
                  <button onClick={() => handleUpdate(loc.id)} className="p-1 text-green-600"><Check className="w-4 h-4" /></button>
                </div>
              </div>
            ) : (
              <>
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{loc.name}</p>
                  {loc.description && <p className="text-xs text-gray-400">{loc.description}</p>}
                </div>
                <button onClick={() => { setEditId(loc.id); setForm({ name: loc.name, description: loc.description || '' }); }} className="p-1 text-gray-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(loc.id, loc.name)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MasterPage() {
  const tabs = ['カテゴリ', '保管場所'];
  const [tab, setTab] = useState(0);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">マスタ管理</h1>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === i ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && <CategorySection />}
      {tab === 1 && <LocationSection />}
    </div>
  );
}
