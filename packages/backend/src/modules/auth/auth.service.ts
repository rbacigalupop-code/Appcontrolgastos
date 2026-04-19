import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getDb } from '../../config/db';
import { signToken } from '../../utils/jwt';
import { SYSTEM_CATEGORIES } from '@gastos/shared';

interface DbUser {
  id: number; family_id: number | null; email: string;
  name: string; role: string; avatar_url: string | null;
  currency: string; created_at: string; password_hash: string;
}

export async function registerUser(email: string, password: string, name: string) {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) throw Object.assign(new Error('Email ya registrado'), { status: 409 });

  const hash = await bcrypt.hash(password, 10);
  const result = db.prepare(
    'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
  ).run(email, hash, name);

  const user = db.prepare('SELECT id, family_id, email, name, role, avatar_url, currency, created_at FROM users WHERE id = ?').get(result.lastInsertRowid) as Omit<DbUser, 'password_hash'>;
  const token = signToken({ id: user.id, family_id: user.family_id, email: user.email, role: user.role });
  return { user, token };
}

export async function loginUser(email: string, password: string) {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as DbUser | undefined;
  if (!user) throw Object.assign(new Error('Credenciales inválidas'), { status: 401 });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw Object.assign(new Error('Credenciales inválidas'), { status: 401 });

  const { password_hash: _, ...safeUser } = user;
  const token = signToken({ id: user.id, family_id: user.family_id, email: user.email, role: user.role });
  return { user: safeUser, token };
}

export function seedCategoriesForUser(userId: number) {
  const db = getDb();
  const insert = db.prepare(
    'INSERT OR IGNORE INTO categories (family_id, name, icon, color, type, is_system) VALUES (NULL, ?, ?, ?, ?, 1)'
  );
  for (const cat of SYSTEM_CATEGORIES) {
    insert.run(cat.name, cat.icon, cat.color, cat.type);
  }
}
