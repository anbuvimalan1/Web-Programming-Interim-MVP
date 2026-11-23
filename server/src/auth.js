import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';

export const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role, name: user.name }, SECRET, { expiresIn: '8h' });

// Verifies the Bearer token. Roles always come from the signed token, never from the request body.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Login required' });
  try {
    req.user = jwt.verify(token, SECRET);
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
