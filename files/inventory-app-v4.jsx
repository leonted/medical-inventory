
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, doc,
  onSnapshot, setDoc, deleteDoc, writeBatch,
} from "firebase/firestore";

/* ──────────────────────────────────────────────────────────
   🔧 ここにFirebaseコンソールから取得した設定を貼り付ける
   手順: https://console.firebase.google.com/
         → プロジェクト作成 → Webアプリ追加 → 設定をコピー
   ────────────────────────────────────────────────────────── */
const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
};

const firebaseApp = initializeApp(FIREBASE_CONFIG);
const db          = getFirestore(firebaseApp);

/* ── Firestore helpers ───────────────────────────────────── */
// コレクション全体をリアルタイム購読し、setterで状態を更新
const useCol = (colName, setter) => {
  useEffect(() => {
    const unsub = onSnapshot(collection(db, colName), snap => {
      setter(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [colName]);
};

// ドキュメント1件を保存（upsert）
const saveDoc = async (colName, item) => {
  const { id, ...data } = item;
  await setDoc(doc(db, colName, id), data, { merge: true });
};

// ドキュメント1件を削除
const delDoc = async (colName, id) => {
  await deleteDoc(doc(db, colName, id));
};

// 配列まるごと初期投入（既存ドキュメントが0件のときのみ）
const seedCol = async (colName, items, currentSize) => {
  if (currentSize > 0) return;
  const batch = writeBatch(db);
  items.forEach(item => {
    const { id, ...data } = item;
    batch.set(doc(db, colName, id), data);
  });
  await batch.commit();
};

const uid = () => Math.random().toString(36).slice(2, 10);
const fmtDate = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

/* ── Initial data ────────────────────────────────────────── */
const INIT_CATS = [
  { id:"c1", name:"ワクチン",    color:"#185FA5" },
  { id:"c2", name:"注射器・針", color:"#0F6E56" },
  { id:"c3", name:"消耗品",      color:"#993C1D" },
  { id:"c4", name:"感染防護具", color:"#7F77DD" },
  { id:"c5", name:"医薬品",      color:"#3B6D11" },
];
const INIT_LOCS = [
  { id:"l1", name:"本部倉庫" },
  { id:"l2", name:"処置室A" },
  { id:"l3", name:"処置室B" },
  { id:"l4", name:"冷蔵庫1" },
  { id:"l5", name:"冷蔵庫2" },
];
const INIT_USERS = [
  { id:"u1", name:"管理者",   email:"admin@hospital.jp",  role:"admin", pass:"admin123", active:true, createdAt: new Date(Date.now()-86400000*10).toISOString() },
  { id:"u2", name:"山田 花子", email:"yamada@hospital.jp", role:"staff", pass:"staff123", active:true, createdAt: new Date(Date.now()-86400000*8).toISOString() },
  { id:"u3", name:"佐藤 一郎", email:"sato@hospital.jp",   role:"staff", pass:"staff123", active:true, createdAt: new Date(Date.now()-86400000*5).toISOString() },
];
const INIT_ITEMS = [
  { id:"i1",  name:"PCV20（プレベナー20）",   categoryId:"c1", locationId:"l4", stock:48, minStock:20, unit:"本", note:"冷蔵2-8℃", image:"" },
  { id:"i2",  name:"PCV21（バキスネファンス）", categoryId:"c1", locationId:"l4", stock:12, minStock:20, unit:"本", note:"冷蔵2-8℃", image:"" },
  { id:"i3",  name:"インフルエンザワクチン",   categoryId:"c1", locationId:"l5", stock:5,  minStock:30, unit:"本", note:"",         image:"" },
  { id:"i4",  name:"シリンジ 1mL",            categoryId:"c2", locationId:"l1", stock:320,minStock:100,unit:"個", note:"",         image:"" },
  { id:"i5",  name:"シリンジ 5mL",            categoryId:"c2", locationId:"l1", stock:85, minStock:50, unit:"個", note:"",         image:"" },
  { id:"i6",  name:"採血針 21G",              categoryId:"c2", locationId:"l2", stock:200,minStock:100,unit:"本", note:"",         image:"" },
  { id:"i7",  name:"サージカルマスク",         categoryId:"c4", locationId:"l1", stock:300,minStock:200,unit:"枚", note:"",         image:"" },
  { id:"i8",  name:"ニトリルグローブ M",       categoryId:"c4", locationId:"l1", stock:150,minStock:100,unit:"枚", note:"",         image:"" },
  { id:"i9",  name:"アルコール綿",             categoryId:"c3", locationId:"l2", stock:500,minStock:200,unit:"枚", note:"",         image:"" },
  { id:"i10", name:"滅菌ガーゼ 5x5",          categoryId:"c3", locationId:"l3", stock:8,  minStock:50, unit:"枚", note:"要発注",   image:"" },
];
/* 出庫先マスタ（都市名ひらがな → 表示名） */
const INIT_DESTINATIONS = [
  // 茨城
  { id:"d01", name:"つくばみらい", region:"茨城" },
  { id:"d02", name:"かすみがうら", region:"茨城" },
  { id:"d03", name:"つくば",       region:"茨城" },
  { id:"d04", name:"いばらき",     region:"茨城" },
  { id:"d05", name:"ひたち",       region:"茨城" },
  // 千葉
  { id:"d06", name:"なりた",       region:"千葉" },
  { id:"d07", name:"のだ",         region:"千葉" },
  { id:"d08", name:"かとり",       region:"千葉" },
  { id:"d09", name:"あびこ",       region:"千葉" },
  // 埼玉
  { id:"d10", name:"あさか",       region:"埼玉" },
  { id:"d11", name:"かわごえ",     region:"埼玉" },
  { id:"d12", name:"かすかべ",     region:"埼玉" },
  // 東京
  { id:"d13", name:"あだち",       region:"東京" },
  { id:"d14", name:"せたがや",     region:"東京" },
  { id:"d15", name:"まちだ",       region:"東京" },
  { id:"d16", name:"すぎなみ",     region:"東京" },
  { id:"d17", name:"えどがわ",     region:"東京" },
  { id:"d18", name:"にしとうきょう", region:"東京" },
  // 神奈川
  { id:"d19", name:"あつぎ",       region:"神奈川" },
  { id:"d20", name:"よこはま",     region:"神奈川" },
  { id:"d21", name:"よこすか",     region:"神奈川" },
  { id:"d22", name:"かわさき",     region:"神奈川" },
  { id:"d23", name:"ひらつか",     region:"神奈川" },
  { id:"d24", name:"ふじさわ",     region:"神奈川" },
  // 栃木
  { id:"d25", name:"うつのみや",   region:"栃木" },
  { id:"d26", name:"もおか",       region:"栃木" },
  { id:"d27", name:"とちぎ",       region:"栃木" },
  // 静岡
  { id:"d28", name:"ぬまづ",       region:"静岡" },
  // 愛知
  { id:"d29", name:"なごや",       region:"愛知" },
  { id:"d30", name:"みよし",       region:"愛知" },
  { id:"d31", name:"きよす",       region:"愛知" },
  // 新潟
  { id:"d32", name:"いといがわ",   region:"新潟" },
  { id:"d33", name:"にいがた",     region:"新潟" },
  { id:"d34", name:"ながおか",     region:"新潟" },
  { id:"d35", name:"じょうえつ",   region:"新潟" },
];

const INIT_HIST = [
  { id:"h1", itemId:"i1",  type:"in",  qty:60, userId:"u2", locationId:"l4", date:new Date(Date.now()-86400000*3).toISOString(), note:"定期発注" },
  { id:"h2", itemId:"i3",  type:"out", qty:10, userId:"u3", locationId:"l5", date:new Date(Date.now()-86400000*2).toISOString(), note:"外来使用" },
  { id:"h3", itemId:"i10", type:"out", qty:42, userId:"u2", locationId:"l3", date:new Date(Date.now()-86400000*1).toISOString(), note:"処置室消耗" },
  { id:"h4", itemId:"i4",  type:"in",  qty:200,userId:"u1", locationId:"l1", date:new Date(Date.now()-3600000*5).toISOString(),  note:"補充" },
  { id:"h5", itemId:"i7",  type:"out", qty:50, userId:"u3", locationId:"l1", date:new Date(Date.now()-3600000*2).toISOString(),  note:"スタッフ配布" },
];

/* ── QR Code generator (pure JS, no lib needed) ─────────── */
// Uses a compact Data Matrix-like pattern encoded as SVG paths
// For production use qrcode.js; this renders a visual placeholder with real URL
const QRCodeSVG = ({ value, size = 120 }) => {
  // Generate deterministic pattern from value string
  const hash = [...value].reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 0);
  const cells = 21;
  const cell = size / cells;
  const bits = [];
  // Finder patterns (top-left, top-right, bottom-left)
  const fp = (ox, oy) => {
    for(let r=0;r<7;r++) for(let c=0;c<7;c++) {
      const v = r===0||r===6||c===0||c===6||(r>=2&&r<=4&&c>=2&&c<=4);
      bits.push({r:oy+r,c:ox+c,v});
    }
  };
  fp(0,0); fp(14,0); fp(0,14);
  // Fill data area with hash-derived bits
  for(let r=0;r<cells;r++) for(let c=0;c<cells;c++) {
    if(bits.find(b=>b.r===r&&b.c===c)) continue;
    const hv = Math.abs(Math.imul(hash^(r*cells+c)*2654435761,(r+c+1)*1234567))%2;
    bits.push({r,c,v:hv===0});
  }
  const rects = bits.filter(b=>b.v).map(b=>`<rect x="${b.c*cell}" y="${b.r*cell}" width="${cell}" height="${cell}" fill="#1a1a1a"/>`).join('');
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg" style={{border:"1px solid #e0e8f0",borderRadius:4,background:"#fff"}}>
      <rect width={size} height={size} fill="#fff"/>
      <g dangerouslySetInnerHTML={{__html:rects}}/>
    </svg>
  );
};

/* ── Icons ───────────────────────────────────────────────── */
const ICONS = {
  dashboard:"M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  boxes:"M20 6h-2.18c.07-.44.18-.87.18-1.3C18 2.55 15.45 0 12.3 0 10.55 0 9 .82 8 2.09L7 3 6 2.09C5 .82 3.45 0 1.7 0 .55 0 0 .55 0 1.7c0 .43.11.86.18 1.3H-1v2h2v14h2v-7h9v7h2v-7h9V8h2V6h-5z",
  history:"M13 3a9 9 0 1 0 0 18A9 9 0 0 0 13 3zm0 16a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm.5-11H12v6l5.25 3.15.75-1.23-4.5-2.67V8z",
  stocktake:"M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-9-2h2v-4h4v-2h-4V7h-2v4H6v2h4z",
  master:"M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",
  qr:"M3 11h8V3H3v8zm2-6h4v4H5V5zm8-2v8h8V3h-8zm6 6h-4V5h4v4zM3 21h8v-8H3v8zm2-6h4v4H5v-4zm13-2h-2v2h2v-2zm0 4h-2v2h2v-2zm2 2h-2v2h2v-2zm-4 2h-2v2h2v-2zm4-8h-2v2h2v-2zm-4-2h-2v2h2v-2zm2 4h-2v2h2v-2z",
  log:"M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
  users:"M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  alert:"M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
  plus:"M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  logout:"M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z",
  print:"M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z",
  edit:"M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
  delete:"M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
  search:"M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
  camera:"M12 15.2A3.2 3.2 0 0 1 8.8 12 3.2 3.2 0 0 1 12 8.8 3.2 3.2 0 0 1 15.2 12 3.2 3.2 0 0 1 12 15.2M12 7a5 5 0 0 0-5 5 5 5 0 0 0 5 5 5 5 0 0 0 5-5 5 5 0 0 0-5-5m6-3.5-1.4 1.5H15c-.5 0-1 .2-1.4.6L12 7l-1.6-1.4A2 2 0 0 0 9 5H7.4L6 3.5C5.6 3.2 5.1 3 4.5 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1.5c-.6 0-1.1.2-1.5.5z",
  warning:"M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z",
  check:"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
  close:"M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  download:"M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z",
};
const Ic = ({ n, s=18, c="currentColor" }) => (
  <svg viewBox="0 0 24 24" width={s} height={s} fill={c} style={{flexShrink:0,display:"block"}}>
    <path d={ICONS[n]||""}/>
  </svg>
);

/* ── Color helpers ───────────────────────────────────────── */
const STATUS_LOW  = { bg:"#FCEBEB", color:"#A32D2D", label:"不足" };
const STATUS_WARN = { bg:"#FAEEDA", color:"#854F0B", label:"警告" };
const STATUS_OK   = { bg:"#E1F5EE", color:"#0F6E56", label:"正常" };
const stockStatus = (item) => {
  if (item.stock <= item.minStock)          return STATUS_LOW;
  if (item.stock <= item.minStock * 1.5)    return STATUS_WARN;
  return STATUS_OK;
};

/* ── Shared Modal ────────────────────────────────────────── */
const Modal = ({ title, onClose, children, width=520 }) => (
  <div style={{position:"fixed",inset:0,zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.45)",padding:16}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:width,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 8px 40px rgba(0,0,0,0.18)"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 20px 14px",borderBottom:"1px solid #e8eef4"}}>
        <div style={{fontWeight:700,fontSize:17,color:"#0C447C"}}>{title}</div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",display:"flex",padding:4}}><Ic n="close" s={20} c="#888"/></button>
      </div>
      <div style={{padding:"18px 20px 22px"}}>{children}</div>
    </div>
  </div>
);

/* ── QR Modal ────────────────────────────────────────────── */
const QRModal = ({ item, onClose }) => {
  const url = `med-inventory://item/${item.id}`;
  const handlePrint = () => {
    const w = window.open("","_blank");
    w.document.write(`<html><head><title>QRコード - ${item.name}</title><style>body{font-family:sans-serif;text-align:center;padding:30px}h2{font-size:16px}p{font-size:12px;color:#555}</style></head><body><h2>${item.name}</h2><p>ID: ${item.id} | 保管場所: ${item.locationId}</p><p>このQRコードをスキャンして入出庫を記録</p><script>window.print();</script></body></html>`);
  };
  return (
    <Modal title={`QRコード — ${item.name}`} onClose={onClose} width={340}>
      <div style={{textAlign:"center"}}>
        <div style={{display:"inline-block",marginBottom:16}}>
          <QRCodeSVG value={url} size={180}/>
        </div>
        <div style={{fontSize:13,color:"#555",marginBottom:6}}>{item.name}</div>
        <div style={{fontSize:11,color:"#aaa",fontFamily:"monospace",marginBottom:18,wordBreak:"break-all"}}>{url}</div>
        <div style={{background:"#f0f6ff",borderRadius:8,padding:"10px 14px",fontSize:12,color:"#185FA5",marginBottom:18,textAlign:"left"}}>
          💡 このQRコードを印刷して棚に貼ると、スマホカメラで読み取るだけで直接この品目の入出庫画面へアクセスできます。
        </div>
        <button onClick={handlePrint} style={{display:"flex",alignItems:"center",gap:8,background:"#185FA5",color:"#fff",border:"none",borderRadius:8,padding:"10px 22px",fontSize:14,fontWeight:600,cursor:"pointer",margin:"0 auto"}}>
          <Ic n="print" s={16} c="#fff"/>印刷する
        </button>
      </div>
    </Modal>
  );
};

/* ── Login ───────────────────────────────────────────────── */
const Login = ({ users, onLogin }) => {
  const [sel, setSel] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  const submit = () => {
    const u = users.find(u => u.name === sel && u.pass === pass && u.active);
    if (u) onLogin(u);
    else setErr("ユーザー名またはパスワードが違います");
  };

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#e8f1fb 0%,#f0f4f8 100%)"}}>
      <div style={{background:"#fff",borderRadius:16,padding:"40px 36px",width:"100%",maxWidth:380,boxShadow:"0 4px 32px rgba(12,68,124,0.12)"}}>
        <div style={{textAlign:"center",marginBottom:30}}>
          <div style={{width:56,height:56,borderRadius:"50%",background:"#185FA5",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
            <span style={{fontSize:26}}>💊</span>
          </div>
          <div style={{fontWeight:800,fontSize:22,color:"#0C447C",letterSpacing:"-0.5px"}}>在庫管理システム</div>
          <div style={{fontSize:13,color:"#888",marginTop:4}}>医療材料・医薬品</div>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:600,color:"#444",marginBottom:5}}>ユーザー</div>
          <select value={sel} onChange={e=>setSel(e.target.value)} style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1.5px solid #d0d8e4",fontSize:15,outline:"none",boxSizing:"border-box",background:"#fff"}}>
            <option value="">選択してください</option>
            {users.filter(u=>u.active).map(u=><option key={u.id} value={u.name}>{u.name}（{u.role==="admin"?"管理者":"スタッフ"}）</option>)}
          </select>
        </div>
        <div style={{marginBottom:18}}>
          <div style={{fontSize:13,fontWeight:600,color:"#444",marginBottom:5}}>パスワード</div>
          <input type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="パスワードを入力" style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1.5px solid #d0d8e4",fontSize:15,outline:"none",boxSizing:"border-box"}}/>
        </div>
        {err&&<div style={{color:"#A32D2D",fontSize:13,padding:"8px 12px",background:"#FCEBEB",borderRadius:8,marginBottom:14}}>{err}</div>}
        <button onClick={submit} style={{width:"100%",background:"#185FA5",color:"#fff",border:"none",borderRadius:8,padding:"13px 0",fontSize:16,fontWeight:700,cursor:"pointer",letterSpacing:"0.5px"}}>ログイン</button>
        <div style={{marginTop:14,fontSize:11,color:"#bbb",textAlign:"center"}}>デモ用パスワード: admin123 / staff123</div>
      </div>
    </div>
  );
};

/* ── Dashboard ───────────────────────────────────────────── */
const Dashboard = ({ items, categories, history, users, locations, onNavigate }) => {
  const alerts  = items.filter(i => i.stock <= i.minStock);
  const warns   = items.filter(i => i.stock > i.minStock && i.stock <= i.minStock*1.5);
  const recent  = [...history].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,10);
  const catStats = categories.map(c=>({ ...c, count:items.filter(i=>i.categoryId===c.id).length, stock:items.filter(i=>i.categoryId===c.id).reduce((s,i)=>s+i.stock,0) }));
  const typeLabel = { in:"入荷", out:"使用", move:"移動" };
  const typeColor = { in:"#185FA5", out:"#A32D2D", move:"#7F77DD" };
  const typeBg    = { in:"#E6F1FB", out:"#FCEBEB", move:"#EEEDFE" };

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24,flexWrap:"wrap",gap:12}}>
        <h2 style={{fontSize:22,fontWeight:800,color:"#0C447C",margin:0}}>ダッシュボード</h2>
        <button onClick={()=>onNavigate("stockio")} style={{display:"flex",alignItems:"center",gap:8,background:"#185FA5",color:"#fff",border:"none",borderRadius:8,padding:"10px 20px",fontSize:14,fontWeight:700,cursor:"pointer"}}>
          <Ic n="history" s={16} c="#fff"/>入出庫登録
        </button>
      </div>

      {/* KPI cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:24}}>
        {[
          {label:"資材数",     value:items.length,                    unit:"品目", icon:"boxes",   color:"#7F77DD", bg:"#EEEDFE"},
          {label:"総在庫数",   value:items.reduce((s,i)=>s+i.stock,0).toLocaleString(), unit:"",  icon:"dashboard",color:"#185FA5",bg:"#E6F1FB"},
          {label:"在庫アラート",value:alerts.length+warns.length,     unit:"品目", icon:"alert",   color:"#A32D2D", bg:"#FCEBEB"},
        ].map(m=>(
          <div key={m.label} style={{background:"#fff",border:"1px solid #e0e8f0",borderRadius:12,padding:"20px 18px",display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:12,color:"#888",fontWeight:600,marginBottom:6}}>{m.label}</div>
              <div style={{fontSize:30,fontWeight:800,color:"#1a1a1a",lineHeight:1}}>{m.value}</div>
              {m.unit&&<div style={{fontSize:12,color:"#aaa",marginTop:4}}>{m.unit}</div>}
            </div>
            <div style={{width:44,height:44,borderRadius:10,background:m.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Ic n={m.icon} s={22} c={m.color}/>
            </div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginBottom:18}}>
        {/* Alerts */}
        <div style={{background:"#fff",border:"1px solid #e0e8f0",borderRadius:12,padding:"18px 20px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            <Ic n="alert" s={16} c="#A32D2D"/>
            <span style={{fontWeight:700,fontSize:14,color:"#1a1a1a"}}>在庫アラート</span>
            <span style={{fontSize:11,color:"#aaa",marginLeft:2}}>現在の在庫数 / 最低在庫数</span>
          </div>
          {[...alerts.map(i=>({...i,...STATUS_LOW})),...warns.map(i=>({...i,...STATUS_WARN}))].length===0
            ? <div style={{fontSize:13,color:"#aaa",textAlign:"center",padding:"16px 0"}}>アラートなし ✓</div>
            : [...alerts.map(i=>({...i,...STATUS_LOW})),...warns.map(i=>({...i,...STATUS_WARN}))].map(item=>(
              <div key={item.id} style={{display:"flex",alignItems:"center",padding:"10px 12px",borderRadius:8,background:item.bg,marginBottom:8}}>
                <span style={{fontSize:11,fontWeight:700,color:item.color,background:"#fff",borderRadius:4,padding:"2px 7px",marginRight:10,whiteSpace:"nowrap"}}>{item.label}</span>
                <span style={{flex:1,fontSize:13,fontWeight:500,color:"#1a1a1a"}}>{item.name}</span>
                <span style={{fontSize:13,fontWeight:700,color:item.color,whiteSpace:"nowrap"}}>{item.stock} / {item.minStock}</span>
              </div>
            ))}
        </div>

        {/* Category stats */}
        <div style={{background:"#fff",border:"1px solid #e0e8f0",borderRadius:12,padding:"18px 20px"}}>
          <div style={{fontWeight:700,fontSize:14,color:"#1a1a1a",marginBottom:14}}>カテゴリ別在庫</div>
          {catStats.map(c=>(
            <div key={c.id} style={{display:"flex",alignItems:"center",marginBottom:10,gap:10}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:c.color,flexShrink:0}}/>
              <div style={{flex:1,fontSize:13,color:"#333"}}>{c.name}</div>
              <div style={{fontSize:11,color:"#aaa"}}>{c.count}資材</div>
              <div style={{fontSize:15,fontWeight:700,color:"#185FA5",minWidth:36,textAlign:"right"}}>{c.stock.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent history */}
      <div style={{background:"#fff",border:"1px solid #e0e8f0",borderRadius:12,padding:"18px 20px"}}>
        <div style={{fontWeight:700,fontSize:14,color:"#1a1a1a",marginBottom:14}}>最近の入出庫履歴</div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr style={{borderBottom:"1px solid #e0e8f0"}}>
                {["日時","種類","資材","数量","場所","担当者"].map(h=><th key={h} style={{padding:"8px 12px",textAlign:"left",fontWeight:600,color:"#888",whiteSpace:"nowrap"}}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {recent.map(h=>{
                const item=items.find(i=>i.id===h.itemId);
                const user=users.find(u=>u.id===h.userId);
                const loc=locations.find(l=>l.id===h.locationId);
                const t=h.type||"in";
                return (
                  <tr key={h.id} style={{borderBottom:"1px solid #f5f7fa"}}>
                    <td style={{padding:"9px 12px",color:"#888",whiteSpace:"nowrap"}}>{fmtDate(h.date)}</td>
                    <td style={{padding:"9px 12px"}}>
                      <span style={{background:typeBg[t]||"#f0f4f8",color:typeColor[t]||"#555",borderRadius:5,padding:"2px 9px",fontSize:12,fontWeight:700}}>{typeLabel[t]||t}</span>
                    </td>
                    <td style={{padding:"9px 12px",fontWeight:500,color:"#1a1a1a"}}>{item?.name||"不明"}</td>
                    <td style={{padding:"9px 12px",fontWeight:700,color:t==="in"?"#185FA5":t==="out"?"#A32D2D":"#7F77DD"}}>{h.qty} {item?.unit||""}</td>
                    <td style={{padding:"9px 12px",color:"#555"}}>{loc?.name||"-"}</td>
                    <td style={{padding:"9px 12px",color:"#555"}}>{user?.name||"不明"}</td>
                  </tr>
                );
              })}
              {recent.length===0&&<tr><td colSpan={6} style={{padding:"20px",textAlign:"center",color:"#aaa"}}>履歴がありません</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ── Inventory List (card view) ──────────────────────────── */
const InventoryList = ({ items, categories, locations, setItems, currentUser, addLog }) => {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [view, setView] = useState("card"); // card | table
  const [qrItem, setQrItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({name:"",categoryId:"",locationId:"",stock:0,minStock:0,unit:"個",note:"",image:""});
  const fileRef = useRef();

  const filtered = useMemo(()=>items.filter(i=>{
    const ms = !search || i.name.includes(search) || (i.note||"").includes(search);
    const mc = catFilter==="all" || i.categoryId===catFilter;
    return ms&&mc;
  }),[items,search,catFilter]);

  const getCat = id => categories.find(c=>c.id===id);
  const getLoc = id => locations.find(l=>l.id===id);

  const handleImage = (e, setter) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = ev => setter(prev=>({...prev,image:ev.target.result}));
    r.readAsDataURL(f);
  };

  const saveItem = () => {
    if (!form.name||!form.categoryId||!form.locationId) { alert("名前・カテゴリ・保管場所は必須"); return; }
    if (editItem) {
      setItems(prev=>prev.map(i=>i.id===editItem.id?{...form,id:editItem.id,stock:Number(form.stock),minStock:Number(form.minStock)}:i));
      addLog(`品目編集: ${form.name}`);
      setEditItem(null);
    } else {
      const newI = {...form,id:uid(),stock:Number(form.stock),minStock:Number(form.minStock)};
      setItems(prev=>[...prev,newI]);
      addLog(`品目追加: ${form.name}`);
      setAdding(false);
    }
    setForm({name:"",categoryId:"",locationId:"",stock:0,minStock:0,unit:"個",note:"",image:""});
  };

  const startEdit = (item) => { setEditItem(item); setForm({...item}); };
  const deleteItem = (item) => {
    if (window.confirm(`「${item.name}」を削除しますか？`)) {
      setItems(prev=>prev.filter(i=>i.id!==item.id));
      addLog(`品目削除: ${item.name}`);
    }
  };

  const ItemForm = () => (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      {[["name","品目名","text",2],["unit","単位","text",1],["stock","初期在庫","number",1],["minStock","最低在庫","number",1]].map(([k,l,t,span])=>(
        <div key={k} style={{gridColumn:`span ${span}`}}>
          <div style={{fontSize:12,color:"#555",marginBottom:4,fontWeight:500}}>{l}</div>
          <input type={t} value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} placeholder={l} style={{width:"100%",padding:"9px 10px",borderRadius:8,border:"1px solid #d0d8e4",fontSize:14,boxSizing:"border-box"}}/>
        </div>
      ))}
      <div>
        <div style={{fontSize:12,color:"#555",marginBottom:4,fontWeight:500}}>カテゴリ</div>
        <select value={form.categoryId} onChange={e=>setForm(p=>({...p,categoryId:e.target.value}))} style={{width:"100%",padding:"9px 10px",borderRadius:8,border:"1px solid #d0d8e4",fontSize:14,boxSizing:"border-box",background:"#fff"}}>
          <option value="">選択</option>
          {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <div style={{fontSize:12,color:"#555",marginBottom:4,fontWeight:500}}>保管場所</div>
        <select value={form.locationId} onChange={e=>setForm(p=>({...p,locationId:e.target.value}))} style={{width:"100%",padding:"9px 10px",borderRadius:8,border:"1px solid #d0d8e4",fontSize:14,boxSizing:"border-box",background:"#fff"}}>
          <option value="">選択</option>
          {locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>
      <div style={{gridColumn:"span 2"}}>
        <div style={{fontSize:12,color:"#555",marginBottom:4,fontWeight:500}}>備考</div>
        <input value={form.note||""} onChange={e=>setForm(p=>({...p,note:e.target.value}))} placeholder="保管条件など" style={{width:"100%",padding:"9px 10px",borderRadius:8,border:"1px solid #d0d8e4",fontSize:14,boxSizing:"border-box"}}/>
      </div>
      <div style={{gridColumn:"span 2"}}>
        <div style={{fontSize:12,color:"#555",marginBottom:4,fontWeight:500}}>画像</div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {form.image
            ? <img src={form.image} alt="" style={{width:64,height:64,objectFit:"cover",borderRadius:8,border:"1px solid #e0e8f0"}}/>
            : <div style={{width:64,height:64,borderRadius:8,border:"1px dashed #d0d8e4",display:"flex",alignItems:"center",justifyContent:"center"}}><Ic n="camera" s={24} c="#ccc"/></div>
          }
          <input type="file" accept="image/*" ref={fileRef} style={{display:"none"}} onChange={e=>handleImage(e,setForm)}/>
          <button onClick={()=>fileRef.current.click()} style={{background:"#f0f4f8",border:"1px solid #d0d8e4",borderRadius:7,padding:"8px 14px",fontSize:13,cursor:"pointer",color:"#555"}}>画像を選択</button>
          {form.image&&<button onClick={()=>setForm(p=>({...p,image:""}))} style={{background:"#FCEBEB",border:"1px solid #F09595",borderRadius:7,padding:"8px 14px",fontSize:13,cursor:"pointer",color:"#A32D2D"}}>削除</button>}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <h2 style={{fontSize:22,fontWeight:800,color:"#0C447C",margin:0}}>在庫一覧</h2>
        {currentUser.role==="admin"&&<button onClick={()=>{setAdding(true);setForm({name:"",categoryId:"",locationId:"",stock:0,minStock:0,unit:"個",note:"",image:""});}} style={{display:"flex",alignItems:"center",gap:8,background:"#185FA5",color:"#fff",border:"none",borderRadius:8,padding:"10px 18px",fontSize:14,fontWeight:700,cursor:"pointer"}}><Ic n="plus" s={16} c="#fff"/>新規資材</button>}
      </div>

      <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:200,position:"relative"}}>
          <div style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)"}}><Ic n="search" s={16} c="#aaa"/></div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="資材名で検索..." style={{width:"100%",padding:"9px 12px 9px 34px",borderRadius:8,border:"1px solid #d0d8e4",fontSize:14,boxSizing:"border-box"}}/>
        </div>
        <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{padding:"9px 12px",borderRadius:8,border:"1px solid #d0d8e4",fontSize:14,background:"#fff"}}>
          <option value="all">すべてのカテゴリ</option>
          {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div style={{display:"flex",gap:4}}>
          {["card","table"].map(v=><button key={v} onClick={()=>setView(v)} style={{padding:"8px 14px",borderRadius:7,border:"1px solid #d0d8e4",fontSize:13,cursor:"pointer",background:view===v?"#185FA5":"#fff",color:view===v?"#fff":"#555",fontWeight:view===v?600:400}}>{v==="card"?"カード":"テーブル"}</button>)}
        </div>
      </div>

      <div style={{fontSize:13,color:"#888",marginBottom:12}}>{filtered.length}件の資材</div>

      {view==="card" ? (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:14}}>
          {filtered.map(item=>{
            const cat=getCat(item.categoryId);
            const st=stockStatus(item);
            return (
              <div key={item.id} style={{background:"#fff",border:"1px solid #e0e8f0",borderRadius:12,overflow:"hidden",cursor:"default"}}>
                <div style={{height:120,background:item.image?"#000":"#f5f8fc",position:"relative",overflow:"hidden"}}>
                  {item.image
                    ? <img src={item.image} alt={item.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    : <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",fontSize:36}}>💊</div>
                  }
                  <button onClick={()=>setQrItem(item)} style={{position:"absolute",top:8,right:8,background:"rgba(255,255,255,0.92)",border:"none",borderRadius:6,padding:"4px 7px",cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontSize:11,fontWeight:600,color:"#185FA5"}}>
                    <Ic n="qr" s={13} c="#185FA5"/>QR
                  </button>
                </div>
                <div style={{padding:"12px 14px"}}>
                  <div style={{fontWeight:600,fontSize:14,color:"#1a1a1a",marginBottom:4,lineHeight:1.3}}>{item.name}</div>
                  {cat&&<span style={{display:"inline-block",background:cat.color+"18",color:cat.color,borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:600,marginBottom:8}}>{cat.name}</span>}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:"1px solid #f0f4f8",paddingTop:8,marginTop:4}}>
                    <span style={{fontSize:12,color:"#888"}}>在庫数</span>
                    <span style={{fontSize:17,fontWeight:800,color:st.color}}>{item.stock} {item.unit}</span>
                  </div>
                  {currentUser.role==="admin"&&(
                    <div style={{display:"flex",gap:6,marginTop:10}}>
                      <button onClick={()=>startEdit(item)} style={{flex:1,background:"#f0f4f8",border:"1px solid #e0e8f0",borderRadius:6,padding:"6px 0",fontSize:12,cursor:"pointer",color:"#555"}}>編集</button>
                      <button onClick={()=>deleteItem(item)} style={{flex:1,background:"#FCEBEB",border:"1px solid #F09595",borderRadius:6,padding:"6px 0",fontSize:12,cursor:"pointer",color:"#A32D2D"}}>削除</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{background:"#fff",borderRadius:12,border:"1px solid #e0e8f0",overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr style={{background:"#f5f8fc"}}>
                {["品目名","カテゴリ","保管場所","在庫","最低","単位","状態","QR",...(currentUser.role==="admin"?["操作"]:[])].map(h=><th key={h} style={{padding:"10px 12px",textAlign:"left",fontWeight:600,color:"#555",borderBottom:"1px solid #e0e8f0",whiteSpace:"nowrap"}}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item=>{
                const cat=getCat(item.categoryId); const loc=getLoc(item.locationId); const st=stockStatus(item);
                return (
                  <tr key={item.id} style={{borderBottom:"1px solid #f5f7fa"}}>
                    <td style={{padding:"10px 12px",fontWeight:500}}>{item.name}</td>
                    <td style={{padding:"10px 12px"}}>{cat&&<span style={{background:cat.color+"18",color:cat.color,borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:600}}>{cat.name}</span>}</td>
                    <td style={{padding:"10px 12px",color:"#555",whiteSpace:"nowrap"}}>{loc?.name||"-"}</td>
                    <td style={{padding:"10px 12px",fontWeight:800,fontSize:15,color:st.color}}>{item.stock}</td>
                    <td style={{padding:"10px 12px",color:"#aaa"}}>{item.minStock}</td>
                    <td style={{padding:"10px 12px",color:"#888"}}>{item.unit}</td>
                    <td style={{padding:"10px 12px"}}><span style={{background:st.bg,color:st.color,borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:700}}>{st.label}</span></td>
                    <td style={{padding:"10px 12px"}}><button onClick={()=>setQrItem(item)} style={{background:"#E6F1FB",border:"none",borderRadius:6,padding:"5px 10px",fontSize:11,cursor:"pointer",color:"#185FA5",fontWeight:600,display:"flex",alignItems:"center",gap:4}}><Ic n="qr" s={12} c="#185FA5"/>表示</button></td>
                    {currentUser.role==="admin"&&<td style={{padding:"10px 12px"}}><div style={{display:"flex",gap:6}}><button onClick={()=>startEdit(item)} style={{background:"#f0f4f8",border:"1px solid #e0e8f0",borderRadius:6,padding:"5px 10px",fontSize:12,cursor:"pointer",color:"#555"}}>編集</button><button onClick={()=>deleteItem(item)} style={{background:"#FCEBEB",border:"1px solid #F09595",borderRadius:6,padding:"5px 10px",fontSize:12,cursor:"pointer",color:"#A32D2D"}}>削除</button></div></td>}
                  </tr>
                );
              })}
              {filtered.length===0&&<tr><td colSpan={9} style={{padding:"24px",textAlign:"center",color:"#aaa"}}>該当する資材がありません</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* QR Modal */}
      {qrItem&&<QRModal item={qrItem} onClose={()=>setQrItem(null)}/>}

      {/* Add / Edit Modal */}
      {(adding||editItem)&&(
        <Modal title={editItem?"品目を編集":"新規品目を追加"} onClose={()=>{setAdding(false);setEditItem(null);}} width={560}>
          <ItemForm/>
          <div style={{display:"flex",gap:10,marginTop:18}}>
            <button onClick={saveItem} style={{background:"#185FA5",color:"#fff",border:"none",borderRadius:8,padding:"11px 24px",fontSize:14,fontWeight:700,cursor:"pointer"}}>保存</button>
            <button onClick={()=>{setAdding(false);setEditItem(null);}} style={{background:"#f0f4f8",color:"#555",border:"1px solid #d0d8e4",borderRadius:8,padding:"11px 20px",fontSize:14,cursor:"pointer"}}>キャンセル</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

/* ── Stock IO ────────────────────────────────────────────── */
const StockIO = ({ items, categories, locations, users, destinations, currentUser, history, setHistory, setItems, addLog }) => {
  const [type, setType] = useState("in");
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState("");
  const [locationId, setLocationId] = useState("");
  // 出庫先: "select"（マスタ選択）or "manual"（手入力）
  const [destMode, setDestMode] = useState("select");
  const [destId, setDestId] = useState("");
  const [destManual, setDestManual] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterDest, setFilterDest] = useState("");
  const [page, setPage] = useState(1);
  const PER = 20;

  // 都道府県でグループ化
  const regions = useMemo(()=>{
    const r={};
    destinations.forEach(d=>{ if(!r[d.region])r[d.region]=[]; r[d.region].push(d); });
    return r;
  },[destinations]);

  const destLabel = (h) => {
    if(!h.destination) return "-";
    return h.destination;
  };

  const submit = () => {
    const q = Number(qty);
    if (!itemId||!q||q<=0) { setMsg({ok:false,text:"品目と正の数量を入力してください"}); return; }
    if (!locationId)        { setMsg({ok:false,text:"場所を選択してください"}); return; }
    const item = items.find(i=>i.id===itemId);
    if (!item) return;
    if (type==="out"&&item.stock<q) { setMsg({ok:false,text:"在庫数が不足しています（現在: "+item.stock+item.unit+"）"}); return; }

    // 出庫先の確定
    let destination = "";
    if (type==="out") {
      if (destMode==="manual") {
        destination = destManual.trim();
      } else {
        const d = destinations.find(d=>d.id===destId);
        destination = d ? d.name : "";
      }
    }

    const newH = { id:uid(), itemId, type, qty:q, userId:currentUser.id, locationId, destination, date:new Date().toISOString(), note };
    setHistory(prev=>[newH,...prev]);
    setItems(prev=>prev.map(i=>i.id===itemId?{...i,stock:type==="in"?i.stock+q:i.stock-q}:i));
    addLog(`${type==="in"?"入庫":"出庫"}: ${item.name} ×${q}${destination?" → "+destination:""}`);
    setMsg({ok:true,text:`${type==="in"?"入庫":"出庫"}を記録しました（${item.name} ${q}${item.unit}${destination?" / 出庫先: "+destination:""}）`});
    setQty(""); setNote(""); setItemId(""); setLocationId(""); setDestId(""); setDestManual("");
    setTimeout(()=>setMsg(null),4000);
  };

  const filtered = useMemo(()=>[...history].sort((a,b)=>new Date(b.date)-new Date(a.date)).filter(h=>{
    const item=items.find(i=>i.id===h.itemId);
    const user=users.find(u=>u.id===h.userId);
    const ms=!search||(item?.name||"").includes(search)||(user?.name||"").includes(search)||(h.note||"").includes(search)||(h.destination||"").includes(search);
    const mt=filterType==="all"||h.type===filterType;
    const md=!filterDest||(h.destination||"").includes(filterDest);
    return ms&&mt&&md;
  }),[history,search,filterType,filterDest,items,users]);

  const paged = filtered.slice((page-1)*PER, page*PER);
  const pages = Math.ceil(filtered.length/PER);

  const typeLabel = { in:"入荷", out:"出庫", move:"移動" };
  const typeBg    = { in:"#E6F1FB", out:"#FCEBEB", move:"#EEEDFE" };
  const typeColor = { in:"#185FA5", out:"#A32D2D", move:"#7F77DD" };

  return (
    <div>
      <h2 style={{fontSize:22,fontWeight:800,color:"#0C447C",marginBottom:20}}>入出庫登録</h2>

      {/* Form */}
      <div style={{background:"#fff",border:"1px solid #e0e8f0",borderRadius:12,padding:"20px 22px",marginBottom:22}}>
        <div style={{display:"flex",gap:8,marginBottom:18}}>
          {[["in","🟢 入庫","#185FA5"],["out","🔴 出庫","#A32D2D"]].map(([t,l,c])=>(
            <button key={t} onClick={()=>setType(t)} style={{flex:1,padding:"11px 0",border:"2px solid "+(type===t?c:"#e0e8f0"),borderRadius:9,fontWeight:700,fontSize:15,cursor:"pointer",background:type===t?c:"#fff",color:type===t?"#fff":"#888"}}>{l}</button>
          ))}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:12}}>
          {/* 品目 */}
          <div style={{gridColumn:"span 2"}}>
            <div style={{fontSize:12,fontWeight:600,color:"#555",marginBottom:5}}>品目</div>
            <select value={itemId} onChange={e=>setItemId(e.target.value)} style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid #d0d8e4",fontSize:14,background:"#fff",boxSizing:"border-box"}}>
              <option value="">品目を選択</option>
              {categories.map(c=>(
                <optgroup key={c.id} label={c.name}>
                  {items.filter(i=>i.categoryId===c.id).map(i=><option key={i.id} value={i.id}>{i.name}（現在: {i.stock}{i.unit}）</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          {/* 数量 */}
          <div>
            <div style={{fontSize:12,fontWeight:600,color:"#555",marginBottom:5}}>数量</div>
            <input type="number" value={qty} onChange={e=>setQty(e.target.value)} placeholder="数量" min="1" style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid #d0d8e4",fontSize:14,boxSizing:"border-box"}}/>
          </div>
          {/* 保管場所 */}
          <div>
            <div style={{fontSize:12,fontWeight:600,color:"#555",marginBottom:5}}>保管場所</div>
            <select value={locationId} onChange={e=>setLocationId(e.target.value)} style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid #d0d8e4",fontSize:14,background:"#fff",boxSizing:"border-box"}}>
              <option value="">場所を選択</option>
              {locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          {/* 出庫先（出庫時のみ） */}
          {type==="out"&&(
            <div style={{gridColumn:"span 2"}}>
              <div style={{fontSize:12,fontWeight:600,color:"#A32D2D",marginBottom:5}}>出庫先</div>
              <div style={{display:"flex",gap:6,marginBottom:8}}>
                <button onClick={()=>setDestMode("select")} style={{padding:"6px 14px",borderRadius:6,border:"1.5px solid "+(destMode==="select"?"#185FA5":"#d0d8e4"),background:destMode==="select"?"#E6F1FB":"#fff",color:destMode==="select"?"#185FA5":"#888",fontSize:12,fontWeight:600,cursor:"pointer"}}>リストから選択</button>
                <button onClick={()=>setDestMode("manual")} style={{padding:"6px 14px",borderRadius:6,border:"1.5px solid "+(destMode==="manual"?"#185FA5":"#d0d8e4"),background:destMode==="manual"?"#E6F1FB":"#fff",color:destMode==="manual"?"#185FA5":"#888",fontSize:12,fontWeight:600,cursor:"pointer"}}>手入力</button>
              </div>
              {destMode==="select" ? (
                <select value={destId} onChange={e=>setDestId(e.target.value)} style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid #d0d8e4",fontSize:14,background:"#fff",boxSizing:"border-box"}}>
                  <option value="">出庫先を選択</option>
                  {Object.entries(regions).map(([region,dests])=>(
                    <optgroup key={region} label={`── ${region} ──`}>
                      {dests.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              ) : (
                <input value={destManual} onChange={e=>setDestManual(e.target.value)} placeholder="出庫先を入力（例: かわぐち）" style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid #d0d8e4",fontSize:14,boxSizing:"border-box"}}/>
              )}
            </div>
          )}
          {/* 備考 */}
          <div style={{gridColumn:"span "+(type==="out"?"1":"3")}}>
            <div style={{fontSize:12,fontWeight:600,color:"#555",marginBottom:5}}>備考</div>
            <input value={note} onChange={e=>setNote(e.target.value)} placeholder="備考（任意）" style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid #d0d8e4",fontSize:14,boxSizing:"border-box"}}/>
          </div>
        </div>

        {msg&&<div style={{padding:"10px 14px",borderRadius:8,background:msg.ok?"#E1F5EE":"#FCEBEB",color:msg.ok?"#0F6E56":"#A32D2D",fontSize:14,marginBottom:12,display:"flex",alignItems:"center",gap:8}}><Ic n={msg.ok?"check":"warning"} s={16} c={msg.ok?"#0F6E56":"#A32D2D"}/>{msg.text}</div>}
        <button onClick={submit} style={{background:type==="in"?"#185FA5":"#A32D2D",color:"#fff",border:"none",borderRadius:8,padding:"12px 32px",fontSize:15,fontWeight:700,cursor:"pointer"}}>記録する</button>
      </div>

      {/* History */}
      <div style={{background:"#fff",border:"1px solid #e0e8f0",borderRadius:12,padding:"18px 20px"}}>
        <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:180,position:"relative"}}>
            <div style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)"}}><Ic n="search" s={15} c="#aaa"/></div>
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="品目名・担当者・出庫先・備考で検索" style={{width:"100%",padding:"8px 12px 8px 33px",borderRadius:8,border:"1px solid #d0d8e4",fontSize:13,boxSizing:"border-box"}}/>
          </div>
          <select value={filterType} onChange={e=>{setFilterType(e.target.value);setPage(1);}} style={{padding:"8px 12px",borderRadius:8,border:"1px solid #d0d8e4",fontSize:13,background:"#fff"}}>
            <option value="all">すべて</option>
            <option value="in">入庫</option>
            <option value="out">出庫</option>
          </select>
          <select value={filterDest} onChange={e=>{setFilterDest(e.target.value);setPage(1);}} style={{padding:"8px 12px",borderRadius:8,border:"1px solid #d0d8e4",fontSize:13,background:"#fff",minWidth:120}}>
            <option value="">出庫先: すべて</option>
            {Object.entries(regions).map(([region,dests])=>(
              <optgroup key={region} label={region}>
                {dests.map(d=><option key={d.id} value={d.name}>{d.name}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr style={{borderBottom:"1px solid #e0e8f0"}}>
                {["日時","種別","資材","数量","保管場所","出庫先","担当者","備考"].map(h=><th key={h} style={{padding:"9px 12px",textAlign:"left",fontWeight:600,color:"#888",whiteSpace:"nowrap"}}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {paged.map(h=>{
                const item=items.find(i=>i.id===h.itemId);
                const user=users.find(u=>u.id===h.userId);
                const loc=locations.find(l=>l.id===h.locationId);
                const t=h.type||"in";
                return (
                  <tr key={h.id} style={{borderBottom:"1px solid #f5f7fa"}}>
                    <td style={{padding:"9px 12px",color:"#888",whiteSpace:"nowrap"}}>{fmtDate(h.date)}</td>
                    <td style={{padding:"9px 12px"}}><span style={{background:typeBg[t],color:typeColor[t],borderRadius:5,padding:"2px 9px",fontSize:12,fontWeight:700}}>{typeLabel[t]||t}</span></td>
                    <td style={{padding:"9px 12px",fontWeight:500,color:"#1a1a1a"}}>{item?.name||"不明"}</td>
                    <td style={{padding:"9px 12px",fontWeight:700,color:typeColor[t]}}>{t==="out"?"-":""}{h.qty} {item?.unit}</td>
                    <td style={{padding:"9px 12px",color:"#555",whiteSpace:"nowrap"}}>{loc?.name||"-"}</td>
                    <td style={{padding:"9px 12px",whiteSpace:"nowrap"}}>
                      {h.destination
                        ? <span style={{background:"#f0f4f8",color:"#333",borderRadius:5,padding:"2px 9px",fontSize:12,fontWeight:600}}>{h.destination}</span>
                        : <span style={{color:"#ddd",fontSize:12}}>—</span>}
                    </td>
                    <td style={{padding:"9px 12px",color:"#555",whiteSpace:"nowrap"}}>{user?.name||"不明"}</td>
                    <td style={{padding:"9px 12px",color:"#aaa"}}>{h.note}</td>
                  </tr>
                );
              })}
              {paged.length===0&&<tr><td colSpan={8} style={{padding:"20px",textAlign:"center",color:"#aaa"}}>履歴がありません</td></tr>}
            </tbody>
          </table>
        </div>
        {pages>1&&(
          <div style={{display:"flex",justifyContent:"center",gap:6,marginTop:14}}>
            {Array.from({length:pages},(_,i)=>i+1).map(p=>(
              <button key={p} onClick={()=>setPage(p)} style={{width:32,height:32,border:"1px solid "+(p===page?"#185FA5":"#d0d8e4"),borderRadius:6,background:p===page?"#185FA5":"#fff",color:p===page?"#fff":"#555",fontSize:13,cursor:"pointer",fontWeight:p===page?700:400}}>{p}</button>
            ))}
          </div>
        )}
        <div style={{textAlign:"center",fontSize:12,color:"#aaa",marginTop:8}}>{filtered.length}件中 {Math.min((page-1)*PER+1,filtered.length)}〜{Math.min(page*PER,filtered.length)}件を表示</div>
      </div>
    </div>
  );
};

/* ── Stocktake ───────────────────────────────────────────── */
const Stocktake = ({ items, categories, locations }) => {
  const [counts, setCounts] = useState({});
  const catFilter = useMemo(()=>[...new Set(items.map(i=>i.categoryId))],[items]);
  const [selCat, setSelCat] = useState("all");

  const displayItems = useMemo(()=>items.filter(i=>selCat==="all"||i.categoryId===selCat),[items,selCat]);
  const results = displayItems.map(i=>({...i, actual:counts[i.id]!==undefined?Number(counts[i.id]):null, diff:counts[i.id]!==undefined?Number(counts[i.id])-i.stock:null}));
  const diffs = results.filter(r=>r.diff!==null&&r.diff!==0);
  const filled = results.filter(r=>r.actual!==null).length;

  const printReport = () => {
    const rows = results.filter(r=>r.actual!==null).map(r=>{
      const cat=categories.find(c=>c.id===r.categoryId);
      const loc=locations.find(l=>l.id===r.locationId);
      return `<tr><td>${r.name}</td><td>${cat?.name||""}</td><td>${loc?.name||""}</td><td>${r.stock}${r.unit}</td><td>${r.actual}${r.unit}</td><td style="color:${r.diff>0?"#185FA5":r.diff<0?"#A32D2D":"#0F6E56"};font-weight:700">${r.diff>0?"+":""}${r.diff}${r.unit}</td></tr>`;
    }).join("");
    const w=window.open("","_blank");
    w.document.write(`<html><head><title>棚卸報告書</title><style>*{font-family:sans-serif;font-size:13px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:8px 10px}th{background:#f0f4f8;font-weight:600}h2{font-size:18px}p{color:#555;margin:4px 0}</style></head><body><h2>棚卸報告書</h2><p>実施日: ${new Date().toLocaleDateString("ja-JP")}</p><p>差異あり: ${diffs.length}品目 / 棚卸済み: ${filled}品目</p><br><table><thead><tr><th>品目名</th><th>カテゴリ</th><th>保管場所</th><th>システム在庫</th><th>実地在庫</th><th>差異</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    w.print();
  };

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <h2 style={{fontSize:22,fontWeight:800,color:"#0C447C",margin:0}}>棚卸作業</h2>
        <button onClick={printReport} style={{display:"flex",alignItems:"center",gap:8,background:"#f0f4f8",color:"#333",border:"1px solid #d0d8e4",borderRadius:8,padding:"10px 18px",fontSize:14,cursor:"pointer"}}><Ic n="print" s={16}/>印刷・PDF出力</button>
      </div>

      {/* Progress */}
      <div style={{background:"#fff",border:"1px solid #e0e8f0",borderRadius:12,padding:"16px 20px",marginBottom:18,display:"flex",gap:16,flexWrap:"wrap"}}>
        <div><span style={{fontSize:12,color:"#888"}}>棚卸済み</span><div style={{fontSize:22,fontWeight:800,color:"#185FA5"}}>{filled}<span style={{fontSize:13,fontWeight:400,color:"#aaa"}}>/{displayItems.length}</span></div></div>
        <div><span style={{fontSize:12,color:"#888"}}>差異あり</span><div style={{fontSize:22,fontWeight:800,color:diffs.length>0?"#A32D2D":"#0F6E56"}}>{diffs.length}</div></div>
        <div style={{flex:1,display:"flex",alignItems:"center"}}>
          <div style={{width:"100%",height:8,background:"#f0f4f8",borderRadius:4,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${displayItems.length?filled/displayItems.length*100:0}%`,background:"#185FA5",borderRadius:4,transition:"width 0.3s"}}/>
          </div>
        </div>
      </div>

      {diffs.length>0&&(
        <div style={{background:"#FCEBEB",border:"1px solid #F09595",borderRadius:12,padding:"14px 18px",marginBottom:16}}>
          <div style={{fontWeight:700,color:"#A32D2D",marginBottom:8,fontSize:14}}>差異あり品目（{diffs.length}品目）</div>
          {diffs.map(r=><div key={r.id} style={{fontSize:13,color:"#A32D2D",marginBottom:3}}>▸ {r.name}：システム{r.stock}{r.unit}→実地{r.actual}{r.unit}（<b>{r.diff>0?"+":""}{r.diff}{r.unit}</b>）</div>)}
        </div>
      )}

      <div style={{marginBottom:14}}>
        <select value={selCat} onChange={e=>setSelCat(e.target.value)} style={{padding:"8px 12px",borderRadius:8,border:"1px solid #d0d8e4",fontSize:13,background:"#fff"}}>
          <option value="all">すべてのカテゴリ</option>
          {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div style={{background:"#fff",borderRadius:12,border:"1px solid #e0e8f0",overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead>
            <tr style={{background:"#f5f8fc"}}>
              {["品目名","カテゴリ","保管場所","システム在庫","実地数量（入力）","差異"].map(h=><th key={h} style={{padding:"10px 12px",textAlign:"left",fontWeight:600,color:"#555",borderBottom:"1px solid #e0e8f0",whiteSpace:"nowrap"}}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {results.map(r=>{
              const cat=categories.find(c=>c.id===r.categoryId);
              const loc=locations.find(l=>l.id===r.locationId);
              const d=r.diff;
              return (
                <tr key={r.id} style={{borderBottom:"1px solid #f5f7fa",background:d!==null&&d!==0?"#fff9f9":"#fff"}}>
                  <td style={{padding:"10px 12px",fontWeight:500,color:"#1a1a1a"}}>{r.name}</td>
                  <td style={{padding:"10px 12px"}}>{cat&&<span style={{background:cat.color+"18",color:cat.color,borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:600}}>{cat.name}</span>}</td>
                  <td style={{padding:"10px 12px",color:"#555",whiteSpace:"nowrap"}}>{loc?.name||"-"}</td>
                  <td style={{padding:"10px 12px",fontWeight:700,color:"#185FA5"}}>{r.stock} {r.unit}</td>
                  <td style={{padding:"10px 12px"}}>
                    <input type="number" min="0" value={counts[r.id]??""} onChange={e=>setCounts(p=>({...p,[r.id]:e.target.value}))} placeholder="実地数量" style={{width:90,padding:"7px 10px",borderRadius:7,border:"1px solid #d0d8e4",fontSize:14}}/>
                  </td>
                  <td style={{padding:"10px 12px",fontWeight:800,fontSize:15,color:d===null?"#ddd":d===0?"#0F6E56":d>0?"#185FA5":"#A32D2D"}}>
                    {d===null?"—":d===0?"✓":(d>0?"+":"")+d+" "+r.unit}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ── Audit Log ───────────────────────────────────────────── */
const AuditLog = ({ logs }) => {
  const [search, setSearch] = useState("");
  const filtered = useMemo(()=>logs.filter(l=>!search||l.text.includes(search)||l.user.includes(search)),[logs,search]);
  return (
    <div>
      <h2 style={{fontSize:22,fontWeight:800,color:"#0C447C",marginBottom:20}}>操作ログ</h2>
      <div style={{background:"#fff",border:"1px solid #e0e8f0",borderRadius:12,padding:"16px 20px"}}>
        <div style={{marginBottom:14,position:"relative"}}>
          <div style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)"}}><Ic n="search" s={15} c="#aaa"/></div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="操作内容・ユーザーで検索" style={{width:"100%",padding:"8px 12px 8px 33px",borderRadius:8,border:"1px solid #d0d8e4",fontSize:13,boxSizing:"border-box"}}/>
        </div>
        <div style={{fontSize:12,color:"#aaa",marginBottom:10}}>{filtered.length}件</div>
        {filtered.map(l=>(
          <div key={l.id} style={{display:"flex",gap:14,padding:"10px 0",borderBottom:"1px solid #f5f7fa",alignItems:"flex-start"}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:"#185FA5",flexShrink:0,marginTop:5}}/>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:"#1a1a1a"}}>{l.text}</div>
              <div style={{fontSize:11,color:"#aaa",marginTop:2}}>{l.user} ・ {fmtDate(l.date)}</div>
            </div>
          </div>
        ))}
        {filtered.length===0&&<div style={{textAlign:"center",padding:"20px",color:"#aaa",fontSize:13}}>ログがありません</div>}
      </div>
    </div>
  );
};

/* ── User Management ─────────────────────────────────────── */
const UserManagement = ({ users, setUsers, currentUser }) => {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({name:"",email:"",role:"staff",pass:"",active:true});

  const addUser = () => {
    if (!form.name||!form.email||!form.pass) { alert("名前・メール・パスワードは必須"); return; }
    setUsers(prev=>[...prev,{...form,id:uid(),createdAt:new Date().toISOString()}]);
    setAdding(false);
    setForm({name:"",email:"",role:"staff",pass:"",active:true});
  };
  const toggleActive = (id) => setUsers(prev=>prev.map(u=>u.id===id&&u.id!==currentUser.id?{...u,active:!u.active}:u));
  const deleteUser   = (u)  => { if(window.confirm(`「${u.name}」を削除しますか？`)) setUsers(prev=>prev.filter(x=>x.id!==u.id)); };

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{fontSize:22,fontWeight:800,color:"#0C447C",margin:"0 0 4px"}}>ユーザー管理</h2>
          <div style={{fontSize:13,color:"#888"}}>ユーザーの権限と有効/無効を管理します</div>
        </div>
        <button onClick={()=>setAdding(true)} style={{display:"flex",alignItems:"center",gap:8,background:"#185FA5",color:"#fff",border:"none",borderRadius:8,padding:"10px 18px",fontSize:14,fontWeight:700,cursor:"pointer"}}><Ic n="plus" s={16} c="#fff"/>ユーザー追加</button>
      </div>

      {adding&&(
        <div style={{background:"#EBF4FF",border:"1px solid #B5D4F4",borderRadius:12,padding:"18px 20px",marginBottom:18}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:14}}>
            {[["name","名前"],["email","メールアドレス"],["pass","パスワード"]].map(([k,l])=>(
              <div key={k}>
                <div style={{fontSize:12,fontWeight:600,color:"#555",marginBottom:4}}>{l}</div>
                <input type={k==="pass"?"password":"text"} value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} placeholder={l} style={{width:"100%",padding:"9px 10px",borderRadius:8,border:"1px solid #d0d8e4",fontSize:14,boxSizing:"border-box"}}/>
              </div>
            ))}
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"#555",marginBottom:4}}>権限</div>
              <select value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))} style={{width:"100%",padding:"9px 10px",borderRadius:8,border:"1px solid #d0d8e4",fontSize:14,background:"#fff",boxSizing:"border-box"}}>
                <option value="staff">利用者</option>
                <option value="admin">管理者</option>
              </select>
            </div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={addUser} style={{background:"#185FA5",color:"#fff",border:"none",borderRadius:8,padding:"10px 22px",fontSize:14,fontWeight:700,cursor:"pointer"}}>追加</button>
            <button onClick={()=>setAdding(false)} style={{background:"#fff",color:"#555",border:"1px solid #d0d8e4",borderRadius:8,padding:"10px 18px",fontSize:14,cursor:"pointer"}}>キャンセル</button>
          </div>
        </div>
      )}

      <div style={{background:"#fff",border:"1px solid #e0e8f0",borderRadius:12,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead>
            <tr style={{background:"#f5f8fc"}}>
              {["名前","メール","権限","状態","登録日","操作"].map(h=><th key={h} style={{padding:"10px 14px",textAlign:"left",fontWeight:600,color:"#555",borderBottom:"1px solid #e0e8f0",whiteSpace:"nowrap"}}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {users.map(u=>(
              <tr key={u.id} style={{borderBottom:"1px solid #f5f7fa"}}>
                <td style={{padding:"12px 14px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:34,height:34,borderRadius:"50%",background:u.role==="admin"?"#185FA5":"#0F6E56",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:13,flexShrink:0}}>{u.name.slice(0,1)}</div>
                    <div>
                      <div style={{fontWeight:600,color:"#1a1a1a"}}>{u.name}{u.id===currentUser.id&&<span style={{fontSize:11,color:"#888",fontWeight:400,marginLeft:5}}>(自分)</span>}</div>
                    </div>
                  </div>
                </td>
                <td style={{padding:"12px 14px",color:"#555"}}>{u.email}</td>
                <td style={{padding:"12px 14px"}}>
                  {u.role==="admin"
                    ? <span style={{background:"#185FA5",color:"#fff",borderRadius:5,padding:"3px 10px",fontSize:12,fontWeight:700}}>管理者</span>
                    : <span style={{background:"#f0f4f8",color:"#555",borderRadius:5,padding:"3px 10px",fontSize:12}}>利用者</span>
                  }
                </td>
                <td style={{padding:"12px 14px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div onClick={()=>toggleActive(u.id)} style={{width:40,height:22,borderRadius:11,background:u.active?"#185FA5":"#ddd",cursor:u.id===currentUser.id?"default":"pointer",position:"relative",transition:"background 0.2s",flexShrink:0}}>
                      <div style={{width:18,height:18,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:u.active?20:2,transition:"left 0.2s"}}/>
                    </div>
                    <span style={{fontSize:12,color:u.active?"#0F6E56":"#aaa"}}>{u.active?"有効":"無効"}</span>
                  </div>
                </td>
                <td style={{padding:"12px 14px",color:"#888",whiteSpace:"nowrap"}}>{fmtDate(u.createdAt)}</td>
                <td style={{padding:"12px 14px"}}>
                  {u.id!==currentUser.id&&users.length>1&&(
                    <button onClick={()=>deleteUser(u)} style={{background:"#FCEBEB",border:"1px solid #F09595",borderRadius:6,padding:"5px 10px",fontSize:12,cursor:"pointer",color:"#A32D2D",display:"flex",alignItems:"center",gap:4}}>
                      <Ic n="delete" s={13} c="#A32D2D"/>削除
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ── Master ──────────────────────────────────────────────── */
const Master = ({ categories, locations, destinations, setCategories, setLocations, setDestinations, currentUser }) => {
  const [tab, setTab] = useState("cat");
  const [newCat, setNewCat] = useState({name:"",color:"#185FA5"});
  const [newLoc, setNewLoc] = useState({name:""});
  const [newDest, setNewDest] = useState({name:"",region:""});
  const [destSearch, setDestSearch] = useState("");

  if(currentUser.role!=="admin") return <div style={{textAlign:"center",padding:"60px",color:"#aaa"}}><div style={{fontSize:32,marginBottom:10}}>🔒</div>管理者のみアクセスできます</div>;

  // 地域リスト（既存の地域名を収集）
  const regionList = [...new Set(destinations.map(d=>d.region))].filter(Boolean);

  const filteredDests = useMemo(()=>
    destinations.filter(d=>!destSearch||d.name.includes(destSearch)||d.region.includes(destSearch))
  ,[destinations,destSearch]);

  // 地域別グループ
  const regionGroups = useMemo(()=>{
    const g={};
    filteredDests.forEach(d=>{ if(!g[d.region])g[d.region]=[]; g[d.region].push(d); });
    return g;
  },[filteredDests]);

  return (
    <div>
      <h2 style={{fontSize:22,fontWeight:800,color:"#0C447C",marginBottom:20}}>マスタ管理</h2>
      <div style={{display:"flex",gap:0,marginBottom:20,border:"1px solid #d0d8e4",borderRadius:9,overflow:"hidden",width:"fit-content"}}>
        {[["cat","カテゴリ"],["loc","保管場所"],["dest","出庫先"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{padding:"10px 24px",border:"none",background:tab===id?"#185FA5":"#fff",color:tab===id?"#fff":"#555",fontWeight:700,fontSize:14,cursor:"pointer"}}>{label}</button>
        ))}
      </div>

      {tab==="cat"&&(
        <>
          <div style={{background:"#fff",border:"1px solid #e0e8f0",borderRadius:12,padding:"18px 20px",marginBottom:14}}>
            <div style={{display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap"}}>
              <div><div style={{fontSize:12,fontWeight:600,color:"#555",marginBottom:4}}>カテゴリ名</div><input value={newCat.name} onChange={e=>setNewCat(p=>({...p,name:e.target.value}))} placeholder="カテゴリ名" style={{padding:"9px 12px",borderRadius:8,border:"1px solid #d0d8e4",fontSize:14}}/></div>
              <div><div style={{fontSize:12,fontWeight:600,color:"#555",marginBottom:4}}>カラー</div><input type="color" value={newCat.color} onChange={e=>setNewCat(p=>({...p,color:e.target.value}))} style={{height:38,width:56,borderRadius:7,border:"1px solid #d0d8e4",cursor:"pointer",padding:2}}/></div>
              <button onClick={()=>{if(!newCat.name)return;setCategories(p=>[...p,{...newCat,id:uid()}]);setNewCat({name:"",color:"#185FA5"});}} style={{background:"#185FA5",color:"#fff",border:"none",borderRadius:8,padding:"10px 20px",fontSize:14,fontWeight:700,cursor:"pointer"}}>追加</button>
            </div>
          </div>
          <div style={{background:"#fff",borderRadius:12,border:"1px solid #e0e8f0",overflow:"hidden"}}>
            {categories.map(c=>(
              <div key={c.id} style={{display:"flex",alignItems:"center",padding:"13px 18px",borderBottom:"1px solid #f5f7fa"}}>
                <div style={{width:14,height:14,borderRadius:"50%",background:c.color,marginRight:12,flexShrink:0}}/>
                <div style={{flex:1,fontWeight:500,fontSize:14}}>{c.name}</div>
                <button onClick={()=>{if(window.confirm(`「${c.name}」を削除しますか？`))setCategories(p=>p.filter(x=>x.id!==c.id));}} style={{background:"#FCEBEB",border:"1px solid #F09595",borderRadius:6,padding:"5px 12px",fontSize:12,cursor:"pointer",color:"#A32D2D"}}>削除</button>
              </div>
            ))}
          </div>
        </>
      )}

      {tab==="loc"&&(
        <>
          <div style={{background:"#fff",border:"1px solid #e0e8f0",borderRadius:12,padding:"18px 20px",marginBottom:14}}>
            <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
              <div><div style={{fontSize:12,fontWeight:600,color:"#555",marginBottom:4}}>保管場所名</div><input value={newLoc.name} onChange={e=>setNewLoc(p=>({...p,name:e.target.value}))} placeholder="保管場所名" style={{padding:"9px 12px",borderRadius:8,border:"1px solid #d0d8e4",fontSize:14}}/></div>
              <button onClick={()=>{if(!newLoc.name)return;setLocations(p=>[...p,{...newLoc,id:uid()}]);setNewLoc({name:""});}} style={{background:"#185FA5",color:"#fff",border:"none",borderRadius:8,padding:"10px 20px",fontSize:14,fontWeight:700,cursor:"pointer"}}>追加</button>
            </div>
          </div>
          <div style={{background:"#fff",borderRadius:12,border:"1px solid #e0e8f0",overflow:"hidden"}}>
            {locations.map(l=>(
              <div key={l.id} style={{display:"flex",alignItems:"center",padding:"13px 18px",borderBottom:"1px solid #f5f7fa"}}>
                <div style={{flex:1,fontWeight:500,fontSize:14}}>📍 {l.name}</div>
                <button onClick={()=>{if(window.confirm(`「${l.name}」を削除しますか？`))setLocations(p=>p.filter(x=>x.id!==l.id));}} style={{background:"#FCEBEB",border:"1px solid #F09595",borderRadius:6,padding:"5px 12px",fontSize:12,cursor:"pointer",color:"#A32D2D"}}>削除</button>
              </div>
            ))}
          </div>
        </>
      )}

      {tab==="dest"&&(
        <>
          {/* 追加フォーム */}
          <div style={{background:"#fff",border:"1px solid #e0e8f0",borderRadius:12,padding:"18px 20px",marginBottom:14}}>
            <div style={{fontWeight:700,fontSize:14,color:"#0C447C",marginBottom:12}}>出庫先を追加</div>
            <div style={{display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:"#555",marginBottom:4}}>出庫先名（ひらがな可）</div>
                <input value={newDest.name} onChange={e=>setNewDest(p=>({...p,name:e.target.value}))} placeholder="例: さいたまにし" style={{padding:"9px 12px",borderRadius:8,border:"1px solid #d0d8e4",fontSize:14,width:180}}/>
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:"#555",marginBottom:4}}>地域（都道府県）</div>
                <div style={{display:"flex",gap:6}}>
                  <input value={newDest.region} onChange={e=>setNewDest(p=>({...p,region:e.target.value}))} placeholder="例: 埼玉" list="region-list" style={{padding:"9px 12px",borderRadius:8,border:"1px solid #d0d8e4",fontSize:14,width:120}}/>
                  <datalist id="region-list">{regionList.map(r=><option key={r} value={r}/>)}</datalist>
                </div>
              </div>
              <button onClick={()=>{
                if(!newDest.name) return;
                setDestinations(p=>[...p,{...newDest,id:uid()}]);
                setNewDest({name:"",region:""});
              }} style={{background:"#185FA5",color:"#fff",border:"none",borderRadius:8,padding:"10px 20px",fontSize:14,fontWeight:700,cursor:"pointer"}}>追加</button>
            </div>
          </div>

          {/* 検索 */}
          <div style={{marginBottom:14,position:"relative"}}>
            <div style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)"}}><Ic n="search" s={15} c="#aaa"/></div>
            <input value={destSearch} onChange={e=>setDestSearch(e.target.value)} placeholder="出庫先名・地域で検索" style={{width:"100%",padding:"8px 12px 8px 32px",borderRadius:8,border:"1px solid #d0d8e4",fontSize:13,boxSizing:"border-box"}}/>
          </div>

          {/* 地域別リスト */}
          <div style={{fontSize:13,color:"#aaa",marginBottom:10}}>{filteredDests.length}件</div>
          {Object.entries(regionGroups).map(([region,dests])=>(
            <div key={region} style={{marginBottom:18}}>
              <div style={{fontSize:11,fontWeight:700,color:"#888",letterSpacing:"0.6px",marginBottom:8,padding:"0 4px",borderLeft:"3px solid #185FA5",paddingLeft:10}}>{region}（{dests.length}）</div>
              <div style={{background:"#fff",borderRadius:10,border:"1px solid #e0e8f0",overflow:"hidden"}}>
                <div style={{display:"flex",flexWrap:"wrap",gap:0}}>
                  {dests.map((d,i)=>(
                    <div key={d.id} style={{display:"flex",alignItems:"center",padding:"9px 14px",borderRight:"1px solid #f0f4f8",borderBottom:"1px solid #f0f4f8",minWidth:140,gap:8}}>
                      <span style={{flex:1,fontSize:13,fontWeight:500,color:"#1a1a1a"}}>{d.name}</span>
                      <button onClick={()=>{if(window.confirm(`「${d.name}」を削除しますか？`))setDestinations(p=>p.filter(x=>x.id!==d.id));}} style={{background:"none",border:"none",cursor:"pointer",padding:2,display:"flex",opacity:0.5}}><Ic n="delete" s={14} c="#A32D2D"/></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {Object.keys(regionGroups).length===0&&<div style={{textAlign:"center",padding:"24px",color:"#aaa",fontSize:13}}>出庫先が見つかりません</div>}
        </>
      )}
    </div>
  );
};

/* ── App root ────────────────────────────────────────────── */
export default function App() {
  // ── State（Firestoreからリアルタイムに流れてくる）──
  const [categories,   setCategories]   = useState([]);
  const [locations,    setLocations]    = useState([]);
  const [users,        setUsers]        = useState([]);
  const [items,        setItems]        = useState([]);
  const [history,      setHistory]      = useState([]);
  const [logs,         setLogs]         = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [currentUser,  setCurrentUser]  = useState(null);
  const [page,         setPage]         = useState("dashboard");
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [dbReady,      setDbReady]      = useState(false);

  // ── Firestoreリアルタイム購読 ──
  useCol("categories",   setCategories);
  useCol("locations",    setLocations);
  useCol("users",        setUsers);
  useCol("items",        setItems);
  useCol("history",      setHistory);
  useCol("logs",         setLogs);
  useCol("destinations", setDestinations);

  // ── 初回のみ初期データを投入 ──
  useEffect(() => {
    // 各コレクションが読み込まれたあと（サイズ確認できる段階）で seed
    const timer = setTimeout(async () => {
      await seedCol("categories",   INIT_CATS,         categories.length);
      await seedCol("locations",    INIT_LOCS,         locations.length);
      await seedCol("users",        INIT_USERS,        users.length);
      await seedCol("items",        INIT_ITEMS,        items.length);
      await seedCol("history",      INIT_HIST,         history.length);
      await seedCol("destinations", INIT_DESTINATIONS, destinations.length);
      setDbReady(true);
    }, 1500); // onSnapshotの初回取得を待つ
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 初回1回だけ実行

  // ── Firestore書き込みラッパー（setterと同時にFirestoreへ保存）──
  const fsSet = useCallback((colName) => async (item) => {
    await saveDoc(colName, item);
  }, []);

  const fsDel = useCallback((colName) => async (id) => {
    await delDoc(colName, id);
  }, []);

  // ── 各setterをFirestore経由に変換 ──
  // items
  const upsertItem = useCallback(async (item) => {
    await saveDoc("items", item);
  }, []);
  const deleteItem = useCallback(async (id) => {
    await delDoc("items", id);
  }, []);

  // history（追加のみ）
  const addHistory = useCallback(async (entry) => {
    await saveDoc("history", entry);
  }, []);

  // その他マスタ類（配列全体をset→差分upsert）
  const makeMasterSetter = useCallback((colName, prev) => async (updater) => {
    const next = typeof updater === "function" ? updater(prev) : updater;
    // 削除されたドキュメントを検出してFirestoreからも消す
    const prevIds = new Set(prev.map(i => i.id));
    const nextIds = new Set(next.map(i => i.id));
    for (const id of prevIds) {
      if (!nextIds.has(id)) await delDoc(colName, id);
    }
    for (const item of next) {
      await saveDoc(colName, item);
    }
  }, []);

  // ── addLog ──
  const addLog = useCallback(async (text) => {
    if (!currentUser) return;
    const entry = { id: uid(), text, user: currentUser.name, date: new Date().toISOString() };
    await saveDoc("logs", entry);
  }, [currentUser]);

  // ── setItems互換（既存コンポーネントはsetItems(prev=>...)を呼ぶため） ──
  const setItemsCompat = useCallback(async (updater) => {
    const next = typeof updater === "function" ? updater(items) : updater;
    for (const item of next) {
      await saveDoc("items", item);
    }
  }, [items]);

  const setHistoryCompat = useCallback(async (updater) => {
    const next = typeof updater === "function" ? updater(history) : updater;
    // 新しく追加されたエントリだけ保存
    const existingIds = new Set(history.map(h => h.id));
    for (const h of next) {
      if (!existingIds.has(h.id)) await saveDoc("history", h);
    }
  }, [history]);

  const setUsersCompat   = useCallback(async (updater) => {
    await makeMasterSetter("users",        users)(updater);
  }, [users, makeMasterSetter]);

  const setCatsCompat    = useCallback(async (updater) => {
    await makeMasterSetter("categories",   categories)(updater);
  }, [categories, makeMasterSetter]);

  const setLocsCompat    = useCallback(async (updater) => {
    await makeMasterSetter("locations",    locations)(updater);
  }, [locations, makeMasterSetter]);

  const setDestsCompat   = useCallback(async (updater) => {
    await makeMasterSetter("destinations", destinations)(updater);
  }, [destinations, makeMasterSetter]);

  // ── ロード中表示 ──
  if (!dbReady && categories.length === 0) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f0f4f8",flexDirection:"column",gap:16}}>
      <div style={{fontSize:28}}>💊</div>
      <div style={{fontSize:15,color:"#185FA5",fontWeight:600}}>データを読み込んでいます…</div>
      <div style={{fontSize:12,color:"#aaa"}}>Firestoreに接続中</div>
    </div>
  );

  const alertCount = items.filter(i => i.stock <= i.minStock * 1.5).length;

  if (!currentUser) return (
    <Login
      users={users}
      onLogin={u => { setCurrentUser(u); setPage("dashboard"); addLog("ログイン"); }}
    />
  );

  const NAV = [
    {id:"dashboard", label:"ダッシュボード", icon:"dashboard"},
    {id:"stockio",   label:"入出庫登録",     icon:"history"},
    {id:"inventory", label:"在庫一覧",        icon:"boxes"},
    {id:"stocktake", label:"棚卸",            icon:"stocktake"},
    {id:"master",    label:"マスタ",          icon:"master"},
    {id:"auditlog",  label:"操作ログ",        icon:"log"},
    {id:"users",     label:"ユーザー管理",    icon:"users"},
  ];

  const props = {
    items, categories, locations, destinations, users, history, currentUser,
    logs, addLog,
    setItems:        setItemsCompat,
    setHistory:      setHistoryCompat,
    setCategories:   setCatsCompat,
    setLocations:    setLocsCompat,
    setDestinations: setDestsCompat,
    setUsers:        setUsersCompat,
  };

  const SideNav = () => (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:"#fff",borderRight:"1px solid #e0e8f0"}}>
      {/* Logo */}
      <div style={{padding:"20px 18px 14px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:34,height:34,borderRadius:9,background:"#185FA5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>💊</div>
          <div>
            <div style={{fontSize:13,fontWeight:800,color:"#0C447C",lineHeight:1.2}}>在庫管理</div>
            <div style={{fontSize:10,color:"#aaa"}}>医療材料・医薬品</div>
          </div>
        </div>
      </div>

      {/* Sections */}
      {[
        {label:"メイン",    items:[NAV[0]]},
        {label:"在庫管理",  items:[NAV[1],NAV[2],NAV[3]]},
        {label:"マスタ",    items:[NAV[4]]},
        {label:"設定",      items:[NAV[5],NAV[6]]},
      ].map(sec=>(
        <div key={sec.label}>
          <div style={{padding:"14px 18px 4px",fontSize:10,fontWeight:700,color:"#bbb",letterSpacing:"0.8px"}}>{sec.label}</div>
          {sec.items.map(n=>(
            <button key={n.id} onClick={()=>{setPage(n.id);setMobileOpen(false);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 18px",border:"none",background:page===n.id?"#EBF4FF":"transparent",color:page===n.id?"#185FA5":"#555",fontSize:13,fontWeight:page===n.id?700:400,cursor:"pointer",textAlign:"left",position:"relative"}}>
              <Ic n={n.icon} s={16} c={page===n.id?"#185FA5":"#888"}/>
              {n.label}
              {n.id==="dashboard"&&alertCount>0&&<span style={{marginLeft:"auto",background:"#E24B4A",color:"#fff",borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0}}>{alertCount}</span>}
            </button>
          ))}
        </div>
      ))}

      {/* User + logout */}
      <div style={{marginTop:"auto",padding:"14px 18px",borderTop:"1px solid #f0f4f8"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:currentUser.role==="admin"?"#185FA5":"#0F6E56",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:12,flexShrink:0}}>{currentUser.name.slice(0,1)}</div>
          <div>
            <div style={{fontSize:12,fontWeight:600,color:"#1a1a1a"}}>{currentUser.name}</div>
            <div style={{fontSize:10,color:"#aaa"}}>{currentUser.role==="admin"?"管理者":"スタッフ"}</div>
          </div>
        </div>
        <button onClick={()=>{addLog("ログアウト");setCurrentUser(null);}} style={{display:"flex",alignItems:"center",gap:8,background:"#f5f8fc",color:"#555",border:"1px solid #e0e8f0",borderRadius:7,padding:"7px 14px",fontSize:12,cursor:"pointer",width:"100%"}}>
          <Ic n="logout" s={14} c="#888"/>ログアウト
        </button>
      </div>
    </div>
  );

  return (
    <div style={{display:"flex",minHeight:"100vh",background:"#f5f8fc"}}>
      {/* Desktop sidebar */}
      <div style={{width:210,flexShrink:0,position:"sticky",top:0,height:"100vh",overflowY:"auto"}} className="desktop-sidebar">
        <SideNav/>
      </div>

      {/* Mobile overlay */}
      {mobileOpen&&(
        <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex"}} onClick={e=>{if(e.target===e.currentTarget)setMobileOpen(false);}}>
          <div style={{width:230,height:"100%",overflowY:"auto"}}><SideNav/></div>
          <div style={{flex:1,background:"rgba(0,0,0,0.35)"}} onClick={()=>setMobileOpen(false)}/>
        </div>
      )}

      {/* Main */}
      <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column"}}>
        {/* Mobile topbar */}
        <div style={{background:"#fff",borderBottom:"1px solid #e0e8f0",padding:"12px 16px",display:"flex",alignItems:"center",gap:12}} className="mobile-bar">
          <button onClick={()=>setMobileOpen(true)} style={{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex"}}><Ic n="master" s={20} c="#185FA5"/></button>
          <div style={{fontWeight:700,fontSize:15,color:"#0C447C",flex:1}}>{NAV.find(n=>n.id===page)?.label||""}</div>
          {alertCount>0&&<span style={{background:"#E24B4A",color:"#fff",borderRadius:"50%",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700}}>{alertCount}</span>}
        </div>

        <div style={{flex:1,padding:"28px 28px 48px",boxSizing:"border-box"}}>
          {page==="dashboard" && <Dashboard {...props} onNavigate={setPage}/>}
          {page==="inventory" && <InventoryList {...props}/>}
          {page==="stockio"   && <StockIO {...props}/>}
          {page==="stocktake" && <Stocktake {...props}/>}
          {page==="master"    && <Master {...props}/>}
          {page==="auditlog"  && <AuditLog {...props}/>}
          {page==="users"     && <UserManagement {...props}/>}
        </div>
      </div>

      <style>{`
        .desktop-sidebar { display: flex; flex-direction: column; }
        .mobile-bar { display: none; }
        @media (max-width: 680px) {
          .desktop-sidebar { display: none !important; }
          .mobile-bar { display: flex !important; }
          div[style*="padding:28px 28px"] { padding: 16px !important; }
        }
        * { box-sizing: border-box; }
        input:focus, select:focus { outline: 2px solid #B5D4F4; border-color: #185FA5 !important; }
        button { transition: opacity 0.15s; }
        button:hover { opacity: 0.85; }
        input[type=number]::-webkit-inner-spin-button { opacity: 1; }
      `}</style>
    </div>
  );
}
