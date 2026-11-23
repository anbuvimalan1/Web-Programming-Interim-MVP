import { useEffect, useState } from 'react';
import { api, getUser } from '../api.js';

export default function Users() {
  const me = getUser();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try { setUsers(await api('/users')); } catch (e) { setError(e.message); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  async function changeRole(u, role) {
    setError('');
    try { await api(`/users/${u.id}`, { method: 'PUT', body: { role } }); load(); } catch (err) { setError(err.message); }
  }

  async function remove(u) {
    if (!window.confirm(`Delete account ${u.email}? Their loan history is removed too.`)) return;
    try { await api(`/users/${u.id}`, { method: 'DELETE' }); load(); } catch (err) { setError(err.message); }
  }

  return (
    <>
      <div className="head"><h1>Users</h1></div>
      {error && <p className="error" role="alert">{error}</p>}
      {loading ? <p className="muted">Loading users…</p> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th></th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td><td>{u.email}</td>
                  <td>
                    <select value={u.role} disabled={u.id === me.id} onChange={(e) => changeRole(u, e.target.value)}>
                      <option value="member">member</option>
                      <option value="librarian">librarian</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td>{u.created_at.slice(0, 10)}</td>
                  <td className="row-actions">
                    {u.id !== me.id && <button className="btn danger small" onClick={() => remove(u)}>Delete</button>}
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
