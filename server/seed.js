import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const files = {
  'users.json': [
    { id: 1, username: 'admin', password: bcrypt.hashSync('admin123', 10), name: '管理者', role: 'admin', createdAt: new Date().toISOString() },
    { id: 2, username: 'nurse1', password: bcrypt.hashSync('nurse123', 10), name: '田中 看護師', role: 'user', createdAt: new Date().toISOString() },
  ],
  'categories.json': [
    { id: 1, name: 'ワクチン', color: '#2563eb', icon: '💉' },
    { id: 2, name: '医療材料', color: '#16a34a', icon: '🩺' },
    { id: 3, name: '医薬品', color: '#7c3aed', icon: '💊' },
    { id: 4, name: '消耗品', color: '#ea580c', icon: '🩹' },
    { id: 5, name: '器具・機器', color: '#0891b2', icon: '🔬' },
    { id: 6, name: '衛生用品', color: '#65a30d', icon: '🧤' },
  ],
  'locations.json': [
    { id: 1, name: '処置室A', description: '1階処置室' },
    { id: 2, name: '処置室B', description: '2階処置室' },
    { id: 3, name: '冷蔵庫1', description: 'ワクチン専用冷蔵庫' },
    { id: 4, name: '薬品棚', description: '医薬品保管棚' },
    { id: 5, name: '倉庫', description: '予備在庫倉庫' },
  ],
  'items.json': [
    { id: 1, name: 'インフルエンザワクチン（成人用）', categoryId: 1, locationId: 3, stock: 45, minStock: 20, unit: 'バイアル', lotNumber: 'LOT2024-001', expiryDate: '2025-03-31', manufacturer: '田辺三菱製薬', price: 3200, image: null, notes: '2〜8℃保管', createdAt: new Date().toISOString() },
    { id: 2, name: 'インフルエンザワクチン（小児用）', categoryId: 1, locationId: 3, stock: 8, minStock: 15, unit: 'バイアル', lotNumber: 'LOT2024-002', expiryDate: '2025-03-31', manufacturer: '田辺三菱製薬', price: 2800, image: null, notes: '小児0.25ml', createdAt: new Date().toISOString() },
    { id: 3, name: '新型コロナワクチン（mRNA）', categoryId: 1, locationId: 3, stock: 120, minStock: 30, unit: 'バイアル', lotNumber: 'LOT2024-100', expiryDate: '2025-06-30', manufacturer: 'ファイザー', price: 0, image: null, notes: '−20℃保管', createdAt: new Date().toISOString() },
    { id: 4, name: '注射針 21G×1.5inch', categoryId: 2, locationId: 1, stock: 500, minStock: 100, unit: '本', lotNumber: null, expiryDate: null, manufacturer: 'テルモ', price: 35, image: null, notes: null, createdAt: new Date().toISOString() },
    { id: 5, name: '注射筒 1mL', categoryId: 2, locationId: 1, stock: 200, minStock: 50, unit: '個', lotNumber: null, expiryDate: null, manufacturer: 'テルモ', price: 45, image: null, notes: null, createdAt: new Date().toISOString() },
    { id: 6, name: '消毒用エタノール 500mL', categoryId: 6, locationId: 4, stock: 12, minStock: 5, unit: '本', lotNumber: null, expiryDate: '2026-12-31', manufacturer: '健栄製薬', price: 850, image: null, notes: null, createdAt: new Date().toISOString() },
    { id: 7, name: 'ニトリル手袋（M）', categoryId: 6, locationId: 5, stock: 3, minStock: 10, unit: '箱', lotNumber: null, expiryDate: null, manufacturer: 'ミドリ安全', price: 1200, image: null, notes: '100枚/箱', createdAt: new Date().toISOString() },
    { id: 8, name: 'ガーゼ 10×10cm', categoryId: 4, locationId: 2, stock: 250, minStock: 100, unit: '枚', lotNumber: null, expiryDate: null, manufacturer: '白十字', price: 15, image: null, notes: null, createdAt: new Date().toISOString() },
    { id: 9, name: 'アスピリン 100mg', categoryId: 3, locationId: 4, stock: 300, minStock: 60, unit: '錠', lotNumber: 'LOT-A001', expiryDate: '2026-08-31', manufacturer: 'バイエル', price: 28, image: null, notes: null, createdAt: new Date().toISOString() },
    { id: 10, name: '体温計（電子）', categoryId: 5, locationId: 2, stock: 8, minStock: 3, unit: '本', lotNumber: null, expiryDate: null, manufacturer: 'オムロン', price: 2500, image: null, notes: null, createdAt: new Date().toISOString() },
    { id: 11, name: '血圧計（上腕式）', categoryId: 5, locationId: 2, stock: 4, minStock: 2, unit: '台', lotNumber: null, expiryDate: null, manufacturer: 'オムロン', price: 15000, image: null, notes: null, createdAt: new Date().toISOString() },
    { id: 12, name: 'サージカルマスク（50枚/箱）', categoryId: 6, locationId: 5, stock: 20, minStock: 10, unit: '箱', lotNumber: null, expiryDate: null, manufacturer: '日本マスク', price: 980, image: null, notes: null, createdAt: new Date().toISOString() },
  ],
  'transactions.json': [
    { id: 1, itemId: 1, type: 'in', quantity: 50, userId: 1, userName: '管理者', reason: '定期発注', notes: null, createdAt: new Date(Date.now() - 7*86400000).toISOString() },
    { id: 2, itemId: 2, type: 'out', quantity: 5, userId: 2, userName: '田中 看護師', reason: '接種使用', notes: '予防接種外来', createdAt: new Date(Date.now() - 6*86400000).toISOString() },
    { id: 3, itemId: 7, type: 'out', quantity: 2, userId: 2, userName: '田中 看護師', reason: '処置使用', notes: null, createdAt: new Date(Date.now() - 5*86400000).toISOString() },
    { id: 4, itemId: 4, type: 'in', quantity: 200, userId: 1, userName: '管理者', reason: '定期発注', notes: null, createdAt: new Date(Date.now() - 3*86400000).toISOString() },
    { id: 5, itemId: 6, type: 'out', quantity: 3, userId: 2, userName: '田中 看護師', reason: '処置使用', notes: null, createdAt: new Date(Date.now() - 2*86400000).toISOString() },
    { id: 6, itemId: 3, type: 'in', quantity: 60, userId: 1, userName: '管理者', reason: '補充', notes: 'ワクチン定期入荷', createdAt: new Date(Date.now() - 1*86400000).toISOString() },
    { id: 7, itemId: 9, type: 'out', quantity: 30, userId: 2, userName: '田中 看護師', reason: '調剤払い出し', notes: null, createdAt: new Date(Date.now() - 3600000).toISOString() },
  ],
  'stocktakes.json': [],
};

for (const [file, data] of Object.entries(files)) {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, JSON.stringify(data, null, 2));
    console.log(`Created ${file}`);
  } else {
    console.log(`Skipped ${file} (already exists)`);
  }
}

console.log('Seed complete. Admin: admin/admin123, Nurse: nurse1/nurse123');
