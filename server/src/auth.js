import jwt from 'jsonwebtoken';
import { db } from './db.js';

const SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET.length < 32) throw new Error('Set JWT_SECRET to a random value of at least 32 characters in server/.env. START.cmd creates one on first launch.');

export const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role, name: user.name }, SECRET, { expiresIn: '8h' });

// Verify identity, then read the current role so deletion/demotion takes effect immediately.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Login required' });
  try {
    const claims = jwt.verify(token, SECRET);
    const user = db.prepare('SELECT id,name,role FROM users WHERE id=?').get(claims.id);
    if (!user) return res.status(401).json({ error: 'Account no longer exists' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired, please log in again' });
  }
}

// Server-side role check: 403 when the role is not allowed.
export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role)
    ? next()
    : res.status(403).json({ error: 'Forbidden: your role cannot do this' });
