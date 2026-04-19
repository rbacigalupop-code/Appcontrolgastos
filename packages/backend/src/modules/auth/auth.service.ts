import bcrypt from 'bcryptjs';
import { getDb } from '../../config/db';
import { signToken } from '../../utils/jwt';

export async function registerUser(email: string, password: string, name: string) {
  const sql = getDb();
  const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
  if (existing.length) throw Object.assign(new Error('Email ya registrado'), { status: 409 });

  const hash = await bcrypt.hash(password, 10);
  const [user] = await sql`
    INSERT INTO users (email, password_hash, name)
    VALUES (${email}, ${hash}, ${name})
    RETURNING id, family_id, email, name, role, avatar_url, currency, created_at
  `;
  const token = signToken({ id: user.id, family_id: user.family_id, email: user.email, role: user.role });
  return { user, token };
}

export async function loginUser(email: string, password: string) {
  const sql = getDb();
  const [user] = await sql`SELECT * FROM users WHERE email = ${email}`;
  if (!user) throw Object.assign(new Error('Credenciales inválidas'), { status: 401 });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw Object.assign(new Error('Credenciales inválidas'), { status: 401 });

  const { password_hash: _, ...safeUser } = user;
  const token = signToken({ id: user.id, family_id: user.family_id, email: user.email, role: user.role });
  return { user: safeUser, token };
}
