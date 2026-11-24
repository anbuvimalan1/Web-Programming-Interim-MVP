import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, getUser } from '../api.js';
import BookCover from '../BookCover.jsx';

const empty = { title: '', isbn: '', year: '', copies_total: 1, category_id: '', author_ids: [] };

export default function Books() {
  const user = getUser();
  const isStaff = user.role !== 'member';
  const [books, setBooks] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [editing, setEditing] = useState(null); // null | book form object
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [params, setParams] = useSearchParams();

  const load = async (search = q) => {
    setLoading(true);
    try {
      const query = search.trim();
      setBooks(await api(`/books?q=${encodeURIComponent(query)}`));
      setActiveQuery(query);
      setError('');
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  useEffect(() => {
    load('');
    api('/categories').then(setCategories).catch(() => {});
    if (isStaff) api('/authors').then(setAuthors).catch(() => {});
  }, []);

  useEffect(() => {
    const id = params.get('edit');
    if (id && isStaff) api(`/books/${id}`).then(setEditing).catch(e => setError(e.message));
  }, [params]);

  async function save(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const body = { ...editing, author_ids: editing.author_ids.map(Number) };
    try {
      await api(editing.id ? `/books/${editing.id}` : '/books', { method: editing.id ? 'PUT' : 'POST', body });
      setEditing(null);
      setParams({});
      setNotice(editing.id ? 'Book updated.' : 'Book added.');
      load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <>
      {editing ? (
        <>
          <p className="eyebrow">Catalogue / {editing.id ? 'Edit record' : 'New record'}</p>
          <div className="head"><h1>{editing.id ? 'Edit book' : 'Add a book'}</h1></div>
        </>
      ) : (
        <section className="catalogue-intro" aria-labelledby="catalogue-title">
          <h1 id="catalogue-title">Explore the catalogue</h1>
          <form className="search" onSubmit={(e) => { e.preventDefault(); load(); }}>
            <label className="sr-only" htmlFor="book-search">Search the catalogue</label>
            <input id="book-search" type="search" placeholder="Search by title, author or ISBN" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn">Search</button>
          </form>
        </section>
      )}

      {notice && <p className="notice" onClick={() => setNotice('')}>{notice}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      {editing && (
        <div className="form-layout"><form className="panel book-form" onSubmit={save}>
          <div className="grid">
            <label className="full">Title<input placeholder="Enter the book title" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} required /></label>
            <label>ISBN<input placeholder="e.g. 9780345539434" value={editing.isbn || ''} onChange={(e) => setEditing({ ...editing, isbn: e.target.value })} /></label>
            <label>Publication year<input placeholder="e.g. 1980" type="number" value={editing.year ?? ''} onChange={(e) => setEditing({ ...editing, year: e.target.value })} /></label>
            <label>Total copies<input type="number" min="0" value={editing.copies_total} onChange={(e) => setEditing({ ...editing, copies_total: e.target.value })} required /></label>
            <label>Category
              <select value={editing.category_id ?? ''} onChange={(e) => setEditing({ ...editing, category_id: e.target.value })}>
                <option value="">Choose a category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="full">Authors (hold Ctrl or Cmd to pick several)
              <select multiple size="5" value={editing.author_ids.map(String)}
                onChange={(e) => setEditing({ ...editing, author_ids: [...e.target.selectedOptions].map((o) => o.value) })}>
                {authors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>
          </div>
          <div className="actions">
            <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save book'}</button>
            <button type="button" className="btn ghost" onClick={() => {setEditing(null);setParams({});}}>Cancel</button>
          </div>
        </form><aside className="form-note"><h2>A complete record</h2><p>Use the edition’s ISBN and publication year.</p><p>Copies includes both available books and those currently on loan.</p><p>Add missing authors on the Authors page first.</p></aside></div>
      )}

      {!editing && (
        <section aria-labelledby="collection-title">
          <div className="collection-head">
            <h2 id="collection-title">{activeQuery ? `Results for “${activeQuery}”` : 'Books'}</h2>
            {isStaff && <button className="btn ghost" onClick={() => { setEditing({ ...empty }); setError(''); }}>Add book</button>}
          </div>
          {loading ? <p className="muted" role="status">Loading books…</p> : books.length === 0 ? (
            <p className="empty-state">No books match your search.</p>
          ) : (
            <ul className={activeQuery ? 'book-list results' : 'book-list'}>
              {books.map((book) => (
                <li className="book-card" key={book.id}>
                  <Link className="book-link" to={`/books/${book.id}`}>
                    <BookCover book={book} compact={Boolean(activeQuery)} />
                    <div className="book-meta">
                      <h3>{book.title}</h3>
                      {book.authors && <p className="muted">{book.authors}</p>}
                      <div className="book-facts">
                        <span>{[book.category, book.year].filter(Boolean).join(' · ')}</span>
                        {activeQuery && book.isbn && <span>ISBN {book.isbn}</span>}
                        <span className={book.copies_available > 0 ? 'availability-text' : 'availability-text unavailable'}>
                          {book.copies_available > 0 ? `${book.copies_available} of ${book.copies_total} available` : 'None left'}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
