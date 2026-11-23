import { useEffect, useState } from 'react';
import { api, getUser } from '../api.js';

export default function Loans() {
  const user = getUser();
  const isStaff = user.role !== 'member';
  const [loans, setLoans] = useState([]);
  const [books, setBooks] = useState([]);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({ book_id: '', user_id: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try { setLoans(await api('/loans')); setError(''); } catch (e) { setError(e.message); }
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (isStaff) {
      api('/books').then(setBooks).catch(() => {});
      api('/users').then((u) => setMembers(u.filter((x) => x.role === 'member'))).catch(() => {});
    }
  }, []);

  async function create(e) {
    e.preventDefault();
    setError('');
    try {
      await api('/loans', { method: 'POST', body: form });
      setForm({ book_id: '', user_id: '' });
      load();
      api('/books').then(setBooks);
    } catch (err) { setError(err.message); }
  }

  async function giveBack(l) {
    try { await api(`/loans/${l.id}/return`, { method: 'PUT' }); load(); api('/books').then(setBooks); } catch (err) { setError(err.message); }
  }

  async function extend(l) {
    const d = new Date(l.due_at);
    d.setDate(d.getDate() + 7);
    try { await api(`/loans/${l.id}`, { method: 'PUT', body: { due_at: d.toISOString().slice(0, 10) } }); load(); } catch (err) { setError(err.message); }
  }

  async function remove(l) {
    if (!window.confirm('Delete this loan record permanently?')) return;
    try { await api(`/loans/${l.id}`, { method: 'DELETE' }); load(); } catch (err) { setError(err.message); }
  }

  return (
    <>
      <div className="head"><h1>{isStaff ? 'Loans' : 'My loans'}</h1></div>
      {error && <p className="error" role="alert">{error}</p>}

      {isStaff && (
        <form className="panel inline" onSubmit={create}>
          <h2>Record a loan</h2>
          <select value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} required>
            <option value="">Member…</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select value={form.book_id} onChange={(e) => setForm({ ...form, book_id: e.target.value })} required>
            <option value="">Book…</option>
            {books.map((b) => (
              <option key={b.id} value={b.id} disabled={b.copies_available <= 0}>
                {b.title} ({b.copies_available} left)
              </option>
            ))}
          </select>
          <button className="btn">Loan for 14 days</button>
        </form>
      )}

      {loading ? <p className="muted">Loading loans…</p> : loans.length === 0 ? <p className="muted">No loans yet.</p> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Book</th>{isStaff && <th>Member</th>}<th>Loaned</th><th>Due</th><th>Status</th>{isStaff && <th></th>}</tr>
            </thead>
            <tbody>
              {loans.map((l) => (
                <tr key={l.id} className={l.overdue ? 'overdue' : ''}>
                  <td>{l.book_title}</td>
                  {isStaff && <td>{l.user_name}</td>}
                  <td>{l.loaned_at}</td>
                  <td>{l.due_at}</td>
                  <td>
                    {l.returned_at ? <span className="tag">Returned {l.returned_at}</span>
                      : l.overdue ? <span className="tag bad">Overdue</span>
                      : <span className="tag ok">On loan</span>}
                  </td>
                  {isStaff && (
                    <td className="row-actions">
                      {!l.returned_at && <button className="btn small" onClick={() => giveBack(l)}>Return</button>}
                      {!l.returned_at && <button className="btn ghost small" onClick={() => extend(l)}>+7 days</button>}
                      {user.role === 'admin' && <button className="btn danger small" onClick={() => remove(l)}>Delete</button>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
