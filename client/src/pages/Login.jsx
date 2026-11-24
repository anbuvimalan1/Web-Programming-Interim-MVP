import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setSession } from '../api.js';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await api(`/auth/${mode}`, { method: 'POST', body: form });
      setSession(data.token, data.user);
      nav('/books');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <main className="auth-main">
        <div className="auth-inner">
          <div className="auth-brand">
            <span className="brand">Folio<span>.</span></span>
            <span className="brand-note">Library management</span>
          </div>
          <form className="auth-card" onSubmit={submit}>
            <header>
              <h1>{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
              <p className="subtitle">{mode === 'login' ? 'Log in to your library account.' : 'Join the library as a member.'}</p>
            </header>
            {mode === 'register' && (
              <label>Full name<input value={form.name} onChange={set('name')} required /></label>
            )}
            <label>Email<input type="email" placeholder="you@example.com" autoComplete="email" value={form.email} onChange={set('email')} required /></label>
            <label>Password<input type="password" placeholder="Enter your password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.password} onChange={set('password')} required minLength={mode === 'register' ? 8 : undefined} /></label>
            {error && <p className="error" role="alert">{error}</p>}
            <button className="btn" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Register'}</button>
            <p className="switch">
              {mode === 'login' ? 'New to the library?' : 'Already registered?'}{' '}
              <button type="button" className="link" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
                {mode === 'login' ? 'Create an account' : 'Log in'}
              </button>
            </p>
          </form>
        </div>
      </main>
      <div className="auth-art" aria-hidden="true" />
    </div>
  );
}
