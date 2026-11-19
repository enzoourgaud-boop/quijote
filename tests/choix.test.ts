/** L'élève choisit ce qu'il veut travailler (thèmes), dans la limite des réglages du professeur. */
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, Game } from '../src/engine/game';
import { canonicalValue } from '../src/engine/questions';
import { content } from './helpers';

/** Joue une partie en répondant juste et renvoie les thèmes des questions posées en combat. */
function themesAsked(g: Game, n = 120): Set<string> {
  const seen = new Set<string>();
  for (let i = 0; i < n * 4 && seen.size < 99; i++) {
    const s = g.state;
    if (s.screen === 'map') g.choose(g.reachable().find(x => x.type === 'combat' || x.type === 'boss' || x.type === 'elite')?.id ?? g.reachable()[0].id);
    else if (s.screen === 'combat' && s.combat) {
      if (s.combat.fb) g.proceed();
      else {
        seen.add(g.question!.theme);
        g.answer(canonicalValue(g.question!));
      }
    } else if (s.screen === 'warmup') g.warmupSkip();
    else break; // récompense, salle… : l'échantillon suffit
  }
  return seen;
}

describe('l’élève choisit ce qu’il travaille', () => {
  it('seuls les thèmes choisis sont posés', () => {
    for (let i = 0; i < 10; i++) {
      const g = Game.newRun(content(), DEFAULT_SETTINGS, `CHOIX-${i}`, 0, { focus: ['conjugacion'] });
      expect([...themesAsked(g)]).toEqual(['conjugacion']);
    }
  });
  it('sans choix, tous les thèmes restent possibles', () => {
    expect(Game.newRun(content(), DEFAULT_SETTINGS, 'TOUS').activeThemes()).toHaveLength(4);
    expect(Game.newRun(content(), DEFAULT_SETTINGS, 'VIDE', 0, { focus: [] }).state.focus).toBeUndefined();
  });
  it('le choix reste dans les thèmes du professeur', () => {
    const prof = { ...DEFAULT_SETTINGS, themes: ['vocabulario', 'conjugacion'] };
    expect(Game.newRun(content(), prof, 'P1', 0, { focus: ['conjugacion', 'personajes'] }).activeThemes()).toEqual(['conjugacion']);
    // un choix entièrement hors des thèmes du professeur : on garde ceux du professeur
    expect(Game.newRun(content(), prof, 'P2', 0, { focus: ['personajes'] }).activeThemes()).toEqual(['vocabulario', 'conjugacion']);
  });
  it('changer les options en cours de partie ne fait pas perdre le choix', () => {
    const g = Game.newRun(content(), DEFAULT_SETTINGS, 'OPT', 0, { focus: ['identidad'] });
    g.updateSettings({ ...DEFAULT_SETTINGS, chrono: true });
    expect(g.activeThemes()).toEqual(['identidad']);
  });
});
