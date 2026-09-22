/**
 * Syllabus data consistency test — validates src/data/syllabus.json (the app's
 * operational syllabus seed) without needing a build:
 *   1. every hierarchy level sums exactly to its parent's weightage
 *      (children → parent convention; subtopics authored without weights stay unweighted)
 *   2. the required subjects exist where the operational syllabus expects them
 * Run: node scripts/syllabus-consistency-test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'syllabus.json'), 'utf8'));

let failed = 0;
const check = (name, ok) => {
  console.log((ok ? '  ✓ ' : '  ✗ ') + name);
  if (!ok) failed++;
};
const close = (a, b) => Math.abs(a - b) < 0.005;
const wsum = (arr) => arr.reduce((a, x) => a + (x.weightage ?? 0), 0);

console.log('syllabus weightage consistency');
for (const p of data.papers) {
  const errors = [];
  if (!close(wsum(p.subjects), p.weightage)) {
    errors.push(`paper ${p.title}: subjects ${wsum(p.subjects).toFixed(2)} ≠ ${p.weightage}`);
  }
  for (const s of p.subjects ?? []) {
    if (!close(wsum(s.chapters ?? []), s.weightage)) errors.push(`${s.title}: chapters ${wsum(s.chapters ?? []).toFixed(2)} ≠ ${s.weightage}`);
    for (const c of s.chapters ?? []) {
      if (!close(wsum(c.topics ?? []), c.weightage)) errors.push(`${s.title}/${c.title}: topics ${wsum(c.topics ?? []).toFixed(2)} ≠ ${c.weightage}`);
      for (const t of c.topics ?? []) {
        const weighted = (t.subtopics ?? []).some((st) => (st.weightage ?? 0) > 0);
        if (weighted && !close(wsum(t.subtopics), t.weightage)) {
          errors.push(`${s.title}/${c.title}/${t.title}: subtopics ${wsum(t.subtopics).toFixed(2)} ≠ ${t.weightage}`);
        }
      }
    }
  }
  const levels = `${(p.subjects ?? []).length} subjects, ${(p.subjects ?? []).reduce((a, s) => a + (s.chapters ?? []).length, 0)} chapters`;
  check(`${p.title}: all weightages sum to parent (${levels})${errors.length ? '' : ' — OK'}`, errors.length === 0);
  errors.slice(0, 8).forEach((e) => { console.log('      ✗ ' + e); failed++; });
}

console.log('required sections present');
const paper = (title) => data.papers.find((p) => p.title === title);
const subject = (title, name) => (paper(title)?.subjects ?? []).find((s) => s.title === name);
const hasSubject = (title, subjectTitle) => Boolean(subject(title, subjectTitle));
const fullSubject = (title, name) => {
  const g = subject(title, name);
  return Boolean(g)
    && (g.chapters ?? []).length >= 2
    && g.chapters.every((c) => (c.topics ?? []).length >= 1)
    && g.chapters.some((c) => (c.topics ?? []).some((t) => (t.subtopics ?? []).length >= 2));
};

check('Prelims GS1 keeps the standard seven subjects', ['History', 'Geography', 'Indian Polity', 'Economy', 'Science & Technology', 'Environment & Ecology', 'Current Affairs'].every((s) => hasSubject('Prelims GS1', s)));
check('Mains GS1 has Geography with chapters/topics/subtopics', fullSubject('GS1', 'Geography'));
check('Mains GS2 has Social Justice with chapters/topics/subtopics', fullSubject('GS2', 'Social Justice'));
check('Mains GS3 has Internal Security with chapters/topics/subtopics', fullSubject('GS3', 'Internal Security'));
check('Geography Optional Paper I has Regional Planning with chapters/topics/subtopics', fullSubject('Geography Optional — Paper I', 'Regional Planning'));
check('Geography Optional Paper I has Models, Theories & Laws in Human Geography', fullSubject('Geography Optional — Paper I', 'Models, Theories & Laws in Human Geography'));

console.log('');
if (failed) {
  console.log(`FAILED: ${failed} syllabus consistency check(s) failed`);
  process.exit(1);
}
console.log('All syllabus consistency checks passed.');
