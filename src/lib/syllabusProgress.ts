import { syllabus } from '../data/syllabus';
import type { ItemProgress, ItemStatus, ItemType } from '../types';

export interface SyllabusNodeRef { id: string; type: ItemType }

export function itemTypeOf(id: string): ItemType {
  if (syllabus.paperById.has(id)) return 'paper';
  if (syllabus.subjectById.has(id)) return 'subject';
  if (syllabus.chapterById.has(id)) return 'chapter';
  if (syllabus.topicById.has(id)) return 'topic';
  return 'subtopic';
}

export function childNodes(id: string): SyllabusNodeRef[] {
  if (syllabus.paperById.has(id)) return (syllabus.subjectsOf.get(id) ?? []).map((x) => ({ id: x.id, type: 'subject' }));
  if (syllabus.subjectById.has(id)) return (syllabus.chaptersOf.get(id) ?? []).map((x) => ({ id: x.id, type: 'chapter' }));
  if (syllabus.chapterById.has(id)) return (syllabus.topicsOf.get(id) ?? []).map((x) => ({ id: x.id, type: 'topic' }));
  if (syllabus.topicById.has(id)) return (syllabus.subtopicsOf.get(id) ?? []).map((x) => ({ id: x.id, type: 'subtopic' }));
  return [];
}

export function parentNode(id: string): SyllabusNodeRef | null {
  const subtopic = syllabus.subtopicById.get(id);
  if (subtopic) return { id: subtopic.topicId, type: 'topic' };
  const topic = syllabus.topicById.get(id);
  if (topic) return { id: topic.chapterId, type: 'chapter' };
  const chapter = syllabus.chapterById.get(id);
  if (chapter) return { id: chapter.subjectId, type: 'subject' };
  const subject = syllabus.subjectById.get(id);
  if (subject) return { id: subject.paperId, type: 'paper' };
  return null;
}

export function subtreeNodes(rootId: string): SyllabusNodeRef[] {
  const root = { id: rootId, type: itemTypeOf(rootId) };
  const out: SyllabusNodeRef[] = [root];
  for (let i = 0; i < out.length; i++) out.push(...childNodes(out[i].id));
  return out;
}

export function leafNodes(rootId?: string): SyllabusNodeRef[] {
  const roots = rootId ? [{ id: rootId, type: itemTypeOf(rootId) }] : syllabus.papers.map((p) => ({ id: p.id, type: 'paper' as const }));
  const leaves: SyllabusNodeRef[] = [];
  const queue = [...roots];
  while (queue.length) {
    const node = queue.shift()!;
    const children = childNodes(node.id);
    if (children.length) queue.push(...children);
    else leaves.push(node);
  }
  return leaves;
}

/** Derived status also supports historical data that only stored leaf rows. */
export function hierarchyStatus(id: string, progress: Record<string, ItemProgress>): ItemStatus {
  const children = childNodes(id);
  if (!children.length) return progress[id]?.status ?? 'not_started';
  const statuses = children.map((child) => hierarchyStatus(child.id, progress));
  if (statuses.every((status) => status === 'completed')) return 'completed';
  if (statuses.every((status) => status === 'not_started')) return 'not_started';
  return 'in_progress';
}

function blankProgress(node: SyllabusNodeRef, now: string): ItemProgress {
  return {
    itemId: node.id,
    itemType: node.type,
    status: 'not_started',
    revisionCount: 0,
    confidence: 0,
    lastRevisedAt: null,
    nextRevisionAt: null,
    notes: '',
    tags: [],
    updatedAt: now,
  };
}

/**
 * Apply one hierarchy toggle in memory. Completing/uncompleting a non-leaf
 * cascades to every descendant, then all ancestors are recalculated from their
 * immediate children. Each affected item is written once.
 */
export function applyHierarchyStatus(
  current: Record<string, ItemProgress>,
  itemId: string,
  requested: ItemStatus,
  now = new Date().toISOString(),
): { progress: Record<string, ItemProgress>; changed: SyllabusNodeRef[] } {
  const progress = { ...current };
  const changed = new Map<string, SyllabusNodeRef>();
  const root = { id: itemId, type: itemTypeOf(itemId) };
  const cascade = childNodes(itemId).length > 0 && requested !== 'in_progress';
  const targets = cascade ? subtreeNodes(itemId) : [root];

  for (const node of targets) {
    const previous = progress[node.id] ?? blankProgress(node, now);
    if (previous.status !== requested || !progress[node.id]) {
      progress[node.id] = { ...previous, itemType: node.type, status: requested, updatedAt: now };
      changed.set(node.id, node);
    }
  }

  let ancestor = cascade ? parentNode(itemId) : parentNode(root.id);
  // For leaf changes this begins at its parent; for parent cascades the root is
  // already deterministic and only nodes above it need recalculation.
  while (ancestor) {
    const nextStatus = hierarchyStatus(ancestor.id, progress);
    const previous = progress[ancestor.id] ?? blankProgress(ancestor, now);
    if (previous.status !== nextStatus || !progress[ancestor.id]) {
      progress[ancestor.id] = { ...previous, itemType: ancestor.type, status: nextStatus, updatedAt: now };
      changed.set(ancestor.id, ancestor);
    }
    ancestor = parentNode(ancestor.id);
  }

  return { progress, changed: [...changed.values()] };
}
