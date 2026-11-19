/**
 * Moteur de partie : état sérialisable + actions. Aucun accès au DOM.
 * L'interface appelle les actions (choose, answer, usePower, proceed…) puis relit `state`.
 */
import { type AccentPolicy, autoHint, fillBlanks, maskAnswer, normalize, type Verdict } from './answer';
import { type ActMap, generateMap, nodeById, reachable, type MapNode } from './map';
import {
  answerText, canonicalValue, fixedMode, givenText, isChoice, isWritable, judgeQuestion, type Mode, orderTokens, questionWords, scissorsHint, STRONG_MODES, TF_OPTIONS,
} from './questions';
import { Rng } from './rng';
import {
  type Act, type Content, type Enemy, type EventEffect, type EventOutcome, type GameEvent, type Intent, type Item, type Phase,
  type Question, type QuestionType, type Rarity, type RoomType, type Synergy, type Trait, levelNum,
} from './schema';

/* ======================= Types ======================= */

export interface Settings {
  /** Thèmes actifs (null = tous). */
  themes: string[] | null;
  /** Types de questions actifs (null = tous). */
  types: string[] | null;
  chrono: boolean;
  /** Multiplie la durée du chrono (1 = normal). */
  chronoFactor: number;
  /** Multiplie la part de réponses écrites (0 = jamais d'écrit, 1 = normal, 2 = double). */
  writeFactor: number;
  accents: AccentPolicy;
}

export const DEFAULT_SETTINGS: Settings = {
  themes: null, types: null, chrono: false, chronoFactor: 1, writeFactor: 1, accents: 'casi',
};

export type { Mode } from './questions';

export interface Asked {
  id: string;
  mode: Mode;
  options: string[];
  again?: boolean;
}

export type Outcome = Verdict | 'timeout' | 'oracle';

/** Effets visuels à jouer après une réponse (l'interface décide comment les animer). */
export type Fx =
  | 'enemyHit' | 'crit' | 'combo' | 'zero' | 'shieldHit' | 'vanish' | 'abanico' | 'heal' | 'enemyDown'
  | 'alma' | 'playerHit' | 'blocked' | 'reflect' | 'mask' | 'canceled' | 'steal' | 'stealItem' | 'poison' | 'playerDown'
  | 'casi' | 'phase' | 'revive' | 'playerHeal';

export interface Feedback {
  outcome: Outcome;
  /** Effets visuels, dans l'ordre. */
  fx: Fx[];
  title: string;
  given: string | null;
  lines: string[];
  alert?: string;
  dmgToEnemy: number;
  dmgToPlayer: number;
  combo?: number;
}

export interface CombatState {
  enemyId: string;
  hp: number;
  maxHp: number;
  shield: number;
  abanico: number;
  phase: number;
  turn: number;
  intent: Intent;
  /** L'intention de ce tour est annulée (Incienso). */
  canceled: boolean;
  attackBonus: number;
  weakTheme: string | null;
  juicio: boolean;
  vanishUsed: boolean;
  firstErrorUsed: boolean;
  freeTranslateUsed: boolean;
  rowCorrect: number;
  /** Erreurs pendant ce combat (combat parfait = 0). */
  errors: number;
  fog: boolean;
  q: Asked;
  fb: Feedback | null;
  used: { translate?: boolean; hint?: boolean; scissors?: boolean };
  hidden: string[];
  mask: string;
  timeMax: number;
  timeLeft: number;
}

/** Petite question hors combat (événement, coffre). */
export interface QuizState {
  q: Asked;
  fb: { verdict: Verdict; given: string } | null;
}

export interface RoomResult {
  text: string;
  textFr?: string;
  lines: string[];
}

export interface EventState {
  id: string;
  choice: number | null;
  quiz: QuizState | null;
  result: RoomResult | null;
  pendingFight: 'normal' | 'elite' | null;
}

export interface ChestState {
  locked: boolean;
  quiz: QuizState | null;
  result: RoomResult | null;
}

export interface RestState {
  result: RoomResult | null;
}

/** Échauffement de début de partie : les questions ratées aux parties précédentes (« almas pendientes »). */
export interface WarmupState {
  ids: string[];
  i: number;
  quiz: QuizState;
  /** Âmes libérées pendant l'échauffement (chacune donne +1 PV). */
  freed: number;
}

export interface ErrorEntry {
  id: string;
  prompt: string;
  answer: string;
  explanation: string;
  given: string | null;
}

export interface Offer {
  id: string;
  sold?: boolean;
}

export type Screen = 'warmup' | 'map' | 'combat' | 'reward' | 'shop' | 'rest' | 'event' | 'chest' | 'over';

export interface RunState {
  v: 3;
  /** Personnage choisi et niveau de difficulté (« Nivel de Calavera », 0 à 10). */
  character: string;
  ascension: number;
  /** Bonus du personnage. */
  bonus: { writeShare: number; restHeal: number };
  /** Ennemis vaincus et objets obtenus (collection de lotería). */
  defeated: string[];
  obtained: string[];
  seed: string;
  rng: number;
  screen: Screen;
  hp: number;
  maxHp: number;
  gold: number;
  act: number;
  map: ActMap;
  /** Salle actuelle (null = au départ de l'acte). */
  node: string | null;
  /** Salles traversées dans l'acte. */
  path: string[];
  inv: Record<string, number>;
  relics: Record<string, number>;
  upgrades: Record<string, boolean>;
  streak: number;
  poison: number;
  reviveUsed: boolean;
  luckyCount: number;
  stats: {
    ok: number; ko: number; casi: number; won: number; written: number; turns: number; rooms: number; startedAt: number; endedAt: number;
    maxStreak: number; perfectFights: number; powersUsed: number;
    /** Questions ratées (dans cette partie ou une précédente) puis réussies : « almas liberadas ». */
    freed?: number;
  };
  seen: Record<string, number>;
  /** Dernières questions posées (les plus récentes à la fin), pour éviter les enchaînements trop proches. */
  recent?: string[];
  /** Questions ratées à reposer (« almas pendientes ») : celles des parties précédentes, puis celles de cette partie. */
  retry: string[];
  warmup?: WarmupState | null;
  errors: ErrorEntry[];
  metEnemies: string[];
  seenEvents: string[];
  combat: CombatState | null;
  offer: Offer[] | null;
  offerKind: 'normal' | 'elite' | 'jefe' | null;
  event: EventState | null;
  chest: ChestState | null;
  rest: RestState | null;
  result: 'win' | 'lose' | null;
}

/** Les types « manipulables », moins nombreux dans la banque, sortent un peu plus souvent pour varier. */
const TYPE_WEIGHT: Partial<Record<QuestionType, number>> = { ordre: 2.2, association: 2, scene: 1.8, ecoute: 1.6, 'vrai-faux': 1.3 };

export const MAX_ASCENSION = 10;

/** Effets cumulatifs de chaque « Nivel de caballero ». */
export const ASCENSION_RULES: string[] = [
  'Le chemin normal.',
  'Les ennemis ont 1 PV de plus.',
  'Le chrono est plus court de 3 secondes.',
  'Une aide de départ en moins.',
  'Les élites ont 2 PV et 1 attaque de plus.',
  'Les combats rapportent moins de monedas.',
  "Le repos soigne moins (−10 points).",
  'Les jefes ont 3 PV de plus.',
  'Davantage de questions à écrire.',
  '3 PV de moins au départ.',
  'Le jefe final a 6 PV et 1 attaque de plus.',
];

/** Nombre de questions récentes comparées pour éviter les enchaînements proches. */
export const RECENT_WINDOW = 6;
/** Une question ratée ne revient pas avant ce nombre de questions. */
export const RETRY_GAP = 6;
/** Chance, à chaque question de combat, de reposer une question ratée en attente. */
export const RETRY_CHANCE = 0.35;
/** Échauffement : nombre de questions au plus, et nombre de questions ratées reprises d'une partie à l'autre. */
export const WARMUP_MAX = 4;
export const CARRY_MAX = 12;

const RARITY_WEIGHT: Record<Rarity, number> = { comun: 60, rara: 30, legendaria: 10 };
const BOSS_RARITY_WEIGHT: Record<Rarity, number> = { comun: 15, rara: 55, legendaria: 30 };

interface PickOpts {
  themes: string[];
  level: 1 | 2 | 3 | 4;
  needWrite: boolean;
  weakTheme?: string | null;
  onlyType?: QuestionType;
}

/* ======================= Moteur ======================= */

export class Game {
  readonly content: Content;
  settings: Settings;
  state: RunState;
  private rng: Rng;
  private qById: Map<string, Question>;
  private enemyById: Map<string, Enemy>;
  private itemById: Map<string, Item>;
  private eventById: Map<string, GameEvent>;
  private listeners = new Set<() => void>();
  /** Poids de tirage d'une question (révision de Leitner). */
  weightOf: (q: Question) => number = () => 1;
  /** Appelé à chaque réponse corrigée (mise à jour des boîtes de Leitner). */
  onRecord?: (q: Question, v: Verdict) => void;

  constructor(content: Content, settings: Settings, state: RunState) {
    this.content = content;
    this.settings = settings;
    this.state = state;
    this.rng = new Rng(state.rng);
    this.qById = new Map(content.questions.map(q => [q.id, q]));
    this.enemyById = new Map(content.enemies.map(e => [e.id, e]));
    this.itemById = new Map(content.items.map(i => [i.id, i]));
    this.eventById = new Map(content.events.map(e => [e.id, e]));
    // mots importants de chaque question, sans les mots trop fréquents dans la banque
    const raw = new Map(content.questions.map(q => [q.id, questionWords(q)]));
    const df = new Map<string, number>();
    for (const w of raw.values()) for (const x of w.all) df.set(x, (df.get(x) ?? 0) + 1);
    const tooCommon = Math.max(12, content.questions.length * 0.06);
    const keep = (set: Set<string>) => new Set([...set].filter(x => (df.get(x) ?? 0) <= tooCommon));
    this.words = new Map([...raw].map(([id, w]) => [id, { all: keep(w.all), answer: keep(w.answer) }]));
  }

  private words: Map<string, { all: Set<string>; answer: Set<string> }>;

  /** Deux questions sont « trop proches » si elles partagent 2 mots importants, ou si la réponse de l'une est dans l'autre. */
  closeTo(a: string, b: string): boolean {
    if (a === b) return true;
    const A = this.words.get(a), B = this.words.get(b);
    if (!A || !B) return false;
    let shared = 0;
    for (const w of A.all) if (B.all.has(w)) shared++;
    if (shared >= 2) return true;
    for (const w of A.answer) if (B.all.has(w)) return true;
    for (const w of B.answer) if (A.all.has(w)) return true;
    return false;
  }

  /** La question ressemble-t-elle à l'une des dernières posées ? */
  private clashes(id: string, window = RECENT_WINDOW): boolean {
    const r = this.state.recent ?? [];
    return r.slice(-window).some(x => this.closeTo(id, x));
  }

  /** Démarre une nouvelle partie à partir d'une graine. */
  static newRun(content: Content, settings: Settings, seed: string, now = Date.now(), opts: { character?: string; ascension?: number; pending?: string[] } = {}): Game {
    const rng = new Rng(seed);
    const p = content.sequence.player;
    const chars = content.sequence.characters;
    const ch = chars.find(c => c.id === opts.character) ?? chars.find(c => c.unlock.type === 'default') ?? chars[0];
    const asc = Math.max(0, Math.min(MAX_ASCENSION, opts.ascension ?? 0));
    const inv: Record<string, number> = { ...p.startItems };
    if (asc >= 3) {
      // Calavera 3 : une aide de départ en moins
      const last = Object.keys(inv).filter(k => inv[k] > 0).pop();
      if (last) inv[last]--;
    }
    for (const [id, n] of Object.entries(ch?.bonus.items ?? {})) inv[id] = (inv[id] ?? 0) + n;
    const relics: Record<string, number> = { ...(ch?.bonus.relics ?? {}) };
    const hp = Math.max(5, p.hp + (ch?.bonus.hp ?? 0) - (asc >= 9 ? 3 : 0));
    const state: RunState = {
      v: 3, seed, rng: rng.state, screen: 'map', hp, maxHp: hp, gold: 0, act: 0,
      character: ch?.id ?? '', ascension: asc, bonus: { writeShare: ch?.bonus.writeShare ?? 0, restHeal: ch?.bonus.restHeal ?? 0.3 },
      defeated: [], obtained: Object.keys(relics),
      map: generateMap(rng, content.sequence.map), node: null, path: [],
      inv, relics, upgrades: {}, streak: 0, poison: 0, reviveUsed: false, luckyCount: 0,
      stats: { ok: 0, ko: 0, casi: 0, won: 0, written: 0, turns: 0, rooms: 0, startedAt: now, endedAt: 0, maxStreak: 0, perfectFights: 0, powersUsed: 0 },
      seen: {}, retry: [], errors: [], metEnemies: [], seenEvents: [],
      combat: null, offer: null, offerKind: null, event: null, chest: null, rest: null, result: null,
    };
    const g = new Game(content, settings, state);
    g.startWarmup(opts.pending ?? []);
    g.commit();
    return g;
  }

  /** Applique de nouveaux réglages en cours de partie (chrono coupé ou rallumé depuis les Options). */
  updateSettings(settings: Settings) {
    this.settings = settings;
    const c = this.state.combat;
    // chrono coupé : la question en cours n'est plus minutée ; rallumé, il reprend à la question suivante
    if (c && !settings.chrono) c.timeMax = c.timeLeft = 0;
    this.commit();
  }

  /* ---------- almas pendientes : échauffement ---------- */

  /** Nombre de questions ratées qui attendent d'être reposées. */
  get pendingCount(): number {
    return this.state.retry.length;
  }

  private quizFor(q: Question): QuizState {
    return { q: this.makeAsked(q, this.chooseMode(q, this.writeChance())), fb: null };
  }

  /** Les questions ratées aux parties précédentes : les premières en échauffement, les suivantes pendant la partie. */
  private startWarmup(pending: string[]) {
    const s = this.state;
    const themes = this.activeThemes();
    const ids = [...new Set(pending)].filter(id => {
      const q = this.qById.get(id);
      return !!q && this.isUsable(q) && themes.includes(q.theme);
    }).slice(0, CARRY_MAX);
    const warm = ids.slice(0, WARMUP_MAX);
    s.retry = ids.slice(WARMUP_MAX);
    if (!warm.length) return;
    s.warmup = { ids: warm, i: 0, quiz: this.quizFor(this.qById.get(warm[0])!), freed: 0 };
    s.screen = 'warmup';
  }

  warmupAnswer(value: string) {
    const s = this.state, w = s.warmup;
    if (s.screen !== 'warmup' || !w) return;
    const v = this.answerQuiz(w.quiz, value);
    if (v === 'ok') {
      w.freed++;
      s.maxHp++;
      s.hp++;
    }
    if (v) this.commit();
  }

  /** Question suivante de l'échauffement, ou départ sur la carte. */
  warmupNext() {
    const s = this.state, w = s.warmup;
    if (s.screen !== 'warmup' || !w || !w.quiz.fb) return;
    if (w.i + 1 >= w.ids.length) s.screen = 'map';
    else {
      w.i++;
      w.quiz = this.quizFor(this.qById.get(w.ids[w.i])!);
    }
    this.commit();
  }

  /** Passe l'échauffement : les questions restantes reviendront pendant la partie. */
  warmupSkip() {
    const s = this.state, w = s.warmup;
    if (s.screen !== 'warmup' || !w) return;
    const rest = w.ids.slice(w.quiz.fb ? w.i + 1 : w.i).filter(id => !s.retry.includes(id));
    s.retry = [...rest, ...s.retry];
    s.screen = 'map';
    this.commit();
  }

  /* ---------- abonnements ---------- */
  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private commit() {
    this.state.rng = this.rng.state;
    this.listeners.forEach(f => f());
  }

  /* ---------- accès ---------- */
  get act(): Act {
    return this.content.sequence.acts[this.state.act];
  }
  get enemy(): Enemy | null {
    return this.state.combat ? this.enemyById.get(this.state.combat.enemyId)! : null;
  }
  get phase(): Phase | null {
    const c = this.state.combat, e = this.enemy;
    return c && e?.phases ? e.phases[c.phase] : null;
  }
  get question(): Question | null {
    return this.state.combat ? this.qById.get(this.state.combat.q.id) ?? null : null;
  }
  get currentNode(): MapNode | null {
    return this.state.node ? nodeById(this.state.map, this.state.node) ?? null : null;
  }
  get currentEvent(): GameEvent | null {
    return this.state.event ? this.eventById.get(this.state.event.id) ?? null : null;
  }
  item(id: string): Item | undefined {
    return this.itemById.get(id);
  }
  getQuestion(id: string): Question | undefined {
    return this.qById.get(id);
  }
  enemyDef(id: string): Enemy | undefined {
    return this.enemyById.get(id);
  }
  reachable(): MapNode[] {
    return this.state.screen === 'map' ? reachable(this.state.map, this.state.node) : [];
  }
  relicCount(effect: Item['effect']): number {
    let n = 0;
    for (const [id, k] of Object.entries(this.state.relics)) if (this.itemById.get(id)?.effect === effect) n += k;
    return n;
  }
  relicValue(effect: Item['effect'], fallback = 1): number {
    let n = 0;
    for (const [id, k] of Object.entries(this.state.relics)) {
      const it = this.itemById.get(id);
      if (it?.effect === effect) n += k * (it.value ?? fallback);
    }
    return n;
  }
  /** Synergies complètes (toutes leurs reliques possédées). */
  activeSynergies(): Synergy[] {
    return this.content.synergies.filter(s => s.items.every(id => (this.state.relics[id] ?? 0) > 0));
  }
  /** Synergies commencées : nombre de reliques possédées sur le total. */
  synergyProgress(): { synergy: Synergy; owned: number }[] {
    return this.content.synergies
      .map(s => ({ synergy: s, owned: s.items.filter(id => (this.state.relics[id] ?? 0) > 0).length }))
      .filter(x => x.owned > 0);
  }
  private synergy(effect: Synergy['effect']): Synergy | undefined {
    return this.activeSynergies().find(s => s.effect === effect);
  }
  traits(): Set<Trait> {
    const e = this.enemy;
    return new Set([...(e?.traits ?? []), ...(this.phase?.traits ?? [])]);
  }
  get streakThreshold(): number {
    return this.relicCount('streakMaster') ? 2 : 3;
  }
  isUpgraded(id: string): boolean {
    return !!this.state.upgrades[id];
  }
  /** Le Traductor gratuit du Diccionario est-il disponible ? */
  freeTranslateAvailable(): boolean {
    const c = this.state.combat;
    return !!c && this.relicCount('freeTranslate') > 0 && !c.freeTranslateUsed;
  }
  /** Les pouvoirs sont-ils utilisables maintenant ? Renvoie la raison sinon. */
  powerBlock(id: string): string | null {
    const s = this.state, c = s.combat, it = this.itemById.get(id), q = this.question;
    if (!it) return 'inconnu';
    const free = it.effect === 'translate' && this.freeTranslateAvailable();
    if (!(s.inv[id] > 0) && !free) return 'non possédé';
    if (it.auto) return 'automatique';
    if (it.effect === 'heal') return s.hp >= s.maxHp ? 'vie pleine' : null;
    if (s.screen !== 'combat' || !c || c.fb || !q) return 'hors combat';
    if (c.fog) return 'brouillard';
    if (this.enemy?.modifier === 'niebla' && (it.effect === 'translate' || it.effect === 'hint')) return 'niebla';
    switch (it.effect) {
      case 'translate': return !this.translationText() ? 'rien à traduire' : c.used.translate ? 'déjà utilisé' : null;
      case 'hint': return c.used.hint ? 'déjà utilisé' : null;
      case 'scissors': return c.used.scissors ? 'déjà utilisé' : c.q.mode === 'tf' ? 'inutile ici' : null;
      case 'time': return c.timeMax ? null : 'pas de chrono';
      case 'cancelIntent': return c.canceled ? 'déjà utilisé' : null;
      default: return null;
    }
  }

  /* ======================= Carte ======================= */

  /** Entre dans une salle accessible de la carte. */
  choose(nodeId: string): boolean {
    const s = this.state;
    if (s.screen !== 'map') return false;
    const node = reachable(s.map, s.node).find(n => n.id === nodeId);
    if (!node) return false;
    s.node = node.id;
    s.path.push(node.id);
    s.stats.rooms++;
    this.enterRoom(node.type);
    this.commit();
    return true;
  }

  private enterRoom(type: RoomType) {
    const s = this.state;
    s.offer = null;
    s.offerKind = null;
    s.event = s.chest = s.rest = null;
    switch (type) {
      case 'combat': return this.startFight(this.pickEnemy('normal'));
      case 'elite': return this.startFight(this.pickEnemy('elite'));
      case 'boss': return this.startFight(this.act.boss);
      case 'shop': {
        const aides = this.pickItems(this.available('aide'), 3, RARITY_WEIGHT);
        const rel = this.pickItems(this.available('reliquia'), 2, RARITY_WEIGHT);
        s.offer = [...aides, ...rel].map(id => ({ id }));
        s.screen = 'shop';
        return;
      }
      case 'rest':
        s.rest = { result: null };
        s.screen = 'rest';
        return;
      case 'chest':
        s.chest = { locked: this.rng.chance(0.4), quiz: null, result: null };
        s.screen = 'chest';
        return;
      case 'event': {
        const ev = this.pickEvent();
        if (!ev) return this.startFight(this.pickEnemy('normal'));
        s.seenEvents.push(ev.id);
        s.event = { id: ev.id, choice: null, quiz: null, result: null, pendingFight: null };
        s.screen = 'event';
        return;
      }
    }
  }

  private toMap() {
    const s = this.state;
    s.screen = 'map';
    s.combat = null;
    s.offer = null;
    s.offerKind = null;
    s.event = s.chest = s.rest = null;
  }

  private nextAct() {
    const s = this.state;
    s.act++;
    s.map = generateMap(this.rng, this.content.sequence.map);
    s.node = null;
    s.path = [];
    s.metEnemies = [];
    this.toMap();
  }

  private pickEnemy(kind: 'normal' | 'elite'): string {
    const s = this.state;
    const pool = kind === 'elite' ? this.act.elites : this.act.enemies;
    const fresh = pool.filter(id => !s.metEnemies.includes(id));
    const id = this.rng.pick(fresh.length ? fresh : pool);
    s.metEnemies.push(id);
    return id;
  }

  private pickEvent(): GameEvent | null {
    const s = this.state, actNo = s.act + 1;
    const ok = this.content.events.filter(e => !e.acts || e.acts.includes(actNo));
    const fresh = ok.filter(e => !s.seenEvents.includes(e.id));
    const pool = fresh.length ? fresh : ok;
    return pool.length ? this.rng.pick(pool) : null;
  }

  /* ======================= Questions ======================= */

  /** Thèmes jouables (réglages ∩ séquence). */
  activeThemes(): string[] {
    const all = this.content.sequence.themes.map(t => t.id);
    const on = this.settings.themes ? all.filter(t => this.settings.themes!.includes(t)) : all;
    return on.length ? on : all;
  }

  private isUsable(q: Question): boolean {
    if (q.disabled) return false;
    if (this.settings.types && !this.settings.types.includes(q.type)) return false;
    return true;
  }

  private pick(o: PickOpts): Question {
    const s = this.state;
    const ok = (q: Question) => this.isUsable(q) && (!o.needWrite || isWritable(q)) && (!o.onlyType || q.type === o.onlyType);
    const order = [o.level, ...[4, 3, 2, 1].filter(l => l < o.level), ...[1, 2, 3, 4].filter(l => l > o.level)];
    const candidatesFor = (theme: string): Question[] => {
      for (const l of order) {
        const pool = this.content.questions.filter(q => q.theme === theme && levelNum(q.level) === l && ok(q));
        if (pool.length) return pool;
      }
      return [];
    };
    const withPool = o.themes.map(t => ({ t, pool: candidatesFor(t) })).filter(x => x.pool.length);
    if (!withPool.length && o.onlyType) return this.pick({ ...o, onlyType: undefined });
    if (!withPool.length) {
      const any = this.content.questions.filter(q => this.isUsable(q));
      return this.rng.pick(any.length ? any : this.content.questions);
    }
    // pour chaque thème : questions pas encore vues, puis sans ressemblance avec les dernières posées
    const refine = (pool: Question[]) => {
      const fresh = pool.filter(q => !s.seen[q.id]);
      const base = fresh.length ? fresh : pool;
      return { base, far: base.filter(q => !this.clashes(q.id)) };
    };
    let chosen = this.rng.pick(withPool);
    if (o.weakTheme && this.rng.chance(0.4)) chosen = withPool.find(x => x.t === o.weakTheme) ?? chosen;
    let { base, far } = refine(chosen.pool);
    if (!far.length) {
      // ce thème n'a plus que des questions trop proches : on essaie un autre thème
      const other = this.rng.shuffle(withPool).map(x => refine(x.pool)).find(x => x.far.length);
      if (other) ({ base, far } = other);
    }
    const pool = far.length ? far : base;
    return this.rng.weighted(pool, q => this.weightOf(q) * (TYPE_WEIGHT[q.type] ?? 1));
  }

  private canWrite(q: Question): boolean {
    return this.settings.writeFactor > 0 && isWritable(q);
  }

  /** Part de base des réponses écrites hors règles spéciales. */
  private writeChance(boost = 0): number {
    const s = this.state;
    const extra = s.bonus.writeShare + (s.ascension >= 8 ? 0.15 : 0);
    return Math.min(1, (this.act.writeShare + boost + extra) * this.settings.writeFactor);
  }

  private makeAsked(q: Question, mode: Mode, again = false): Asked {
    const s = this.state;
    s.seen[q.id] = (s.seen[q.id] ?? 0) + 1;
    s.recent = [...(s.recent ?? []), q.id].slice(-12);
    let options: string[] = [];
    if (mode === 'qcm' && isChoice(q)) options = this.rng.shuffle([q.answer, ...this.rng.shuffle(q.distractors).slice(0, 3)]);
    else if (mode === 'tf') options = [...TF_OPTIONS];
    else if (mode === 'order' && q.type === 'ordre') {
      const toks = [...orderTokens(q), ...q.extra];
      options = this.rng.shuffle(toks);
      for (let k = 0; k < 5 && options.join(' ') === orderTokens(q).join(' '); k++) options = this.rng.shuffle(toks);
    } else if (mode === 'match' && q.type === 'association') options = this.rng.shuffle(q.pairs.map(p => p[1]));
    else if (mode === 'place' && q.type === 'scene') options = this.rng.shuffle(q.scene.items.map(it => it.object));
    return { id: q.id, mode, options, again: again || undefined };
  }

  /** Mode de réponse : imposé par le type, sinon QCM ou écrit. */
  private chooseMode(q: Question, writeP: number, forceWrite = false): Mode {
    const fm = fixedMode(q);
    if (fm && fm !== 'write') return fm;
    if (!this.canWrite(q)) return 'qcm';
    if (fm === 'write' || forceWrite) return 'write';
    return this.rng.chance(writeP) ? 'write' : 'qcm';
  }

  /**
   * Enregistre le résultat d'une réponse (statistiques, carnet, almas pendientes).
   * Renvoie true si une « alma » est libérée : une question déjà ratée, maintenant réussie.
   */
  private record(q: Question, v: Verdict, given: string | null, mode: Mode): boolean {
    const s = this.state;
    this.onRecord?.(q, v);
    if (v !== 'ok' && s.screen === 'combat' && s.combat) s.combat.errors++;
    if (v === 'ok') {
      s.stats.ok++;
      if (mode === 'write') s.stats.written++;
      const w = s.screen === 'warmup' ? s.warmup : null;
      const freed = s.retry.includes(q.id) || !!w?.ids.includes(q.id);
      s.retry = s.retry.filter(id => id !== q.id);
      if (freed) s.stats.freed = (s.stats.freed ?? 0) + 1;
      return freed;
    } else if (v === 'casi') {
      s.stats.casi++;
      this.logError(q, given);
    } else {
      s.stats.ko++;
      this.logError(q, given);
      if (!s.retry.includes(q.id)) s.retry.push(q.id);
    }
    return false;
  }

  private checkOptions(q: Question) {
    const theme = this.content.sequence.themes.find(t => t.id === q.theme);
    return {
      ignoreArticles: q.check?.ignoreArticles ?? theme?.check?.ignoreArticles ?? false,
      optionalSubject: q.check?.optionalSubject ?? theme?.check?.optionalSubject ?? true,
      accents: this.relicCount('accentForgive') ? ('accept' as const) : this.settings.accents,
    };
  }

  private judgeAsked(asked: Asked, value: string): Verdict | null {
    const q = this.qById.get(asked.id);
    if (!q) return null;
    return judgeQuestion(q, asked.mode, value, this.checkOptions(q));
  }

  /** Question hors combat (événements, coffres). */
  private makeQuiz(o: { themes?: string[]; write?: boolean; level?: 1 | 2 | 3 }): QuizState {
    const active = this.activeThemes();
    const themes = o.themes?.filter(t => active.includes(t)) ?? [];
    const q = this.pick({ themes: themes.length ? themes : active, level: o.level ?? this.act.level, needWrite: !!o.write && this.settings.writeFactor > 0 });
    return { q: this.makeAsked(q, this.chooseMode(q, this.writeChance(), !!o.write)), fb: null };
  }

  private answerQuiz(quiz: QuizState, value: string): Verdict | null {
    if (quiz.fb) return null;
    const v = this.judgeAsked(quiz.q, value);
    if (!v) return null;
    const q = this.qById.get(quiz.q.id)!;
    this.record(q, v, value, quiz.q.mode);
    quiz.fb = { verdict: v, given: value };
    return v;
  }

  /* ======================= Combat ======================= */

  private startFight(enemyId: string) {
    const s = this.state;
    const e = this.enemyById.get(enemyId)!;
    s.screen = 'combat';
    s.offer = null;
    s.offerKind = null;
    s.poison = 0;
    const abanico = e.phases?.[0]?.abanico ?? 0;
    const a = s.ascension;
    const hp = e.hp + (a >= 1 ? 1 : 0) + (a >= 4 && e.kind === 'elite' ? 2 : 0) + (a >= 7 && (e.kind === 'jefe' || e.kind === 'final') ? 3 : 0) + (a >= 10 && e.kind === 'final' ? 6 : 0);
    s.combat = {
      enemyId: e.id, hp, maxHp: hp, shield: 0, abanico: this.settings.writeFactor > 0 ? abanico : 0,
      phase: 0, turn: 0, intent: { kind: 'attack' }, canceled: false, attackBonus: e.phases?.[0]?.attackBonus ?? 0, weakTheme: null,
      juicio: false, vanishUsed: false, firstErrorUsed: false, freeTranslateUsed: false, rowCorrect: 0, errors: 0, fog: false,
      q: { id: '', mode: 'qcm', options: [] }, fb: null, used: {}, hidden: [], mask: '', timeMax: 0, timeLeft: 0,
    };
    this.nextTurn();
  }

  private rollIntent(): Intent {
    const c = this.state.combat!, e = this.enemy!;
    const list = this.phase?.intents ?? e.intents;
    let it: Intent;
    if (e.pattern === 'cycle') it = list[(c.turn - 1) % list.length];
    else {
      const prev = c.intent;
      const pool = list.filter(x => x.kind === 'attack' || x.kind !== prev.kind);
      it = this.rng.pick(pool.length ? pool : list);
    }
    if (it.kind === 'rush' && !this.settings.chrono) it = { kind: 'attack' };
    if (it.kind === 'listen' && this.settings.types && !this.settings.types.includes('ecoute')) it = { kind: 'attack' };
    return { ...it };
  }

  private nextTurn() {
    const s = this.state, c = s.combat!;
    c.turn++;
    s.stats.turns++;
    c.intent = this.rollIntent();
    c.canceled = false;
    const tr = this.traits();
    c.fog = c.intent.kind === 'fog';
    c.juicio = tr.has('juicio') && c.turn % 3 === 0;
    c.weakTheme = tr.has('colorShift') ? this.rng.pick(this.activeThemes()) : null;
    if (c.intent.kind === 'shield') c.shield += c.intent.value ?? 2;
    this.ask();
  }

  private needsWrite(): boolean {
    return this.enemy?.modifier === 'soloEscrito' && this.settings.writeFactor > 0;
  }

  /** Seules les questions possibles à l'écrit sont tirées (élite « Solo escrito », abanico). */
  private writableOnly(): boolean {
    return this.settings.writeFactor > 0 && (this.enemy?.modifier === 'soloEscrito' || this.traits().has('abanico'));
  }

  private targetLevel(): 1 | 2 | 3 | 4 {
    const e = this.enemy!, ph = this.phase;
    if (ph?.levels?.length) return levelNum(this.rng.pick(ph.levels));
    if (e.kind === 'final') return this.rng.chance(0.6) ? 4 : 3;
    const L = this.act.level;
    if (e.kind === 'jefe' && L >= 2) return this.rng.chance(0.25) ? 4 : L;
    if (e.kind !== 'normal') return L;
    return L === 1 || this.rng.chance(0.65) ? L : ((L - 1) as 1 | 2);
  }

  private combatPickOpts(easier = false): PickOpts {
    const c = this.state.combat!, e = this.enemy!, ph = this.phase;
    let themes = this.activeThemes();
    if (ph?.themes) {
      const t = themes.filter(x => ph.themes!.includes(x));
      if (t.length) themes = t;
    }
    if (c.juicio && e.focusTheme && themes.includes(e.focusTheme)) themes = [e.focusTheme];
    let level = this.targetLevel();
    if (easier && level > 1) level = (level - 1) as 1 | 2 | 3;
    const listen = c.intent.kind === 'listen' && !c.canceled;
    return { themes, level, needWrite: this.writableOnly(), weakTheme: c.weakTheme, onlyType: listen ? 'ecoute' : undefined };
  }

  private modeFor(q: Question): Mode {
    const e = this.enemy!, tr = this.traits();
    let p = this.writeChance(e.kind === 'jefe' ? 0.1 : 0);
    if (e.kind === 'final') p = Math.min(1, 0.5 * this.settings.writeFactor);
    if (tr.has('abanico')) p = Math.min(1, 0.75 * this.settings.writeFactor);
    return this.chooseMode(q, p, this.needsWrite() || this.relicCount('allWrite') > 0);
  }

  private ask(forceNew = false, easier = false) {
    const s = this.state, c = s.combat!, e = this.enemy!;
    let q: Question | undefined;
    let again = false;
    if (!forceNew && s.retry.length && e.kind !== 'final' && !c.juicio && this.rng.chance(RETRY_CHANCE)) {
      // alma pendiente : une question ratée, posable maintenant, pas trop tôt et pas proche des dernières posées.
      // Elle reste en attente tant qu'elle n'est pas réussie.
      const recent = (s.recent ?? []).slice(-RETRY_GAP);
      const listen = c.intent.kind === 'listen' && !c.canceled;
      const writeOnly = this.writableOnly();
      const id = s.retry.find(r => {
        const x = this.qById.get(r);
        return !!x && this.isUsable(x) && !recent.includes(r) && !this.clashes(r) && (!writeOnly || this.canWrite(x)) && (!listen || x.type === 'ecoute');
      });
      if (id) {
        q = this.qById.get(id);
        again = true;
      }
    }
    if (!q) {
      q = this.pick(this.combatPickOpts(easier));
      again = false;
    }
    c.q = this.makeAsked(q, this.modeFor(q), again);
    const mode = c.q;
    c.fb = null;
    c.used = {};
    c.hidden = [];
    c.mask = '';
    if (!this.settings.chrono) {
      c.timeMax = c.timeLeft = 0;
    } else {
      let sec = this.traits().has('ultimoBaile') ? 15 : this.act.chrono;
      sec += { write: 10, order: 12, match: 10, place: 15, qcm: 0, tf: -5 }[mode.mode] ?? 0;
      if (q.type === 'ecoute') sec += 6;
      sec += this.relicValue('slowTime', 10);
      if (e.modifier === 'prisa') sec *= 0.5;
      if (s.ascension >= 2) sec -= 3;
      sec *= this.settings.chronoFactor;
      if (c.intent.kind === 'rush' && !c.canceled) sec -= c.intent.value ?? 5;
      sec = Math.max(6, Math.round(sec));
      c.timeMax = c.timeLeft = sec * 1000;
    }
  }

  /** Avance le chrono. Renvoie true si l'état a changé (fin du temps). */
  tick(ms: number): boolean {
    const c = this.state.combat;
    if (this.state.screen !== 'combat' || !c || c.fb || !c.timeMax) return false;
    c.timeLeft = Math.max(0, c.timeLeft - ms);
    if (c.timeLeft <= 0) {
      this.answer(null, 'timeout');
      return true;
    }
    return false;
  }

  /** Juge une réponse au combat sans rien modifier. */
  judge(value: string): Verdict | null {
    const c = this.state.combat;
    return c ? this.judgeAsked(c.q, value) : null;
  }

  /** Répond à la question en cours. how = 'timeout' ou 'oracle' pour les cas spéciaux. */
  answer(value: string | null, how: 'normal' | 'timeout' | 'oracle' = 'normal'): Feedback | null {
    const s = this.state, c = s.combat, q = this.question, e = this.enemy;
    if (s.screen !== 'combat' || !c || !q || !e || c.fb) return null;
    let v: Verdict;
    if (how === 'oracle') v = 'ok';
    else if (how === 'timeout') v = 'ko';
    else {
      const j = this.judge(value ?? '');
      if (!j) return null;
      v = j;
    }
    const seq = this.content.sequence;
    const fb: Feedback = { outcome: how === 'normal' ? v : how, fx: [], title: '', given: value, lines: [], dmgToEnemy: 0, dmgToPlayer: 0 };
    const tr = this.traits();
    // l'Oráculo amélioré compte comme une vraie réponse écrite
    const strongOracle = how === 'oracle' && this.isUpgraded(this.idByEffect('oracle') ?? '');
    const counts = how !== 'oracle' || strongOracle;
    const written = STRONG_MODES.includes(c.q.mode) || strongOracle;

    if (v === 'ok') {
      let dmg = 1 + this.relicValue('damageBonus');
      if (counts) {
        s.streak++;
        s.stats.maxStreak = Math.max(s.stats.maxStreak, s.streak);
        c.rowCorrect++;
        const freed = how !== 'oracle' && this.record(q, 'ok', value, c.q.mode);
        if (written) {
          dmg += 1 + this.relicValue('writeBonus');
          if (this.relicCount('allWrite')) dmg += this.relicValue('allWrite', 2);
          const g = this.synergy('goldOnWrite');
          if (g) s.gold += g.value ?? 1;
        }
        if (written) fb.fx.push('crit');
        const th = this.streakThreshold;
        if (s.streak >= th) {
          fb.fx.push('combo');
          let bonus = (th === 2 ? 2 : 1) + this.relicValue('streakBonus');
          if (this.synergy('streakDouble')) bonus *= 2;
          dmg += bonus;
          fb.combo = s.streak;
        }
        if (c.weakTheme === q.theme) {
          dmg += 2;
          fb.lines.push(`${e.name} est vulnérable à ce thème : +2 dégâts.`);
        }
        if (tr.has('ultimoBaile') && s.streak >= 3) {
          dmg *= 2;
          fb.lines.push(`Série de ${s.streak} : ${e.name} titube, dégâts doublés !`);
        }
        const heal = this.synergy('healOnCorrect');
        if (heal && s.hp < s.maxHp) {
          const h = Math.min(s.maxHp - s.hp, heal.value ?? 1);
          s.hp += h;
          fb.fx.push('playerHeal');
          fb.lines.push(`${heal.name} : +${h} PV.`);
        }
        if (freed) {
          const h = Math.min(s.maxHp - s.hp, 1);
          s.hp += h;
          if (h && !fb.fx.includes('playerHeal')) fb.fx.push('playerHeal');
          fb.fx.push('alma');
          fb.lines.push(`Página recuperada : tu avais raté cette question, tu la réussis.${h ? ' +1 PV.' : ''}`);
        }
        if (this.relicCount('luckyCards') && how !== 'oracle') {
          s.luckyCount++;
          const every = this.relicValue('luckyCards', 4) / this.relicCount('luckyCards');
          if (s.luckyCount % every === 0) {
            const id = this.gainRandom('aide');
            if (id) fb.lines.push(`${this.content.items.find(i => i.effect === 'luckyCards')?.name ?? 'Bonus'} : tu gagnes ${this.itemById.get(id)!.name}.`);
          }
        }
      }
      if (tr.has('vanish') && !c.vanishUsed) {
        c.vanishUsed = true;
        dmg = 0;
        fb.fx.push('vanish');
        fb.lines.push(`${e.name} disparaît : ton coup passe à travers ! La prochaine fois, ça touchera.`);
      }
      if (dmg > 0 && c.abanico > 0) {
        if (c.q.mode === 'write' || how === 'oracle') {
          const a = Math.min(c.abanico, dmg);
          c.abanico -= a;
          dmg -= a;
          fb.lines.push(c.abanico > 0 ? `La capa se déchire (${c.abanico} restant).` : 'La capa est déchirée !');
        } else {
          dmg = 0;
          fb.fx.push('abanico');
          fb.lines.push('La capa bloque les réponses en QCM : écris pour la déchirer !');
        }
      }
      if (dmg > 0 && c.shield > 0) {
        const a = Math.min(c.shield, dmg);
        c.shield -= a;
        dmg -= a;
        fb.fx.push('shieldHit');
        fb.lines.push(`Le bouclier absorbe ${a} dégât${a > 1 ? 's' : ''}.`);
      }
      c.hp = Math.max(0, c.hp - dmg);
      fb.dmgToEnemy = dmg;
      fb.fx.push(dmg > 0 ? 'enemyHit' : 'zero');
      const gold = 1 + this.relicValue('goldPerCorrect');
      s.gold += gold;
      fb.title = how === 'oracle' ? seq.feedback.oracle : this.rng.pick(seq.feedback.ok);
      fb.lines.unshift(`${e.name} perd ${dmg} PV${fb.combo ? ` (série de ${fb.combo})` : ''}${written && how !== 'oracle' ? `, ${c.q.mode === 'write' ? 'réponse écrite' : 'défi réussi'} : dégâts renforcés` : ''}. +${gold} 🪙`);
    } else if (v === 'casi') {
      this.record(q, 'casi', value, c.q.mode);
      fb.fx.push('casi');
      fb.title = seq.feedback.casi;
      fb.lines.push("Il manque un accent (ou un tilde). Personne n'est blessé, ta série continue.");
    } else {
      this.record(q, 'ko', value, c.q.mode);
      s.streak = 0;
      c.rowCorrect = 0;
      fb.title = how === 'timeout' ? seq.feedback.timeout : this.rng.pick(seq.feedback.ko);
      if (how === 'timeout') fb.lines.push('Le temps est écoulé : cela compte comme une erreur.');
      this.enemyStrikes(fb);
      if (tr.has('vanidad') && c.hp > 0) {
        c.hp = Math.min(c.maxHp, c.hp + 1);
        fb.lines.push(`${e.name} admire son reflet et récupère 1 PV.`);
      }
    }

    // fin de tour
    if (c.hp > 0) {
      if (c.intent.kind === 'heal' && !c.canceled) {
        const h = Math.min(c.maxHp - c.hp, c.intent.value ?? 2);
        if (h > 0) {
          c.hp += h;
          fb.fx.push('heal');
          fb.lines.push(`${e.name} se soigne de ${h} PV.`);
        }
      }
      if (tr.has('crescendo')) {
        if (c.rowCorrect >= 2) {
          if (c.attackBonus > 0) fb.lines.push('Deux bonnes réponses de suite : la musique se calme.');
          c.attackBonus = 0;
          c.rowCorrect = 0;
        } else c.attackBonus = Math.min(4, c.attackBonus + 1);
      }
    }
    if (s.poison > 0 && s.hp > 0 && c.hp > 0) {
      s.hp = Math.max(0, s.hp - 1);
      s.poison--;
      fb.dmgToPlayer += 1;
      if (!fb.fx.includes('playerHit')) fb.fx.push('poison');
      fb.lines.push(`Le poison te fait perdre 1 PV (${s.poison} restant${s.poison > 1 ? 's' : ''}).`);
    }
    if (s.hp <= 0) this.tryRevive(fb);
    if (s.hp <= 0) fb.fx.push('playerDown');
    if (c.hp <= 0) fb.fx.push('enemyDown');
    // changement de phase
    if (e.phases && c.hp > 0) {
      let p = c.phase;
      while (p + 1 < e.phases.length && c.hp / c.maxHp <= e.phases[p + 1].from) p++;
      if (p !== c.phase) {
        c.phase = p;
        const ph = e.phases[p];
        c.abanico = this.settings.writeFactor > 0 ? ph.abanico ?? 0 : 0;
        c.attackBonus = ph.attackBonus;
        fb.fx.push('phase');
        fb.alert = `${ph.name} — ${ph.message}`;
      }
    }
    c.fb = fb;
    this.commit();
    return fb;
  }

  private tryRevive(fb: { lines: string[]; alert?: string; fx?: Fx[] }) {
    const s = this.state;
    if (s.hp > 0 || s.reviveUsed || !this.relicCount('revive')) return;
    s.reviveUsed = true;
    s.hp = Math.ceil(s.maxHp / 2);
    fb.fx?.push('revive');
    fb.alert = `${this.content.items.find(i => i.effect === 'revive')?.name ?? 'Ta relique'} te remet debout avec ${s.hp} PV !`;
  }

  private enemyStrikes(fb: Feedback) {
    const s = this.state, c = s.combat!, e = this.enemy!, it = c.intent;
    if (c.canceled) {
      fb.fx.push('canceled');
      fb.lines.push(`${e.name} est arrêté : il ne fait rien ce tour-ci.`);
      return;
    }
    const a = s.ascension;
    const ascAtk = (a >= 4 && e.kind === 'elite' ? 1 : 0) + (a >= 10 && e.kind === 'final' ? 1 : 0);
    let dmg = (it.kind === 'attack' ? it.value ?? e.attack : e.attack) + c.attackBonus + ascAtk + (this.relicCount('slowTime') ? 1 : 0);
    if (c.juicio) {
      dmg *= 2;
      fb.lines.push('Juicio : la sentence est doublée !');
    }
    const shieldId = Object.keys(s.inv).find(id => s.inv[id] > 0 && this.itemById.get(id)?.effect === 'autoShield');
    if (shieldId) {
      s.inv[shieldId]--;
      fb.fx.push('blocked');
      fb.lines.push(`Ton ${this.itemById.get(shieldId)!.name} bloque l'attaque de ${e.name}.`);
      if (this.isUpgraded(shieldId)) {
        c.hp = Math.max(0, c.hp - 2);
        fb.dmgToEnemy += 2;
        fb.fx.push('reflect');
        fb.lines.push(`Il renvoie 2 dégâts à ${e.name} !`);
      }
    } else if (this.relicCount('firstErrorShield') && !c.firstErrorUsed) {
      c.firstErrorUsed = true;
      fb.fx.push('mask');
      fb.lines.push('Ta Máscara encaisse la première erreur du combat : aucun dégât.');
    } else {
      s.hp = Math.max(0, s.hp - dmg);
      fb.dmgToPlayer += dmg;
      fb.fx.push('playerHit');
      fb.lines.push(`${e.name} t'inflige ${dmg} dégât${dmg > 1 ? 's' : ''}.`);
    }
    if (it.kind === 'steal' && s.gold > 0) {
      const g = Math.min(s.gold, it.value ?? 2);
      s.gold -= g;
      fb.fx.push('steal');
      fb.lines.push(`${e.name} te vole ${g} 🪙.`);
    }
    if (it.kind === 'stealItem') {
      const owned = Object.keys(s.inv).filter(id => s.inv[id] > 0);
      if (owned.length) {
        const id = this.rng.pick(owned);
        s.inv[id]--;
        fb.fx.push('stealItem');
        fb.lines.push(`${e.name} te vole un pouvoir : ${this.itemById.get(id)?.name ?? id}.`);
      }
    }
    if (it.kind === 'poison') {
      s.poison += it.value ?? 3;
      fb.fx.push('poison');
      fb.lines.push(`Tu es empoisonné·e : −1 PV par question pendant ${s.poison} questions.`);
    }
  }

  private logError(q: Question, given: string | null) {
    const s = this.state;
    if (s.errors.some(e => e.id === q.id)) return;
    s.errors.push({
      id: q.id,
      prompt: `${q.label ? q.label + ' · ' : ''}${q.prompt}`,
      answer: isChoice(q) || q.type === 'ordre' ? fillBlanks(q.prompt, q.answer) : answerText(q, this.content.scenes),
      explanation: q.explanation,
      given: givenText(q, given, this.content.scenes),
    });
  }

  /** Passe à la suite après le retour (feedback). */
  proceed() {
    const s = this.state, c = s.combat;
    if (s.screen !== 'combat' || !c || !c.fb) return;
    if (s.hp <= 0) return this.end(false);
    if (c.hp <= 0) return this.winFight();
    this.nextTurn();
    this.commit();
  }

  private winFight() {
    const s = this.state, e = this.enemy!;
    s.stats.won++;
    if (!s.defeated.includes(e.id)) s.defeated.push(e.id);
    if (this.state.combat && this.state.combat.errors === 0) s.stats.perfectFights++;
    s.gold += (e.kind === 'normal' ? 3 : e.kind === 'elite' ? 5 : 8) - (s.ascension >= 5 ? 1 : 0);
    const h = this.relicValue('healAfterFight', 2);
    if (h) s.hp = Math.min(s.maxHp, s.hp + h);
    s.poison = 0;
    if (e.kind === 'final') return this.end(true);
    if (e.kind === 'jefe') {
      s.hp = Math.min(s.maxHp, s.hp + Math.ceil(s.maxHp * 0.25));
      s.offer = this.rollOffer('jefe');
      s.offerKind = 'jefe';
    } else {
      s.offerKind = e.kind === 'elite' ? 'elite' : 'normal';
      s.offer = this.rollOffer(s.offerKind);
    }
    s.screen = 'reward';
    s.combat = null;
    this.commit();
  }

  /* ======================= Objets ======================= */

  private idByEffect(effect: Item['effect']): string | undefined {
    return this.content.items.find(i => i.effect === effect)?.id;
  }

  /** Objets encore obtenables d'une catégorie. */
  available(kind: Item['kind']): string[] {
    // sans chrono, les objets qui ne servent qu'au chrono ne sont plus proposés
    const useless = (i: Item) => !this.settings.chrono && (i.effect === 'time' || i.effect === 'slowTime');
    return this.content.items
      .filter(i => i.kind === kind && !useless(i) && (kind === 'aide' || (this.state.relics[i.id] ?? 0) < (i.max ?? 1)))
      .map(i => i.id);
  }

  private pickItems(ids: string[], n: number, weights: Record<Rarity, number>): string[] {
    const out: string[] = [];
    let pool = [...ids];
    while (out.length < n && pool.length) {
      const id = this.rng.weighted(pool, x => weights[this.itemById.get(x)!.rarity]);
      out.push(id);
      pool = pool.filter(x => x !== id);
    }
    return out;
  }

  private rollOffer(kind: 'normal' | 'elite' | 'jefe'): Offer[] {
    const n = 3 + this.relicCount('extraChoice');
    if (kind !== 'normal') {
      const r = this.pickItems(this.available('reliquia'), n, kind === 'jefe' ? BOSS_RARITY_WEIGHT : RARITY_WEIGHT);
      return (r.length ? r : this.pickItems(this.available('aide'), n, RARITY_WEIGHT)).map(id => ({ id }));
    }
    const mix = [...this.pickItems(this.available('aide'), 2, RARITY_WEIGHT), ...this.pickItems(this.available('reliquia'), 2, RARITY_WEIGHT)];
    const extra = this.pickItems(this.available('aide').filter(id => !mix.includes(id)), n - 3, RARITY_WEIGHT);
    return this.rng.shuffle([...mix, ...extra]).slice(0, n).map(id => ({ id }));
  }

  private gain(id: string) {
    const it = this.itemById.get(id)!;
    const s = this.state;
    if (!s.obtained.includes(id)) s.obtained.push(id);
    if (it.kind === 'reliquia') {
      s.relics[id] = (s.relics[id] ?? 0) + 1;
      if (it.effect === 'maxHp') {
        s.maxHp += it.value ?? 4;
        s.hp += it.value ?? 4;
      }
    } else s.inv[id] = (s.inv[id] ?? 0) + 1;
  }

  private gainRandom(kind: Item['kind'], rarity?: Rarity): string | null {
    let ids = this.available(kind);
    if (rarity) {
      const r = ids.filter(id => this.itemById.get(id)!.rarity === rarity);
      if (r.length) ids = r;
    }
    if (!ids.length) return null;
    const id = this.rng.weighted(ids, x => RARITY_WEIGHT[this.itemById.get(x)!.rarity]);
    this.gain(id);
    return id;
  }

  /** Récompense : prendre l'objet n°i (ou passer si i < 0). */
  take(i: number) {
    const s = this.state;
    if (s.screen !== 'reward' || !s.offer) return;
    if (i >= 0 && s.offer[i]) this.gain(s.offer[i].id);
    if (s.offerKind === 'jefe') this.nextAct();
    else this.toMap();
    this.commit();
  }

  buy(i: number): boolean {
    const s = this.state, o = s.offer?.[i];
    if (s.screen !== 'shop' || !o || o.sold) return false;
    const it = this.itemById.get(o.id)!;
    if (s.gold < it.price) return false;
    s.gold -= it.price;
    this.gain(o.id);
    o.sold = true;
    this.commit();
    return true;
  }

  buyMeal(): boolean {
    const s = this.state, meal = this.content.sequence.meal;
    if (s.screen !== 'shop' || s.gold < meal.price || s.hp >= s.maxHp) return false;
    s.gold -= meal.price;
    s.hp = Math.min(s.maxHp, s.hp + meal.heal);
    this.commit();
    return true;
  }

  leaveShop() {
    if (this.state.screen !== 'shop') return;
    this.toMap();
    this.commit();
  }

  /* ======================= Ofrenda (repos) ======================= */

  restHealAmount(): number {
    const s = this.state;
    return Math.ceil(s.maxHp * Math.max(0.1, s.bonus.restHeal - (s.ascension >= 6 ? 0.1 : 0)));
  }

  /** Aides possédées qui peuvent être améliorées. */
  upgradable(): string[] {
    return Object.keys(this.state.inv).filter(id => this.state.inv[id] > 0 && this.itemById.get(id)?.upgrade && !this.state.upgrades[id]);
  }

  restHeal() {
    const s = this.state;
    if (s.screen !== 'rest' || !s.rest || s.rest.result) return;
    const before = s.hp;
    s.hp = Math.min(s.maxHp, s.hp + this.restHealAmount());
    s.rest.result = { text: 'Tu te reposes un moment.', lines: [`+${s.hp - before} PV`] };
    this.commit();
  }

  restUpgrade(id: string) {
    const s = this.state;
    if (s.screen !== 'rest' || !s.rest || s.rest.result || !this.upgradable().includes(id)) return;
    s.upgrades[id] = true;
    const it = this.itemById.get(id)!;
    s.rest.result = { text: `Tu prends soin de ton objet « ${it.name} ». Il brille…`, lines: [it.upgrade ?? `${it.name} amélioré`] };
    this.commit();
  }

  /* ======================= Coffre ======================= */

  chestOpen() {
    const s = this.state, ch = s.chest;
    if (s.screen !== 'chest' || !ch || ch.result || ch.quiz) return;
    if (ch.locked) ch.quiz = this.makeQuiz({ write: true });
    else ch.result = { text: 'Le coffre s\'ouvre.', lines: this.loot(false) };
    this.commit();
  }

  chestAnswer(value: string) {
    const s = this.state, ch = s.chest;
    if (s.screen !== 'chest' || !ch?.quiz || ch.result) return;
    const v = this.answerQuiz(ch.quiz, value);
    if (!v) return;
    ch.result = v === 'ko'
      ? { text: 'Le cadenas résiste. Tu récupères quelques monedas tombées par terre.', lines: this.applyEffects([{ type: 'gold', value: 2 }]) }
      : { text: 'Le cadenas s\'ouvre ! Ce coffre cachait un trésor.', lines: this.loot(true) };
    this.commit();
  }

  private loot(rich: boolean): string[] {
    const lines: string[] = [];
    if (rich || this.rng.chance(0.55)) {
      const id = this.gainRandom('reliquia', rich ? (this.rng.chance(0.3) ? 'legendaria' : 'rara') : undefined);
      if (id) lines.push(`Nouvelle relique : ${this.itemById.get(id)!.emoji} ${this.itemById.get(id)!.name}`);
    }
    if (!lines.length) {
      for (let k = 0; k < 2; k++) {
        const id = this.gainRandom('aide');
        if (id) lines.push(`Nouvelle aide : ${this.itemById.get(id)!.emoji} ${this.itemById.get(id)!.name}`);
      }
    }
    lines.push(...this.applyEffects([{ type: 'gold', value: 2 + this.rng.int(4) }]));
    return lines;
  }

  /* ======================= Événements ======================= */

  /** Le choix n°i est-il possible ? Renvoie la raison sinon. */
  choiceBlock(i: number): string | null {
    const ev = this.currentEvent, ch = ev?.choices[i];
    if (!ch) return 'inconnu';
    const r = ch.require;
    if (r?.gold && this.state.gold < r.gold) return `il faut ${r.gold} monedas`;
    if (r?.aide && Object.values(this.state.inv).reduce((a, b) => a + b, 0) < r.aide) return 'il faut une aide';
    return null;
  }

  eventChoose(i: number) {
    const s = this.state, st = s.event, ev = this.currentEvent;
    if (s.screen !== 'event' || !st || !ev || st.choice !== null || this.choiceBlock(i)) return;
    st.choice = i;
    const ch = ev.choices[i];
    if (ch.quiz) st.quiz = this.makeQuiz({ themes: ch.quiz.themes, write: ch.quiz.write });
    else this.resolveEvent(ch.outcome!);
    this.commit();
  }

  eventAnswer(value: string) {
    const s = this.state, st = s.event, ev = this.currentEvent;
    if (s.screen !== 'event' || !st?.quiz || !ev || st.choice === null || st.result) return;
    const v = this.answerQuiz(st.quiz, value);
    if (!v) return;
    const ch = ev.choices[st.choice];
    this.resolveEvent(v === 'ko' ? ch.failure! : ch.success!);
    this.commit();
  }

  private resolveEvent(o: EventOutcome) {
    const st = this.state.event!;
    const lines = this.applyEffects(o.effects);
    let text = o.text, textFr = o.textFr;
    const fight = o.effects.find(e => e.type === 'fight');
    if (fight && fight.type === 'fight') st.pendingFight = fight.kind;
    // un tirage au sort ajoute son propre texte
    const extra = lines.filter(l => l.startsWith('§')).map(l => l.slice(1));
    if (extra.length) {
      const [es, fr] = extra[0].split('¦');
      text += ' ' + es;
      if (textFr && fr) textFr += ' ' + fr;
    }
    st.result = { text, textFr, lines: lines.filter(l => !l.startsWith('§')) };
  }

  /** Quitte l'événement : retour à la carte ou combat déclenché par le choix. */
  eventContinue() {
    const s = this.state, st = s.event;
    if (s.screen !== 'event' || !st?.result) return;
    if (st.pendingFight) this.startFight(this.pickEnemy(st.pendingFight));
    else this.toMap();
    this.commit();
  }

  /** Continue après une salle sans combat (coffre, repos). */
  roomContinue() {
    const s = this.state;
    if ((s.screen === 'chest' && s.chest?.result) || (s.screen === 'rest' && s.rest?.result)) {
      this.toMap();
      this.commit();
    }
  }

  /** Applique les effets d'un événement. Renvoie des lignes lisibles (en français). */
  private applyEffects(effects: EventEffect[]): string[] {
    const s = this.state, out: string[] = [];
    for (const e of effects) {
      switch (e.type) {
        case 'hp': {
          const before = s.hp;
          s.hp = Math.max(1, Math.min(s.maxHp, s.hp + e.value));
          if (s.hp !== before) out.push(`${s.hp > before ? '+' : '−'}${Math.abs(s.hp - before)} PV`);
          break;
        }
        case 'maxHp':
          s.maxHp = Math.max(1, s.maxHp + e.value);
          s.hp = Math.min(s.hp, s.maxHp);
          out.push(`${e.value > 0 ? '+' : '−'}${Math.abs(e.value)} PV maximum`);
          break;
        case 'gold': {
          const d = Math.max(-s.gold, e.value);
          s.gold += d;
          if (d) out.push(`${d > 0 ? '+' : '−'}${Math.abs(d)} 🪙`);
          break;
        }
        case 'item': {
          let id: string | null = null;
          if (e.id) {
            const it = this.itemById.get(e.id);
            if (it && (it.kind === 'aide' || (s.relics[e.id] ?? 0) < (it.max ?? 1))) {
              this.gain(e.id);
              id = e.id;
            } else if (it) {
              out.push(...this.applyEffects([{ type: 'gold', value: 5 }]));
              break;
            }
          } else id = this.gainRandom(e.kind ?? 'aide', e.rarity);
          if (id) {
            const it = this.itemById.get(id)!;
            out.push(`${it.kind === 'reliquia' ? 'Nouvelle relique' : 'Nouvelle aide'} : ${it.emoji} ${it.name}`);
          }
          break;
        }
        case 'loseItem': {
          const owned = Object.keys(s.inv).filter(id => s.inv[id] > 0);
          if (owned.length) {
            const id = this.rng.pick(owned);
            s.inv[id]--;
            out.push(`Tu donnes : ${this.itemById.get(id)?.name ?? id}`);
          }
          break;
        }
        case 'upgrade': {
          const ids = this.upgradable();
          if (ids.length) {
            const id = this.rng.pick(ids);
            s.upgrades[id] = true;
            out.push(this.itemById.get(id)!.upgrade ?? `${this.itemById.get(id)!.name} amélioré`);
          } else out.push(...this.applyEffects([{ type: 'gold', value: 4 }]));
          break;
        }
        case 'fight':
          break;
        case 'random': {
          const o = this.rng.pick(e.outcomes);
          out.push(`§${o.text}¦${o.textFr ?? ''}`, ...this.applyEffects(o.effects));
          break;
        }
      }
    }
    return out;
  }

  /* ======================= Pouvoirs ======================= */

  usePower(id: string): boolean {
    if (this.powerBlock(id)) return false;
    this.state.stats.powersUsed++;
    const s = this.state, c = s.combat, it = this.itemById.get(id)!, q = this.question;
    const up = this.isUpgraded(id);
    const consume = () => {
      if (s.inv[id] > 0) s.inv[id]--;
      else if (it.effect === 'translate' && c) c.freeTranslateUsed = true;
    };
    switch (it.effect) {
      case 'heal':
        s.hp = Math.min(s.maxHp, s.hp + (it.value ?? 5) + (up ? 3 : 0));
        break;
      case 'translate':
        c!.used.translate = true;
        if (up) c!.used.hint = true;
        break;
      case 'hint':
        c!.used.hint = true;
        break;
      case 'scissors':
        c!.used.scissors = true;
        if (c!.q.mode === 'qcm' && isChoice(q!)) c!.hidden = this.rng.shuffle(c!.q.options.filter(o => o !== q!.answer)).slice(0, 2);
        else if (c!.q.mode === 'write' && isChoice(q!)) c!.mask = maskAnswer(q!.answer);
        else c!.mask = scissorsHint(q!, this.content.scenes);
        if (up && c!.timeMax) {
          c!.timeLeft += 10000;
          c!.timeMax = Math.max(c!.timeMax, c!.timeLeft);
        }
        break;
      case 'time':
        c!.timeLeft += ((it.value ?? 15) + (up ? 10 : 0)) * 1000;
        c!.timeMax = Math.max(c!.timeMax, c!.timeLeft);
        break;
      case 'cancelIntent':
        c!.canceled = true;
        c!.fog = false;
        if (up) c!.shield = 0;
        break;
      case 'swap':
        consume();
        this.ask(true, up);
        this.commit();
        return true;
      case 'oracle':
        consume();
        this.answer(canonicalValue(q!), 'oracle');
        return true;
      default:
        return false;
    }
    consume();
    this.commit();
    return true;
  }

  /** Texte du Traductor : la traduction de l'énoncé ; s'il n'y a rien à traduire, la première lettre de la réponse. */
  translationText(): string {
    const q = this.question;
    if (!q) return '';
    if (q.translation) return q.translation;
    return isChoice(q) ? autoHint(q.answer) : '';
  }

  /** Texte de l'antisèche : la règle, sauf si elle dévoile la réponse. */
  hintText(): string {
    const q = this.question;
    if (!q) return '';
    // vrai / faux : l'explication commence par la réponse ; l'antisèche aide seulement à comprendre la phrase
    if (q.type === 'vrai-faux') return q.translation ? `En français : ${q.translation}` : 'Relis chaque mot : un seul détail peut rendre la phrase fausse.';
    const ans = answerText(q, this.content.scenes);
    const leaks = isChoice(q) && normalize(q.explanation).includes(normalize(ans));
    const hintId = this.idByEffect('hint');
    const auto = isChoice(q) || q.type === 'ordre' ? autoHint(ans) : '';
    if (hintId && this.isUpgraded(hintId)) return leaks ? auto : `${q.explanation} ${auto}`.trim();
    return leaks ? auto : q.explanation;
  }

  /* ======================= Fin ======================= */

  private end(win: boolean) {
    const s = this.state;
    s.screen = 'over';
    s.result = win ? 'win' : 'lose';
    s.stats.endedAt = Date.now();
    this.commit();
  }

  /** Abandon volontaire. */
  abandon() {
    this.end(false);
  }
}
