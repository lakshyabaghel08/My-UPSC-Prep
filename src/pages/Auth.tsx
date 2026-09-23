/** Authentication screen — matches the existing PREPTRACK design system. */
import React, { useState } from 'react';
import { useStore } from '../store/store';
import { isCloudConfigured } from '../lib/supabase';
import { useToast } from '../ui/toast';

export function AuthPage() {
  const { signIn, signUp, continueLocal, db } = useStore();
  const { push } = useToast();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  // Default on: matches the previous behavior (session survives reloads).
  // Off: session-only — the app signs out on its own after the browser session.
  const [rememberMe, setRememberMe] = useState(true);

  const localRecords = db.tasks.length + Object.keys(db.progress).length + db.lectures.length + db.pyqs.length;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setInfo(null);
    if (!email.trim() || password.length < 6) {
      setError('Enter a valid email and a password of at least 6 characters.');
      return;
    }
    setBusy(true);
    const res = mode === 'signin' ? await signIn(email.trim(), password, rememberMe) : await signUp(email.trim(), password);
    setBusy(false);
    if (res.error) setError(res.error);
    else if (res.needsConfirmation) setInfo('Check your inbox — confirm your email, then sign in.');
    else if (mode === 'signin') push(
      rememberMe ? 'Signed in — your data is syncing' : 'Signed in for this session only — nothing stored on this device',
      'ok');
    else push('Account created — your data is syncing', 'ok');
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card card">
        <div className="auth-brand">
          <img className="brand-mark" src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" />
          <div>
            <div className="brand-wordmark">PREPTRACK</div>
            <div className="brand-sub">CSE 2027 · Geography Optional</div>
          </div>
        </div>

        <h1 style={{ fontSize: 20.5, margin: '14px 0 2px' }}>Sign in to sync</h1>
        <p className="small muted" style={{ marginBottom: 14 }}>
          Your preparation data syncs privately to your own account via Supabase —
          protected by Row Level Security. Without signing in, the app stays fully usable on this device.
        </p>

        {!isCloudConfigured ? (
          <div className="card card-pad small" style={{ background: 'var(--warn-soft)', border: 'none', marginBottom: 12 }}>
            Cloud sync isn't configured in this build. The app runs in local mode.
          </div>
        ) : (
          <>
            <div className="seg" style={{ marginBottom: 14, width: '100%' }}>
              <button className={mode === 'signin' ? 'active' : ''} style={{ flex: 1 }} onClick={() => { setMode('signin'); setError(null); setInfo(null); }}>Sign in</button>
              <button className={mode === 'signup' ? 'active' : ''} style={{ flex: 1 }} onClick={() => { setMode('signup'); setError(null); setInfo(null); }}>Create account</button>
            </div>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <div className="field">
                <label>Email</label>
                <input className="input" type="email" value={email} onChange={(e2) => setEmail(e2.target.value)}
                  placeholder="you@example.com" autoComplete="email" autoFocus />
              </div>
              <div className="field">
                <label>Password</label>
                <input className="input" type="password" value={password} onChange={(e2) => setPassword(e2.target.value)}
                  placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
              </div>
              {mode === 'signin' && (
                <>
                  <label className="checkbox-row">
                    <input type="checkbox" checked={rememberMe} onChange={(e2) => setRememberMe(e2.target.checked)} />
                    Remember me
                  </label>
                  <p className="tiny muted" style={{ marginTop: -6 }}>
                    Off = this session stays only in this browser session — nothing is stored on this device.
                  </p>
                </>
              )}
              {error && <div className="small" style={{ color: 'var(--bad)', background: 'var(--bad-soft)', padding: '8px 12px', borderRadius: 9 }}>{error}</div>}
              {info && <div className="small" style={{ color: 'var(--info)', background: 'var(--info-soft)', padding: '8px 12px', borderRadius: 9 }}>{info}</div>}
              <button className="btn primary block" disabled={busy} style={{ marginTop: 4, padding: '10px 0' }}>
                {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account & sign in'}
              </button>
            </form>
          </>
        )}

        <div style={{ margin: '16px 0 4px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <hr className="divider grow" />
          <span className="tiny muted">or</span>
          <hr className="divider grow" />
        </div>
        <button className="btn block" onClick={continueLocal}>Continue on this device</button>
        {localRecords > 0 && (
          <p className="tiny muted" style={{ marginTop: 8, textAlign: 'center' }}>
            {localRecords} local records found on this device — signing in to a new account syncs them up
            automatically, once. Nothing is deleted, and nothing is ever uploaded twice.
          </p>
        )}
      </div>
    </div>
  );
}
