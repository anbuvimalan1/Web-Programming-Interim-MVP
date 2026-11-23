import { useEffect, useState } from 'react';
import { api } from '../api.js';

const empty = { name: '', birth_year: '', country: '' };

export default function Authors() {
  const [authors, setAuthors] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try { setAuthors(await api('/authors')); } catch (e) { setError(e.message); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    setError('');
    try {
      await api(editing.id ? `/authors/${editing.id}` : '/authors', { method: editing.id ? 'PUT' : 'POST', body: editing });
      setEditing(null);
      load();
    } catch (err) { setError(err.message); }
  }

  async function remove(a) {
    if (!window.confirm(`Delete author "${a.name}"? Books keep existing but lose this author link.`)) return;
    try { await api(`/authors/${a.id}`, { method: 'DELETE' }); load(); } catch (err) { setError(err.message); }
  }

  return (
    <>
      <div className="head">
        <h1>Authors</h1>
        <button className="btn" onClick={() => { setEditing({ ...empty }); setError(''); }}>Add author</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}

      {editing && (
        <form className="panel" onSubmit={save}>
          <h2>{editing.id ? 'Edit author' : 'New author'}</h2>
          <div className="grid">
            <label>Name<input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required /></label>
            <label>Birth year<input type="number" value={editing.birth_year ?? ''} onChange={(e) => setEditing({ ...editing, birth_year: e.target.value })} /></label>
            <label>Country<input value={editing.country ?? ''} onChange={(e) => setEditing({ ...editing, country: e.target.value })} /></label>
          </div>
          <div className="actions">
            <button className="btn">Save</button>
            <button type="button" className="btn ghost" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? <p className="muted">Loading authors…</p> : authors.length === 0 ? <p className="muted">No authors yet.</p> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Born</th><th>Country</th><th>Books</th><th></th></tr></thead>
            <tbody>
              {authors.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td><td>{a.birth_year || '—'}</td><td>{a.country || '—'}</td><td>{a.book_count}</td>
                  <td className="row-actions">
                    <button className="btn ghost small" onClick={() => { setEditing({ ...a }); setError(''); }}>Edit</button>
                    <button className="btn danger small" onClick={() => remove(a)}>Delete</button>
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
