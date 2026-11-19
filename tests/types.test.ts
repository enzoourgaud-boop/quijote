import { describe, expect, it } from 'vitest';
import { DEFAULT_CHECK } from '../src/engine/answer';
import { checkCoherence } from '../src/engine/content';
import { DEFAULT_SETTINGS, Game } from '../src/engine/game';
import { answerText, canonicalValue, judgeQuestion, orderTokens, wrongValue } from '../src/engine/questions';
import type { Question } from '../src/engine/schema';
import { content } from './helpers';

const S = { ...DEFAULT_SETTINGS };
const byType = (t: Question['type']) => content().questions.filter(q => q.type === t);
const modeOf = (q: Question) => ({ 'vrai-faux': 'tf', ordre: 'order', association: 'match', scene: 'place', ecrit: 'write' } as const)[q.type as 'ordre'] ?? 'qcm';

describe('nouveaux types de questions', () => {
  it('chaque type est présent dans la banque', () => {
    for (const t of ['vrai-faux', 'ordre', 'association', 'scene', 'ecoute'] as const) expect(byType(t).length).toBeGreaterThan(9);
  });

  it('la bonne réponse est acceptée et une mauvaise refusée, pour chaque question', () => {
    for (const q of content().questions) {
      const m = modeOf(q);
      expect(judgeQuestion(q, m, canonicalValue(q), DEFAULT_CHECK), q.id).toBe('ok');
      const opts = 'distractors' in q ? [q.answer, ...q.distractors] : [];
      expect(judgeQuestion(q, m, wrongValue(q, opts), DEFAULT_CHECK), q.id).toBe('ko');
    }
  });

  it('ordre : la ponctuation et les majuscules ne comptent pas, l’ordre oui', () => {
    const q = byType('ordre')[0] as Extract<Question, { type: 'ordre' }>;
    const toks = orderTokens(q);
    expect(judgeQuestion(q, 'order', JSON.stringify(toks.map(t => t.toLowerCase())), DEFAULT_CHECK)).toBe('ok');
    expect(judgeQuestion(q, 'order', JSON.stringify([toks[1], toks[0], ...toks.slice(2)]), DEFAULT_CHECK)).toBe('ko');
    expect(judgeQuestion(q, 'order', '[]', DEFAULT_CHECK)).toBeNull();
  });

  it('association : il faut relier tous les mots', () => {
    const q = byType('association')[0] as Extract<Question, { type: 'association' }>;
    const partial = Object.fromEntries(q.pairs.slice(1));
    expect(judgeQuestion(q, 'match', JSON.stringify(partial), DEFAULT_CHECK)).toBeNull();
  });

  it('scène : une position laissée libre sur un axe accepte toute rangée', () => {
    const q = byType('scene').find(x => x.type === 'scene' && x.scene.items.some(it => !it.row)) as Extract<Question, { type: 'scene' }>;
    expect(q).toBeTruthy();
    const free = q.scene.items.find(it => !it.row)!;
    const decor = content().scenes.decors.find(d => d.id === q.scene.decor)!;
    const v = JSON.parse(canonicalValue(q)) as Record<string, string>;
    for (const r of decor.rows) {
      v[free.object] = `${r[0]}|${free.col}`;
      expect(judgeQuestion(q, 'place', JSON.stringify(v), DEFAULT_CHECK)).toBe('ok');
    }
  });

  it('vrai/faux : la réponse lisible est en espagnol', () => {
    const q = byType('vrai-faux')[0];
    expect(['Verdadero', 'Falso']).toContain(answerText(q));
  });

  it('le validateur repère une phrase dont les étiquettes ne recomposent pas la réponse', () => {
    const c = content();
    const q = { ...(byType('ordre')[0] as Extract<Question, { type: 'ordre' }>), tokens: ['Hola', 'mundo'] };
    expect(checkCoherence({ ...c, questions: [q] }).some(i => i.message.includes('recomposent'))).toBe(true);
  });

  it('le validateur repère deux objets au même endroit sur une scène', () => {
    const c = content();
    const q0 = byType('scene')[0] as Extract<Question, { type: 'scene' }>;
    const q = { ...q0, scene: { decor: q0.scene.decor, items: [{ object: 'lanza', row: 'arriba', col: 'izquierda' }, { object: 'foto', row: 'arriba', col: 'izquierda' }] } };
    expect(checkCoherence({ ...c, questions: [q] }).some(i => i.message.includes('même endroit'))).toBe(true);
  });
});

describe('moteur et nouveaux types', () => {
  it('chaque type prend le bon mode de réponse en combat', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 300 && seen.size < 6; i++) {
      const g = Game.newRun(content(), S, `MODE-${i}`);
      g.choose(g.reachable()[0].id);
      const q = g.question!, m = g.state.combat!.q.mode;
      seen.add(q.type);
      if (q.type === 'vrai-faux') expect(m).toBe('tf');
      if (q.type === 'ordre') expect(m).toBe('order');
      if (q.type === 'association') expect(m).toBe('match');
      if (q.type === 'scene') expect(m).toBe('place');
      if (q.type === 'ordre') expect([...g.state.combat!.q.options].sort()).toEqual([...orderTokens(q), ...q.extra].sort());
    }
    expect(seen.size).toBeGreaterThanOrEqual(5);
  });

  it('le professeur peut limiter les types de questions', () => {
    const g = Game.newRun(content(), { ...S, types: ['vrai-faux'] }, 'TYPES-1');
    g.choose(g.reachable()[0].id);
    for (let i = 0; i < 20 && g.state.screen === 'combat'; i++) {
      if (g.state.combat!.fb) g.proceed();
      else {
        expect(g.question!.type).toBe('vrai-faux');
        g.answer(canonicalValue(g.question!));
      }
    }
  });

  it('l’intention « ¿Me oyes? » du Caballo Salvaje impose une question orale', () => {
    const g = Game.newRun(content(), S, 'LECHUZA');
    (g as unknown as { startFight(id: string): void }).startFight('caballo-salvaje');
    let listened = 0;
    for (let i = 0; i < 30 && g.state.screen === 'combat'; i++) {
      const c = g.state.combat!;
      if (c.fb) {
        g.proceed();
        continue;
      }
      if (c.intent.kind === 'listen') {
        expect(g.question!.type).toBe('ecoute');
        listened++;
      }
      g.answer(canonicalValue(g.question!));
    }
    expect(listened).toBeGreaterThan(0);
  });

  it('« En realidad… » fonctionne sur tous les types', () => {
    for (const t of ['vrai-faux', 'ordre', 'association', 'scene'] as const) {
      const g = Game.newRun(content(), { ...S, types: [t] }, `ORA-${t}`);
      g.choose(g.reachable()[0].id);
      g.state.inv['en-realidad'] = 1;
      g.usePower('en-realidad');
      expect(g.state.combat!.fb!.outcome, t).toBe('oracle');
    }
  });

  it('¡Fíjate! donne un indice sur les types sans QCM', () => {
    const g = Game.newRun(content(), { ...S, types: ['ordre'] }, 'TIJ-ORD');
    g.choose(g.reachable()[0].id);
    expect(g.usePower('fijate')).toBe(true);
    expect(g.state.combat!.mask).toMatch(/commence par/);
  });
});
