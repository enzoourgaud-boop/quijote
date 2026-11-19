import { describe, expect, it } from 'vitest';
import { generateMap, nodeById, reachable } from '../src/engine/map';
import { Rng } from '../src/engine/rng';
import { content } from './helpers';

const cfg = () => content().sequence.map;
const maps = Array.from({ length: 300 }, (_, i) => generateMap(new Rng(`MAP-${i}`), cfg()));

describe('carte à embranchements', () => {
  it('même graine → même carte', () => {
    expect(generateMap(new Rng('X-1'), cfg())).toEqual(generateMap(new Rng('X-1'), cfg()));
  });

  it('structure : combats au départ, En casa avant le jefe, un seul jefe à la fin', () => {
    for (const m of maps) {
      const last = m.floors - 1;
      expect(m.nodes.filter(n => n.floor === 0).every(n => n.type === 'combat')).toBe(true);
      expect(m.nodes.filter(n => n.floor === cfg().restFloor).every(n => n.type === 'rest')).toBe(true);
      const boss = m.nodes.filter(n => n.type === 'boss');
      expect(boss).toHaveLength(1);
      expect(boss[0].floor).toBe(last);
    }
  });

  it('chaque salle est atteignable et mène au jefe', () => {
    for (const m of maps) {
      const seen = new Set<string>();
      const stack = reachable(m, null).map(n => n.id);
      while (stack.length) {
        const id = stack.pop()!;
        if (seen.has(id)) continue;
        seen.add(id);
        stack.push(...nodeById(m, id)!.next);
      }
      expect(seen.size).toBe(m.nodes.length);
      for (const n of m.nodes) if (n.type !== 'boss') expect(n.next.length).toBeGreaterThan(0);
    }
  });

  it('les chemins ne se croisent pas', () => {
    for (const m of maps) {
      for (let f = 0; f < m.floors - 1; f++) {
        const A = m.nodes.filter(n => n.floor === f);
        const idx = (id: string) => Number(id.split('-')[1]);
        for (let i = 0; i + 1 < A.length; i++) {
          const maxL = Math.max(...A[i].next.map(idx));
          const minR = Math.min(...A[i + 1].next.map(idx));
          expect(maxL).toBeLessThanOrEqual(minR);
        }
      }
    }
  });

  it('chaque acte propose au moins un élite et un Tianguis', () => {
    for (const m of maps) {
      expect(m.nodes.some(n => n.type === 'elite')).toBe(true);
      expect(m.nodes.some(n => n.type === 'shop')).toBe(true);
    }
  });

  it('pas deux Tianguis de suite, pas d’élite au premier étage intermédiaire', () => {
    for (const m of maps) {
      for (const n of m.nodes) {
        if (n.type === 'shop') for (const id of n.next) expect(nodeById(m, id)!.type).not.toBe('shop');
        if (n.floor <= 1) expect(n.type).not.toBe('elite');
      }
    }
  });
});
