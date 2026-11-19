import { describe, expect, it } from 'vitest';
import { content } from './helpers';
import { simulate } from './sim';

const N = 120;
const run = (acc: number) => Array.from({ length: N }, (_, i) => simulate(content(), `BAL-${i}`, acc));
const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);

describe('équilibrage (simulation)', () => {
  it('un très bon élève (90 %) gagne presque toujours, en 13 à 20 minutes', () => {
    const rs = run(0.9);
    expect(rs.filter(r => r.win).length / N).toBeGreaterThan(0.85);
    const m = avg(rs.map(r => r.minutes));
    expect(m).toBeGreaterThan(13);
    expect(m).toBeLessThan(20);
  });
  it('un élève moyen (75 %) gagne parfois, mais pas toujours', () => {
    const w = run(0.75).filter(r => r.win).length / N;
    expect(w).toBeGreaterThan(0.3);
    // chrono coupé par défaut (pas de temps écoulé) : 91 à 95 % de victoires avec les valeurs de combat d'El Camino
    expect(w).toBeLessThan(0.97);
  });
  it('un élève fragile (60 %) dépasse le premier acte dans au moins deux parties sur trois', () => {
    const rs = run(0.6);
    expect(rs.filter(r => r.win || r.act >= 1).length / N).toBeGreaterThan(0.66);
    // et la partie ne s'éternise pas
    expect(avg(rs.map(r => r.minutes))).toBeLessThan(21);
  });
  it('répondre au hasard ne suffit pas pour gagner', () => {
    expect(run(0.4).filter(r => r.win).length).toBe(0);
  });
  it('une partie gagnée par un élève moyen dure en moyenne moins de 22 minutes', () => {
    expect(avg(run(0.75).filter(r => r.win).map(r => r.minutes))).toBeLessThan(22);
  });
});
