#!/usr/bin/env node
/**
 * Bootstrap the "My UPSC Prep" Supabase project — one-time, idempotent.
 * Runs on GitHub Actions (or any machine with network access to Supabase).
 *
 * Requires env: SUPABASE_ACCESS_TOKEN (repo secret, delete after use).
 * Safe to re-run: reuses an existing project named "my-upsc-prep" and the
 * SQL migration itself is idempotent.
 *
 * Output (parsed by CI / operator):
 *   MUP_PROJECT_REF=...
 *   MUP_PROJECT_URL=...
 *   MUP_PUBLISHABLE_KEY=...
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const API = 'https://api.supabase.com/v1';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_NAME = process.env.PROJECT_NAME || 'my-upsc-prep';
const REGIONS = ['ap-south-1', 'ap-southeast-1', 'us-east-1']; // Mumbai first

if (!TOKEN || !TOKEN.startsWith('sbp_')) {
  console.error('::error::SUPABASE_ACCESS_TOKEN secret is missing or invalid (should start with sbp_). Add it under repo Settings → Secrets and variables → Actions.');
  process.exit(1);
}

const headers = () => ({ Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' });
async function api(method, p, body) {
  const res = await fetch(API + p, { method, headers: headers(), body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  if (!res.ok) {
    const msg = typeof json === 'string' ? json : JSON.stringify(json);
    throw new Error(`${method} ${p} → ${res.status}: ${msg.slice(0, 400)}`);
  }
  return json;
}

function extractKey(apiKeysResponse) {
  // API returns either [{name:'anon', api_key:'...'}] or [{name:'publishable', keys:[...]}]-style shapes
  for (const entry of apiKeysResponse ?? []) {
    if (entry.api_key && (entry.name === 'anon' || entry.name === 'publishable' || entry.type === 'publishable')) return entry.api_key;
    if (entry.keys) for (const k of entry.keys) {
      if ((k.name === 'legacy-anon' || k.name === 'anon' || k.type === 'publishable') && k.api_key) return k.api_key;
    }
  }
  return null;
}

async function main() {
  console.log('::group::1 · Organizations');
  let orgs = await api('GET', '/organizations');
  let org = Array.isArray(orgs) ? orgs[0] : null;
  if (!org) {
    console.log('No organization found — creating "personal"…');
    org = await api('POST', '/organizations', { name: 'personal' });
  }
  console.log('Using organization:', org.id, org.name ?? '');
  console.log('::endgroup::');

  console.log('::group::2 · Project');
  const projects = await api('GET', '/projects');
  let project = (projects ?? []).find((p) => p.name === PROJECT_NAME);
  if (project) {
    console.log(`Reusing existing project "${PROJECT_NAME}" (${project.id}, status ${project.status})`);
  } else {
    const dbPass = crypto.randomBytes(24).toString('base64url');
    let created = null;
    let lastErr = null;
    for (const region of REGIONS) {
      try {
        console.log(`Creating project "${PROJECT_NAME}" in ${region}…`);
        created = await api('POST', '/projects', {
          organization_id: org.id, name: PROJECT_NAME, region, db_pass: dbPass,
          confirm_password: dbPass,
        });
        break;
      } catch (e) {
        lastErr = e;
        console.log(`Region ${region} failed: ${e.message.slice(0, 160)}`);
      }
    }
    if (!created) { console.error('::error::Project creation failed:', lastErr?.message); process.exit(1); }
    project = created;
  }
  const ref = project.id;
  console.log('Project ref:', ref);
  console.log('::endgroup::');

  console.log('::group::3 · Waiting for ACTIVE (up to 15 min)');
  const deadline = Date.now() + 15 * 60 * 1000;
  let status = project.status ?? '';
  while (!/ACTIVE/i.test(status) && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 15000));
    const fresh = await api('GET', `/projects/${ref}`);
    status = fresh.status ?? '';
    console.log(`  status: ${status}`);
  }
  if (!/ACTIVE/i.test(status)) { console.error('::error::Project did not become ACTIVE in time'); process.exit(1); }
  console.log('Project is ACTIVE ✓');
  console.log('::endgroup::');

  console.log('::group::4 · Migration SQL');
  const migrationsDir = path.join(ROOT, 'supabase', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`Applying ${file} (${(sql.length / 1024).toFixed(1)} KB)…`);
    await api('POST', `/projects/${ref}/database/query`, { query: sql });
    console.log(`Applied ✓ ${file}`);
  }
  console.log('::endgroup::');

  console.log('::group::5 · Auth config');
  try {
    await api('PATCH', `/projects/${ref}/config/auth`, { mailer_autoconfirm: true, disable_signup: false });
    console.log('Auth: email signups enabled, email auto-confirm ON (personal app — no verification mails).');
  } catch (e) {
    console.log(`::warning::Auth config PATCH failed (${e.message.slice(0, 120)}). If signups require email confirmation, toggle "Confirm email" off in Dashboard → Authentication.`);
  }
  console.log('::endgroup::');

  console.log('::group::6 · Publishable config');
  const apiKeys = await api('GET', `/projects/${ref}/api-keys`);
  const publishable = extractKey(apiKeys);
  if (!publishable) { console.error('::error::Could not find anon/publishable key'); process.exit(1); }
  const projectUrl = `https://${ref}.supabase.co`;
  console.log(`MUP_PROJECT_REF=${ref}`);
  console.log(`MUP_PROJECT_URL=${projectUrl}`);
  console.log(`MUP_PUBLISHABLE_KEY=${publishable}`);
  console.log('::endgroup::');
  console.log('BOOTSTRAP COMPLETE ✓  (publishable key + URL are browser-safe by design; the service_role key is never read or printed)');
}

main().catch((e) => {
  console.error('::error::BOOTSTRAP FAILED:', e.message);
  process.exit(1);
});
