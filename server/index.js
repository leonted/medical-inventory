import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import qrcode from 'qrcode';
import { db, initSchema, seedIfEmpty, seedDestinations } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JWT_SECRET = process.env.JWT_SECRET || 'medical-inventory-secret-2024';
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production' || !!process.env.DATABASE_URL;

// DB初期化（クラウド時）
try {
  await initSchema();
  await seedIfEmpty(bcrypt);
  await seedDestinations();
} catch (e) {
  console.error('DB init error:', e.message);
}

// ローカル開発時のみJSONシードを実行
if (!IS_PROD) {
  try { await import('./seed.js'); } catch (e) {}
}

const app = express();
app.use(cors());
app.use(express.json());

// ファイルアップロード設定
const UPLOAD_DIR = IS_PROD
  ? '/tmp/uploads'
  : path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
app.use('/uploads', express.static(UPLOAD_DIR));

// 認証ミドルウェア
function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '認証が必要です' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'トークンが無効です' });
  }
}

// ── Auth ──────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const users = await db.getUsers();
    const user = users.find(u => u.username === username);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'ユーザー名またはパスワードが違います' });
    }
    const token = jwt.sign(
      { id: user.id, username: user.username, name: user.name, role: user.role },
      JWT_SECRET, { expiresIn: '8h' }
    );
    res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/auth/me', auth, (req, res) => res.json(req.user));

// ── Categories ───────────────────────────────────────
app.get('/api/categories', auth, async (req, res) => res.json(await db.getCategories()));
app.post('/api/categories', auth, async (req, res) => res.json(await db.addCategory(req.body)));
app.put('/api/categories/:id', auth, async (req, res) => {
  const r = await db.updateCategory(Number(req.params.id), req.body);
  r ? res.json(r) : res.status(404).json({ error: 'Not found' });
});
app.delete('/api/categories/:id', auth, async (req, res) => {
  await db.deleteCategory(Number(req.params.id));
  res.json({ ok: true });
});

// ── Locations ────────────────────────────────────────
app.get('/api/locations', auth, async (req, res) => res.json(await db.getLocations()));
app.post('/api/locations', auth, async (req, res) => res.json(await db.addLocation(req.body)));
app.put('/api/locations/:id', auth, async (req, res) => {
  const r = await db.updateLocation(Number(req.params.id), req.body);
  r ? res.json(r) : res.status(404).json({ error: 'Not found' });
});
app.delete('/api/locations/:id', auth, async (req, res) => {
  await db.deleteLocation(Number(req.params.id));
  res.json({ ok: true });
});

// ── Destinations ─────────────────────────────────────
app.get('/api/destinations', auth, async (req, res) => res.json(await db.getDestinations()));
app.post('/api/destinations', auth, async (req, res) => res.json(await db.addDestination(req.body)));
app.put('/api/destinations/:id', auth, async (req, res) => {
  const r = await db.updateDestination(Number(req.params.id), req.body);
  r ? res.json(r) : res.status(404).json({ error: 'Not found' });
});
app.delete('/api/destinations/:id', auth, async (req, res) => {
  await db.deleteDestination(Number(req.params.id));
  res.json({ ok: true });
});

// ── Items ────────────────────────────────────────────
app.get('/api/items', auth, async (req, res) => {
  try {
    const { search, categoryId, locationId } = req.query;
    res.json(await db.getItems({ search, categoryId, locationId }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/items/:id', auth, async (req, res) => {
  const item = await db.getItem(Number(req.params.id));
  item ? res.json(item) : res.status(404).json({ error: 'Not found' });
});

app.post('/api/items', auth, upload.single('image'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.image = `/uploads/${req.file.filename}`;
    if (data.categoryId) data.categoryId = Number(data.categoryId);
    if (data.locationId) data.locationId = Number(data.locationId);
    data.stock = data.stock !== undefined && data.stock !== '' ? Number(data.stock) : 0;
    data.minStock = data.minStock !== undefined && data.minStock !== '' ? Number(data.minStock) : 0;
    if (data.price) data.price = Number(data.price);
    data.isActive = data.isActive !== 'false' && data.isActive !== false;
    res.json(await db.addItem(data));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/items/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.image = `/uploads/${req.file.filename}`;
    if (data.categoryId) data.categoryId = Number(data.categoryId);
    if (data.locationId) data.locationId = Number(data.locationId);
    if (data.stock !== undefined) data.stock = Number(data.stock);
    if (data.minStock !== undefined) data.minStock = Number(data.minStock);
    if (data.price !== undefined) data.price = Number(data.price);
    if (data.isActive !== undefined) data.isActive = data.isActive !== 'false' && data.isActive !== false;
    const r = await db.updateItem(Number(req.params.id), data);
    r ? res.json(r) : res.status(404).json({ error: 'Not found' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/items/:id', auth, async (req, res) => {
  await db.deleteItem(Number(req.params.id));
  res.json({ ok: true });
});

app.get('/api/items/:id/qr', auth, async (req, res) => {
  try {
    const item = await db.getItem(Number(req.params.id));
    if (!item) return res.status(404).json({ error: 'Not found' });
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    const url = `${appUrl}/scan/${item.id}`;
    const qr = await qrcode.toDataURL(url);
    res.json({ qr, item });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Transactions ─────────────────────────────────────
app.get('/api/transactions', auth, async (req, res) => {
  try {
    const { itemId, type, search, from, to } = req.query;
    let txs = await db.getTransactions({ itemId, type, from, to });
    const items = await db.getItems();
    if (search) {
      const matchIds = items.filter(i => i.name.includes(search)).map(i => i.id);
      txs = txs.filter(t => matchIds.includes(t.itemId) || t.userName?.includes(search));
    }
    txs = txs.map(t => {
      const item = items.find(i => i.id === t.itemId);
      return { ...t, itemName: item?.name || '不明', itemUnit: item?.unit || '' };
    });
    res.json(txs);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/transactions', auth, async (req, res) => {
  try {
    const tx = {
      ...req.body,
      itemId: Number(req.body.itemId),
      quantity: Number(req.body.quantity),
      userId: req.user.id,
      userName: req.user.name,
    };
    res.json(await db.addTransaction(tx));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/transactions/:id', auth, async (req, res) => {
  try {
    await db.deleteTransaction(Number(req.params.id));
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Stocktakes ───────────────────────────────────────
app.get('/api/stocktakes', auth, async (req, res) => res.json(await db.getStocktakes()));

app.post('/api/stocktakes', auth, async (req, res) => {
  try {
    const items = await db.getItems();
    const entries = items.map(item => ({
      itemId: item.id, itemName: item.name,
      systemStock: item.stock, actualStock: null,
      difference: null, adjusted: false,
    }));
    const st = {
      title: req.body.title || `棚卸 ${new Date().toLocaleDateString('ja-JP')}`,
      status: 'open', entries,
      userId: req.user.id, userName: req.user.name,
    };
    res.json(await db.addStocktake(st));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/stocktakes/:id', auth, async (req, res) => {
  try {
    const r = await db.updateStocktake(Number(req.params.id), req.body);
    r ? res.json(r) : res.status(404).json({ error: 'Not found' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/stocktakes/:id/adjust', auth, async (req, res) => {
  try {
    const sts = await db.getStocktakes();
    const st = sts.find(s => s.id === Number(req.params.id));
    if (!st) return res.status(404).json({ error: 'Not found' });
    const { entryIndexes } = req.body;
    for (const idx of (entryIndexes || [])) {
      const entry = st.entries[idx];
      if (entry && entry.actualStock !== null && !entry.adjusted) {
        const diff = entry.actualStock - entry.systemStock;
        if (diff !== 0) {
          await db.addTransaction({
            itemId: entry.itemId,
            type: diff > 0 ? 'in' : 'out',
            quantity: Math.abs(diff),
            userId: req.user.id, userName: req.user.name,
            reason: '棚卸調整', notes: `棚卸ID:${st.id}`,
          });
        }
        entry.difference = diff;
        entry.adjusted = true;
      }
    }
    st.status = 'closed';
    st.closedAt = new Date().toISOString();
    res.json(await db.updateStocktake(st.id, st));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Dashboard ─────────────────────────────────────────
app.get('/api/dashboard', auth, async (req, res) => {
  try {
    const [items, txs, categories] = await Promise.all([
      db.getItems(), db.getTransactions(), db.getCategories(),
    ]);
    const activeItems = items.filter(i => i.isActive !== false);
    const lowStock = activeItems.filter(i => i.stock <= i.minStock);
    const now = new Date();
    const in90 = new Date(now.getTime() + 90 * 86400000).toISOString().split('T')[0];
    const expiryWarnings = activeItems.filter(i => i.expiryDate && i.expiryDate <= in90 && i.stock > 0);
    const categoryBreakdown = categories.map(c => ({
      ...c,
      count: items.filter(i => i.categoryId === c.id).length,
      totalStock: items.filter(i => i.categoryId === c.id).reduce((s, i) => s + i.stock, 0),
    }));
    const recentTxs = txs.slice(0, 10).map(t => {
      const item = items.find(i => i.id === t.itemId);
      return { ...t, itemName: item?.name || '不明', itemUnit: item?.unit || '' };
    });
    const monthlyStats = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const inCount = txs.filter(t => t.type === 'in' && String(t.createdAt).startsWith(key)).reduce((s, t) => s + Number(t.quantity), 0);
      const outCount = txs.filter(t => t.type === 'out' && String(t.createdAt).startsWith(key)).reduce((s, t) => s + Number(t.quantity), 0);
      monthlyStats.push({ month: `${d.getMonth() + 1}月`, in: inCount, out: outCount });
    }
    res.json({ totalItems: items.length, totalCategories: categories.length, lowStock, categoryBreakdown, expiryWarnings, recentTxs, monthlyStats });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Users ─────────────────────────────────────────────
app.get('/api/users', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: '権限がありません' });
  const users = (await db.getUsers()).map(({ password: _, ...u }) => u);
  res.json(users);
});

app.post('/api/users', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: '権限がありません' });
    const { username, password, name, role } = req.body;
    const users = await db.getUsers();
    if (users.find(u => u.username === username)) return res.status(400).json({ error: 'ユーザー名が既に存在します' });
    const hashed = bcrypt.hashSync(password, 10);
    const newUser = await db.addUser({ username, password: hashed, name, role: role || 'user' });
    const { password: _, ...safe } = newUser;
    res.json(safe);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// パスワード変更
app.post('/api/auth/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const users = await db.getUsers();
    const user = users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'ユーザーが見つかりません' });
    if (!bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(400).json({ error: '現在のパスワードが違います' });
    }
    if (newPassword.length < 6) return res.status(400).json({ error: 'パスワードは6文字以上にしてください' });
    const hashed = bcrypt.hashSync(newPassword, 10);
    // update password
    if (process.env.DATABASE_URL) {
      const { Pool } = await import('pg').then(m => m.default);
      const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
      await pool.query('UPDATE users SET password=$1 WHERE id=$2', [hashed, req.user.id]);
      await pool.end();
    } else {
      const allUsers = await db.getUsers();
      const idx = allUsers.findIndex(u => u.id === req.user.id);
      if (idx !== -1) { allUsers[idx].password = hashed; await db.saveUsers(allUsers); }
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ユーザー削除（管理者のみ）
app.delete('/api/users/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: '権限がありません' });
    if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: '自分自身は削除できません' });
    if (process.env.DATABASE_URL) {
      const { Pool } = await import('pg').then(m => m.default);
      const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
      await pool.query('DELETE FROM users WHERE id=$1', [Number(req.params.id)]);
      await pool.end();
    } else {
      const users = await db.getUsers();
      await db.saveUsers(users.filter(u => u.id !== Number(req.params.id)));
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── 本番用: Viteのビルドファイルを配信 ──────────────
if (IS_PROD) {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
