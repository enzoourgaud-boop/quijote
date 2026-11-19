/**
 * Progression entre les parties : collection de lotería, succès, personnages, niveaux de Calavera,
 * révision de Leitner. Fonctions pures, testables ; la sauvegarde est faite par l'interface.
 */
import type { Verdict } from './answer';
import { MAX_ASCENSION, type RunState } from './game';
import type { Content, Question } from './schema';

/* ======================= Leitner ======================= */

/**
 * Boîte de Leitner d'une question : [boîte 1-5, nombre de fois vue, nombre d'erreurs, dernière réponse].
 * La dernière réponse est une date en minutes (absente des sauvegardes d'avant la version 1.1).
 */
export type LeitnerEntry = [box: number, seen: number, wrong: number, last?: number];
export type Leitner = Record<string, LeitnerEntry>;

/** Met à jour une boîte : bonne réponse = boîte suivante, erreur = retour en boîte 1, « casi » = reste. */
export function leitnerUpdate(l: Leitner, id: string, v: Verdict, now = Date.now()): Leitner {
  const [box, seen, wrong] = l[id] ?? [0, 0, 0];
  const nb = v === 'ok' ? Math.min(5, Math.max(1, box) + 1) : v === 'ko' ? 1 : Math.max(1, box);
  return { ...l, [id]: [nb, seen + 1, wrong + (v === 'ok' ? 0 : 1), Math.floor(now / 60000)] };
}

/**
 * « Almas pendientes » : les questions ratées et pas encore réussies depuis (boîte 1, au moins une erreur),
 * les plus récentes d'abord. Elles sont reposées au début de la partie suivante.
 */
export function pendingAlmas(l: Leitner): string[] {
  return Object.keys(l)
    .filter(id => l[id][0] === 1 && l[id][2] > 0)
    .sort((a, b) => (l[b][3] ?? 0) - (l[a][3] ?? 0));
}

/**
 * Poids de tirage : une question ratée (boîte 1) revient environ 6 fois plus qu'une question maîtrisée (boîte 5).
 * Une question jamais vue est prioritaire, sans dépasser les questions ratées.
 */
export function leitnerWeight(l: Leitner, id: string): number {
  const box = l[id]?.[0] ?? 0;
  return [4, 6, 4, 2.5, 1.5, 1][box] ?? 1;
}

export interface NotionStat {
  id: string;
  label: string;
  /** Score de fragilité : plus il est haut, plus la notion est à revoir. */
  weakness: number;
  wrong: number;
  /** Questions à revoir (boîte 1 ou 2, déjà ratées), les plus fragiles d'abord. */
  questions: Question[];
  mastered: number;
  total: number;
}

/** Bilan par notion pour l'écran « Mon carnet ». */
export function notionStats(content: Content, l: Leitner): NotionStat[] {
  const out: NotionStat[] = content.sequence.notions.map(n => ({ id: n.id, label: n.label, weakness: 0, wrong: 0, questions: [], mastered: 0, total: 0 }));
  const byId = new Map(out.map(n => [n.id, n]));
  for (const q of content.questions) {
    if (q.disabled) continue;
    const e = l[q.id];
    for (const nid of q.notions) {
      const n = byId.get(nid);
      if (!n) continue;
      n.total++;
      if (!e) continue;
      if (e[0] >= 4) n.mastered++;
      if (e[2] > 0 && e[0] <= 2) {
        n.weakness += e[2] * (6 - e[0]);
        n.wrong += e[2];
        n.questions.push(q);
      }
    }
  }
  for (const n of out) n.questions.sort((a, b) => (l[a.id][0] - l[b.id][0]) || l[b.id][2] - l[a.id][2]);
  return out.sort((a, b) => b.weakness - a.weakness);
}

/* ======================= Profil ======================= */

export interface Meta {
  v: 1;
  runs: number;
  wins: number;
  bestWon: number;
  /** Niveau de Calavera le plus haut débloqué. */
  maxAscension: number;
  bossesDefeated: string[];
  /** Cartes de lotería : « e:<ennemi> » ou « i:<objet> ». */
  cards: string[];
  achievements: string[];
  /** Personnages ayant gagné une partie. */
  winsWith: string[];
  bestMinutes: number;
}

export const emptyMeta = (): Meta => ({
  v: 1, runs: 0, wins: 0, bestWon: 0, maxAscension: 0, bossesDefeated: [], cards: [], achievements: [], winsWith: [], bestMinutes: 0,
});

export function characterUnlocked(content: Content, meta: Meta, id: string): boolean {
  const ch = content.sequence.characters.find(c => c.id === id);
  if (!ch) return false;
  switch (ch.unlock.type) {
    case 'default': return true;
    case 'boss': return meta.bossesDefeated.includes(ch.unlock.value);
    case 'wins': return meta.wins >= ch.unlock.value;
  }
}

/** Toutes les cartes possibles, dans l'ordre des numéros. */
export function allCards(content: Content): { key: string; card: number; name: string; emoji: string; top?: string; phrase?: string; kind: 'enemy' | 'item'; desc: string }[] {
  const cards = [
    ...content.enemies.map(e => ({ key: `e:${e.id}`, card: e.card, name: e.name, emoji: e.emoji, top: e.top, phrase: e.phrase, kind: 'enemy' as const, desc: e.kind === 'final' ? 'Jefa final' : e.kind === 'jefe' ? 'Jefe' : e.kind === 'elite' ? 'Élite' : 'Ennemi' })),
    ...content.items.filter(i => i.card).map(i => ({ key: `i:${i.id}`, card: i.card!, name: i.name, emoji: i.emoji, phrase: i.phrase, kind: 'item' as const, desc: i.kind === 'reliquia' ? 'Relique' : 'Aide' })),
  ];
  return cards.sort((a, b) => a.card - b.card);
}

/* ======================= Succès ======================= */

export interface Achievement {
  id: string;
  icon: string;
  name: string;
  desc: string;
  test: (r: RunState, m: Meta, ctx: { content: Content; leitner: Leitner; synergies: number }) => boolean;
}

const minutes = (r: RunState) => (r.stats.endedAt - r.stats.startedAt) / 60000;
const won = (r: RunState) => r.result === 'win';

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'primer-paso', icon: '👣', name: 'Primer paso', desc: 'Gagner un premier combat.', test: r => r.stats.won >= 1 },
  { id: 'jefe-1', icon: '📕', name: 'Gran lector', desc: "Vaincre le jefe de l'acte 1.", test: (r, _m, { content }) => r.defeated.includes(content.sequence.acts[0]?.boss) },
  { id: 'jefe-2', icon: '🌀', name: '¡Es un molino!', desc: "Vaincre le jefe de l'acte 2.", test: (r, _m, { content }) => r.defeated.includes(content.sequence.acts[1]?.boss ?? '-') },
  { id: 'victoria', icon: '🏆', name: '¡Felicidades!', desc: 'Vaincre le jefe final.', test: won },
  { id: 'sin-errores', icon: '💯', name: 'Sin errores', desc: 'Gagner un combat sans aucune erreur.', test: r => r.stats.perfectFights >= 1 },
  { id: 'perfeccionista', icon: '🏅', name: 'Perfeccionista', desc: 'Gagner 5 combats sans erreur dans la même partie.', test: r => r.stats.perfectFights >= 5 },
  { id: 'escritor', icon: '✒️', name: 'Escritor', desc: 'Écrire 15 bonnes réponses dans une partie.', test: r => r.stats.written >= 15 },
  { id: 'racha', icon: '🔥', name: 'Racha', desc: 'Enchaîner 8 bonnes réponses.', test: r => r.stats.maxStreak >= 8 },
  { id: 'racha-loca', icon: '☄️', name: 'Racha loca', desc: 'Enchaîner 15 bonnes réponses.', test: r => r.stats.maxStreak >= 15 },
  { id: 'conjunto', icon: '🤝', name: 'Conjunto completo', desc: 'Compléter un ensemble de reliques.', test: (_r, _m, { synergies }) => synergies > 0 },
  { id: 'sin-poderes', icon: '🙌', name: 'Sin ayuda', desc: 'Gagner une partie sans utiliser une seule aide.', test: r => won(r) && r.stats.powersUsed === 0 },
  { id: 'rapido', icon: '⚡', name: 'Rápido', desc: 'Gagner une partie en moins de 15 minutes.', test: r => won(r) && minutes(r) < 15 },
  { id: 'por-un-pelo', icon: '😅', name: 'Por un pelo', desc: 'Gagner avec 3 PV ou moins.', test: r => won(r) && r.hp <= 3 },
  { id: 'caballero-3', icon: '🛡️', name: 'Caballero 3', desc: 'Gagner au Nivel de caballero 3.', test: r => won(r) && r.ascension >= 3 },
  { id: 'caballero-10', icon: '⚔️', name: 'Caballero 10', desc: 'Gagner au Nivel de caballero 10.', test: r => won(r) && r.ascension >= 10 },
  { id: 'coleccionista', icon: '📚', name: 'Coleccionista', desc: 'Réunir 20 cartes de l’album.', test: (_r, m) => m.cards.length >= 20 },
  { id: 'album-lleno', icon: '📖', name: '¡Álbum completo!', desc: 'Réunir toutes les cartes.', test: (_r, m, { content }) => m.cards.length >= allCards(content).length },
  { id: 'trio', icon: '👥', name: 'Trío', desc: 'Gagner avec chacun des personnages.', test: (_r, m, { content }) => content.sequence.characters.every(c => m.winsWith.includes(c.id)) },
  { id: 'estudioso', icon: '📚', name: 'Estudioso', desc: 'Maîtriser 50 questions (boîte 4 ou 5 du carnet).', test: (_r, _m, { leitner }) => Object.values(leitner).filter(e => e[0] >= 4).length >= 50 },
];

/* ======================= Fin de partie ======================= */

export interface Unlocks {
  cards: string[];
  achievements: Achievement[];
  characters: string[];
  ascension: number | null;
}

/** Intègre une partie terminée au profil. Renvoie le nouveau profil et ce qui vient d'être débloqué. */
export function applyRun(content: Content, before: Meta, r: RunState, leitner: Leitner, synergies: number): { meta: Meta; unlocks: Unlocks } {
  const m: Meta = structuredClone(before);
  const win = r.result === 'win';
  m.runs++;
  if (win) {
    m.wins++;
    if (!m.winsWith.includes(r.character)) m.winsWith.push(r.character);
    const mins = (r.stats.endedAt - r.stats.startedAt) / 60000;
    m.bestMinutes = m.bestMinutes ? Math.min(m.bestMinutes, mins) : mins;
  }
  m.bestWon = Math.max(m.bestWon, r.stats.won);
  for (const id of r.defeated) {
    const e = content.enemies.find(x => x.id === id);
    if (e && (e.kind === 'jefe' || e.kind === 'final') && !m.bossesDefeated.includes(id)) m.bossesDefeated.push(id);
  }
  // cartes
  const valid = new Set(allCards(content).map(c => c.key));
  const newCards = [...r.defeated.map(id => `e:${id}`), ...r.obtained.map(id => `i:${id}`)].filter(k => valid.has(k) && !m.cards.includes(k));
  m.cards.push(...newCards);
  // niveau de Calavera : une victoire au niveau maximal débloque le suivant
  let ascension: number | null = null;
  if (win && r.ascension >= m.maxAscension && m.maxAscension < MAX_ASCENSION) {
    m.maxAscension = r.ascension + 1;
    ascension = m.maxAscension;
  }
  // personnages
  const charsBefore = content.sequence.characters.filter(c => characterUnlocked(content, before, c.id)).map(c => c.id);
  const characters = content.sequence.characters.filter(c => characterUnlocked(content, m, c.id) && !charsBefore.includes(c.id)).map(c => c.id);
  // succès
  const achievements = ACHIEVEMENTS.filter(a => !m.achievements.includes(a.id) && a.test(r, m, { content, leitner, synergies }));
  m.achievements.push(...achievements.map(a => a.id));
  return { meta: m, unlocks: { cards: newCards, achievements, characters, ascension } };
}
