import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { createToken, requireAuth } from '../services/auth.js';
import { writeAuditLog } from '../services/audit.js';

export const authRouter = Router();

const verifyPassword = async (password, storedHash) => {
  if (storedHash.startsWith('plain:')) {
    return password === storedHash.replace('plain:', '');
  }
  return bcrypt.compare(password, storedHash);
};

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const match = await verifyPassword(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = createToken(user);
  await writeAuditLog(user.id, 'auth.login', `User ${user.email} logged in`);
  return res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const { rows } = await query('SELECT id, name, email, role FROM users WHERE id = $1', [req.user.id]);
  return res.json(rows[0]);
});
