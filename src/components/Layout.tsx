import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  Activity, LayoutDashboard, Package, ArrowLeftRight, ClipboardList,
  Settings, LogOut, Menu, KeyRound, X, History
} from 'lucide-react';
import { useState } from 'react';
import { api } from '../api';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'ダッシュボード' },
  { to: '/items', icon: Package, label: '在庫一覧' },
  { to: '/transactions', icon: ArrowLeftRight, label: '入出庫' },
  { to: '/history', icon: History, label: '履歴' },
  { to: '/stocktake', icon: ClipboardList, label: '棚卸' },
  { to: '/master', icon: Settings, label: 'マスタ管理' },
];

function PasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) return toast.error('新しいパスワードが一致しません');
    if (next.length < 6) return toast.error('パスワードは6文字以上にしてください');
    setSaving(true);
    try {
      await api.changePassword(current, next);
      toast.success('パスワードを変更しました');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '変更に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-gray-800">パスワード変更</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">現在のパスワード</label>
            <input type="password" className="input" required value={current} onChange={e => setCurrent(e.target.value)} />
          </div>
          <div>
            <label className="label">新しいパスワード（6文字以上）</label>
            <input type="password" className="input" required value={next} onChange={e => setNext(e.target.value)} />
          </div>
          <div>
            <label className="label">新しいパスワード（確認）</label>
            <input type="password" className="input" required value={confirm} onChange={e => setConfirm(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">キャンセル</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? '変更中...' : '変更する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const Sidebar = () => (
    <nav className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
        <div className="flex items-center justify-center w-9 h-9 bg-blue-600 rounded-lg">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-gray-800 text-sm leading-tight">医療材料</p>
          <p className="text-gray-400 text-xs">在庫管理システム</p>
        </div>
      </div>

      <div className="flex-1 py-4 px-2 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </div>

      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm">
            {user?.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400">{user?.role === 'admin' ? '管理者' : 'スタッフ'}</p>
          </div>
        </div>
        <button onClick={() => { setShowPwModal(true); setSidebarOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 mt-1 text-sm text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
          <KeyRound className="w-4 h-4" />
          パスワード変更
        </button>
        <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          <LogOut className="w-4 h-4" />
          ログアウト
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="hidden lg:flex flex-col w-56 bg-white border-r border-gray-100 flex-shrink-0">
        <Sidebar />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-56 bg-white flex flex-col z-50">
            <Sidebar />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
          <button onClick={() => setSidebarOpen(true)} className="p-1 text-gray-500">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-gray-800 text-sm">医療材料 在庫管理</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {showPwModal && <PasswordModal onClose={() => setShowPwModal(false)} />}
    </div>
  );
}
