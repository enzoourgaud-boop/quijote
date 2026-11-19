/** Chargement du contenu de la séquence active (empaqueté par Vite au build). */
import { parseContent, type Issue, type RawContent } from '../engine/content';
import type { Content } from '../engine/schema';
import { applyOverlay, teacher } from './teacher';

const SEQUENCE_ID = 'quijote';

const sequences = import.meta.glob('../../content/sequences/*/sequence.json', { eager: true, import: 'default' });
const enemies = import.meta.glob('../../content/sequences/*/enemies.json', { eager: true, import: 'default' });
const items = import.meta.glob('../../content/sequences/*/items.json', { eager: true, import: 'default' });
const events = import.meta.glob('../../content/sequences/*/events.json', { eager: true, import: 'default' });
const synergies = import.meta.glob('../../content/sequences/*/synergies.json', { eager: true, import: 'default' });
const scenes = import.meta.glob('../../content/sequences/*/scenes.json', { eager: true, import: 'default' });
const questions = import.meta.glob('../../content/sequences/*/questions/*.json', { eager: true, import: 'default' });

export function rawContent(id = SEQUENCE_ID): RawContent {
  const base = `../../content/sequences/${id}/`;
  return {
    sequence: sequences[`${base}sequence.json`],
    enemies: enemies[`${base}enemies.json`],
    items: items[`${base}items.json`],
    events: events[`${base}events.json`] ?? [],
    synergies: synergies[`${base}synergies.json`] ?? [],
    scenes: scenes[`${base}scenes.json`] ?? { decors: [], objects: [] },
    questions: Object.entries(questions)
      .filter(([k]) => k.startsWith(`${base}questions/`))
      .map(([k, data]) => ({ file: k.slice(base.length), data })),
  };
}

export function loadContent(id = SEQUENCE_ID): { content: Content | null; issues: Issue[] } {
  return parseContent(rawContent(id));
}

/**
 * Contenu actif : la séquence importée par le professeur (s'il y en a une, et si elle est valide),
 * sinon la séquence intégrée, avec les questions ajoutées / modifiées / retirées par le professeur.
 */
export function loadActiveContent(): { content: Content | null; issues: Issue[]; fromPack: boolean } {
  const overlay = teacher.overlay();
  const pack = teacher.pack();
  if (pack) {
    const r = parseContent(applyOverlay(pack, overlay));
    if (r.content) return { ...r, fromPack: true };
  }
  return { ...parseContent(applyOverlay(rawContent(), overlay)), fromPack: false };
}
