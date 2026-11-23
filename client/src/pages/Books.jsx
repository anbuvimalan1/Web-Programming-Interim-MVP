import { useEffect, useState } from 'react';
import { api, getUser } from '../api.js';

const empty = { title: '', isbn: '', year: '', copies_total: 1, category_id: '', author_ids: [] };

export default function Books() {
  const user = getUser();
  const isStaff = user.role !== 'member';
  const [books, setBooks] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null); // null | book form object
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async (search = q) => {
    setLoading(true);
    try {
      setBooks(await api(`/books?q=${encodeURIComponent(search)}`));
      setError('');
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  useEffect(() => {
    load('');
    api('/categories').then(setCategories).catch(() => {});
    if (isStaff) api('/authors').then(setAuthors).catch(() => {});
  }, []);

  async function save(e) {
    e.preventDefault();
    setError('');
    const body = { ...editing, author_ids: editing.author_ids.map(Number) };
    try {
      await api(editing.id ? `/books/${editing.id}` : '/books', { method: editing.id ? 'PUT' : 'POST', body });
      setEditing(null);
      setNotice(editing.id ? 'Book updated.' : 'Book added.');
      load();
    } catch (err) { setError(err.message); }
  }

  async function remove(b) {
    if (!window.confirm(`Delete "${b.title}"? This also removes its loan records.`)) return;
    try {
      await api(`/books/${b.id}`, { method: 'DELETE' });
      setNotice('Book deleted.');
      load();
    } catch (err) { setError(err.message); }
  }

  async function borrow(b) {
    try {
      await api('/loans', { method: 'POST', body: { book_id: b.id } });
      setNotice(`You borrowed "${b.title}". It is due in 14 days.`);
      load();
    } catch (err) { setError(err.message); }
  }

  return (
    <>
      <div className="head">
        <h1>Books</h1>
        {isStaff && <button className="btn" onClick={() => { setEditing({ ...empty }); setError(''); }}>Add book</button>}
      </div>

      <form className="search" onSubmit={(e) => { e.preventDefault(); load(); }}>
        <input placeholder="Search title, author or ISBN" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn ghost">Search</button>
      </form>

      {notice && <p className="notice" onClick={() => setNotice('')}>{notice}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      {editing && (
        <form className="panel" onSubmit={save}>
          <h2>{editing.id ? 'Edit book' : 'New book'}</h2>
          <div className="grid">
            <label>Title<input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} required /></label>
            <label>ISBN<input value={editing.isbn || ''} onChange={(e) => setEditing({ ...editing, isbn: e.target.value })} /></label>
            <label>Year<input type="number" value={editing.year ?? ''} onChange={(e) => setEditing({ ...editing, year: e.target.value })} /></label>
            <label>Copies<input type="number" min="0" value={editing.copies_total} onChange={(e) => setEditing({ ...editing, copies_total: e.target.value })} required /></label>
            <label>Category
              <select value={editing.category_id ?? ''} onChange={(e) => setEditing({ ...editing, category_id: e.target.value })}>
                <option value="">None</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label>Authors (hold Ctrl or Cmd to pick several)
              <select multiple size="5" value={editing.author_ids.map(String)}
                onChange={(e) => setEditing({ ...editing, author_ids: [...e.target.selectedOptions].map((o) => o.value) })}>
                {authors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>
          </div>
          <div className="actions">
            <button className="btn">Save</button>
            <button type="button" className="btn ghost" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? <p className="muted">Loading books…</p> : books.length === 0 ? (
        <p className="muted">No books match your search.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Title</th><th>Authors</th><th>Category</th><th>Year</th><th>Available</th><th></th></tr>
            </thead>
            <tbody>
              {books.map((b) => (
                <tr key={b.id}>
                  <td>{b.title}<div className="muted small">{b.isbn}</div></td>
                  <td>{b.authors}</td>
                  <td>{b.category || '—'}</td>
                  <td>{b.year || '—'}</td>
                  <td>{b.copies_available > 0 ? `${b.copies_available} of ${b.copies_total}` : <span className="tag bad">None left</span>}</td>
                  <td className="row-actions">
                    {user.role === 'member' && (
                      <button className="btn small" disabled={b.copies_available <= 0} onClick={() => borrow(b)}>Borrow</button>
                    )}
                    {isStaff && (
                      <>
                        <button className="btn ghost small" onClick={() => { setEditing({ ...b }); setError(''); }}>Edit</button>
                        <button className="btn danger small" onClick={() => remove(b)}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
