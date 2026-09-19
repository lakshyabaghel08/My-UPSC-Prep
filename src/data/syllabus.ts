/** Loads the operational syllabus (src/data/syllabus.json) and builds a stable,
 * hierarchy-aware index: paper -> subject -> chapter -> topic -> subtopic. */
import raw from './syllabus.json';
import type { Paper, Subject, Chapter, Topic, Subtopic, ItemType } from '../types';

export interface SyllabusIndex {
  papers: Paper[];
  subjects: Subject[];
  chapters: Chapter[];
  topics: Topic[];
  subtopics: Subtopic[];
  paperById: Map<string, Paper>;
  subjectById: Map<string, Subject>;
  chapterById: Map<string, Chapter>;
  topicById: Map<string, Topic>;
  subtopicById: Map<string, Subtopic>;
  subjectsOf: Map<string, Subject[]>;
  chaptersOf: Map<string, Chapter[]>;
  topicsOf: Map<string, Topic[]>; // by chapterId
  subtopicsOf: Map<string, Subtopic[]>;
  pathOf: (itemId: string, itemType: ItemType) => { paper: Paper | null; subject: Subject | null; chapter: Chapter | null; topic: Topic | null; subtopic: Subtopic | null };
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

interface RawSubtopic { title: string; description?: string; weightage?: number }
interface RawTopic { title: string; description?: string; weightage?: number; subtopics?: RawSubtopic[] }
interface RawChapter { title: string; description?: string; weightage?: number; topics?: RawTopic[] }
interface RawSubject { title: string; description?: string; weightage?: number; chapters?: RawChapter[] }
interface RawPaper { title: string; code?: string | null; description?: string; category: 'prelims' | 'mains' | 'optional'; isOptional?: boolean; weightage?: number; subjects?: RawSubject[] }

function build(rawData: { papers: RawPaper[] }): SyllabusIndex {
  const papers: Paper[] = [];
  const subjects: Subject[] = [];
  const chapters: Chapter[] = [];
  const topics: Topic[] = [];
  const subtopics: Subtopic[] = [];

  rawData.papers.forEach((rp) => {
    const pid = `p:${slug(rp.title)}`;
    papers.push({ id: pid, title: rp.title, code: rp.code ?? null, description: rp.description ?? '', category: rp.category, isOptional: Boolean(rp.isOptional), weightage: rp.weightage ?? 0, order: papers.length });
    (rp.subjects ?? []).forEach((rs, si) => {
      const sid = `${pid}:s${si}:${slug(rs.title)}`;
      subjects.push({ id: sid, paperId: pid, title: rs.title, description: rs.description ?? '', weightage: rs.weightage ?? 0, order: si });
      (rs.chapters ?? []).forEach((rc, ci) => {
        const cid = `${sid}:c${ci}:${slug(rc.title)}`;
        chapters.push({ id: cid, subjectId: sid, title: rc.title, description: rc.description ?? '', weightage: rc.weightage ?? 0, order: ci });
        (rc.topics ?? []).forEach((rt, ti) => {
          const tid = `${cid}:t${ti}:${slug(rt.title)}`;
          topics.push({ id: tid, chapterId: cid, title: rt.title, description: rt.description ?? '', weightage: rt.weightage ?? 0, order: ti });
          (rt.subtopics ?? []).forEach((rst, sti) => {
            const stid = `${tid}:st${sti}:${slug(rst.title)}`;
            subtopics.push({ id: stid, topicId: tid, title: rst.title, description: rst.description ?? '', weightage: rst.weightage ?? 0, order: sti });
          });
        });
      });
    });
  });

  const paperById = new Map(papers.map((p) => [p.id, p]));
  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  const chapterById = new Map(chapters.map((c) => [c.id, c]));
  const topicById = new Map(topics.map((t) => [t.id, t]));
  const subtopicById = new Map(subtopics.map((s) => [s.id, s]));

  const subjectsOf = new Map<string, Subject[]>();
  for (const s of subjects) {
    const arr = subjectsOf.get(s.paperId) ?? [];
    arr.push(s);
    subjectsOf.set(s.paperId, arr);
  }
  const chaptersOf = new Map<string, Chapter[]>();
  for (const c of chapters) {
    const arr = chaptersOf.get(c.subjectId) ?? [];
    arr.push(c);
    chaptersOf.set(c.subjectId, arr);
  }
  const topicsOfChapter = new Map<string, Topic[]>();
  for (const t of topics) {
    const arr = topicsOfChapter.get(t.chapterId) ?? [];
    arr.push(t);
    topicsOfChapter.set(t.chapterId, arr);
  }
  const subtopicsOfTopic = new Map<string, Subtopic[]>();
  for (const st of subtopics) {
    const arr = subtopicsOfTopic.get(st.topicId) ?? [];
    arr.push(st);
    subtopicsOfTopic.set(st.topicId, arr);
  }
  function pathOf(itemId: string, itemType: ItemType) {
    let subtopic: Subtopic | null = null;
    let topic: Topic | null = null;
    let chapter: Chapter | null = null;
    let subject: Subject | null = null;
    let paper: Paper | null = null;
    if (itemType === 'subtopic') { subtopic = subtopicById.get(itemId) ?? null; if (!subtopic) return { paper, subject, chapter, topic, subtopic }; itemId = subtopic.topicId; itemType = 'topic'; }
    if (itemType === 'topic') { topic = topicById.get(itemId) ?? null; if (!topic) return { paper, subject, chapter, topic, subtopic }; itemId = topic.chapterId; itemType = 'chapter'; }
    if (itemType === 'chapter') { chapter = chapterById.get(itemId) ?? null; if (!chapter) return { paper, subject, chapter, topic, subtopic }; itemId = chapter.subjectId; itemType = 'subject'; }
    if (itemType === 'subject') { subject = subjectById.get(itemId) ?? null; if (!subject) return { paper, subject, chapter, topic, subtopic }; itemId = subject.paperId; itemType = 'paper'; }
    if (itemType === 'paper') paper = paperById.get(itemId) ?? null;
    return { paper, subject, chapter, topic, subtopic };
  }

  return {
    papers, subjects, chapters, topics, subtopics,
    paperById, subjectById, chapterById, topicById, subtopicById,
    subjectsOf, chaptersOf,
    topicsOf: topicsOfChapter,
    subtopicsOf: subtopicsOfTopic,
    pathOf,
  };
}

export const syllabus: SyllabusIndex = build(raw as unknown as { papers: RawPaper[] });

/** The user's optional — Geography. IDs of the two optional papers. */
export const OPTIONAL_PAPER_IDS = papersOfCategory('optional').map((p) => p.id);

export function papersOfCategory(cat: Paper['category']): Paper[] {
  return syllabus.papers.filter((p) => p.category === cat);
}

export function itemTitle(itemId: string, itemType: ItemType): string {
  switch (itemType) {
    case 'paper': return syllabus.paperById.get(itemId)?.title ?? itemId;
    case 'subject': return syllabus.subjectById.get(itemId)?.title ?? itemId;
    case 'chapter': return syllabus.chapterById.get(itemId)?.title ?? itemId;
    case 'topic': return syllabus.topicById.get(itemId)?.title ?? itemId;
    case 'subtopic': return syllabus.subtopicById.get(itemId)?.title ?? itemId;
  }
}

export const GEO_PAPER1_ID = syllabus.papers.find((p) => p.title.includes('Paper I'))?.id ?? '';
export const GEO_PAPER2_ID = syllabus.papers.find((p) => p.title.includes('Paper II'))?.id ?? '';
