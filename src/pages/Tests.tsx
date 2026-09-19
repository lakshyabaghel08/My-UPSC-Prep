/** Test Tracker & Analytics — Prelims mocks (negative marking aware) + Mains tests. */
import React, { useMemo, useState } from 'react';
import { useStore } from '../store/store';
import { Card, CardHead, Empty, Modal, Field, Confirm, Seg } from '../ui/components';
import { LineChart, HBars } from '../ui/charts';
import { useToast } from '../ui/toast';
import { prelimsAnalytics, mainsAnalytics } from '../store/selectors';
import type { PrelimsTest, MainsTest } from '../types';
import { todayKey } from '../lib/date';

export function Tests() {
  const { db, addPrelimsTest, deletePrelimsTest, addMainsTest, deleteMainsTest } = useStore();
  const { push } = useToast();
  const [tab, setTab] = useState<'prelims' | 'mains'>('prelims');
  const [showAddP, setShowAddP] = useState(false);
  const [showAddM, setShowAddM] = useState(false);
  const [deleting, setDeleting] = useState<{ kind: 'p' | 'm'; id: string; name: string } | null>(null);

  const pa = useMemo(() => prelimsAnalytics(db), [db]);
  const ma = useMemo(() => mainsAnalytics(db), [db]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Test Tracker & Analytics</h1>
          <div className="sub">{pa.count} prelims · {ma.count} mains tests · score = correct×2 − wrong×0.66 (Prelims)</div>
        </div>
        <div className="page-actions">
          <Seg options={[{ value: 'prelims', label: 'Prelims' }, { value: 'mains', label: 'Mains' }]} value={tab} onChange={setTab} />
          <button className="btn primary" onClick={() => (tab === 'prelims' ? setShowAddP(true) : setShowAddM(true))}>+ Log {tab === 'prelims' ? 'Prelims' : 'Mains'} test</button>
        </div>
      </div>

      {tab === 'prelims' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="grid cols-4">
            <Card className="stat-card"><div><div className="stat-value">{pa.count}</div><div className="stat-label">Tests taken</div></div></Card>
            <Card className="stat-card"><div><div className="stat-value">{pa.avgScore}%</div><div className="stat-label">Avg score</div><div className="stat-extra">best {pa.best}%</div></div></Card>
            <Card className="stat-card"><div><div className="stat-value">{pa.avgAccuracy}%</div><div className="stat-label">Avg accuracy</div><div className="stat-extra">of attempted</div></div></Card>
            <Card className="stat-card"><div><div className="stat-value">{pa.avgAttempt}%</div><div className="stat-label">Avg attempt rate</div><div className="stat-extra">of 100 Qs</div></div></Card>
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
            <Card>
              <CardHead title="Score & accuracy trend" hint="all prelims tests" right={
                <span className="legend">
                  <span><span className="dot" style={{ background: 'var(--accent)' }} /> Score %</span>
                  <span><span className="dot" style={{ background: 'var(--geo)' }} /> Accuracy %</span>
                </span>} />
              <div className="card-pad" style={{ paddingTop: 10 }}>
                {pa.series.length < 2 ? <Empty icon="◭" title="Need 2+ tests for a trend" hint="Log sectional tests weekly to build the curve" /> : (
                  <LineChart
                    yMax={100}
                    suffix="%"
                    series={[
                      { name: 'Score', color: 'var(--accent)', points: pa.series.map((s) => s.scorePct) },
                      { name: 'Accuracy', color: 'var(--geo)', points: pa.series.map((s) => s.accuracy) },
                    ]}
                    xLabels={pa.series.map((s) => `T${s.idx}`)}
                  />
                )}
              </div>
            </Card>
            <Card>
              <CardHead title="By test type" />
              <div className="card-pad" style={{ paddingTop: 14 }}>
                {pa.byType.length === 0 ? <p className="small muted">No data yet.</p> : <HBars tone="var(--accent-strong)" rows={pa.byType.map((t) => ({ label: t.type, pct: t.avgScore, hint: `${t.count} tests` }))} />}
              </div>
            </Card>
          </div>

          <Card>
            <CardHead title="Prelims test log" hint="last first" />
            <div className="card-pad" style={{ paddingTop: 6 }}>
              {db.prelimsTests.length === 0 ? <Empty icon="A" title="No prelims tests yet" hint="Log each mock with attempts, correct & incorrect to unlock analytics" /> : (
                <div className="table-wrap">
                  <table className="tbl">
                    <thead><tr><th>Test</th><th>Date</th><th>Type</th><th className="num">Attempted</th><th className="num">Correct</th><th className="num">Wrong</th><th className="num">Score</th><th className="num">Acc</th><th></th></tr></thead>
                    <tbody>
                      {[...db.prelimsTests].sort((a, b) => b.testDate.localeCompare(a.testDate)).map((t) => {
                        const acc = t.attempted ? Math.round((t.correct / t.attempted) * 100) : 0;
                        const scorePct = t.maxScore ? Math.round((t.score / t.maxScore) * 100) : 0;
                        return (
                          <tr key={t.id}>
                            <td style={{ fontWeight: 600 }}>{t.testName}{t.notes && <div className="tiny muted">{t.notes}</div>}</td>
                            <td className="num muted">{t.testDate}</td>
                            <td><span className="chip info">{t.testType}</span></td>
                            <td className="num">{t.attempted}/{t.totalQuestions}</td>
                            <td className="num" style={{ color: 'var(--ok)', fontWeight: 700 }}>{t.correct}</td>
                            <td className="num" style={{ color: 'var(--bad)', fontWeight: 700 }}>{t.incorrect}</td>
                            <td className="num" style={{ fontWeight: 800 }}>{t.score}<span className="tiny muted">/{t.maxScore}</span><div className="bar thin" style={{ marginTop: 3, width: 60 }}><div style={{ width: `${scorePct}%` }} /></div></td>
                            <td className="num">{acc}%</td>
                            <td><div className="actions"><button className="icon-btn" style={{ width: 27, height: 27, fontSize: 12 }} onClick={() => setDeleting({ kind: 'p', id: t.id, name: t.testName })}>🗑</button></div></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="grid cols-4">
            <Card className="stat-card"><div><div className="stat-value">{ma.count}</div><div className="stat-label">Mains tests</div></div></Card>
            <Card className="stat-card"><div><div className="stat-value">{ma.avgMarks}%</div><div className="stat-label">Avg marks</div><div className="stat-extra">best {ma.best}%</div></div></Card>
            <Card className="stat-card"><div><div className="stat-value">{(ma.totalWords / 1000).toFixed(1)}k</div><div className="stat-label">Words written</div></div></Card>
            <Card className="stat-card"><div><div className="stat-value">{ma.byPaper.length}</div><div className="stat-label">Papers covered</div></div></Card>
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
            <Card>
              <CardHead title="Marks trend" hint="% of max marks" />
              <div className="card-pad" style={{ paddingTop: 10 }}>
                {ma.series.length < 2 ? <Empty icon="✎" title="Need 2+ tests for a trend" /> : (
                  <LineChart yMax={100} suffix="%" series={[{ name: 'Marks %', color: 'var(--accent)', points: ma.series.map((s) => s.marksPct) }]} xLabels={ma.series.map((s) => `T${s.idx}`)} />
                )}
              </div>
            </Card>
            <Card>
              <CardHead title="By paper" />
              <div className="card-pad" style={{ paddingTop: 14 }}>
                {ma.byPaper.length === 0 ? <p className="small muted">No data yet.</p> : <HBars tone="var(--geo)" rows={ma.byPaper.map((p) => ({ label: p.paper, pct: p.avgMarks, hint: `${p.count} tests` }))} />}
              </div>
            </Card>
          </div>

          <Card>
            <CardHead title="Mains test log" />
            <div className="card-pad" style={{ paddingTop: 6 }}>
              {db.mainsTests.length === 0 ? <Empty icon="✎" title="No mains tests yet" hint="Log sectionals, essays and full mocks with marks & word counts" /> : (
                <div className="table-wrap">
                  <table className="tbl">
                    <thead><tr><th>Test</th><th>Date</th><th>Paper</th><th className="num">Marks</th><th className="num">Words</th><th>Type</th><th></th></tr></thead>
                    <tbody>
                      {[...db.mainsTests].sort((a, b) => b.testDate.localeCompare(a.testDate)).map((t) => (
                        <tr key={t.id}>
                          <td style={{ fontWeight: 600 }}>{t.testName}{t.notes && <div className="tiny muted">{t.notes}</div>}</td>
                          <td className="num muted">{t.testDate}</td>
                          <td><span className="chip accent">{t.paper}</span></td>
                          <td className="num" style={{ fontWeight: 800 }}>{t.marksObtained}<span className="tiny muted">/{t.maxMarks}</span></td>
                          <td className="num">{t.wordCount ?? '—'}</td>
                          <td><span className="chip">{t.testType}</span></td>
                          <td><div className="actions"><button className="icon-btn" style={{ width: 27, height: 27, fontSize: 12 }} onClick={() => setDeleting({ kind: 'm', id: t.id, name: t.testName })}>🗑</button></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      <PrelimsForm open={showAddP} onClose={() => setShowAddP(false)} onSave={addPrelimsTest} />
      <MainsForm open={showAddM} onClose={() => setShowAddM(false)} onSave={addMainsTest} />
      <Confirm open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => {
        if (!deleting) return;
        deleting.kind === 'p' ? deletePrelimsTest(deleting.id) : deleteMainsTest(deleting.id);
        push('Test deleted');
      }} title="Delete test?" body={`"${deleting?.name}" and its analytics contribution will be removed.`} />
    </>
  );
}

function PrelimsForm({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (t: Omit<PrelimsTest, 'id' | 'createdAt'>) => void }) {
  const { push } = useToast();
  const [testName, setTestName] = useState('');
  const [testDate, setTestDate] = useState(todayKey());
  const [testType, setTestType] = useState<PrelimsTest['testType']>('Full Mock');
  const [totalQuestions, setTotalQuestions] = useState('100');
  const [attempted, setAttempted] = useState('');
  const [correct, setCorrect] = useState('');
  const [incorrect, setIncorrect] = useState('');
  const [timeTaken, setTimeTaken] = useState('120');
  const [notes, setNotes] = useState('');

  const t = Number(totalQuestions) || 100;
  const a = Number(attempted) || 0;
  const c = Number(correct) || 0;
  const w = Number(incorrect) || 0;
  const maxScore = t * 2;
  const score = c * 2 - w * 0.66;
  const valid = testName.trim() && a > 0 && c + w <= a;

  const submit = () => {
    if (!valid) { push('Check name, attempted count (correct + wrong ≤ attempted)', 'bad'); return; }
    onSave({
      testName: testName.trim(), testDate, totalQuestions: t, attempted: a, correct: c, incorrect: w,
      score: Math.round(score * 100) / 100, maxScore, timeTakenMinutes: Number(timeTaken) || null, testType, notes,
    });
    push(`Saved · score ${Math.round(score * 100) / 100}/${maxScore} (${Math.round((score / maxScore) * 100)}%)`, 'ok');
    setTestName(''); setAttempted(''); setCorrect(''); setIncorrect(''); setNotes('');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Log Prelims test" wide footer={
      <>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={submit} disabled={!valid}>Save test</button>
      </>
    }>
      <div className="form-grid">
        <Field label="Test name" className="full"><input className="input" value={testName} onChange={(e) => setTestName(e.target.value)} placeholder="e.g. Vision IAS Full Mock 4" autoFocus /></Field>
        <Field label="Date"><input type="date" className="input" value={testDate} onChange={(e) => setTestDate(e.target.value)} /></Field>
        <Field label="Type">
          <select className="input" value={testType} onChange={(e) => setTestType(e.target.value as PrelimsTest['testType'])}>
            {['Full Mock', 'Sectional', 'PYQ', 'CSAT', 'Mini'].map((x) => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Total questions"><input type="number" className="input" value={totalQuestions} onChange={(e) => setTotalQuestions(e.target.value)} /></Field>
        <Field label="Time taken (min)"><input type="number" className="input" value={timeTaken} onChange={(e) => setTimeTaken(e.target.value)} /></Field>
        <Field label="Attempted"><input type="number" className="input" value={attempted} onChange={(e) => setAttempted(e.target.value)} /></Field>
        <Field label="Correct"><input type="number" className="input" value={correct} onChange={(e) => setCorrect(e.target.value)} /></Field>
        <Field label="Incorrect"><input type="number" className="input" value={incorrect} onChange={(e) => setIncorrect(e.target.value)} /></Field>
      </div>
      <div className="card card-pad" style={{ background: 'var(--accent-soft)', border: 'none' }}>
        <div className="row small" style={{ justifyContent: 'space-between' }}>
          <span className="soft">Projected score: <b style={{ fontSize: 16, color: 'var(--text)' }}>{Math.round(score * 100) / 100}</b> / {maxScore} ({maxScore > 0 ? Math.round((score / maxScore) * 100) : 0}%)</span>
          <span className="soft">Accuracy: <b style={{ color: 'var(--text)' }}>{a ? Math.round((c / a) * 100) : 0}%</b> · Attempt rate: <b style={{ color: 'var(--text)' }}>{Math.round((a / t) * 100)}%</b></span>
        </div>
      </div>
      <Field label="Notes — weak areas, silly mistakes, guesses gone wrong"><textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <p className="tiny muted">UPSC Prelims marking: +2 per correct, −0.66 per wrong. CSAT: +2.5, −0.83 (approximate — adjust totals if needed).</p>
    </Modal>
  );
}

function MainsForm({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (t: Omit<MainsTest, 'id' | 'createdAt'>) => void }) {
  const { push } = useToast();
  const [testName, setTestName] = useState('');
  const [testDate, setTestDate] = useState(todayKey());
  const [paper, setPaper] = useState('GS1');
  const [questionNumber, setQuestionNumber] = useState('');
  const [marksObtained, setMarksObtained] = useState('');
  const [maxMarks, setMaxMarks] = useState('250');
  const [timeTaken, setTimeTaken] = useState('180');
  const [wordCount, setWordCount] = useState('');
  const [testType, setTestType] = useState<MainsTest['testType']>('Sectional');
  const [notes, setNotes] = useState('');

  const m = Number(marksObtained) || 0;
  const mm = Number(maxMarks) || 250;

  const submit = () => {
    if (!testName.trim() || m < 0) { push('Check test name and marks', 'bad'); return; }
    onSave({
      testName: testName.trim(), testDate, paper, questionNumber: questionNumber || null,
      marksObtained: m, maxMarks: mm, timeTakenMinutes: Number(timeTaken) || null,
      wordCount: wordCount ? Number(wordCount) : null, testType, notes,
    });
    push(`Saved · ${Math.round((m / mm) * 100)}% of max`, 'ok');
    setTestName(''); setMarksObtained(''); setNotes(''); setWordCount('');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Log Mains test / answer practice" wide footer={
      <>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={submit}>Save test</button>
      </>
    }>
      <div className="form-grid">
        <Field label="Test name" className="full"><input className="input" value={testName} onChange={(e) => setTestName(e.target.value)} placeholder="e.g. GS2 Sectional — Polity & IR" autoFocus /></Field>
        <Field label="Date"><input type="date" className="input" value={testDate} onChange={(e) => setTestDate(e.target.value)} /></Field>
        <Field label="Paper">
          <select className="input" value={paper} onChange={(e) => setPaper(e.target.value)}>
            {['GS1', 'GS2', 'GS3', 'GS4', 'Essay', 'Optional P1', 'Optional P2'].map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Question #"><input className="input" value={questionNumber} onChange={(e) => setQuestionNumber(e.target.value)} placeholder="e.g. Q3(b)" /></Field>
        <Field label="Type">
          <select className="input" value={testType} onChange={(e) => setTestType(e.target.value as MainsTest['testType'])}>
            {['Full Mock', 'Sectional', 'Practice', 'Essay'].map((x) => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Marks obtained"><input type="number" className="input" value={marksObtained} onChange={(e) => setMarksObtained(e.target.value)} /></Field>
        <Field label="Max marks"><input type="number" className="input" value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} /></Field>
        <Field label="Time (min)"><input type="number" className="input" value={timeTaken} onChange={(e) => setTimeTaken(e.target.value)} /></Field>
        <Field label="Word count"><input type="number" className="input" value={wordCount} onChange={(e) => setWordCount(e.target.value)} /></Field>
      </div>
      <Field label="Evaluation notes — structure, intro/conclusion, diagrams, data"><textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
    </Modal>
  );
}
