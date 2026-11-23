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
        <NavLink className="brand" to="/books">Folio</NavLink>
        <span className="brand-note">Library catalogue</span>
        <nav aria-label="Main navigation">
          <NavLink to="/books">Books</NavLink>
          {isStaff && <NavLink to="/authors">Authors</NavLink>}
          <NavLink to="/loans">{isStaff ? 'Loans' : 'My loans'}</NavLink>
          {user.role === 'admin' && <NavLink to="/users">Users</NavLink>}
        </nav>
        <div className="who">
          <span>{user.name} <small className="role">{user.role}</small></span>
          <button className="btn ghost" onClick={logout}>Log out</button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
