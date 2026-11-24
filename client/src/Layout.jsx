import { NavLink, useNavigate } from 'react-router-dom';
import { api, clearSession, getUser } from './api.js';

export default function Layout({ children }) {
  const user = getUser();
  const nav = useNavigate();
  const isStaff = user.role !== 'member';

  async function logout() {
    try { await api('/auth/logout', { method: 'POST' }); } catch { /* token may already be invalid */ }
    clearSession();
    nav('/login');
  }

  return (
    <div className="shell">
      <header className="topbar">
        <NavLink className="brand" to="/books" aria-label="Folio, books">Folio<span>.</span></NavLink>
        <nav aria-label="Main navigation">
          <NavLink to="/books">Books</NavLink>
          {isStaff && <NavLink to="/authors">Authors</NavLink>}
          <NavLink to="/loans">{isStaff ? 'Loans' : 'My loans'}</NavLink>
          {user.role === 'admin' && <NavLink to="/users">Users</NavLink>}
        </nav>
        <div className="who">
          <span className="account-name">{user.name} <small className="role">{user.role}</small></span>
          <button className="btn ghost small" onClick={logout}>Log out</button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
