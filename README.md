# Folio | Library Management

Web Programming interim MVP, Team 01. Active contributors are Nikoloz Bakuradze and Anbu Vimalan Francis.

Members search the catalogue, open a title and borrow an available copy. Library staff maintain books, authors and circulation records. The React client calls an Express API backed by SQLite. The API verifies the current role for each authenticated request and stores bcrypt password hashes.

## Design

[Editable wireframes, finished screens and style guide](https://www.figma.com/design/oMu2BvvAvMqskeTRnWHlDn). The button and text field are adapted from [Figma's Simple Design System](https://www.figma.com/community/file/1380235722331273046/simple-design-system). Folio uses Lora for its wordmark and Source Sans 3 for the interface. A dark blue palette and cyan actions frame a searchable bookshelf. The book grid reflows on small screens and staff tables scroll within their panels. Font licenses are included in client/public/fonts.

Edition covers are from [Open Library](https://openlibrary.org/dev/docs/api/covers). The sign-in photo is [the Library of Congress Main Reading Room by Shawn Miller](https://commons.wikimedia.org/wiki/File:20171201SM007-Pano.jpg), released under CC0.

## Run locally

Install Node.js 24 or later. On Windows extract the project, double-click START.cmd and open http://localhost:5173 when Vite reports ready. The first launch downloads dependencies, generates a local signing secret and seeds the database. Later launches preserve changes.

On macOS or Linux run these commands from the project root.

```sh
npm ci --prefix server
npm ci --prefix client
node scripts/setup.mjs
node scripts/start.mjs
```

Run the isolated API checks with `npm test --prefix server`. Build the client with `npm run build --prefix client`.

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

