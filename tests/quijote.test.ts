/** Tests propres à la séquence « Presentarse con Don Quijote » : réponses attendues, accents, variantes acceptées. */
import { describe, expect, it } from 'vitest';
import { judgeQuestion } from '../src/engine/questions';
import type { Question } from '../src/engine/schema';
import { FIGURES } from '../src/ui/figures';
import { content } from './helpers';

const c = content();
const q = (id: string): Question => {
  const x = c.questions.find(y => y.id === id);
  if (!x) throw new Error(`question absente : ${id}`);
  return x;
};
const theme = (x: Question) => c.sequence.themes.find(t => t.id === x.theme)!;
/** Réglages de correction tels que le jeu les applique (thème, puis question). */
const judge = (id: string, value: string, mode: 'write' | 'qcm' = 'write') => {
  const x = q(id);
  return judgeQuestion(x, mode, value, {
    ignoreArticles: x.check?.ignoreArticles ?? theme(x).check?.ignoreArticles ?? false,
    optionalSubject: x.check?.optionalSubject ?? theme(x).check?.optionalSubject ?? true,
    accents: 'casi',
  });
};

describe('réponses de la séquence', () => {
  it('les exercices du document : bonnes formes de ser, estar, tener', () => {
    expect(judge('conj-ex1-1', 'soy')).toBe('ok');
    expect(judge('conj-ex1-2', 'tiene')).toBe('ok');
    expect(judge('conj-ex1-3', 'estás')).toBe('ok');
    expect(judge('conj-ex1-7', 'eres')).toBe('ok');
    expect(judge('conj-ex1-7', 'es')).toBe('ko');
    expect(judge('conj-ex2-1', 'estoy', 'qcm')).toBe('ok');
    expect(judge('conj-ex2-1', 'está', 'qcm')).toBe('ko');
  });
  it('un accent oublié donne « ¡Casi! »', () => {
    expect(judge('conj-ex1-3', 'estas')).toBe('casi');
    expect(judge('int-como-te-llamas', 'Como')).toBe('casi');
    expect(judge('int-cuantos-anos', 'Cuantos')).toBe('casi');
    expect(judge('pers-cervantes-nacion', 'espanol')).toBe('casi');
  });
  it('un tilde (ñ) oublié donne aussi « ¡Casi! »', () => {
    expect(judge('pres-tengo-anos', 'anos')).toBe('casi');
    expect(judge('voc-codigo-senor', 'senor')).toBe('casi');
    expect(judge('voc-codigo-espana', 'Espana')).toBe('casi');
  });
  it('variantes acceptées : chiffres, pronom sujet, nom court', () => {
    expect(judge('pres-escribe-anos', 'Tengo 50 años')).toBe('ok');
    expect(judge('pres-escribe-anos', 'Yo tengo cincuenta años.')).toBe('ok');
    expect(judge('conj-jefe-burro', 'Tú tienes un burro')).toBe('ok');
    expect(judge('conj-jefe-burro', 'tienes un burro')).toBe('ok');
    expect(judge('conj-jefe-burro', 'tiene un burro')).toBe('ko');
    expect(judge('pers-cervantes', 'Cervantes')).toBe('ok');
    expect(judge('dul-cuantas-jovenes', '3')).toBe('ok');
    expect(judge('int-escribe-eres', '¿quién eres tú?')).toBe('ok');
  });
  it('vocabulaire : l’article est facultatif, le mot exact ne l’est pas', () => {
    expect(judge('voc-molino-es', 'molino')).toBe('ok');
    expect(judge('voc-molino-es', 'el molino')).toBe('ok');
    expect(judge('voc-molino-es', 'el camino')).toBe('ko');
    expect(judge('voc-codigo-caballo', 'CABALLO')).toBe('ok');
  });
  it('mots codés : le code de chaque question correspond bien au mot attendu', () => {
    const ALPH = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
    for (const x of c.questions.filter(y => y.id.startsWith('voc-codigo-'))) {
      const word = x.prompt.split(' – ').map(n => ALPH[Number(n) - 1]).join('');
      expect(word, x.id).toBe((x as { answer: string }).answer.toUpperCase());
    }
  });
});

describe('contenu de la séquence', () => {
  it('chaque dessin « svg: » cité dans le contenu existe', () => {
    const refs = [
      ...c.enemies.map(e => e.emoji),
      ...c.items.map(i => i.emoji),
      ...c.questions.flatMap(x => (x.type === 'association' ? x.pairs.map(p => p[1]) : [])),
    ].filter(e => e.startsWith('svg:'));
    expect(refs.length).toBeGreaterThan(0);
    for (const r of refs) expect(Object.keys(FIGURES), r).toContain(r.slice(4));
  });
  it('chaque scène peut être réalisée (pas plus de personnages par village que de places)', () => {
    for (const x of c.questions) {
      if (x.type !== 'scene') continue;
      const d = c.scenes.decors.find(y => y.id === x.scene.decor)!;
      for (const [col] of d.cols) expect(x.scene.items.filter(i => i.col === col).length, x.id).toBeLessThanOrEqual(d.rows.length);
    }
  });
  it('chaque question cite l’un des cinq documents de la séquence', () => {
    const docs = new Set(['intro', 'dq1', 'dq2', 'conjugacion', 'dulcinea']);
    for (const x of c.questions) expect(docs.has(x.source), x.id).toBe(true);
  });
  it('les questions hors documents restent désactivées tant que le professeur ne les a pas validées', () => {
    for (const x of c.questions.filter(y => y.notions.includes('hors-documents'))) expect(x.disabled, x.id).toBe(true);
  });
});
