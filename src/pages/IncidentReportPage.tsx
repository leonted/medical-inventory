import { useState, useEffect } from 'react';
import { api } from '../api';
import type { IncidentBase } from '../types';
import toast from 'react-hot-toast';
import { AlertCircle, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';

const REPORT_TYPES = [
  { value: 'incident', label: 'インシデント', desc: '患者に実施されたミス・エラー', color: 'bg-red-50 border-red-200 text-red-700' },
  { value: 'near_miss', label: 'ヒヤリハット', desc: '実施前に気づいた危険な状況', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  { value: 'complaint', label: 'クレーム', desc: '利用者・家族からの苦情・要望', color: 'bg-blue-50 border-blue-200 text-blue-700' },
];

const SEVERITY_LEVELS = [
  { value: '0', label: 'レベル0', desc: 'エラーが発生したが患者に実施されなかった' },
  { value: '1', label: 'レベル1', desc: '患者への影響なし' },
  { value: '2', label: 'レベル2', desc: '観察強化・処置を要した（軽微）' },
  { value: '3a', label: 'レベル3a', desc: '一時的な影響あり（処置不要）' },
  { value: '3b', label: 'レベル3b', desc: '一時的な影響あり（処置要）' },
  { value: '4', label: 'レベル4', desc: '永続的な影響あり' },
  { value: '5', label: 'レベル5', desc: '死亡' },
];

const STEPS = ['基本情報', 'S：状況', 'B：背景', 'A：評価', 'R：提案', '確認・送信'];

const emptyForm = {
  reportType: '',
  occurrenceDate: new Date().toISOString().split('T')[0],
  occurrenceTime: '',
  baseId: '',
  baseName: '',
  department: '',
  patientName: '',
  severity: '',
  situation: '',
  background: '',
  assessment: '',
  recommendation: '',
};

export default function IncidentReportPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ ...emptyForm });
  const [bases, setBases] = useState<IncidentBase[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getIncidentBases().then(setBases).catch(() => {});
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const canNext = () => {
    if (step === 0) return form.reportType && form.occurrenceDate && form.baseName && form.department && form.patientName;
    if (step === 1) return form.situation.trim().length > 0;
    if (step === 2) return form.background.trim().length > 0;
    if (step === 3) return form.assessment.trim().length > 0;
    if (step === 4) return form.recommendation.trim().length > 0;
    return true;
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await api.submitIncident({
        ...form,
        baseId: form.baseId ? Number(form.baseId) : undefined,
      });
      setSubmitted(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '送信に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">報告を受け付けました</h2>
          <p className="text-gray-500 text-sm mb-6">
            担当者が確認後、承認フローに従い処理されます。<br />
            報告いただきありがとうございました。
          </p>
          <button
            onClick={() => { setForm({ ...emptyForm }); setStep(0); setSubmitted(false); }}
            className="btn-primary w-full"
          >
            続けて報告する
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-full text-sm font-medium mb-3">
            <AlertCircle className="w-4 h-4" />
            匿名で報告できます
          </div>
          <h1 className="text-2xl font-bold text-gray-800">インシデント・ヒヤリハット・クレーム報告</h1>
          <p className="text-gray-500 text-sm mt-1">報告者の名前は記録されません</p>
        </div>

        {/* ステッパー */}
        <div className="flex items-center justify-between mb-6 overflow-x-auto pb-1">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center shrink-0">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`ml-1 text-xs hidden sm:block ${i === step ? 'text-blue-700 font-semibold' : 'text-gray-400'}`}>{label}</span>
              {i < STEPS.length - 1 && <div className={`w-4 sm:w-8 h-0.5 mx-1 ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {/* Step 0: 基本情報 */}
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-gray-800">基本情報</h2>

              <div>
                <label className="label">種別 <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
                  {REPORT_TYPES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => set('reportType', t.value)}
                      className={`border-2 rounded-xl p-3 text-left transition-all ${form.reportType === t.value ? t.color + ' border-current' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <div className="font-bold text-sm">{t.label}</div>
                      <div className="text-xs mt-0.5 opacity-75">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">発生日 <span className="text-red-500">*</span></label>
                  <input type="date" className="input" value={form.occurrenceDate} onChange={e => set('occurrenceDate', e.target.value)} />
                </div>
                <div>
                  <label className="label">発生時刻（任意）</label>
                  <input type="time" className="input" value={form.occurrenceTime} onChange={e => set('occurrenceTime', e.target.value)} />
                </div>
              </div>

              <div>
                <label className="label">拠点 <span className="text-red-500">*</span></label>
                <select
                  className="input"
                  value={form.baseId}
                  onChange={e => {
                    const selected = bases.find(b => b.id === Number(e.target.value));
                    set('baseId', e.target.value);
                    set('baseName', selected?.name || '');
                  }}
                >
                  <option value="">選択してください</option>
                  {bases.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div>
                <label className="label">部署名 <span className="text-red-500">*</span></label>
                <input type="text" className="input" placeholder="例：訪問介護 〇〇チーム" value={form.department} onChange={e => set('department', e.target.value)} />
              </div>

              <div>
                <label className="label">利用者名 <span className="text-red-500">*</span></label>
                <input type="text" className="input" placeholder="例：山田 花子" value={form.patientName} onChange={e => set('patientName', e.target.value)} />
                <p className="text-xs text-gray-400 mt-1">承認権限のある担当者のみ閲覧できます</p>
              </div>

              {form.reportType === 'incident' && (
                <div>
                  <label className="label">重大度レベル（任意）</label>
                  <div className="space-y-1.5 mt-1">
                    {SEVERITY_LEVELS.map(s => (
                      <label key={s.value} className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer border transition-colors ${form.severity === s.value ? 'bg-blue-50 border-blue-200' : 'border-transparent hover:bg-gray-50'}`}>
                        <input type="radio" name="severity" value={s.value} checked={form.severity === s.value} onChange={e => set('severity', e.target.value)} className="mt-0.5" />
                        <div>
                          <span className="font-semibold text-sm">{s.label}</span>
                          <span className="text-xs text-gray-500 ml-2">{s.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 1: S（状況） */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-gray-800">S（Situation）：状況</h2>
                <p className="text-sm text-gray-500 mt-1">今何が起きているか、端的に教えてください。「誰が・いつ・何をしていたとき・何が起きた」を具体的に。</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
                例：「〇月〇日 朝の服薬介助中、Aさんに誤って別の利用者の薬を飲ませてしまった」
              </div>
              <textarea
                className="input min-h-[180px] resize-none"
                placeholder="状況を入力してください..."
                value={form.situation}
                onChange={e => set('situation', e.target.value)}
              />
            </div>
          )}

          {/* Step 2: B（背景） */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-gray-800">B（Background）：背景</h2>
                <p className="text-sm text-gray-500 mt-1">その時の状況や経緯を補足してください。当日の人員配置・利用者の状態・手順など。</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
                例：「当日は担当2名で5名分の服薬介助を行っていた。薬袋の名前確認を省略していた」
              </div>
              <textarea
                className="input min-h-[180px] resize-none"
                placeholder="背景・経緯を入力してください..."
                value={form.background}
                onChange={e => set('background', e.target.value)}
              />
            </div>
          )}

          {/* Step 3: A（評価） */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-gray-800">A（Assessment）：評価</h2>
                <p className="text-sm text-gray-500 mt-1">なぜ起きたと思いますか？原因として考えられることを書いてください。自分を責めなくて大丈夫です。</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
                例：「薬袋の確認手順が明確でなかった。繁忙時間帯で確認を省きがちな環境があった」
              </div>
              <textarea
                className="input min-h-[180px] resize-none"
                placeholder="原因・評価を入力してください..."
                value={form.assessment}
                onChange={e => set('assessment', e.target.value)}
              />
            </div>
          )}

          {/* Step 4: R（提案） */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-gray-800">R（Recommendation）：提案</h2>
                <p className="text-sm text-gray-500 mt-1">再発防止のために「こうすれば良い」と思うことを教えてください。どんな小さな気づきでも歓迎します。</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
                例：「薬袋に利用者の顔写真を貼る。服薬前のダブルチェックを必須にする」
              </div>
              <textarea
                className="input min-h-[180px] resize-none"
                placeholder="提案・改善策を入力してください..."
                value={form.recommendation}
                onChange={e => set('recommendation', e.target.value)}
              />
            </div>
          )}

          {/* Step 5: 確認 */}
          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-800">内容を確認して送信</h2>
              <div className="space-y-3 text-sm">
                <Row label="種別" value={REPORT_TYPES.find(t => t.value === form.reportType)?.label} />
                <Row label="発生日時" value={`${form.occurrenceDate}${form.occurrenceTime ? ' ' + form.occurrenceTime : ''}`} />
                <Row label="拠点" value={form.baseName} />
                <Row label="部署" value={form.department} />
                <Row label="利用者名" value={form.patientName} />
                {form.severity && <Row label="重大度" value={SEVERITY_LEVELS.find(s => s.value === form.severity)?.label} />}
                <div className="border-t pt-3 space-y-3">
                  <SBARRow label="S：状況" value={form.situation} />
                  <SBARRow label="B：背景" value={form.background} />
                  <SBARRow label="A：評価" value={form.assessment} />
                  <SBARRow label="R：提案" value={form.recommendation} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ナビゲーションボタン */}
        <div className="flex gap-3 mt-4">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="btn-secondary flex items-center gap-2 flex-1">
              <ChevronLeft className="w-4 h-4" />戻る
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="btn-primary flex items-center gap-2 flex-1 disabled:opacity-40"
            >
              次へ<ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="btn-primary flex-1"
            >
              {saving ? '送信中...' : '報告を送信する'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-gray-500 w-24 shrink-0">{label}</span>
      <span className="text-gray-800 font-medium">{value || '—'}</span>
    </div>
  );
}

function SBARRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-semibold text-gray-700 mb-1">{label}</div>
      <p className="text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{value}</p>
    </div>
  );
}
