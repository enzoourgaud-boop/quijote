import { describe, expect, it } from 'vitest';
import { checkCoherence, parseContent } from '../src/engine/content';
import { readSequence } from '../scripts/read-content';
import { content } from './helpers';

describe('banque de questions', () => {
  it('la séquence fournie est valide et compte au moins 200 questions', () => {
    const { content: c, issues } = parseContent(readSequence('quijote'));
    expect(issues.filter(i => i.level === 'erreur')).toEqual([]);
    expect(c!.questions.length).toBeGreaterThanOrEqual(200);
  });
  it('chaque thème a des questions de niveaux 1, 2 et 3, et il existe un niveau jefe', () => {
    const c = content();
    for (const t of c.sequence.themes) for (const l of [1, 2, 3]) expect(c.questions.some(q => q.theme === t.id && q.level === l)).toBe(true);
    expect(c.questions.some(q => q.level === 'jefe')).toBe(true);
  });
  it('détecte une réponse présente parmi les distracteurs', () => {
    const c = content();
    const q0 = c.questions.find(q => q.type === 'qcm')! as Extract<(typeof c.questions)[number], { type: 'qcm' }>;
    const bad = { ...q0, distractors: [q0.answer.toUpperCase(), 'x', 'y'] };
    const issues = checkCoherence({ ...c, questions: [bad] });
    expect(issues.some(i => i.message.includes('est une bonne réponse'))).toBe(true);
  });
  it('détecte les identifiants et énoncés en double', () => {
    const c = content();
    const q = c.questions[5];
    expect(checkCoherence({ ...c, questions: [q, { ...q }] }).some(i => i.message.includes('utilisé 2 fois'))).toBe(true);
    expect(checkCoherence({ ...c, questions: [q, { ...q, id: 'copie' }] }).some(i => i.message.includes('même énoncé'))).toBe(true);
  });
  it('détecte un champ manquant', () => {
    const raw = readSequence('quijote');
    const data = [{ id: 'sans-reponse', type: 'qcm', theme: 'personajes', notions: ['cultura-fiesta'], level: 1, prompt: '¿?', distractors: ['a', 'b', 'c'], explanation: 'x', source: 'texto-ce' }];
    const { issues } = parseContent({ ...raw, questions: [{ file: 'test.json', data }] });
    expect(issues.some(i => i.where.includes('sans-reponse') && i.where.includes('answer'))).toBe(true);
  });
  it('détecte un nombre de trous incohérent', () => {
    const c = content();
    const q = { ...(c.questions.find(x => x.type === 'qcm' && x.prompt.includes('___'))! as Extract<(typeof c.questions)[number], { type: 'qcm' }>), answer: 'a / b / c' };
    expect(checkCoherence({ ...c, questions: [q] }).some(i => i.message.includes('trou'))).toBe(true);
  });
});
