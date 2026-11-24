import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, getUser } from '../api.js';

export default function BookDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [book, setBook] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const staff = getUser().role !== 'member';
  useEffect(() => { api(`/books/${id}`).then(setBook).catch(e => setError(e.message)); }, [id]);
  async function remove() {
    if (!window.confirm(`Delete "${book.title}"? Its returned-loan history will also be removed. Active loans must be returned first.`)) return;
    setBusy(true);
    try { await api(`/books/${id}`, { method: 'DELETE' }); nav('/books'); }
    catch(e) { setError(e.message); } finally { setBusy(false); }
  }
  async function borrow() {
    setBusy(true); setError('');
    try { await api('/loans', { method: 'POST', body: { book_id: book.id } }); setBook(await api(`/books/${id}`)); setNotice('Book borrowed for 14 days. See My loans for the due date.'); }
    catch(e) { setError(e.message); } finally { setBusy(false); }
  }
  return <>
    <p className="eyebrow"><Link to="/books">Catalogue</Link> / Book record</p>
    {error && <p role="alert" className="error">{error}</p>}
    {!book ? <p role="status">{error ? 'The book could not be loaded.' : 'Loading book…'}</p> : <>
      <div className="head"><div><h1>{book.title}</h1><p className="subtitle">{book.authors}</p></div></div>
      {notice && <p role="status" className="notice">{notice}</p>}
      <div className="detail-layout"><section className="panel record"><h2>Catalogue record</h2><dl>
        {Object.entries({'ISBN':book.isbn || 'Not recorded','Publication year':book.year || 'Not recorded','Category':book.category || 'Uncategorised','Authors':book.authors,'Total copies':book.copies_total}).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl></section><aside className="detail-actions">
        {staff ? <><Link className="btn" to={`/books?edit=${book.id}`}>Edit book</Link><button className="btn danger" disabled={busy} onClick={remove}>Delete book</button></> : <button className="btn" disabled={busy || book.copies_available <= 0} onClick={borrow}>{busy ? 'Borrowing…' : 'Borrow book'}</button>}
        <section className="panel availability"><p className="eyebrow">{book.copies_available > 0 ? 'Available to borrow' : 'Currently unavailable'}</p><h2>{book.copies_available} of {book.copies_total} copies</h2><p>Members can borrow a copy for 14 days.<br/>Librarians record loans and returns.</p></section>
      </aside></div>
    </>}
  </>;
}
