import { Router } from 'express';
import bcrypt from 'bcrypt';
import { db } from './db.js';
import { requireAuth, requireRole, signToken } from './auth.js';

const router = Router();
const staff = requireRole('librarian', 'admin');
const adminOnly = requireRole('admin');

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const int = (v) => (v === '' || v == null ? null : (Number.isSafeInteger(Number(v)) ? Number(v) : NaN));
const bad = (res, msg) => res.status(400).json({ error: msg });
const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

/* ---------- AUTH ---------- */
router.post('/auth/register', (req, res) => {
  const name = str(req.body.name);
  const email = str(req.body.email).toLowerCase();
  const password = req.body.password;
  if (name.length < 2) return bad(res, 'Name must be at least 2 characters');
  if (!/^\S+@\S+\.\S+$/.test(email)) return bad(res, 'Enter a valid email');
  if (typeof password !== 'string' || password.length < 8) return bad(res, 'Password must be at least 8 characters');
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) return bad(res, 'Email already registered');
  // Public registration always creates a member. Roles are changed only by an admin.
  const info = db
    .prepare('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)')
    .run(name, email, bcrypt.hashSync(password, 10), 'member');
  const user = { id: info.lastInsertRowid, name, email, role: 'member' };
  res.status(201).json({ token: signToken(user), user });
});

router.post('/auth/login', (req, res) => {
  const email = str(req.body.email).toLowerCase();
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!row || !bcrypt.compareSync(String(req.body.password ?? ''), row.password_hash))
    return res.status(401).json({ error: 'Wrong email or password' });
  const user = { id: row.id, name: row.name, email: row.email, role: row.role };
  res.json({ token: signToken(user), user });
});

router.get('/auth/me', requireAuth, (req, res) => {
  const u = db.prepare('SELECT id,name,email,role FROM users WHERE id = ?').get(req.user.id);
  if (!u) return res.status(401).json({ error: 'Account no longer exists' });
  res.json(u);
});

// Logout is client-side with JWT; this endpoint exists so the flow is explicit in the API.
router.post('/auth/logout', requireAuth, (_req, res) => res.json({ ok: true }));

/* ---------- CATEGORIES ---------- */
router.get('/categories', requireAuth, (_req, res) =>
  res.json(db.prepare('SELECT * FROM categories ORDER BY name').all()));

router.post('/categories', requireAuth, staff, (req, res) => {
  const name = str(req.body.name);
  if (!name) return bad(res, 'Category name is required');
  try {
    const info = db.prepare('INSERT INTO categories (name) VALUES (?)').run(name);
    res.status(201).json({ id: info.lastInsertRowid, name });
  } catch { bad(res, 'Category already exists'); }
});

router.delete('/categories/:id', requireAuth, adminOnly, (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

/* ---------- AUTHORS ---------- */
router.get('/authors', requireAuth, (_req, res) =>
  res.json(db.prepare(`
    SELECT a.*, COUNT(ba.book_id) AS book_count
    FROM authors a LEFT JOIN book_authors ba ON ba.author_id = a.id
    GROUP BY a.id ORDER BY a.name`).all()));

function authorInput(body) {
  const name = str(body.name);
  const birth_year = int(body.birth_year);
  if (name.length < 2) return { error: 'Author name must be at least 2 characters' };
  if (birth_year != null && (Number.isNaN(birth_year) || birth_year < 1 || birth_year > new Date().getFullYear()))
    return { error: 'Birth year is not valid' };
  return { name, birth_year, country: str(body.country) || null };
}

router.post('/authors', requireAuth, staff, (req, res) => {
  const a = authorInput(req.body);
  if (a.error) return bad(res, a.error);
  const info = db.prepare('INSERT INTO authors (name,birth_year,country) VALUES (?,?,?)').run(a.name, a.birth_year, a.country);
  res.status(201).json({ id: info.lastInsertRowid, ...a });
});

router.put('/authors/:id', requireAuth, staff, (req, res) => {
  const a = authorInput(req.body);
  if (a.error) return bad(res, a.error);
  const info = db.prepare('UPDATE authors SET name=?, birth_year=?, country=? WHERE id=?').run(a.name, a.birth_year, a.country, req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Author not found' });
  res.json({ id: Number(req.params.id), ...a });
});

router.delete('/authors/:id', requireAuth, staff, (req, res) => {
  const info = db.prepare('DELETE FROM authors WHERE id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Author not found' });
  res.json({ ok: true });
});

/* ---------- BOOKS ---------- */
const booksQuery = `
  SELECT b.id, b.title, b.isbn, b.year, b.copies_total, b.category_id,
         c.name AS category,
         (SELECT GROUP_CONCAT(a.name, ', ') FROM book_authors ba JOIN authors a ON a.id = ba.author_id WHERE ba.book_id = b.id) AS authors,
         (SELECT GROUP_CONCAT(ba.author_id) FROM book_authors ba WHERE ba.book_id = b.id) AS author_ids,
         b.copies_total - (SELECT COUNT(*) FROM loans l WHERE l.book_id = b.id AND l.returned_at IS NULL) AS copies_available
  FROM books b LEFT JOIN categories c ON c.id = b.category_id`;

const shapeBook = (r) => ({ ...r, author_ids: r.author_ids ? r.author_ids.split(',').map(Number) : [] });

router.get('/books', requireAuth, (req, res) => {
  const q = `%${str(req.query.q)}%`;
  const rows = db
    .prepare(`${booksQuery} WHERE b.title LIKE ? OR b.isbn LIKE ? OR authors LIKE ? ORDER BY b.title`)
    .all(q, q, q);
  res.json(rows.map(shapeBook));
});

router.get('/books/:id', requireAuth, (req, res) => {
  const r = db.prepare(`${booksQuery} WHERE b.id = ?`).get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Book not found' });
  res.json(shapeBook(r));
});

function bookInput(body) {
  const title = str(body.title);
  const isbn = str(body.isbn) || null;
  const year = int(body.year);
  const copies_total = int(body.copies_total ?? 1);
  const category_id = int(body.category_id);
  const author_ids = Array.isArray(body.author_ids) ? body.author_ids.map(Number).filter(Number.isInteger) : [];
  if (title.length < 1) return { error: 'Title is required' };
  if (year != null && (Number.isNaN(year) || year < 0 || year > new Date().getFullYear() + 1)) return { error: 'Year is not valid' };
  if (copies_total == null || Number.isNaN(copies_total) || copies_total < 0) return { error: 'Copies must be 0 or more' };
  if (author_ids.length === 0) return { error: 'Choose at least one author' };
  return { title, isbn, year, copies_total, category_id: Number.isNaN(category_id) ? null : category_id, author_ids };
}

const saveBook = db.transaction((id, b) => {
  let bookId = id;
  if (id) {
    db.prepare('UPDATE books SET title=?, isbn=?, year=?, copies_total=?, category_id=? WHERE id=?')
      .run(b.title, b.isbn, b.year, b.copies_total, b.category_id, id);
    db.prepare('DELETE FROM book_authors WHERE book_id = ?').run(id);
  } else {
    bookId = db.prepare('INSERT INTO books (title,isbn,year,copies_total,category_id) VALUES (?,?,?,?,?)')
      .run(b.title, b.isbn, b.year, b.copies_total, b.category_id).lastInsertRowid;
  }
  const ins = db.prepare('INSERT INTO book_authors (book_id, author_id) VALUES (?,?)');
  b.author_ids.forEach((a) => ins.run(bookId, a));
  return bookId;
});

router.post('/books', requireAuth, staff, (req, res) => {
  const b = bookInput(req.body);
  if (b.error) return bad(res, b.error);
  try {
    const id = saveBook(null, b);
    res.status(201).json(shapeBook(db.prepare(`${booksQuery} WHERE b.id = ?`).get(id)));
  } catch (e) {
    bad(res, /UNIQUE/.test(e.message) ? 'ISBN already exists' : 'Could not save book (check author and category)');
  }
});

router.put('/books/:id', requireAuth, staff, (req, res) => {
  const b = bookInput(req.body);
  if (b.error) return bad(res, b.error);
  if (!db.prepare('SELECT 1 FROM books WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Book not found' });
  const active = db.prepare('SELECT COUNT(*) AS count FROM loans WHERE book_id=? AND returned_at IS NULL').get(req.params.id).count;
  if (b.copies_total < active) return res.status(409).json({ error: `Cannot reduce copies below ${active} currently on loan` });
  try {
    saveBook(Number(req.params.id), b);
    res.json(shapeBook(db.prepare(`${booksQuery} WHERE b.id = ?`).get(req.params.id)));
  } catch (e) {
    bad(res, /UNIQUE/.test(e.message) ? 'ISBN already exists' : 'Could not save book (check author and category)');
  }
});

router.delete('/books/:id', requireAuth, staff, (req, res) => {
  if (db.prepare('SELECT 1 FROM loans WHERE book_id=? AND returned_at IS NULL').get(req.params.id))
    return res.status(409).json({ error: 'Return all active loans before deleting this book' });
  const info = db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Book not found' });
  res.json({ ok: true });
});

/* ---------- LOANS ---------- */
const loansQuery = `
  SELECT l.id, l.book_id, l.user_id, l.loaned_at, l.due_at, l.returned_at,
         b.title AS book_title, u.name AS user_name,
         CASE WHEN l.returned_at IS NULL AND l.due_at < date('now') THEN 1 ELSE 0 END AS overdue
  FROM loans l JOIN books b ON b.id = l.book_id JOIN users u ON u.id = l.user_id`;

router.get('/loans', requireAuth, (req, res) => {
  const isStaff = req.user.role !== 'member';
  const rows = isStaff
    ? db.prepare(`${loansQuery} ORDER BY l.returned_at IS NOT NULL, l.due_at`).all()
    : db.prepare(`${loansQuery} WHERE l.user_id = ? ORDER BY l.returned_at IS NOT NULL, l.due_at`).all(req.user.id);
  res.json(rows);
});

// Librarians/admins loan to any member; members can only borrow for themselves.
router.post('/loans', requireAuth, (req, res) => {
  const bookId = int(req.body.book_id);
  const isStaff = req.user.role !== 'member';
  const userId = isStaff ? int(req.body.user_id) : req.user.id;
  if (!bookId || !userId) return bad(res, 'Book and member are required');
  const user = db.prepare("SELECT id FROM users WHERE id = ? AND role='member'").get(userId);
  if (!user) return bad(res, 'Member not found');

  const create = db.transaction(() => {
    const book = db.prepare(`${booksQuery} WHERE b.id = ?`).get(bookId);
    if (!book) return { status: 404, error: 'Book not found' };
    if (book.copies_available <= 0) return { status: 409, error: 'No copies left to loan' };
    const dup = db.prepare('SELECT 1 FROM loans WHERE book_id=? AND user_id=? AND returned_at IS NULL').get(bookId, userId);
    if (dup) return { status: 409, error: 'This member already has this book' };
    const id = db.prepare('INSERT INTO loans (book_id,user_id,loaned_at,due_at) VALUES (?,?,?,?)')
      .run(bookId, userId, today(), plusDays(14)).lastInsertRowid;
    return { status: 201, loan: db.prepare(`${loansQuery} WHERE l.id = ?`).get(id) };
  });
  const out = create();
  if (out.error) return res.status(out.status).json({ error: out.error });
  res.status(201).json(out.loan);
});

// Record a return (staff only)
router.put('/loans/:id/return', requireAuth, staff, (req, res) => {
  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.id);
  if (!loan) return res.status(404).json({ error: 'Loan not found' });
  if (loan.returned_at) return res.status(409).json({ error: 'Already returned' });
  db.prepare('UPDATE loans SET returned_at = ? WHERE id = ?').run(today(), loan.id);
  res.json(db.prepare(`${loansQuery} WHERE l.id = ?`).get(loan.id));
});

// Extend due date by 7 days (update), staff only
router.put('/loans/:id', requireAuth, staff, (req, res) => {
  const due = str(req.body.due_at);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return bad(res, 'Due date must be YYYY-MM-DD');
  const parsed = new Date(`${due}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10) !== due) return bad(res, 'Choose a real calendar date');
  const loan = db.prepare('SELECT loaned_at FROM loans WHERE id=?').get(req.params.id);
  if (loan && due < loan.loaned_at) return bad(res, 'Due date cannot be before the loan date');
  const info = db.prepare('UPDATE loans SET due_at = ? WHERE id = ? AND returned_at IS NULL').run(due, req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Active loan not found' });
  res.json(db.prepare(`${loansQuery} WHERE l.id = ?`).get(req.params.id));
});

router.delete('/loans/:id', requireAuth, adminOnly, (req, res) => {
  const info = db.prepare('DELETE FROM loans WHERE id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Loan not found' });
  res.json({ ok: true });
});

/* ---------- USERS (admin) ---------- */
router.get('/users', requireAuth, staff, (_req, res) =>
  res.json(db.prepare('SELECT id,name,email,role,created_at FROM users ORDER BY name').all()));

router.put('/users/:id', requireAuth, adminOnly, (req, res) => {
  const role = str(req.body.role);
  if (!['admin', 'librarian', 'member'].includes(role)) return bad(res, 'Invalid role');
  if (Number(req.params.id) === req.user.id) return bad(res, 'You cannot change your own role');
  const info = db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'User not found' });
  res.json({ ok: true });
});

router.delete('/users/:id', requireAuth, adminOnly, (req, res) => {
  if (Number(req.params.id) === req.user.id) return bad(res, 'You cannot delete yourself');
  const info = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'User not found' });
  res.json({ ok: true });
});

export default router;
