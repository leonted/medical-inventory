import pg from 'pg';

const { Pool } = pg;

// ローカル開発はJSONファイル、本番はPostgreSQLを自動切換え
const USE_PG = !!process.env.DATABASE_URL;

// ── PostgreSQL接続 ─────────────────────────────────
let pool;
if (USE_PG) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
}

async function query(sql, params = []) {
  const res = await pool.query(sql, params);
  return res.rows;
}

// ── スキーマ初期化（初回のみ実行） ────────────────
export async function initSchema() {
  if (!USE_PG) return;
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS locations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT
    );
    CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category_id INTEGER REFERENCES categories(id),
      location_id INTEGER REFERENCES locations(id),
      stock NUMERIC NOT NULL DEFAULT 0,
      min_stock NUMERIC NOT NULL DEFAULT 10,
      unit TEXT NOT NULL DEFAULT '個',
      lot_number TEXT,
      expiry_date DATE,
      manufacturer TEXT,
      price NUMERIC,
      image TEXT,
      notes TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      item_id INTEGER REFERENCES items(id),
      type TEXT NOT NULL,
      quantity NUMERIC NOT NULL,
      user_id INTEGER,
      user_name TEXT,
      reason TEXT,
      notes TEXT,
      destination TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS stocktakes (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      entries JSONB NOT NULL DEFAULT '[]',
      user_id INTEGER,
      user_name TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      closed_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS destinations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  // 既存テーブルへの列追加（マイグレーション）
  await query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS destination TEXT`);
  await query(`ALTER TABLE items ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`);
}

// ── シード（初回のみ） ────────────────────────────
export async function seedIfEmpty(bcrypt) {
  if (!USE_PG) return;
  const existing = await query('SELECT COUNT(*) FROM users');
  if (Number(existing[0].count) > 0) return;

  const adminPw = await bcrypt.hash('admin123', 10);
  const nursePw = await bcrypt.hash('nurse123', 10);
  await query(`INSERT INTO users (username, password, name, role) VALUES ($1,$2,$3,$4),($5,$6,$7,$8)`,
    ['admin', adminPw, '管理者', 'admin', 'nurse1', nursePw, '田中 看護師', 'user']);

  const cats = [
    ['ワクチン','#2563eb','💉'],['医療材料','#16a34a','🩺'],['医薬品','#7c3aed','💊'],
    ['消耗品','#ea580c','🩹'],['器具・機器','#0891b2','🔬'],['衛生用品','#65a30d','🧤'],
  ];
  for (const [name, color, icon] of cats) {
    await query('INSERT INTO categories (name, color, icon) VALUES ($1,$2,$3)', [name, color, icon]);
  }

  const locs = [
    ['処置室A','1階処置室'],['処置室B','2階処置室'],['冷蔵庫1','ワクチン専用冷蔵庫'],
    ['薬品棚','医薬品保管棚'],['倉庫','予備在庫倉庫'],
  ];
  for (const [name, desc] of locs) {
    await query('INSERT INTO locations (name, description) VALUES ($1,$2)', [name, desc]);
  }

  const items = [
    ['インフルエンザワクチン（成人用）',1,3,45,20,'バイアル','LOT2024-001','2025-03-31','田辺三菱製薬',3200,'2〜8℃保管'],
    ['インフルエンザワクチン（小児用）',1,3,8,15,'バイアル','LOT2024-002','2025-03-31','田辺三菱製薬',2800,'小児0.25ml'],
    ['新型コロナワクチン（mRNA）',1,3,120,30,'バイアル','LOT2024-100','2025-06-30','ファイザー',0,'−20℃保管'],
    ['注射針 21G×1.5inch',2,1,500,100,'本',null,null,'テルモ',35,null],
    ['注射筒 1mL',2,1,200,50,'個',null,null,'テルモ',45,null],
    ['消毒用エタノール 500mL',6,4,12,5,'本',null,'2026-12-31','健栄製薬',850,null],
    ['ニトリル手袋（M）',6,5,3,10,'箱',null,null,'ミドリ安全',1200,'100枚/箱'],
    ['ガーゼ 10×10cm',4,2,250,100,'枚',null,null,'白十字',15,null],
    ['アスピリン 100mg',3,4,300,60,'錠','LOT-A001','2026-08-31','バイエル',28,null],
    ['体温計（電子）',5,2,8,3,'本',null,null,'オムロン',2500,null],
    ['血圧計（上腕式）',5,2,4,2,'台',null,null,'オムロン',15000,null],
    ['サージカルマスク（50枚/箱）',6,5,20,10,'箱',null,null,'日本マスク',980,null],
  ];
  for (const [name,catId,locId,stock,minStock,unit,lot,exp,maker,price,notes] of items) {
    await query(
      `INSERT INTO items (name,category_id,location_id,stock,min_stock,unit,lot_number,expiry_date,manufacturer,price,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [name,catId,locId,stock,minStock,unit,lot,exp||null,maker,price,notes]
    );
  }
  console.log('DB seeded successfully');
}

// 出庫場所の初期データ（destinationsテーブルが空の場合のみ投入）
export async function seedDestinations() {
  if (!USE_PG) return;
  const existing = await query('SELECT COUNT(*) FROM destinations');
  if (Number(existing[0].count) > 0) return;
  const defaults = [
    '茨城県 つくばみらい','茨城県 かすみがうら','茨城県 つくば','茨城県 いばらき','茨城県 ひたち',
    '千葉県 なりた','千葉県 のだ','千葉県 かとり','千葉県 やちよ','千葉県 あびこ',
    '埼玉県 あさか','埼玉県 かわごえ','埼玉県 かすかべ',
    '東京都 あだち','東京都 せたがや','東京都 まちだ','東京都 すぎなみ','東京都 えどがわ','東京都 にしとうきょう',
    '神奈川県 あつぎ','神奈川県 よこはま','神奈川県 よこすか','神奈川県 かわさき','神奈川県 ひらつか','神奈川県 ふじさわ',
    '栃木県 うつのみや','栃木県 もおか','栃木県 とちぎ','栃木県 しおや',
    '静岡県 ぬまづ',
    '愛知県 なごや','愛知県 みよし','愛知県 きよす',
    '新潟県 いといがわ','新潟県 にいがた','新潟県 ながおか','新潟県 じょうえつ',
  ];
  for (const name of defaults) {
    await query('INSERT INTO destinations (name) VALUES ($1)', [name]);
  }
}

// ── ヘルパー: スネークケース→キャメルケース変換 ──
function toItem(r) {
  if (!r) return null;
  return {
    id: r.id, name: r.name, categoryId: r.category_id, locationId: r.location_id,
    stock: Number(r.stock), minStock: Number(r.min_stock), unit: r.unit,
    lotNumber: r.lot_number, expiryDate: r.expiry_date?.toISOString?.()?.split('T')[0] ?? r.expiry_date,
    manufacturer: r.manufacturer, price: r.price ? Number(r.price) : null,
    image: r.image, notes: r.notes, isActive: r.is_active !== false,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}
function toTx(r) {
  return {
    id: r.id, itemId: r.item_id, type: r.type, quantity: Number(r.quantity),
    userId: r.user_id, userName: r.user_name, reason: r.reason, notes: r.notes,
    destination: r.destination, createdAt: r.created_at,
  };
}

// ── ローカル用JSON DB（既存コードを流用） ──────────
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readJson(file) {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}
function writeJson(file, data) { fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2)); }
function nextId(arr) { return arr.length === 0 ? 1 : Math.max(...arr.map(x => x.id)) + 1; }

// ── 統合DB API ────────────────────────────────────
export const db = {
  // Users
  getUsers: async () => {
    if (USE_PG) return (await query('SELECT * FROM users ORDER BY id')).map(r => ({ id: r.id, username: r.username, password: r.password, name: r.name, role: r.role, createdAt: r.created_at }));
    return readJson('users.json');
  },
  saveUsers: async (d) => { if (!USE_PG) writeJson('users.json', d); },
  addUser: async (u) => {
    if (USE_PG) {
      const rows = await query('INSERT INTO users (username,password,name,role) VALUES ($1,$2,$3,$4) RETURNING *', [u.username, u.password, u.name, u.role || 'user']);
      return rows[0];
    }
    const users = readJson('users.json');
    const newU = { ...u, id: nextId(users), createdAt: new Date().toISOString() };
    users.push(newU); writeJson('users.json', users); return newU;
  },

  // Categories
  getCategories: async () => {
    if (USE_PG) return await query('SELECT * FROM categories ORDER BY id');
    return readJson('categories.json');
  },
  addCategory: async (c) => {
    if (USE_PG) return (await query('INSERT INTO categories (name,color,icon) VALUES ($1,$2,$3) RETURNING *', [c.name, c.color, c.icon]))[0];
    const cats = readJson('categories.json'); const n = { ...c, id: nextId(cats) }; cats.push(n); writeJson('categories.json', cats); return n;
  },
  updateCategory: async (id, c) => {
    if (USE_PG) return (await query('UPDATE categories SET name=$1,color=$2,icon=$3 WHERE id=$4 RETURNING *', [c.name, c.color, c.icon, id]))[0];
    const cats = readJson('categories.json'); const i = cats.findIndex(x => x.id === id); if (i === -1) return null; cats[i] = { ...cats[i], ...c }; writeJson('categories.json', cats); return cats[i];
  },
  deleteCategory: async (id) => {
    if (USE_PG) { await query('DELETE FROM categories WHERE id=$1', [id]); return; }
    writeJson('categories.json', readJson('categories.json').filter(x => x.id !== id));
  },

  // Locations
  getLocations: async () => {
    if (USE_PG) return await query('SELECT * FROM locations ORDER BY id');
    return readJson('locations.json');
  },
  addLocation: async (l) => {
    if (USE_PG) return (await query('INSERT INTO locations (name,description) VALUES ($1,$2) RETURNING *', [l.name, l.description || null]))[0];
    const locs = readJson('locations.json'); const n = { ...l, id: nextId(locs) }; locs.push(n); writeJson('locations.json', locs); return n;
  },
  updateLocation: async (id, l) => {
    if (USE_PG) return (await query('UPDATE locations SET name=$1,description=$2 WHERE id=$3 RETURNING *', [l.name, l.description || null, id]))[0];
    const locs = readJson('locations.json'); const i = locs.findIndex(x => x.id === id); if (i === -1) return null; locs[i] = { ...locs[i], ...l }; writeJson('locations.json', locs); return locs[i];
  },
  deleteLocation: async (id) => {
    if (USE_PG) { await query('DELETE FROM locations WHERE id=$1', [id]); return; }
    writeJson('locations.json', readJson('locations.json').filter(x => x.id !== id));
  },

  // Destinations
  getDestinations: async () => {
    if (USE_PG) return await query('SELECT * FROM destinations ORDER BY id');
    return readJson('destinations.json');
  },
  addDestination: async (d) => {
    if (USE_PG) return (await query('INSERT INTO destinations (name) VALUES ($1) RETURNING *', [d.name]))[0];
    const list = readJson('destinations.json'); const n = { ...d, id: nextId(list) }; list.push(n); writeJson('destinations.json', list); return n;
  },
  updateDestination: async (id, d) => {
    if (USE_PG) return (await query('UPDATE destinations SET name=$1 WHERE id=$2 RETURNING *', [d.name, id]))[0];
    const list = readJson('destinations.json'); const i = list.findIndex(x => x.id === id); if (i === -1) return null; list[i] = { ...list[i], ...d }; writeJson('destinations.json', list); return list[i];
  },
  deleteDestination: async (id) => {
    if (USE_PG) { await query('DELETE FROM destinations WHERE id=$1', [id]); return; }
    writeJson('destinations.json', readJson('destinations.json').filter(x => x.id !== id));
  },

  // Items
  getItems: async (filters = {}) => {
    if (USE_PG) {
      let sql = 'SELECT * FROM items WHERE 1=1';
      const params = [];
      if (filters.search) { params.push(`%${filters.search}%`); sql += ` AND name ILIKE $${params.length}`; }
      if (filters.categoryId) { params.push(filters.categoryId); sql += ` AND category_id=$${params.length}`; }
      if (filters.locationId) { params.push(filters.locationId); sql += ` AND location_id=$${params.length}`; }
      sql += ' ORDER BY id';
      return (await query(sql, params)).map(toItem);
    }
    let items = readJson('items.json');
    if (filters.search) items = items.filter(i => i.name.includes(filters.search));
    if (filters.categoryId) items = items.filter(i => i.categoryId === Number(filters.categoryId));
    if (filters.locationId) items = items.filter(i => i.locationId === Number(filters.locationId));
    return items;
  },
  getItem: async (id) => {
    if (USE_PG) return toItem((await query('SELECT * FROM items WHERE id=$1', [id]))[0]);
    return readJson('items.json').find(i => i.id === id) || null;
  },
  addItem: async (item) => {
    if (USE_PG) {
      const r = (await query(
        `INSERT INTO items (name,category_id,location_id,stock,min_stock,unit,lot_number,expiry_date,manufacturer,price,image,notes,is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [item.name, item.categoryId||null, item.locationId||null, item.stock||0, item.minStock||10,
         item.unit||'個', item.lotNumber||null, item.expiryDate||null, item.manufacturer||null,
         item.price||null, item.image||null, item.notes||null, item.isActive !== false]
      ))[0];
      return toItem(r);
    }
    const items = readJson('items.json');
    const n = { ...item, id: nextId(items), createdAt: new Date().toISOString() };
    items.push(n); writeJson('items.json', items); return n;
  },
  updateItem: async (id, item) => {
    if (USE_PG) {
      const fields = [], params = [];
      const map = { name:'name', categoryId:'category_id', locationId:'location_id', stock:'stock', minStock:'min_stock', unit:'unit', lotNumber:'lot_number', expiryDate:'expiry_date', manufacturer:'manufacturer', price:'price', image:'image', notes:'notes', isActive:'is_active' };
      for (const [k, col] of Object.entries(map)) {
        if (item[k] !== undefined) { params.push(item[k] || null); fields.push(`${col}=$${params.length}`); }
      }
      if (!fields.length) return db.getItem(id);
      params.push(id); fields.push(`updated_at=NOW()`);
      const r = (await query(`UPDATE items SET ${fields.join(',')} WHERE id=$${params.length} RETURNING *`, params))[0];
      return toItem(r);
    }
    const items = readJson('items.json'); const i = items.findIndex(x => x.id === id);
    if (i === -1) return null; items[i] = { ...items[i], ...item, updatedAt: new Date().toISOString() };
    writeJson('items.json', items); return items[i];
  },
  deleteItem: async (id) => {
    if (USE_PG) { await query('DELETE FROM items WHERE id=$1', [id]); return; }
    writeJson('items.json', readJson('items.json').filter(x => x.id !== id));
  },

  // Transactions
  getTransactions: async (filters = {}) => {
    if (USE_PG) {
      let sql = 'SELECT * FROM transactions WHERE 1=1';
      const params = [];
      if (filters.itemId) { params.push(filters.itemId); sql += ` AND item_id=$${params.length}`; }
      if (filters.type) { params.push(filters.type); sql += ` AND type=$${params.length}`; }
      if (filters.from) { params.push(filters.from); sql += ` AND created_at>=$${params.length}`; }
      if (filters.to) { params.push(filters.to); sql += ` AND created_at<=$${params.length}`; }
      sql += ' ORDER BY id DESC';
      return (await query(sql, params)).map(toTx);
    }
    let txs = readJson('transactions.json');
    if (filters.itemId) txs = txs.filter(t => t.itemId === Number(filters.itemId));
    if (filters.type) txs = txs.filter(t => t.type === filters.type);
    if (filters.from) txs = txs.filter(t => t.createdAt >= filters.from);
    if (filters.to) txs = txs.filter(t => t.createdAt <= filters.to);
    return txs.sort((a, b) => b.id - a.id);
  },
  addTransaction: async (tx) => {
    if (USE_PG) {
      const r = (await query(
        `INSERT INTO transactions (item_id,type,quantity,user_id,user_name,reason,notes,destination,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [tx.itemId, tx.type, tx.quantity, tx.userId||null, tx.userName||null, tx.reason||null, tx.notes||null, tx.destination||null, tx.createdAt || new Date()]
      ))[0];
      const delta = tx.type === 'in' ? tx.quantity : -tx.quantity;
      await query('UPDATE items SET stock=stock+$1, updated_at=NOW() WHERE id=$2', [delta, tx.itemId]);
      return toTx(r);
    }
    const txs = readJson('transactions.json');
    const n = { ...tx, id: nextId(txs), createdAt: tx.createdAt || new Date().toISOString() };
    txs.push(n); writeJson('transactions.json', txs);
    const items = readJson('items.json'); const i = items.findIndex(x => x.id === tx.itemId);
    if (i !== -1) { items[i].stock = (items[i].stock || 0) + (tx.type === 'in' ? tx.quantity : -tx.quantity); writeJson('items.json', items); }
    return n;
  },

  // Stocktakes
  getStocktakes: async () => {
    if (USE_PG) return (await query('SELECT * FROM stocktakes ORDER BY id DESC')).map(r => ({ id: r.id, title: r.title, status: r.status, entries: r.entries, userId: r.user_id, userName: r.user_name, createdAt: r.created_at, closedAt: r.closed_at }));
    return readJson('stocktakes.json').sort((a, b) => b.id - a.id);
  },
  addStocktake: async (st) => {
    if (USE_PG) {
      const r = (await query('INSERT INTO stocktakes (title,status,entries,user_id,user_name) VALUES ($1,$2,$3,$4,$5) RETURNING *',
        [st.title, 'open', JSON.stringify(st.entries), st.userId||null, st.userName||null]))[0];
      return { id: r.id, title: r.title, status: r.status, entries: r.entries, userId: r.user_id, userName: r.user_name, createdAt: r.created_at };
    }
    const sts = readJson('stocktakes.json'); const n = { ...st, id: nextId(sts), createdAt: new Date().toISOString() }; sts.push(n); writeJson('stocktakes.json', sts); return n;
  },
  updateStocktake: async (id, st) => {
    if (USE_PG) {
      const r = (await query('UPDATE stocktakes SET title=$1,status=$2,entries=$3,closed_at=$4 WHERE id=$5 RETURNING *',
        [st.title, st.status, JSON.stringify(st.entries), st.closedAt||null, id]))[0];
      return { id: r.id, title: r.title, status: r.status, entries: r.entries, userId: r.user_id, userName: r.user_name, createdAt: r.created_at, closedAt: r.closed_at };
    }
    const sts = readJson('stocktakes.json'); const i = sts.findIndex(x => x.id === id);
    if (i === -1) return null; sts[i] = { ...sts[i], ...st }; writeJson('stocktakes.json', sts); return sts[i];
  },
};
