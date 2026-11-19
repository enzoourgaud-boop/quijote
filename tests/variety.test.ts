import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, Game, RETRY_GAP } from '../src/engine/game';
import { canonicalValue, wrongValue } from '../src/engine/questions';
import { content } from './helpers';

const S = { ...DEFAULT_SETTINGS };

/** Joue une partie et renvoie la suite des questions posées (et celles posées en revanche). */
function history(seed: string, wrongEvery = 3) {
  const g = Game.newRun(content(), S, seed, 0);
  const hist: { id: string; again: boolean }[] = [];
  const raw = g as unknown as { makeAsked: (q: { id: string }, m: string, a?: boolean) => unknown };
  const orig = raw.makeAsked.bind(g);
  raw.makeAsked = (q, m, a) => {
    hist.push({ id: q.id, again: !!a });
    return orig(q, m, a);
  };
  let k = 0;
  const reply = (id: string, opts: string[]) => {
    const q = g.getQuestion(id)!;
    return ++k % wrongEvery === 0 ? wrongValue(q, opts) : canonicalValue(q);
  };
  for (let i = 0; i < 8000 && g.state.screen !== 'over'; i++) {
    const s = g.state;
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
  return { g, hist };
}

describe('variété des questions', () => {
  it('repère les questions qui se répondent l’une l’autre', () => {
    const g = Game.newRun(content(), S, 'X');
    expect(g.closeTo('pers-burro-nombre', 'int-como-burro')).toBe(true); // la réponse « Rucio » est dans l'autre énoncé
    expect(g.closeTo('voc-libro-es', 'conj-yo-leo')).toBe(true); // libro
    expect(g.closeTo('pers-quijote-edad', 'conj-ex1-2')).toBe(true); // « cincuenta años »
    expect(g.closeTo('pers-cervantes', 'int-como-te-llamas')).toBe(false);
  });

  it('presque jamais deux questions proches à moins de 4 questions d’écart', () => {
    let close = 0, total = 0;
    for (let i = 0; i < 40; i++) {
      const { g, hist } = history(`VAR-${i}`);
      for (let k = 1; k < hist.length; k++) for (let d = 1; d <= 3 && k - d >= 0; d++) {
        total++;
        if (g.closeTo(hist[k].id, hist[k - d].id)) close++;
      }
    }
    expect(close / total).toBeLessThan(0.005);
  });

  it(`une question ratée ne revient pas avant ${RETRY_GAP} questions`, () => {
    let agains = 0;
    for (let i = 0; i < 40; i++) {
      const { hist } = history(`GAP-${i}`, 2);
      hist.forEach((h, k) => {
        if (!h.again) return;
        agains++;
        const prev = hist.slice(0, k).map(x => x.id).lastIndexOf(h.id);
        expect(k - prev).toBeGreaterThan(RETRY_GAP);
      });
    }
    expect(agains).toBeGreaterThan(10);
  });
});
