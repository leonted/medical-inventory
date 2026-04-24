import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowLeft, Download } from 'lucide-react';

const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

const TYPE_COLORS: Record<string, string> = {
  incident: '#ef4444', near_miss: '#f59e0b', complaint: '#3b82f6',
};
const TYPE_LABELS: Record<string, string> = {
  incident: 'インシデント', near_miss: 'ヒヤリハット', complaint: 'クレーム',
};

type StatRow = { month: number; report_type: string; base_name: string; count: number };

export default function IncidentStatsPage() {
  const navigate = useNavigate();
  const [year, setYear] = useState(new Date().getFullYear());
  const [rows, setRows] = useState<StatRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getIncidentStats(year)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [year]);

  // 月別グラフデータ
  const monthlyData = MONTHS.map((label, i) => {
    const month = i + 1;
    const monthRows = rows.filter(r => r.month === month);
    return {
      month: label,
      インシデント: monthRows.filter(r => r.report_type === 'incident').reduce((s, r) => s + r.count, 0),
      ヒヤリハット: monthRows.filter(r => r.report_type === 'near_miss').reduce((s, r) => s + r.count, 0),
      クレーム: monthRows.filter(r => r.report_type === 'complaint').reduce((s, r) => s + r.count, 0),
    };
  });

  const total = rows.reduce((s, r) => s + r.count, 0);

  // 種別集計
  const byType = Object.entries(TYPE_LABELS).map(([type, label]) => ({
    name: label,
    value: rows.filter(r => r.report_type === type).reduce((s, r) => s + r.count, 0),
    color: TYPE_COLORS[type],
  })).filter(d => d.value > 0);

  // 拠点別集計
  const baseMap = new Map<string, number>();
  rows.forEach(r => baseMap.set(r.base_name, (baseMap.get(r.base_name) || 0) + r.count));
  const byBase = Array.from(baseMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([name, count]) => ({ name, count }));

  // CSVダウンロード（月次明細）
  const downloadCSV = () => {
    const header = '月,インシデント,ヒヤリハット,クレーム,合計';
    const dataRows = monthlyData.map(d =>
      `${d.month},${d.インシデント},${d.ヒヤリハット},${d.クレーム},${d.インシデント + d.ヒヤリハット + d.クレーム}`
    );
    const csv = [header, ...dataRows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `インシデント集計_${year}年.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/incidents')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
            <ArrowLeft className="w-4 h-4" />一覧
          </button>
          <h1 className="text-xl font-bold text-gray-800">月次集計・年度報告</h1>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="input w-28 text-sm"
            value={year}
            onChange={e => setYear(Number(e.target.value))}
          >
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}年</option>)}
          </select>
          <button onClick={downloadCSV} className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" />CSV出力
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">読み込み中...</div>
      ) : (
        <>
          {/* サマリーカード */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummaryCard label="年間合計" value={total} color="text-gray-800" />
            <SummaryCard label="インシデント" value={byType.find(t => t.name === 'インシデント')?.value || 0} color="text-red-600" />
            <SummaryCard label="ヒヤリハット" value={byType.find(t => t.name === 'ヒヤリハット')?.value || 0} color="text-yellow-600" />
            <SummaryCard label="クレーム" value={byType.find(t => t.name === 'クレーム')?.value || 0} color="text-blue-600" />
          </div>

          {/* 月別棒グラフ */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-bold text-gray-800 mb-4">月別件数（{year}年）</h2>
            {total === 0 ? (
              <div className="text-center py-8 text-gray-400">{year}年のデータはありません</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="インシデント" stackId="a" fill={TYPE_COLORS.incident} />
                  <Bar dataKey="ヒヤリハット" stackId="a" fill={TYPE_COLORS.near_miss} />
                  <Bar dataKey="クレーム" stackId="a" fill={TYPE_COLORS.complaint} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* 種別円グラフ＋拠点別棒グラフ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="font-bold text-gray-800 mb-4">種別内訳</h2>
              {byType.length === 0 ? (
                <div className="text-center py-8 text-gray-400">データなし</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}>
                      {byType.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="font-bold text-gray-800 mb-4">拠点別件数（上位15）</h2>
              {byBase.length === 0 ? (
                <div className="text-center py-8 text-gray-400">データなし</div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {byBase.map(b => (
                    <div key={b.name} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-36 truncate shrink-0">{b.name}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-3">
                        <div
                          className="bg-blue-500 h-3 rounded-full"
                          style={{ width: `${Math.round((b.count / (byBase[0]?.count || 1)) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-700 w-6 text-right">{b.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 月次明細テーブル */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-bold text-gray-800 mb-4">月次明細</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="text-left pb-2 font-medium">月</th>
                    <th className="text-right pb-2 font-medium text-red-600">インシデント</th>
                    <th className="text-right pb-2 font-medium text-yellow-600">ヒヤリハット</th>
                    <th className="text-right pb-2 font-medium text-blue-600">クレーム</th>
                    <th className="text-right pb-2 font-medium">合計</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((d, i) => {
                    const rowTotal = d.インシデント + d.ヒヤリハット + d.クレーム;
                    return (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2">{d.month}</td>
                        <td className="text-right">{d.インシデント || '—'}</td>
                        <td className="text-right">{d.ヒヤリハット || '—'}</td>
                        <td className="text-right">{d.クレーム || '—'}</td>
                        <td className="text-right font-semibold">{rowTotal || '—'}</td>
                      </tr>
                    );
                  })}
                  <tr className="font-bold border-t-2">
                    <td className="py-2">年間合計</td>
                    <td className="text-right text-red-600">{monthlyData.reduce((s, d) => s + d.インシデント, 0)}</td>
                    <td className="text-right text-yellow-600">{monthlyData.reduce((s, d) => s + d.ヒヤリハット, 0)}</td>
                    <td className="text-right text-blue-600">{monthlyData.reduce((s, d) => s + d.クレーム, 0)}</td>
                    <td className="text-right">{total}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
