/** Version 1.1 : corrections de bugs, « almas pendientes » (retour garanti des erreurs) et échauffement. */
import { describe, expect, it } from 'vitest';
import { CARRY_MAX, DEFAULT_SETTINGS, Game, RETRY_GAP, WARMUP_MAX } from '../src/engine/game';
import { type Leitner, leitnerUpdate, pendingAlmas } from '../src/engine/meta';
import { canonicalValue, wrongValue } from '../src/engine/questions';
import { content } from './helpers';
import { simulate } from './sim';

const S = { ...DEFAULT_SETTINGS, chrono: true }; // ces tests portent sur le chrono, coupé par défaut
type Internals = { startFight(id: string): void };
const good = (g: Game, id: string) => canonicalValue(g.getQuestion(id)!);
const bad = (g: Game, id: string, options: string[]) => wrongValue(g.getQuestion(id)!, options);

function fight(seed: string, settings = S, enemy = 'queso-gigante', pending: string[] = []): Game {
  const g = Game.newRun(content(), settings, seed, 0, { pending });
  if (g.state.screen === 'warmup') g.warmupSkip();
  (g as unknown as Internals).startFight(enemy);
  return g;
}

/** Quelques questions de la banque, utilisables telles quelles. */
const ids = (n: number, filter: (q: ReturnType<typeof content>['questions'][number]) => boolean = () => true) =>
  content().questions.filter(q => !q.disabled && filter(q)).slice(0, n).map(q => q.id);

describe('bugs corrigés', () => {
  it('le poison ne tue pas au tour où l’ennemi tombe', () => {
    const g = fight('POISON');
    const c = g.state.combat!;
    c.hp = 1;
    c.shield = 0;
    c.intent = { kind: 'attack' };
    g.state.hp = 1;
    g.state.poison = 2;
    g.answer(good(g, c.q.id));
    expect(g.state.combat!.hp).toBe(0);
    expect(g.state.hp).toBe(1);
    g.proceed();
    expect(g.state.screen).toBe('reward');
    expect(g.state.result).toBeNull();
  });
  it('le poison continue de faire effet tant que l’ennemi est debout', () => {
    const g = fight('POISON-2');
    const c = g.state.combat!;
    c.hp = 50;
    g.state.hp = 10;
    g.state.poison = 2;
    g.answer(good(g, c.q.id));
    expect(g.state.hp).toBe(9);
  });
  it('couper le chrono en cours de partie arrête le chrono de la question en cours', () => {
    const g = fight('CHRONO');
    const c = g.state.combat!;
    expect(c.timeMax).toBeGreaterThan(0);
    g.tick(1000);
    g.updateSettings({ ...S, chrono: false });
    expect(g.state.combat!.timeMax).toBe(0);
    // plus de limite de temps : une minute passe sans que la question soit comptée fausse
    expect(g.tick(60000)).toBe(false);
    expect(g.state.combat!.fb).toBeNull();
    // et les questions suivantes n'ont pas de chrono non plus
    g.answer(good(g, c.q.id));
    g.proceed();
    if (g.state.screen === 'combat') expect(g.state.combat!.timeMax).toBe(0);
  });
  it('rallumer le chrono vaut à partir de la question suivante', () => {
    const g = fight('CHRONO-2', { ...S, chrono: false });
    g.state.combat!.hp = 50;
    expect(g.state.combat!.timeMax).toBe(0);
    g.updateSettings({ ...S, chrono: true });
    expect(g.state.combat!.timeMax).toBe(0);
    g.answer(good(g, g.state.combat!.q.id));
    g.proceed();
    expect(g.state.combat!.timeMax).toBeGreaterThan(0);
  });
  it('sans chrono, les objets qui ne servent qu’au chrono ne sont plus proposés', () => {
    const items = content().items;
    const time = items.filter(i => i.effect === 'time' || i.effect === 'slowTime').map(i => i.id);
    expect(time.length).toBeGreaterThan(0);
    const avec = Game.newRun(content(), S, 'OBJ');
    const sans = Game.newRun(content(), { ...S, chrono: false }, 'OBJ');
    const all = (g: Game) => [...g.available('aide'), ...g.available('reliquia')];
    for (const id of time) {
      expect(all(avec)).toContain(id);
      expect(all(sans)).not.toContain(id);
    }
  });
  it('l’Ayuda ne donne pas la réponse d’un vrai / faux', () => {
    const g = fight('CHULETA');
    for (const q of content().questions.filter(x => x.type === 'vrai-faux' && !x.disabled)) {
      g.state.combat!.q = { id: q.id, mode: 'tf', options: ['verdadero', 'falso'] };
      const hint = g.hintText().toLowerCase();
      expect(hint, q.id).not.toMatch(/verdadero|falso|^vrai|^faux|c'est vrai|c'est faux/);
      expect(hint.length, q.id).toBeGreaterThan(10);
    }
  });
  it('le Léxico sert toujours : traduction, sinon première lettre de la réponse', () => {
    const g = fight('TRADUCTOR');
    const sans = content().questions.find(q => !q.disabled && !q.translation && (q.type === 'qcm' || q.type === 'ecrit'))!;
    g.state.combat!.q = { id: sans.id, mode: 'qcm', options: [] };
    expect(g.translationText()).toMatch(/commence par/);
    expect(g.powerBlock('lexico')).toBeNull();
    const avec = content().questions.find(q => !q.disabled && !!q.translation)!;
    g.state.combat!.q = { id: avec.id, mode: 'qcm', options: [] };
    expect(g.translationText()).toBe(avec.translation);
  });
});

describe('almas pendientes : les erreurs reviennent', () => {
  it('une seule question ratée revient dans la même partie, et reste en attente tant qu’elle n’est pas réussie', () => {
    const g = fight('ALMA-1');
    const c = () => g.state.combat!;
    const missed = c().q.id;
    c().hp = 999;
    g.answer(bad(g, missed, c().q.options));
    expect(g.state.retry).toEqual([missed]);
    expect(g.pendingCount).toBe(1);
    g.proceed();
    let turns = 0, back = -1;
    for (; turns < 60 && back < 0; turns++) {
      g.state.hp = g.state.maxHp;
      if (c().q.id === missed) {
        back = turns;
        expect(c().q.again).toBe(true);
        break;
      }
      g.answer(good(g, c().q.id));
      g.proceed();
    }
    expect(back).toBeGreaterThanOrEqual(RETRY_GAP - 1);
    // ratée une deuxième fois : elle attend toujours
    g.answer(bad(g, missed, c().q.options));
    expect(g.state.retry).toContain(missed);
    g.proceed();
    for (let k = 0; k < 80 && c().q.id !== missed; k++) {
      g.state.hp = g.state.maxHp;
      g.answer(good(g, c().q.id));
      g.proceed();
    }
    expect(c().q.id).toBe(missed);
    // réussie : l'âme est libérée, +1 PV
    g.state.hp = 5;
    const fb = g.answer(good(g, missed))!;
    expect(g.state.retry).not.toContain(missed);
    expect(g.state.stats.freed).toBe(1);
    expect(g.state.hp).toBe(6);
    expect(fb.fx).toContain('alma');
    expect(fb.lines.join(' ')).toMatch(/Página recuperada/);
  });
  it('une question en attente n’est jamais reposée si elle ne convient pas à l’ennemi (écrit obligatoire)', () => {
    const notWritable = ids(3, q => q.type === 'vrai-faux');
    const g = fight('ALMA-2', S, 'caballero-enmascarado', []);
    g.state.retry = [...notWritable];
    const c = () => g.state.combat!;
    c().hp = 999;
    for (let k = 0; k < 40; k++) {
      g.state.hp = g.state.maxHp;
      expect(notWritable).not.toContain(c().q.id);
      g.answer(good(g, c().q.id));
      g.proceed();
    }
    // elles ne sont pas perdues : elles attendent un autre combat
    expect(g.state.retry).toEqual(notWritable);
  });
});

describe('échauffement de début de partie', () => {
  it('sans question en attente, la partie commence sur la carte', () => {
    const g = Game.newRun(content(), S, 'W0', 0, { pending: [] });
    expect(g.state.screen).toBe('map');
    expect(g.state.warmup ?? null).toBeNull();
  });
  it('les premières almas passent en échauffement, les suivantes pendant la partie', () => {
    const pend = ids(20);
    const g = Game.newRun(content(), S, 'W1', 0, { pending: pend });
    expect(g.state.screen).toBe('warmup');
    expect(g.state.warmup!.ids).toEqual(pend.slice(0, WARMUP_MAX));
    expect(g.state.retry).toEqual(pend.slice(WARMUP_MAX, CARRY_MAX));
  });
  it('questions inconnues, désactivées ou hors réglages : ignorées', () => {
    const off = content().questions.find(q => q.disabled)!;
    const voc = ids(1, q => q.theme === 'vocabulario')[0];
    const conj = ids(1, q => q.theme === 'conjugacion')[0];
    const g = Game.newRun(content(), { ...S, themes: ['conjugacion'] }, 'W2', 0, { pending: ['inconnue', off.id, voc, conj, conj] });
    expect(g.state.warmup!.ids).toEqual([conj]);
  });
  it('chaque âme libérée donne +1 PV ; une erreur renvoie la question dans la partie', () => {
    const pend = ids(3);
    const g = Game.newRun(content(), S, 'W3', 0, { pending: pend });
    const hp0 = g.state.maxHp;
    const w = () => g.state.warmup!;
    // 1 : juste
    g.warmupAnswer(good(g, w().quiz.q.id));
    expect(w().freed).toBe(1);
    expect(g.state.maxHp).toBe(hp0 + 1);
    expect(g.state.hp).toBe(hp0 + 1);
    g.warmupNext();
    // 2 : faux
    const missed = w().quiz.q.id;
    g.warmupAnswer(bad(g, missed, w().quiz.q.options));
    expect(g.state.maxHp).toBe(hp0 + 1);
    expect(g.state.retry).toContain(missed);
    expect(g.state.errors.map(e => e.id)).toContain(missed);
    g.warmupNext();
    // 3 : juste, puis départ
    g.warmupAnswer(good(g, w().quiz.q.id));
    g.warmupNext();
    expect(g.state.screen).toBe('map');
    expect(g.state.maxHp).toBe(hp0 + 2);
    expect(g.state.stats.freed).toBe(2);
  });
  it('on ne peut pas répondre deux fois à la même question ni avancer sans répondre', () => {
    const g = Game.newRun(content(), S, 'W4', 0, { pending: ids(2) });
    const hp0 = g.state.maxHp;
    g.warmupNext();
    expect(g.state.warmup!.i).toBe(0);
    const id = g.state.warmup!.quiz.q.id;
    g.warmupAnswer(good(g, id));
    g.warmupAnswer(good(g, id));
    expect(g.state.maxHp).toBe(hp0 + 1);
  });
  it('passer l’échauffement ne perd aucune question', () => {
    const pend = ids(7);
    const g = Game.newRun(content(), S, 'W5', 0, { pending: pend });
    g.warmupAnswer(good(g, g.state.warmup!.quiz.q.id));
    g.warmupNext();
    g.warmupSkip();
    expect(g.state.screen).toBe('map');
    expect(g.state.retry).toEqual(pend.slice(1));
  });
  it('une partie sauvegardée pendant l’échauffement se reprend', () => {
    const g = Game.newRun(content(), S, 'W6', 0, { pending: ids(2) });
    const copy = new Game(content(), S, JSON.parse(JSON.stringify(g.state)));
    expect(copy.state.screen).toBe('warmup');
    copy.warmupAnswer(good(copy, copy.state.warmup!.quiz.q.id));
    expect(copy.state.warmup!.freed).toBe(1);
  });
});

describe('d’une partie à l’autre (simulation)', () => {
  /** Deux parties de suite pour le même élève : les erreurs de la première sont-elles reposées dans la seconde ? */
  function twoRuns(i: number, acc: number) {
    let l: Leitner = {};
    let clock = 0;
    const attach = (g: Game) => {
      g.onRecord = (q, v) => {
        l = leitnerUpdate(l, q.id, v, (clock += 60000));
      };
    };
    simulate(content(), `ALMAS-A-${i}`, acc, S, { attach });
    const carried = pendingAlmas(l).slice(0, CARRY_MAX);
    const second = simulate(content(), `ALMAS-B-${i}`, acc, S, { attach, pending: pendingAlmas(l) });
    const back = carried.filter(id => second.asked.includes(id)).length;
    return { carried: carried.length, back, second };
  }
  it('au moins 80 % des questions ratées sont reposées à la partie suivante', () => {
    let carried = 0, back = 0;
    for (let i = 0; i < 60; i++) {
      const r = twoRuns(i, 0.7);
      carried += r.carried;
      back += r.back;
    }
    expect(carried).toBeGreaterThan(200);
    expect(back / carried).toBeGreaterThan(0.8);
  });
  it('l’échauffement pose au plus 4 questions et donne au plus 4 PV', () => {
    for (let i = 0; i < 30; i++) {
      const { second } = twoRuns(i, 0.6);
      expect(second.warmup).toBeLessThanOrEqual(WARMUP_MAX);
    }
  });
});
