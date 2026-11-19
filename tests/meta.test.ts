import { describe, expect, it } from 'vitest';
import { codeDataFromRun, decodeCode, encodeCode } from '../src/engine/code';
import { DEFAULT_SETTINGS, Game } from '../src/engine/game';
import { ACHIEVEMENTS, allCards, applyRun, characterUnlocked, emptyMeta, type Leitner, leitnerUpdate, leitnerWeight, notionStats, pendingAlmas } from '../src/engine/meta';
import { canonicalValue, wrongValue } from '../src/engine/questions';
import { content } from './helpers';

const S = { ...DEFAULT_SETTINGS };

function playOut(g: Game, wrongEvery = 0) {
  let k = 0;
  for (let i = 0; i < 8000 && g.state.screen !== 'over'; i++) {
    const s = g.state;
    const reply = (id: string, opts: string[]) => {
      const q = g.getQuestion(id)!;
      return wrongEvery && ++k % wrongEvery === 0 ? wrongValue(q, opts) : canonicalValue(q);
    };
    if (s.screen === 'map') g.choose(g.reachable()[0].id);
    else if (s.screen === 'combat') s.combat!.fb ? g.proceed() : g.answer(reply(s.combat!.q.id, s.combat!.q.options));
    else if (s.screen === 'reward') g.take(0);
    else if (s.screen === 'shop') g.leaveShop();
    else if (s.screen === 'rest') s.rest!.result ? g.roomContinue() : g.restHeal();
    else if (s.screen === 'chest') s.chest!.result ? g.roomContinue() : s.chest!.quiz ? g.chestAnswer(reply(s.chest!.quiz.q.id, s.chest!.quiz.q.options)) : g.chestOpen();
    else if (s.screen === 'event') {
      const st = s.event!;
      if (st.result) g.eventContinue();
      else if (st.quiz) g.eventAnswer(reply(st.quiz.q.id, st.quiz.q.options));
      else g.eventChoose(g.currentEvent!.choices.findIndex((_, j) => !g.choiceBlock(j)));
    }
  }
  return g;
}

describe('Leitner', () => {
  it('bonne réponse = boîte suivante, erreur = boîte 1, « casi » = on reste', () => {
    let l: Leitner = {};
    l = leitnerUpdate(l, 'a', 'ok', 120000);
    expect(l.a).toEqual([2, 1, 0, 2]);
    l = leitnerUpdate(l, 'a', 'ok');
    l = leitnerUpdate(l, 'a', 'casi');
    expect(l.a[0]).toBe(3);
    l = leitnerUpdate(l, 'a', 'ko', 600000);
    expect(l.a).toEqual([1, 4, 2, 10]);
    for (let i = 0; i < 10; i++) l = leitnerUpdate(l, 'b', 'ok');
    expect(l.b[0]).toBe(5);
  });
  it('almas pendientes : les questions ratées et pas encore réussies, les plus récentes d’abord', () => {
    let l: Leitner = { vieille: [1, 2, 1] }; // sauvegarde d'avant la version 1.1 : pas de date
    l = leitnerUpdate(l, 'a', 'ko', 60000 * 10);
    l = leitnerUpdate(l, 'b', 'ko', 60000 * 30);
    l = leitnerUpdate(l, 'c', 'ko', 60000 * 20);
    l = leitnerUpdate(l, 'reussie', 'ko', 60000 * 40);
    l = leitnerUpdate(l, 'reussie', 'ok', 60000 * 41);
    l = leitnerUpdate(l, 'accent', 'casi', 60000 * 50); // un accent oublié reste en boîte 1 : à revoir aussi
    l = leitnerUpdate(l, 'jamais-ratee', 'ok', 60000 * 60);
    expect(pendingAlmas(l)).toEqual(['accent', 'b', 'c', 'a', 'vieille']);
  });
  it('une question ratée pèse 6 fois plus qu’une question maîtrisée', () => {
    const l: Leitner = { rate: [1, 3, 2], ok: [5, 6, 0] };
    expect(leitnerWeight(l, 'rate') / leitnerWeight(l, 'ok')).toBe(6);
    expect(leitnerWeight(l, 'jamais')).toBeGreaterThan(leitnerWeight(l, 'ok'));
  });
  it('les questions ratées reviennent plus souvent d’une partie à l’autre', () => {
    const c = content();
    const target = c.questions.filter(q => q.theme === 'personajes' && q.level === 1 && q.type === 'qcm' && !q.disabled);
    const l: Leitner = Object.fromEntries(target.map((q, i) => [q.id, i < 3 ? [1, 2, 2] : [5, 5, 0]]));
    const counts: Record<string, number> = {};
    for (let i = 0; i < 150; i++) {
      const g = Game.newRun(c, { ...S, themes: ['personajes'], types: ['qcm'] }, `LEIT-${i}`);
      g.weightOf = q => leitnerWeight(l, q.id);
      g.choose(g.reachable()[0].id);
      counts[g.question!.id] = (counts[g.question!.id] ?? 0) + 1;
    }
    const weak = target.slice(0, 3).reduce((n, q) => n + (counts[q.id] ?? 0), 0) / 3;
    const strong = target.slice(3).reduce((n, q) => n + (counts[q.id] ?? 0), 0) / Math.max(1, target.length - 3);
    expect(weak).toBeGreaterThan(strong * 2.5);
  });
  it('le carnet classe les notions les plus fragiles en premier', () => {
    const c = content();
    const q = c.questions.find(x => x.notions.includes('tener'))!;
    const stats = notionStats(c, { [q.id]: [1, 4, 3] });
    expect(stats[0].id).toBe('tener');
    expect(stats[0].questions[0].id).toBe(q.id);
  });
});

describe('progression entre les parties', () => {
  it('personnages : bonus de départ et déblocage', () => {
    const c = content();
    const m = emptyMeta();
    expect(characterUnlocked(c, m, 'sancho')).toBe(true);
    expect(characterUnlocked(c, m, 'antonia')).toBe(false);
    expect(characterUnlocked(c, { ...m, bossesDefeated: ['gran-libro'] }, 'antonia')).toBe(true);
    expect(characterUnlocked(c, { ...m, wins: 1 }, 'aldonza')).toBe(true);
    const g = Game.newRun(c, S, 'CHAR-1', 0, { character: 'antonia' });
    expect(g.state.relics.rocinante).toBe(1);
    expect(g.state.maxHp).toBe(c.sequence.player.hp + 3);
    const v = Game.newRun(c, S, 'CHAR-2', 0, { character: 'sancho' });
    expect(v.state.inv.queso).toBe(1);
  });

  it('niveaux de caballero : les ennemis ont plus de PV, le départ est plus dur', () => {
    const c = content();
    const g0 = Game.newRun(c, S, 'ASC', 0, { ascension: 0 });
    const g9 = Game.newRun(c, S, 'ASC', 0, { ascension: 9 });
    expect(g9.state.maxHp).toBe(g0.state.maxHp - 3);
    expect(Object.values(g9.state.inv).reduce((a, b) => a + b, 0)).toBe(Object.values(g0.state.inv).reduce((a, b) => a + b, 0) - 1);
    g0.choose(g0.reachable()[0].id);
    g9.choose(g9.reachable()[0].id);
    expect(g9.state.combat!.maxHp).toBe(g0.state.combat!.maxHp + 1);
  });

  it('une victoire débloque cartes, succès, personnage et niveau suivant', () => {
    const c = content();
    const g = playOut(Game.newRun(c, S, 'META-1', 0, { character: 'sancho' }));
    expect(g.state.result).toBe('win');
    g.state.stats.endedAt = 20 * 60000;
    const { meta, unlocks } = applyRun(c, emptyMeta(), g.state, {}, 0);
    expect(meta.wins).toBe(1);
    expect(unlocks.ascension).toBe(1);
    expect(unlocks.characters).toEqual(expect.arrayContaining(['antonia', 'aldonza']));
    expect(unlocks.cards.length).toBeGreaterThan(5);
    expect(unlocks.cards).toContain('e:mago');
    expect(unlocks.achievements.map(a => a.id)).toEqual(expect.arrayContaining(['primer-paso', 'jefe-1', 'victoria']));
    // pas de doublon à la partie suivante
    const again = applyRun(c, meta, g.state, {}, 0);
    expect(again.unlocks.cards).toEqual([]);
    expect(again.unlocks.achievements.map(a => a.id)).not.toContain('victoria');
  });

  it('les cartes ont des numéros uniques et une phrase en espagnol', () => {
    const cards = allCards(content());
    expect(new Set(cards.map(c => c.card)).size).toBe(cards.length);
    for (const c of cards) expect(c.phrase, c.key).toBeTruthy();
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(15);
  });
});

describe('code de fin de partie', () => {
  it('encode puis décode à l’identique', () => {
    const d = { win: true, character: 2, act: 3, ascension: 4, ok: 71, total: 88, won: 11, minutes: 17, date: new Date(Date.UTC(2026, 10, 12)), missed: [0, 5, 12] };
    const code = encodeCode(d, 'quijote');
    expect(code).toMatch(/^[0-9A-Z]{5}-[0-9A-Z]{5}-[0-9A-Z]{5}-[0-9A-Z]{4}$/);
    const r = decodeCode(code, 'quijote');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toEqual(d);
  });
  it('tolère minuscules, espaces et confusions O/0, I/1', () => {
    const d = { win: false, character: 0, act: 2, ascension: 0, ok: 30, total: 41, won: 5, minutes: 12, date: new Date(Date.UTC(2026, 0, 3)), missed: [3] };
    const code = encodeCode(d, 'quijote');
    const messy = code.toLowerCase().replace(/-/g, ' ').replace(/0/g, 'o').replace(/1/g, 'l');
    expect(decodeCode(messy, 'quijote').ok).toBe(true);
  });
  it('repère une faute de recopie et un code d’une autre séquence', () => {
    const d = { win: true, character: 1, act: 3, ascension: 0, ok: 50, total: 60, won: 10, minutes: 16, date: new Date(Date.UTC(2026, 5, 1)), missed: [] };
    const code = encodeCode(d, 'quijote');
    const typo = (code[0] === 'A' ? 'B' : 'A') + code.slice(1);
    expect(decodeCode(typo, 'quijote').ok).toBe(false);
    expect(decodeCode(code, 'navidad').ok).toBe(false);
    expect(decodeCode('ABC', 'quijote').ok).toBe(false);
  });
  it('le code d’une vraie partie liste les notions ratées', () => {
    const c = content();
    const g = playOut(Game.newRun(c, S, 'CODE-1', 0), 4);
    const d = codeDataFromRun(c, g.state);
    expect(d.missed.length).toBeGreaterThan(0);
    const r = decodeCode(encodeCode(d, c.sequence.id), c.sequence.id);
    expect(r.ok && r.data.missed).toEqual(d.missed);
  });
});
