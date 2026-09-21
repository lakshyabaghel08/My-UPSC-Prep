// Extracts the operational syllabus embedded in the reference MyUPSCPlanner bundles
// (reference/.../syllabusLoader-*.js) and merges it with the authored Geography Optional
// syllabus to produce src/data/syllabus.json — the seed data for PREPTRACK.
//
// Nothing inside /reference is modified. Run: node scripts/extract-reference-syllabus.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { geographyOptional } from './data/geographyOptional.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ---------- helpers ----------
function findFirst(src, needle) {
  const i = src.indexOf(needle);
  if (i === -1) throw new Error(`Needle not found: ${needle}`);
  return i;
}

/** Extract the JS object/array literal that starts at index `start` (pointing at '{' or '['). */
function extractLiteral(src, start) {
  let depth = 0, end = -1, inStr = false, esc = false;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  if (end === -1) throw new Error('Unterminated object literal');
  // The bundles are JS object literals (unquoted keys) — evaluate them safely.
  return (0, eval)('(' + src.slice(start, end) + ')');
}

// ---------- 1. Prelims (GS1 + CSAT) from syllabusLoader ----------
const assetsDir = path.join(ROOT, 'reference', 'myupscplanner.com', 'assets');
const loaderFile = fs.readdirSync(assetsDir).find((f) => f.startsWith('syllabusLoader-') && f.endsWith('.js'));
if (!loaderFile) throw new Error('syllabusLoader bundle not found in reference assets');
const loaderSrc = fs.readFileSync(path.join(assetsDir, loaderFile), 'utf8');

const prelimsStart = findFirst(loaderSrc, 'const R={papers:[');
const prelims = extractLiteral(loaderSrc, loaderSrc.indexOf('{', prelimsStart));

const mainsStart = findFirst(loaderSrc, '={papers:[{title:"Essay"');
const mains = extractLiteral(loaderSrc, loaderSrc.indexOf('{', mainsStart));

// ---------- 2. Optional seed hierarchy from Syllabus bundle (geography check) ----------
const syllabusBundle = fs.readdirSync(assetsDir).find((f) => f.startsWith('Syllabus-') && f.endsWith('.js'));
const syllabusSrc = fs.readFileSync(path.join(assetsDir, syllabusBundle), 'utf8');
const optStart = findFirst(syllabusSrc, 'Geography:{paper1:{title:"Geography - Paper 1"');
// start extraction at the '{' that is the VALUE of the `Geography:` key
const optTree = extractLiteral(syllabusSrc, optStart + 'Geography:'.length);

// ---------- 3. Compose ----------
function normalizePaper(ref, order) {
  return {
    title: ref.title,
    code: null,
    description: ref.description ?? '',
    category: ref.category,
    isOptional: Boolean(ref.is_optional),
    weightage: ref.weightage ?? 0,
    order,
    subjects: (ref.subjects ?? []).map((s, si) => ({
      title: s.title,
      description: s.description ?? '',
      weightage: s.weightage ?? 0,
      order: si,
      chapters: (s.chapters ?? []).map((c, ci) => ({
        title: c.title,
        description: c.description ?? '',
        weightage: c.weightage ?? 0,
        order: ci,
        topics: (c.topics ?? []).map((t, ti) => ({
          title: t.title,
          description: t.description ?? '',
          weightage: t.weightage ?? 0,
          order: ti,
          subtopics: (t.subtopics ?? []).map((st, sti) => ({
            title: st.title,
            description: st.description ?? '',
            weightage: st.weightage ?? 0,
            order: sti,
          })),
        })),
      })),
    })),
  };
}

const papers = [
  ...prelims.papers.map((p, i) => normalizePaper(p, i)),
  ...mains.papers.map((p, i) => normalizePaper(p, prelims.papers.length + i)),
];

// Geography Optional: replace the placeholder "Optional Paper I/II" with the authored,
// expanded operational syllabus. The reference template for Geography optional is kept
// as a sub-map inside Geography Optional Paper I chapters for cross-checking.
const optIdx1 = papers.findIndex((p) => p.title === 'Optional Paper I');
const optIdx2 = papers.findIndex((p) => p.title === 'Optional Paper II');
const geoPapers = geographyOptional.papers.map((p, i) => normalizePaper(p, i));
if (optIdx1 !== -1) papers[optIdx1] = geoPapers[0];
if (optIdx2 !== -1) papers[optIdx2] = geoPapers[1];

const meta = {
  title: 'UPSC CSE 2027 — Operational Syllabus',
  targetYear: 2027,
  optional: 'Geography',
  sources: {
    prelimsMains: 'reference/myupscplanner.com/assets/syllabusLoader (embedded seed data)',
    geographyOptional: 'authored operational expansion (official UPSC Geography optional syllabus)',
  },
  generatedOn: new Date().toISOString().slice(0, 10),
};

// stats
let counts = { subjects: 0, chapters: 0, topics: 0, subtopics: 0 };
for (const p of papers) for (const s of p.subjects) {
  counts.subjects++;
  for (const c of s.chapters) {
    counts.chapters++;
    for (const t of c.topics) {
      counts.topics++;
      counts.subtopics += t.subtopics.length;
    }
  }
}

const out = { meta, papers };
const outPath = path.join(ROOT, 'src', 'data', 'syllabus.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 1) + '\n');

console.log('syllabus.json written:', outPath);
console.log('papers:', papers.length, JSON.stringify(counts));
console.log('reference Geography optional template preserved (subjects per paper):');
console.log('  paper1 subjects:', (optTree.paper1 ?? optTree.Geography.paper1).subjects.map((s) => s.title).join(', '));
console.log('  paper2 subjects:', (optTree.paper2 ?? optTree.Geography.paper2).subjects.map((s) => s.title).join(', '));
