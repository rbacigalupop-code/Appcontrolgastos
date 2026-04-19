import { getDb } from '../config/db';
import { SYSTEM_CATEGORIES } from '@gastos/shared';

const db = getDb();

const insert = db.prepare(`
  INSERT OR IGNORE INTO categories (family_id, name, icon, color, type, is_system)
  VALUES (NULL, ?, ?, ?, ?, 1)
`);

const insertMany = db.transaction(() => {
  for (const cat of SYSTEM_CATEGORIES) {
    insert.run(cat.name, cat.icon, cat.color, cat.type);
  }
});

insertMany();
console.log('Seed complete: system categories inserted.');
