#!/usr/bin/env node
/**
 * Bootstrap the "My UPSC Prep" Supabase project — one-time, idempotent.
 * Runs on GitHub Actions (or any machine with network access to Supabase).
 *
 * Requires env: SUPABASE_ACCESS_TOKEN (repo secret, delete after use).
 * Safe to re-run: lists existing projects first and REUSES one named
 * "my-upsc-prep" instead of creating a duplicate; the SQL migration itself
 * is idempotent too.
 *
 * Payload built against the CURRENT Management API schema (2025+):
 *   required: name, organization_slug, db_pass
 *   region via region_selection {type: specific|smartGroup, code} — the
 *   selection object is taken verbatim from GET /v1/projects/available-regions
 *   (legacy organization_id/region kept only as fallback candidates).
 * Output (parsed by CI / operator):
 *   MUP_PROJECT_REF=...  MUP_PROJECT_URL=...  MUP_PUBLISHABLE_KEY=...
 * The access token is used only in Authorization headers and is never logged.
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
const PREFERRED_REGION = 'ap-south-1'; // Mumbai

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

/** Find the publishable key (sb_publishable_…) or legacy anon JWT in any response shape. */
function extractKey(resp) {
  const found = [];
  const walk = (node) => {
    if (typeof node === 'string') {
      if (node.startsWith('sb_publishable_')) found.push(node);
      else if (node.startsWith('eyJ') && node.length > 100) found.push(node); // legacy anon JWT
    } else if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        if ((k === 'anon' || k === 'publishable' || k === 'default') && typeof v === 'string') found.push(v);
        else walk(v);
      }
    }
  };
  walk(resp);
  return found.find((k) => k.startsWith('sb_publishable_')) ?? found.find((k) => k.startsWith('eyJ')) ?? null;
}

async function main() {
  console.log('::group::1 · Organizations');
  const orgs = await api('GET', '/organizations');
  const org = Array.isArray(orgs) ? orgs[0] : null;
  if (!org) {
    console.error('::error::No organization found on this account. Create one at supabase.com/dashboard (or share the account) and re-run.');
    process.exit(1);
  }
  const orgSlug = org.slug ?? org.id; // current API wants organization_slug
  console.log(`Using organization: slug=${orgSlug} (fields: ${Object.keys(org).join(', ')})`);
  console.log('::endgroup::');

  console.log('::group::2 · Existing projects (duplicate guard)');
  const projects = await api('GET', '/projects');
  const existing = (projects ?? []).filter((p) => p.name === PROJECT_NAME);
  for (const p of existing) console.log(`Found existing "${p.name}" (${p.id}, status ${p.status}, region ${p.region ?? 'n/a'})`);
  if (existing.length > 1) console.log('::warning::More than one project with this name exists — using the first.');
  let project = existing[0] ?? null;
  console.log('::endgroup::');

  if (!project) {
    console.log('::group::3 · Create project (current schema, live region data)');
    const dbPass = crypto.randomBytes(24).toString('base64url');

    // Ask the API which regions are actually available right now.
    let specific = [];
    let smartGroup = null;
    try {
      const regions = await api('GET', '/projects/available-regions');
      const recs = regions?.recommendations ?? regions ?? {};
      specific = recs.specific ?? recs.all?.specific ?? [];
      smartGroup = recs.smartGroup ?? recs.all?.smartGroup ?? null;
      console.log(`Available regions: ${specific.map((r) => r.code).join(', ') || 'n/a'}; smart groups: ${(Array.isArray(smartGroup) ? smartGroup : [smartGroup]).map((r) => r?.code).filter(Boolean).join(', ') || 'n/a'}`);
    } catch (e) {
      console.log(`::warning::available-regions lookup failed (${e.message.slice(0, 120)}) — using static candidates.`);
    }

    const pick = specific.find((r) => r.code === PREFERRED_REGION)
      ?? (Array.isArray(smartGroup) ? smartGroup.find((r) => r.code === 'apac') : null)
      ?? specific[0] ?? null;

    // Candidate payloads, tried in order until one validates.
    const candidates = [];
    if (pick) candidates.push({
      organization_slug: orgSlug, name: PROJECT_NAME, db_pass: dbPass,
      region_selection: { type: pick.type, code: pick.code },
      desired_instance_size: 'micro',
    });
    if (!pick || pick.code !== 'apac') candidates.push({
      organization_slug: orgSlug, name: PROJECT_NAME, db_pass: dbPass,
      region_selection: { type: 'smartGroup', code: 'apac' },
      desired_instance_size: 'micro',
    });
    candidates.push({ organization_slug: orgSlug, name: PROJECT_NAME, db_pass: dbPass }); // API-default region
    candidates.push({ organization_id: org.id, name: PROJECT_NAME, db_pass: dbPass, region: PREFERRED_REGION }); // legacy fallback

    let created = null;
    let lastErr = null;
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      const desc = c.region_selection ? `region_selection=${JSON.stringify(c.region_selection)}` : (c.region ? `region=${c.region}` : 'API-default region');
      try {
        console.log(`Attempt ${i + 1}/${candidates.length}: create "${PROJECT_NAME}" in ${desc} …`);
        created = await api('POST', '/projects', c);
        console.log(`Accepted ✓ (ref ${created?.id ?? '?'})`);
        break;
      } catch (e) {
        lastErr = e;
        console.log(`  rejected: ${e.message.slice(0, 220)}`);
      }
    }
    if (!created) { console.error('::error::Project creation failed:', lastErr?.message); process.exit(1); }
    project = created;
    console.log('::endgroup::');
  } else {
    console.log('Reusing existing project — no duplicate created ✓');
  }

  const ref = project.id;
  console.log('Project ref:', ref);

  console.log('::group::4 · Wait for ACTIVE (up to 20 min)');
  const deadline = Date.now() + 20 * 60 * 1000;
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

  console.log('::group::5 · Apply migration + verify RLS');
  const migrationsDir = path.join(ROOT, 'supabase', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`Applying ${file} (${(sql.length / 1024).toFixed(1)} KB)…`);
    await api('POST', `/projects/${ref}/database/query`, { query: sql });
    console.log(`Applied ✓ ${file}`);
  }
  const noRls = await api('POST', `/projects/${ref}/database/query`, {
    query: "select tablename from pg_tables where schemaname='public' and rowsecurity = false;",
  });
  const tables = Array.isArray(noRls) ? noRls.map((r) => r.tablename) : [];
  if (tables.length > 0) { console.error(`::error::RLS MISSING on: ${tables.join(', ')}`); process.exit(1); }
  const policyCount = await api('POST', `/projects/${ref}/database/query`, {
    query: "select count(*)::int as n from pg_policies where schemaname='public';",
  });
  console.log(`RLS VERIFIED LIVE ✓ — row level security enabled on every public table; ${Array.isArray(policyCount) ? policyCount[0]?.n : '?'} policies present.`);
  console.log('::endgroup::');

  console.log('::group::6 · Auth config');
  try {
    await api('PATCH', `/projects/${ref}/config/auth`, { mailer_autoconfirm: true, disable_signup: false });
    console.log('Auth: signups enabled, email auto-confirm ON (personal app — no verification mails).');
  } catch (e) {
    console.log(`::warning::Auth config PATCH failed (${e.message.slice(0, 120)}). If signups demand email confirmation, turn off "Confirm email" in Dashboard → Authentication.`);
  }
  console.log('::endgroup::');

  console.log('::group::7 · Publishable key + URL');
  const apiKeys = await api('GET', `/projects/${ref}/api-keys`);
  const publishable = extractKey(apiKeys);
  if (!publishable) { console.error('::error::Could not find anon/publishable key in api-keys response'); process.exit(1); }
  const projectUrl = `https://${ref}.supabase.co`;
  console.log(`MUP_PROJECT_REF=${ref}`);
  console.log(`MUP_PROJECT_URL=${projectUrl}`);
  console.log(`MUP_PUBLISHABLE_KEY=${publishable}`);
  console.log('::endgroup::');
  console.log('BOOTSTRAP COMPLETE ✓ — copy MUP_PROJECT_URL and MUP_PUBLISHABLE_KEY (browser-safe publishable key) into the two VITE_ repo secrets. The service_role/secret key is never read or printed.');
}

main().catch((e) => {
  console.error('::error::BOOTSTRAP FAILED:', e.message);
  process.exit(1);
});
