import { describe, expect, it } from 'vitest';
import { cleanSeed, hashSeed, randomSeed, Rng } from '../src/engine/rng';

describe('générateur à graine', () => {
  it('même graine → même suite', () => {
    const a = new Rng('MOLINO-42'), b = new Rng('MOLINO-42');
    expect(Array.from({ length: 50 }, () => a.next())).toEqual(Array.from({ length: 50 }, () => b.next()));
  });
  it('graines différentes → suites différentes', () => {
    const a = new Rng('LANZA-10'), b = new Rng('LANZA-11');
    expect(a.next()).not.toBe(b.next());
  });
  it('la graine ignore la casse et les espaces autour', () => {
    expect(hashSeed(' molino-42 ')).toBe(hashSeed('MOLINO-42'));
  });
  it("l'état peut être sauvegardé puis repris", () => {
    const a = new Rng('X');
    a.next();
    a.next();
    const b = new Rng(a.state);
    expect(b.next()).toBe(a.next());
  });
  it('produit des nombres dans [0,1[ et uniformes', () => {
    const r = new Rng('stat');
    const buckets = new Array(10).fill(0);
    for (let i = 0; i < 20000; i++) {
      const x = r.next();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      buckets[Math.floor(x * 10)]++;
    }
    for (const n of buckets) expect(n).toBeGreaterThan(1800);
  });
  it('shuffle conserve les éléments', () => {
    const r = new Rng('s');
    expect(r.shuffle([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
  });
  it('weighted respecte les poids nuls', () => {
    const r = new Rng('w');
    for (let i = 0; i < 200; i++) expect(r.weighted(['a', 'b'], x => (x === 'a' ? 0 : 1))).toBe('b');
  });
  it('graine lisible', () => {
    expect(randomSeed(() => 0)).toBe('MOLINO-10');
    expect(cleanSeed(' mi graine ! ')).toBe('MI-GRAINE');
  });
});
