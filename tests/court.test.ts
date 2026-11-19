/** Partie courte : les trois actes raccourcis, 8 à 10 minutes, mêmes règles de combat. */
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, Game } from '../src/engine/game';
import { content } from './helpers';
import { simulate } from './sim';

const N = 120;
const run = (acc: number) => Array.from({ length: N }, (_, i) => simulate(content(), `COURT-${i}`, acc, undefined, { short: true }));
const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
const bossHp = (short: boolean) => {
  const g = Game.newRun(content(), DEFAULT_SETTINGS, 'BOSS-1', 0, { short });
  const boss = g.state.map.nodes.find(n => n.type === 'boss')!;
  g.state.node = g.state.map.nodes.find(n => n.next.includes(boss.id))?.id ?? null;
  g.choose(boss.id);
  return g.state.combat!.maxHp;
};

describe('partie courte', () => {
  it('chaque acte a 3 étages au lieu de 6, et les trois actes restent', () => {
    const c = content();
    const g = Game.newRun(c, DEFAULT_SETTINGS, 'COURT-MAP', 0, { short: true });
    expect(g.state.short).toBe(true);
    expect(g.state.map.floors).toBe(3);
    expect(Game.newRun(c, DEFAULT_SETTINGS, 'NORMAL-MAP').state.map.floors).toBe(c.sequence.map.floors);
  });
  it('les jefes ont moins de PV en partie courte seulement', () => {
    expect(bossHp(true)).toBeLessThan(bossHp(false));
    expect(bossHp(false)).toBe(content().enemies.find(e => e.id === content().sequence.acts[0].boss)!.hp);
  });
  it('un élève moyen (75 %) finit en 8 à 10 minutes environ, et gagne souvent', () => {
    const rs = run(0.75);
    expect(avg(rs.map(r => r.minutes))).toBeGreaterThan(8);
    expect(avg(rs.map(r => r.minutes))).toBeLessThan(10.5);
    expect(rs.filter(r => r.win).length / N).toBeGreaterThan(0.6);
  });
  it('un très bon élève (90 %) ne dépasse pas 10 minutes', () => {
    const m = avg(run(0.9).map(r => r.minutes));
    expect(m).toBeGreaterThan(6);
    expect(m).toBeLessThan(10);
  });
  it('répondre au hasard ne suffit pas pour gagner', () => {
    expect(run(0.4).filter(r => r.win).length / N).toBeLessThan(0.1);
  });
});
