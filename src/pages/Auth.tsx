/** Authentication screen — matches the existing My UPSC Prep design system. */
import React, { useState } from 'react';
import { useStore } from '../store/store';
import { Modal } from '../ui/components';
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
          <div className="brand-mark">M</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17 }}>My UPSC Prep</div>
            <div className="brand-sub">CSE 2027 · Geography Optional</div>
          </div>
        </div>

        <h1 style={{ fontSize: 20, margin: '14px 0 2px' }}>Sign in to sync</h1>
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
        <button className="btn block" onClick={continueLocal}>Continue on this device (local only)</button>
        {localRecords > 0 && (
          <p className="tiny muted" style={{ marginTop: 8, textAlign: 'center' }}>
            {localRecords} local records found on this device — you can import them into your account after signing in.
          </p>
        )}
        <p className="tiny muted" style={{ marginTop: 14, textAlign: 'center' }}>
          100% free · no tracking · your data belongs to you
        </p>
      </div>
    </div>
  );
}

/** First-sign-in migration offer (Phase 6). Local data is never deleted. */
export function MigrationModal() {
  const { migrationPrompt, dismissMigrationPrompt, migrateLocalToCloud, db } = useStore();
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<string>('');
  const [pct, setPct] = useState(0);
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);

  if (!migrationPrompt) return null;

  const counts: [string, number][] = [
    ['tasks', db.tasks.length],
    ['syllabus progress', Object.keys(db.progress).length],
    ['revision logs', db.revisionLogs.length],
    ['tests', db.prelimsTests.length + db.mainsTests.length],
    ['focus sessions', db.focusSessions.length],
    ['Geo lectures', db.lectures.length],
    ['current affairs', db.currentAffairs.length],
    ['answers', db.answers.length],
  ];
  const total = counts.reduce((a, [, n]) => a + n, 0);

  const run = async () => {
    setBusy(true); setResult(null);
    const res = await migrateLocalToCloud((msg, p) => { setStep(msg); setPct(p); });
    setBusy(false);
    setResult(res);
  };

  return (
    <Modal open onClose={dismissMigrationPrompt} title="Import your local data?" footer={
      result?.ok ? (
        <button className="btn primary" onClick={dismissMigrationPrompt}>Done</button>
      ) : (
        <>
          <button className="btn ghost" onClick={dismissMigrationPrompt} disabled={busy}>{result?.ok ? 'Close' : 'Not now'}</button>
          {!result && <button className="btn primary" onClick={run} disabled={busy || total === 0}>{busy ? 'Importing…' : `Import ${total} records`}</button>}
        </>
      )
    }>
      {!result ? (
        <>
          <p className="small soft">
            This device has <b style={{ color: 'var(--text)' }}>{total} local records</b>. Import them into your
            account so they sync everywhere. This replaces any existing cloud data with this device's data
            (safe re-run — no duplicates). <b>Your local copy is never deleted.</b>
          </p>
          <div className="row wrap" style={{ gap: 6 }}>
            {counts.filter(([, n]) => n > 0).map(([label, n]) => <span key={label} className="chip">{label}: {n}</span>)}
          </div>
          {busy && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="bar geo"><div style={{ width: `${pct}%` }} /></div>
              <span className="tiny muted">{step}</span>
            </div>
          )}
        </>
      ) : result.ok ? (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: 34 }}>✅</div>
          <h2 style={{ margin: '6px 0' }}>Migration complete</h2>
          <p className="small soft">{total} records are now synced to your account. Local data remains on this device as a backup.</p>
        </div>
      ) : (
        <div className="small" style={{ color: 'var(--bad)', background: 'var(--bad-soft)', padding: '10px 14px', borderRadius: 10 }}>
          Migration failed: {result.error}. Nothing was lost — your local data is intact. You can retry.
        </div>
      )}
    </Modal>
  );
}
