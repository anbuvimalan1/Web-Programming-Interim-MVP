import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
  const [busy, setBusy] = useState(false);
  const [params, setParams] = useSearchParams();

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
      <p className="eyebrow">{editing ? 'Catalogue / New record' : 'The collection'}</p>
      <div className="head">
        <div><h1>{editing ? (editing.id ? 'Edit book' : 'Add a book') : 'Books'}</h1><p className="subtitle">{editing ? 'Create a catalogue record for your collection.' : 'Browse the catalogue and manage available copies.'}</p></div>
        {isStaff && !editing && <button className="btn" onClick={() => { setEditing({ ...empty }); setError(''); }}>Add book</button>}
      </div>

      {!editing && <form className="search" onSubmit={(e) => { e.preventDefault(); load(); }}>
        <label>Search the catalogue<input placeholder="Search title, author or ISBN" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <button className="btn">Search</button>
      </form>}

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

      {!editing && (loading ? <p className="muted" role="status">Loading books…</p> : books.length === 0 ? (
        <p className="muted">No books match your search.</p>
      ) : (
        <div className="table-wrap">
          <table className="catalogue-table">
            <colgroup>{[330,230,140,100,130,110].map((width,i)=><col key={i} style={{width}} />)}</colgroup>
            <thead>
              <tr><th>Title / ISBN</th><th>Author</th><th>Category</th><th>Year</th><th>Available</th><th><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {books.map((b) => (
                <tr key={b.id}>
                  <td><Link className="book-title" to={`/books/${b.id}`}>{b.title}</Link><div className="muted small">{b.isbn}</div></td>
                  <td>{b.authors}</td>
                  <td>{b.category || '—'}</td>
                  <td>{b.year || '—'}</td>
                  <td>{b.copies_available > 0 ? `${b.copies_available} of ${b.copies_total}` : <span className="tag bad">None left</span>}</td>
                  <td className="row-actions">
                    <Link to={`/books/${b.id}`}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
}
