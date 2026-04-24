import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Category, Location } from '../types';
import { Plus, Edit2, Trash2, X, Check, Tag, MapPin, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

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

function DestinationSection() {
  const [list, setList] = useState<{ id: number; name: string }[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState('');

  const load = () => api.getDestinations().then(setList);
  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.trim()) return;
    try {
      await api.addDestination({ name: form.trim() });
      setForm('');
      setAdding(false);
      toast.success('出庫場所を追加しました');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '追加に失敗しました');
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return;
    await api.updateDestination(id, { name: editName.trim() });
    setEditId(null);
    toast.success('更新しました');
    load();
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    await api.deleteDestination(id);
    toast.success('削除しました');
    load();
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-orange-500" />
          <h2 className="font-semibold text-gray-700">出庫場所</h2>
        </div>
        <button onClick={() => setAdding(true)} className="btn-primary text-sm flex items-center gap-1 py-1.5">
          <Plus className="w-4 h-4" /> 追加
        </button>
      </div>

      {adding && (
        <div className="mb-4 p-4 bg-orange-50 rounded-lg space-y-3">
          <input
            className="input"
            placeholder="例: 茨城県 つくば"
            value={form}
            onChange={e => setForm(e.target.value)}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <div className="flex gap-2">
            <button onClick={() => setAdding(false)} className="btn-secondary text-sm flex-1">キャンセル</button>
            <button onClick={handleAdd} className="btn-primary text-sm flex-1">追加する</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {list.map(d => (
          <div key={d.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg">
            {editId === d.id ? (
              <div className="flex-1 flex gap-2">
                <input className="input text-sm flex-1" value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUpdate(d.id)} autoFocus />
                <button onClick={() => setEditId(null)} className="p-1 text-gray-400"><X className="w-4 h-4" /></button>
                <button onClick={() => handleUpdate(d.id)} className="p-1 text-green-600"><Check className="w-4 h-4" /></button>
              </div>
            ) : (
              <>
                <MapPin className="w-4 h-4 text-orange-400 flex-shrink-0" />
                <span className="text-sm text-gray-800 flex-1">{d.name}</span>
                <button onClick={() => { setEditId(d.id); setEditName(d.name); }} className="p-1 text-gray-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(d.id, d.name)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function UserSection() {
  const [users, setUsers] = useState<{ id: number; name: string; username: string; role: string }[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'staff' });
  const { user: me } = useAuth();

  const load = () => api.getUsers().then(setUsers);
  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.name || !form.username || !form.password) return toast.error('すべての項目を入力してください');
    try {
      await api.addUser(form);
      setForm({ name: '', username: '', password: '', role: 'staff' });
      setAdding(false);
      toast.success('ユーザーを追加しました');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '追加に失敗しました');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (id === me?.id) return toast.error('自分自身は削除できません');
    if (!confirm(`「${name}」を削除しますか？`)) return;
    try {
      await api.deleteUser(id);
      toast.success('削除しました');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '削除に失敗しました');
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-600" />
          <h2 className="font-semibold text-gray-700">ユーザー管理</h2>
        </div>
        <button onClick={() => setAdding(true)} className="btn-primary text-sm flex items-center gap-1 py-1.5">
          <Plus className="w-4 h-4" /> 追加
        </button>
      </div>

      {adding && (
        <div className="mb-4 p-4 bg-purple-50 rounded-lg space-y-3">
          <input className="input" placeholder="表示名（例: 山田 花子）" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
          <input className="input" placeholder="ユーザーID（例: hanako）" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
          <input type="password" className="input" placeholder="パスワード（6文字以上）" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
            <option value="user">スタッフ（閲覧のみ）</option>
            <option value="rmg">リスクマネージャー（1次確認）</option>
            <option value="mg">マネージャー（1次確認）</option>
            <option value="shozokucho">所属長（2次確認）</option>
            <option value="honbu">本部（最終承認）</option>
            <option value="admin">管理者（全権限）</option>
          </select>
          <div className="flex gap-2">
            <button onClick={() => setAdding(false)} className="btn-secondary text-sm flex-1">キャンセル</button>
            <button onClick={handleAdd} className="btn-primary text-sm flex-1">追加する</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {users.map(u => (
          <div key={u.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold text-sm flex-shrink-0">
              {u.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">{u.name}</p>
              <p className="text-xs text-gray-400">@{u.username} · {{
                admin: '管理者', honbu: '本部', shozokucho: '所属長',
                rmg: 'リスクMG', mg: 'マネージャー', user: 'スタッフ', staff: 'スタッフ',
              }[u.role] || u.role}</p>
            </div>
            {u.id !== me?.id && (
              <button onClick={() => handleDelete(u.id, u.name)} className="p-1 text-gray-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MasterPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const tabs = isAdmin ? ['カテゴリ', '保管場所', '出庫場所', 'ユーザー管理'] : ['カテゴリ', '保管場所', '出庫場所'];
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
      {tab === 2 && <DestinationSection />}
      {tab === 3 && isAdmin && <UserSection />}
    </div>
  );
}
