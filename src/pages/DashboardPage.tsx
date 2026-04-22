import { useEffect, useState } from 'react';
import { api } from '../api';
import type { DashboardData, Item } from '../types';
import { AlertTriangle, Package, TrendingUp, TrendingDown, Calendar, ArrowLeftRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

function StatCard({ icon: Icon, label, value, color, onClick }: { icon: React.ElementType; label: string; value: string | number; color: string; onClick?: () => void }) {
  return (
    <div className={`card flex items-center gap-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`} onClick={onClick}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function StockBadge({ item }: { item: Item }) {
  const ratio = item.stock / item.minStock;
  if (ratio <= 0) return <span className="badge-out">在庫なし</span>;
  if (ratio <= 1) return <span className="badge-low">要発注</span>;
  return null;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.dashboard().then(setData).catch(() => toast.error('データ読み込みに失敗しました'));
  }, []);

  if (!data) return (
    <div className="flex items-center justify-center h-64 text-gray-400">読み込み中...</div>
  );

  const daysToExpiry = (date: string) => {
    const diff = new Date(date).getTime() - Date.now();
    return Math.ceil(diff / 86400000);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-800">ダッシュボード</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package} label="登録資材数" value={data.totalItems} color="bg-blue-50 text-blue-600" onClick={() => navigate('/items')} />
        <StatCard icon={AlertTriangle} label="在庫不足" value={data.lowStock.length} color="bg-orange-50 text-orange-600" onClick={() => navigate('/items')} />
        <StatCard icon={Calendar} label="期限切れ間近" value={data.expiryWarnings.length} color="bg-red-50 text-red-600" />
        <StatCard icon={ArrowLeftRight} label="カテゴリ数" value={data.totalCategories} color="bg-purple-50 text-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 card">
          <h2 className="font-semibold text-gray-700 mb-4">入出庫推移（過去6ヶ月）</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.monthlyStats} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="in" name="入庫" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="out" name="出庫" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category breakdown */}
        <div className="card">
          <h2 className="font-semibold text-gray-700 mb-4">カテゴリ別在庫</h2>
          <div className="space-y-3">
            {data.categoryBreakdown.filter(c => c.count > 0).map(c => (
              <div key={c.id} className="flex items-center gap-3">
                <span className="text-xl">{c.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700 truncate">{c.name}</span>
                    <span className="text-xs text-gray-400">{c.count}品目</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low stock alerts */}
        {data.lowStock.length > 0 && (
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <h2 className="font-semibold text-gray-700">在庫不足アラート</h2>
            </div>
            <div className="space-y-2">
              {data.lowStock.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-500">最低在庫: {item.minStock}{item.unit}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-orange-600">{item.stock}</p>
                    <p className="text-xs text-gray-400">{item.unit}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expiry warnings */}
        {data.expiryWarnings.length > 0 && (
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-red-500" />
              <h2 className="font-semibold text-gray-700">使用期限が間近な品目</h2>
            </div>
            <div className="space-y-2">
              {data.expiryWarnings.map(item => {
                const days = daysToExpiry(item.expiryDate!);
                return (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-500">期限: {item.expiryDate}</p>
                    </div>
                    <div className={`text-right ${days <= 30 ? 'text-red-600' : 'text-orange-600'}`}>
                      <p className="text-sm font-bold">あと{days}日</p>
                      <p className="text-xs text-gray-400">在庫{item.stock}{item.unit}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent transactions */}
        <div className={`card ${data.lowStock.length === 0 && data.expiryWarnings.length === 0 ? 'lg:col-span-2' : ''}`}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h2 className="font-semibold text-gray-700">最近の入出庫</h2>
          </div>
          <div className="space-y-2">
            {data.recentTxs.slice(0, 8).map(tx => (
              <div key={tx.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <span className={tx.type === 'in' ? 'badge-in' : 'badge-out'}>
                  {tx.type === 'in' ? <TrendingUp className="w-3 h-3 mr-1 inline" /> : <TrendingDown className="w-3 h-3 mr-1 inline" />}
                  {tx.type === 'in' ? '入庫' : '出庫'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{tx.itemName}</p>
                  <p className="text-xs text-gray-400">{tx.userName} · {new Date(tx.createdAt).toLocaleDateString('ja-JP')}</p>
                </div>
                <span className={`text-sm font-bold ${tx.type === 'in' ? 'text-blue-600' : 'text-orange-600'}`}>
                  {tx.type === 'in' ? '+' : '-'}{tx.quantity}{tx.itemUnit}
                </span>
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/history')} className="w-full mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">
            すべての履歴を見る →
          </button>
        </div>
      </div>
    </div>
  );
}
