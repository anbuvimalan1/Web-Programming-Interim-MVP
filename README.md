# Library Management System

Web Programming, Ilia State University, Fall 2026. Team 01: Nikoloz Bakuradze, Anbu Vimalan Francis, Merab Enukidze.

A library app where librarians manage the catalogue and loans, and members browse and borrow books.

**Figma:** _paste the view link here_

## Stack

- Frontend: React (Vite) + React Router
- Backend: Express.js REST API (Node.js)
- Database: SQLite (`better-sqlite3`), parameterized queries only
- Auth: JWT, passwords hashed with bcrypt, roles checked on the server

## How to run

Requires Node.js 20+.

```bash
# 1. API
cd server
npm install
cp .env.example .env
npm run seed      # creates library.db from schema.sql and inserts test data
npm start         # http://localhost:4000

# 2. Frontend (second terminal)
cd client
npm install
cp .env.example .env
npm run dev       # http://localhost:5173
```

`npm run seed` can be run again at any time to reset the database to the demo state.

## Test logins

| Role | Email | Password |
|---|---|---|
| Admin | admin@library.test | Admin123! |
| Librarian | librarian@library.test | Librarian123! |
| Member | member@library.test | Member123! |

## Roles

| Action | Member | Librarian | Admin |
|---|---|---|---|
| Browse and search books | yes | yes | yes |
| Borrow a book for themselves | yes | | |
| See own loans | yes | | |
| Add, edit, delete books and authors | | yes | yes |
| Record loans and returns, extend due date, see all loans | | yes | yes |
| List users | | yes | yes |
| Change roles, delete users, delete loans | | | yes |

Public registration always creates a `member`. Only an admin can promote someone.

## Data model

`users`, `categories`, `authors`, `books`, `book_authors` (many to many Book and Author), `loans`.
One to many: category to books, book to loans, user to loans. See `server/schema.sql`.

## Business rules (enforced in the API)

- A book cannot be loaned when no copies are left (HTTP 409).
- A member cannot hold two active loans of the same book.
- Loans last 14 days; overdue loans are highlighted.
- Server returns 401 without a login and 403 when the role is not allowed. Try it: log in as the member and call `POST /api/books` (the UI hides the button, the server still refuses).

## Structure

```
server/   schema.sql, src/ (index, routes, auth, db, seed)
client/   src/ (pages, api helper, styles.css)
```

## Team split

- Member A: authentication and roles (`server/src/auth.js`, auth routes, `Login.jsx`, `Users.jsx`)
- Member B: database and CRUD (`schema.sql`, `seed.js`, books/authors/loans routes)
- Member C: Figma design and interface (`client/src`, `styles.css`)
