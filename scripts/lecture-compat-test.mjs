/**
 * Lecture sync compatibility regression test (migration 0002 drift).
 *
 * A database that predates `supabase/migrations/0002_lecture_ranges.sql`
 * rejects lecture writes containing range_start/range_end/completed_lectures
 * with PostgREST's schema-cache error — which used to wedge the sync queue
 * forever ("⚠ lectures: Could not find the 'completed_lectures' column …").
 * Bundles the real repository and proves:
 *   1. non-schema errors still surface (no silent swallowing)
 *   2. full-schema servers receive the range columns
 *   3. legacy-schema servers get a retried legacy payload (no range columns),
 *      for both insert and update
 *   4. the update path detects the schema error too (when it hits first)
 */
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const outfile = path.join(ROOT, '.test-lecture-compat-bundle.mjs');
await build({
  entryPoints: [path.join(ROOT, 'src/data/repository.ts')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  outfile,
  logLevel: 'silent',
  define: {
    'import.meta.env.PROD': 'true',
    'import.meta.env.DEV': 'false',
    'import.meta.env.MODE': '"production"',
    'import.meta.env.BASE_URL': '"/"',
  },
});

let failed = 0;
const check = (name, cond) => {
  console.log(`  ${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failed++;
};

const SCHEMA_CACHE_ERROR = "Could not find the 'completed_lectures' column of 'lectures' in the schema cache";
const RANGE_KEYS = ['range_start', 'range_end', 'completed_lectures'];
const hasRangeColumns = (row) => RANGE_KEYS.some((key) => key in row);

const sampleLecture = {
  id: 'lec-1', title: 'Geomorphology', subject: 'Geomorphology', chapter: '',
  // absolute pointer into the 98–101 range: 2 done ([98, 99]), next is 100
  lectureNo: 100, totalLectures: 4, rangeStart: 98, rangeEnd: 101,
  completedLectures: [98, 99], source: '', pdfFollowed: '', shortNotesMade: false,
  notesLink: '', revised: false, revisionCount: 0, pyqsAttempted: 0,
  status: 'in_progress', lastWatchedAt: null, completedAt: null, notes: '',
  createdAt: '2026-01-01T00:00:00.000Z',
};

/** Minimal PostgREST stand-in: records every payload, optionally rejects
 * payloads that reference the 0002 columns with the real schema-cache error. */
function makeClient({ legacySchema = false, failWith = null } = {}) {
  const calls = [];
  return {
    calls,
    from(table) {
      return {
        insert(rows) {
          calls.push({ op: 'insert', table, rows });
          const p = (async () => {
            if (failWith) return { data: null, error: { message: failWith } };
            if (legacySchema && rows.some(hasRangeColumns)) return { data: null, error: { message: SCHEMA_CACHE_ERROR } };
            return { data: rows.map((_, i) => ({ id: `uuid-${table}-${calls.length}-${i}` })), error: null };
          })();
          return { select: () => p };
        },
        update(row) {
          calls.push({ op: 'update', table, rows: [row] });
          return {
            eq: async () => {
              if (failWith) return { error: { message: failWith } };
              if (legacySchema && hasRangeColumns(row)) return { error: { message: SCHEMA_CACHE_ERROR } };
              return { error: null };
            },
          };
        },
      };
    },
  };
}

// Fresh module instance per scenario: the legacy-schema flag is per module.
let fresh = 0;
const importRepository = () => import(`${pathToFileURL(outfile).href}?fresh=${(fresh += 1)}`);

// ---------- 1. unrelated errors still throw ----------
{
  const { Repository } = await importRepository();
  const client = makeClient({ failWith: 'permission denied for table lectures' });
  let threw = false;
  try {
    await new Repository(client, 'user-1').insertLecturesAndGetIds([sampleLecture]);
  } catch {
    threw = true;
  }
  check('1. non-schema insert errors still throw', threw);

  const updateClient = makeClient({ failWith: 'permission denied for table lectures' });
  let updateThrew = false;
  try {
    await new Repository(updateClient, 'user-1').updateLecture('uuid-x', sampleLecture);
  } catch {
    updateThrew = true;
  }
  check('2. non-schema update errors still throw', updateThrew);
}

// ---------- 2. full-schema server receives the range columns ----------
{
  const { Repository } = await importRepository();
  const client = makeClient();
  const ids = await new Repository(client, 'user-1').insertLecturesAndGetIds([sampleLecture]);
  const row = client.calls[0].rows[0];
  check('3. full-schema insert returns server ids', ids.length === 1 && ids[0].startsWith('uuid-'));
  check('4. full-schema insert carries range columns', hasRangeColumns(row) && JSON.stringify(row.completed_lectures) === JSON.stringify([98, 99]));

  const updateClient = makeClient();
  await new Repository(updateClient, 'user-1').updateLecture('uuid-x', sampleLecture);
  check('5. full-schema update carries range columns', hasRangeColumns(updateClient.calls[0].rows[0]));
}

// ---------- 3. legacy server: retried legacy payload ----------
{
  const { Repository } = await importRepository();
  const client = makeClient({ legacySchema: true });
  const ids = await new Repository(client, 'user-1').insertLecturesAndGetIds([sampleLecture]);
  check('6. legacy insert falls back and returns ids', ids.length === 1 && ids[0].startsWith('uuid-'));
  check('7. legacy insert retries exactly once', client.calls.length === 2);
  const retried = client.calls[1].rows[0];
  check('8. legacy retry strips the 0002 columns', !hasRangeColumns(retried));
  check('9. legacy retry rebases lecture_no to 1-based + keeps status', retried.lecture_no === 3 && retried.status === 'in_progress' && retried.total_lectures === 4);

  const updateClient = makeClient({ legacySchema: true });
  await new Repository(updateClient, 'user-1').updateLecture('uuid-x', sampleLecture);
  check('10. later updates skip the doomed full payload', updateClient.calls.length === 1 && !hasRangeColumns(updateClient.calls[0].rows[0]));
}

// ---------- 4. update path detects the schema error first ----------
{
  const { Repository } = await importRepository();
  const client = makeClient({ legacySchema: true });
  await new Repository(client, 'user-1').updateLecture('uuid-x', sampleLecture);
  check('11. update-first legacy fallback works', client.calls.length === 2 && !hasRangeColumns(client.calls[1].rows[0]));

  const insertClient = makeClient({ legacySchema: true });
  await new Repository(insertClient, 'user-1').insertLecturesAndGetIds([sampleLecture]);
  check('12. flag is shared after update-first detection', insertClient.calls.length === 1 && !hasRangeColumns(insertClient.calls[0].rows[0]));
}

fs.rmSync(outfile, { force: true });
console.log(failed ? `\nLECTURE COMPAT TEST FAILED (${failed})` : '\nLECTURE COMPAT TEST PASSED');
process.exit(failed ? 1 : 0);
