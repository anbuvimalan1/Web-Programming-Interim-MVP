import bcrypt from 'bcrypt';
import { db, runSchema } from './db.js';

runSchema();

const hash = (p) => bcrypt.hashSync(p, 10);

const users = [
  ['Admin User', 'admin@library.test', 'Admin123!', 'admin'],
  ['Lela Librarian', 'librarian@library.test', 'Librarian123!', 'librarian'],
  ['Mari Member', 'member@library.test', 'Member123!', 'member'],
  ['Giorgi Beridze', 'giorgi@library.test', 'Member123!', 'member'],
];
const insUser = db.prepare('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)');
for (const [n, e, p, r] of users) insUser.run(n, e, hash(p), r);

const categories = ['Fiction', 'History', 'Science', 'Poetry', 'Philosophy'];
const insCat = db.prepare('INSERT INTO categories (name) VALUES (?)');
categories.forEach((c) => insCat.run(c));

const authors = [
  ['Ilia Chavchavadze', 1837, 'Georgia'],
  ['Vazha-Pshavela', 1861, 'Georgia'],
  ['Mikheil Javakhishvili', 1880, 'Georgia'],
  ['Konstantine Gamsakhurdia', 1893, 'Georgia'],
  ['Ursula K. Le Guin', 1929, 'USA'],
  ['Carl Sagan', 1934, 'USA'],
  ['Yuval Noah Harari', 1976, 'Israel'],
  ['Hannah Arendt', 1906, 'Germany'],
  ['Terry Pratchett', 1948, 'UK'],
  ['Neil Gaiman', 1960, 'UK'],
];
const insAuth = db.prepare('INSERT INTO authors (name,birth_year,country) VALUES (?,?,?)');
authors.forEach((a) => insAuth.run(...a));

// title, isbn, year, copies, category_id, [author ids]
const books = [
  ['The Hermit', '9789941000011', 1883, 3, 1, [1]],
  ['Host and Guest', '9789941000028', 1893, 2, 4, [2]],
  ['Jaqo\'s Dispossessed', '9789941000035', 1924, 2, 1, [3]],
  ['The Left Hand of Darkness', '9780441478125', 1969, 3, 1, [5]],
  ['The Dispossessed', '9780061054884', 1974, 1, 1, [5]],
  ['Cosmos', '9780345539434', 1980, 2, 3, [6]],
  ['Pale Blue Dot', '9780345376596', 1994, 2, 3, [6]],
  ['Sapiens', '9780062316097', 2011, 4, 2, [7]],
  ['The Origins of Totalitarianism', '9780156701532', 1951, 1, 5, [8]],
  ['The Human Condition', '9780226025988', 1958, 2, 5, [8]],
  ['Good Omens', '9780060853983', 1990, 2, 1, [9, 10]],
];
const insBook = db.prepare('INSERT INTO books (title,isbn,year,copies_total,category_id) VALUES (?,?,?,?,?)');
const insBA = db.prepare('INSERT INTO book_authors (book_id,author_id) VALUES (?,?)');
for (const [t, i, y, c, cat, aids] of books) {
  const id = insBook.run(t, i, y, c, cat).lastInsertRowid;
  aids.forEach((a) => insBA.run(id, a));
}

const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
const insLoan = db.prepare('INSERT INTO loans (book_id,user_id,loaned_at,due_at,returned_at) VALUES (?,?,?,?,?)');
insLoan.run(4, 3, day(-30), day(-16), null); // overdue
insLoan.run(8, 3, day(-5), day(9), null); // active
insLoan.run(6, 4, day(-40), day(-26), day(-27)); // returned
insLoan.run(5, 4, day(-2), day(12), null); // active, last copy

console.log('Seeded. Test logins:');
users.forEach(([, e, p, r]) => console.log(`  ${r.padEnd(10)} ${e}  /  ${p}`));
