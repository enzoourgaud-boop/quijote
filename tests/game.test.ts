import { describe, expect, it } from 'vitest';
import { canonicalValue, wrongValue } from '../src/engine/questions';
import { DEFAULT_SETTINGS, Game } from '../src/engine/game';
import { content } from './helpers';
import { simulate } from './sim';

const S = { ...DEFAULT_SETTINGS, chrono: true }; // chrono coupé par défaut : on l'active pour tester son effet

/** Partie démarrée directement sur un combat (contre l'ennemi donné, sinon le premier de la carte). */
function fight(seed: string, settings = S, enemy?: string): Game {
  const g = Game.newRun(content(), settings, seed);
  if (enemy) (g as unknown as { startFight(id: string): void }).startFight(enemy);
  else g.choose(g.reachable()[0].id);
  return g;
}

/** Joue automatiquement toutes les salles jusqu'à la fin (bonnes réponses sauf si wrong(k)). */
function autoplay(g: Game, max = 5000, wrong: (k: number) => boolean = () => false, onQuestion?: () => void) {
  let k = 0;
  for (let i = 0; i < max && g.state.screen !== 'over'; i++) {
    const s = g.state;
    const reply = (id: string, _mode: string, options: string[]) => {
      const q = g.getQuestion(id)!;
      return wrong(k++) ? wrongValue(q, options) : canonicalValue(q);
    };
    if (s.screen === 'map') g.choose(g.reachable()[0].id);
    else if (s.screen === 'combat') {
      if (s.combat!.fb) g.proceed();
      else {
        onQuestion?.();
        g.answer(reply(s.combat!.q.id, s.combat!.q.mode, s.combat!.q.options));
      }
    } else if (s.screen === 'reward') g.take(0);
    else if (s.screen === 'shop') g.leaveShop();
    else if (s.screen === 'rest') s.rest!.result ? g.roomContinue() : g.restHeal();
    else if (s.screen === 'chest') {
      const ch = s.chest!;
      if (ch.result) g.roomContinue();
      else if (ch.quiz) g.chestAnswer(reply(ch.quiz.q.id, ch.quiz.q.mode, ch.quiz.q.options));
      else g.chestOpen();
    } else if (s.screen === 'event') {
      const st = s.event!;
      if (st.result) g.eventContinue();
      else if (st.quiz) g.eventAnswer(reply(st.quiz.q.id, st.quiz.q.mode, st.quiz.q.options));
      else g.eventChoose(g.currentEvent!.choices.findIndex((_, i) => !g.choiceBlock(i)));
    }
  }
}

function wrongOf(g: Game) {
  const c = g.state.combat!, q = g.question!;
  return wrongValue(q, c.q.options);
}

describe('moteur de partie', () => {
  it('une nouvelle partie démarre sur la carte, au pied du premier étage', () => {
    const g = Game.newRun(content(), S, 'TEST-1');
    expect(g.state.screen).toBe('map');
    expect(g.reachable().every(n => n.floor === 0 && n.type === 'combat')).toBe(true);
    expect(g.state.hp).toBe(content().sequence.player.hp);
    g.choose(g.reachable()[0].id);
    expect(g.state.screen).toBe('combat');
    expect(g.question).toBeTruthy();
  });

  it('on ne peut pas sauter d’étage sur la carte', () => {
    const g = Game.newRun(content(), S, 'TEST-2');
    const far = g.state.map.nodes.find(n => n.floor === 2)!;
    expect(g.choose(far.id)).toBe(false);
    expect(g.state.screen).toBe('map');
  });

  it('même graine + mêmes réponses = même partie (reproductible)', () => {
    const a = simulate(content(), 'REPRO-7', 0.8);
    const b = simulate(content(), 'REPRO-7', 0.8);
    expect(a).toEqual(b);
    const g1 = fight('REPRO-7'), g2 = fight('REPRO-7');
    expect(g1.state.map).toEqual(g2.state.map);
    expect(g1.state.combat!.q).toEqual(g2.state.combat!.q);
  });

  it('une bonne réponse blesse l’ennemi, une erreur blesse le joueur', () => {
    const g = fight('HIT-1');
    const hp0 = g.state.combat!.hp + g.state.combat!.shield;
    g.answer(canonicalValue(g.question!));
    const c = g.state.combat!;
    expect(c.fb!.outcome).toBe('ok');
    expect(c.hp + c.shield).toBeLessThan(hp0);
    g.proceed();
    const php = g.state.hp;
    g.answer(wrongOf(g));
    expect(g.state.combat!.fb!.outcome).toBe('ko');
    expect(g.state.hp).toBeLessThan(php);
    expect(g.state.errors).toHaveLength(1);
  });

  it('un accent oublié ne blesse personne', () => {
    // cherche une partie dont une question écrite contient un accent
    for (let i = 0; i < 400; i++) {
      const g = fight(`CASI-${i}`, { ...S, writeFactor: 10, types: ["qcm", "ecrit"] });
      const q = g.question!;
      if (g.state.combat!.q.mode !== 'write' || !/[áéíóú]/.test(canonicalValue(q))) continue;
      const hp = g.state.hp, ehp = g.state.combat!.hp;
      g.answer(canonicalValue(q).normalize('NFD').replace(/[̀-ͯ]/g, ''));
      expect(g.state.combat!.fb!.outcome).toBe('casi');
      expect(g.state.hp).toBe(hp);
      expect(g.state.combat!.hp).toBe(ehp);
      return;
    }
    throw new Error('aucune question écrite accentuée trouvée');
  });

  it('le chrono écoulé compte comme une erreur', () => {
    const g = fight('TIME-1');
    const hp = g.state.hp;
    g.tick(g.state.combat!.timeMax + 10);
    expect(g.state.combat!.fb!.outcome).toBe('timeout');
    expect(g.state.hp).toBeLessThanOrEqual(hp);
  });

  it('sans chrono, le temps ne s’écoule pas', () => {
    const g = fight('TIME-2', { ...S, chrono: false });
    expect(g.state.combat!.timeMax).toBe(0);
    expect(g.tick(999999)).toBe(false);
    expect(g.state.combat!.fb).toBeNull();
  });

  it('sans écrit, aucune question n’est posée à l’écrit', () => {
    const g = Game.newRun(content(), { ...S, writeFactor: 0 }, 'QCM-1');
    autoplay(g, 600, () => false, () => expect(g.state.combat!.q.mode).not.toBe('write'));
  });

  it('les thèmes désactivés ne sont jamais posés', () => {
    const g = Game.newRun(content(), { ...S, themes: ['personajes'] }, 'THEME-1');
    autoplay(g, 600, () => false, () => expect(g.question!.theme).toBe('personajes'));
  });

  it('les questions désactivées ne sont jamais posées', () => {
    const disabled = new Set(content().questions.filter(q => q.disabled).map(q => q.id));
    expect(disabled.size).toBeGreaterThan(0);
    for (let i = 0; i < 30; i++) {
      const g = Game.newRun(content(), { ...S, themes: ['personajes'] }, `DIS-${i}`);
      autoplay(g, 200, k => k % 3 === 0, () => expect(disabled.has(g.question!.id)).toBe(false));
    }
  });

  it('« En realidad… » donne la réponse et blesse l’ennemi', () => {
    const g = fight('ORA-1');
    g.state.inv['en-realidad'] = 1;
    expect(g.usePower('en-realidad')).toBe(true);
    expect(g.state.combat!.fb!.outcome).toBe('oracle');
    expect(g.state.inv['en-realidad']).toBe(0);
  });

  it('¡Fíjate! retire deux mauvaises réponses en QCM', () => {
    for (let i = 0; i < 50; i++) {
      const g = fight(`TIJ-${i}`, { ...S, writeFactor: 0, types: ['qcm'] });
      expect(g.usePower('fijate')).toBe(true);
      const c = g.state.combat!;
      expect(c.hidden).toHaveLength(2);
      expect(c.hidden).not.toContain(canonicalValue(g.question!));
      return;
    }
  });

  it('l’Escudo bloque une attaque automatiquement', () => {
    const g = fight('ESC-1');
    g.state.inv.escudo = 1;
    const hp = g.state.hp;
    g.answer(wrongOf(g));
    expect(g.state.inv.escudo).toBe(0);
    expect(g.state.hp).toBeGreaterThanOrEqual(hp - 1); // seul un éventuel poison passe
  });

  it('un élite « Solo escrito » ne pose que des questions écrites', () => {
    const g = fight('ELITE-1', S, 'caballero-enmascarado');
    for (let i = 0; i < 15 && g.state.screen === 'combat'; i++) {
      if (g.state.combat!.fb) {
        g.proceed();
        continue;
      }
      expect(g.state.combat!.q.mode).toBe('write');
      g.answer(canonicalValue(g.question!));
    }
  });

  it('El Mago change de phase quand ses PV baissent', () => {
    const g = fight('CAT-1', { ...S, writeFactor: 10 }, 'mago');
    const seen = new Set<number>();
    for (let i = 0; i < 80 && g.state.screen === 'combat'; i++) {
      seen.add(g.state.combat!.phase);
      if (g.state.combat!.fb) g.proceed();
      else g.answer(canonicalValue(g.question!));
    }
    expect([...seen].sort()).toEqual([0, 1, 2]);
    expect(g.state.result).toBe('win');
  });

  it('la capa del Mago bloque les QCM', () => {
    const g = fight('ABA-1', { ...S, writeFactor: 0.0001 }, 'mago');
    const c = g.state.combat!;
    expect(c.abanico).toBeGreaterThan(0);
    if (c.q.mode === 'qcm') {
      const hp = c.hp + c.shield;
      g.answer(canonicalValue(g.question!));
      expect(c.hp + c.shield).toBe(hp);
    }
  });

  it('le pouvoir ¡Dejadnos pasar! change la question sans pénalité', () => {
    const g = fight('CAM-1');
    g.state.inv['dejadnos-pasar'] = 1;
    const id = g.state.combat!.q.id, hp = g.state.hp;
    g.usePower('dejadnos-pasar');
    expect(g.state.combat!.q.id).not.toBe(id);
    expect(g.state.hp).toBe(hp);
    expect(g.state.combat!.fb).toBeNull();
  });

  it('la partie se joue jusqu’au bout et l’état reste sérialisable', () => {
    const g = Game.newRun(content(), S, 'FULL-1');
    const acts = new Set<number>();
    for (let i = 0; i < 5000 && g.state.screen !== 'over'; i++) {
      autoplay(g, 1);
      acts.add(g.state.act);
      // la sauvegarde doit pouvoir être relue à tout moment
      const copy = JSON.parse(JSON.stringify(g.state));
      expect(new Game(content(), S, copy).state.screen).toBe(g.state.screen);
    }
    expect(g.state.result).toBe('win');
    expect([...acts]).toEqual([0, 1, 2]);
  });
});
