import { describe, expect, it } from 'vitest';
import { canonicalValue, isWritable, wrongValue } from '../src/engine/questions';
import { DEFAULT_SETTINGS, Game } from '../src/engine/game';
import { content } from './helpers';

const S = { ...DEFAULT_SETTINGS };
type Internal = { enterRoom(t: string): void; startFight(id: string): void; state: Game['state'] };
const room = (g: Game, t: string) => (g as unknown as Internal).enterRoom(t);

describe('salles hors combat', () => {
  it('En casa : se reposer soigne selon le personnage (30 % par défaut, 40 % pour Sancho)', () => {
    const g = Game.newRun(content(), S, 'REST-1');
    g.state.hp = 3;
    room(g, 'rest');
    g.restHeal();
    expect(g.state.hp).toBe(3 + Math.ceil(g.state.maxHp * 0.4));
    const m = Game.newRun(content(), S, 'REST-1b', 0, { character: 'antonia' });
    expect(m.restHealAmount()).toBe(Math.ceil(m.state.maxHp * 0.3));
    g.roomContinue();
    expect(g.state.screen).toBe('map');
  });

  it('En casa : améliorer une aide la rend plus puissante', () => {
    const g = Game.newRun(content(), S, 'REST-2');
    room(g, 'rest');
    expect(g.upgradable()).toContain('fijate');
    g.restUpgrade('fijate');
    expect(g.isUpgraded('fijate')).toBe(true);
    expect(g.upgradable()).not.toContain('fijate');
  });

  it('Queso+ soigne davantage', () => {
    const g = Game.newRun(content(), S, 'UP-1');
    g.state.inv.queso = 2;
    g.state.upgrades.queso = true;
    g.state.hp = 1;
    g.usePower('queso');
    expect(g.state.hp).toBe(9);
  });

  it('Tianguis : on achète avec ses monedas, le repas soigne', () => {
    const g = Game.newRun(content(), S, 'SHOP-1');
    g.state.gold = 100;
    room(g, 'shop');
    expect(g.state.offer!.length).toBe(5);
    expect(g.buy(0)).toBe(true);
    expect(g.buy(0)).toBe(false); // déjà acheté
    g.state.hp = 2;
    expect(g.buyMeal()).toBe(true);
    expect(g.state.hp).toBe(2 + content().sequence.meal.heal);
    g.leaveShop();
    expect(g.state.screen).toBe('map');
  });

  it('coffre : s’ouvre, ou demande une question si fermé', () => {
    let locked = 0, open = 0;
    for (let i = 0; i < 40; i++) {
      const g = Game.newRun(content(), S, `CHEST-${i}`);
      room(g, 'chest');
      const ch = g.state.chest!;
      g.chestOpen();
      if (ch.locked) {
        locked++;
        expect(ch.quiz).toBeTruthy();
        g.chestAnswer(canonicalValue(g.getQuestion(ch.quiz!.q.id)!));
        expect(Object.keys(g.state.relics).length).toBeGreaterThan(0);
      } else {
        open++;
        expect(ch.result).toBeTruthy();
      }
      g.roomContinue();
      expect(g.state.screen).toBe('map');
    }
    expect(locked).toBeGreaterThan(0);
    expect(open).toBeGreaterThan(0);
  });

  it('chaque choix de chaque événement se résout sans erreur', () => {
    for (const ev of content().events) {
      ev.choices.forEach((ch, i) => {
        for (const right of [true, false]) {
          const g = Game.newRun(content(), S, `EV-${ev.id}-${i}`);
          g.state.gold = 20;
          g.state.act = Math.max(0, (ev.acts?.[0] ?? 1) - 1);
          room(g, 'event');
          g.state.event!.id = ev.id;
          g.state.seenEvents = [ev.id];
          g.eventChoose(i);
          const st = g.state.event!;
          if (ch.quiz) {
            const q = g.getQuestion(st.quiz!.q.id)!;
            g.eventAnswer(right ? canonicalValue(q) : wrongValue(q, st.quiz!.q.options));
          }
          expect(st.result, `${ev.id} choix ${i}`).toBeTruthy();
          g.eventContinue();
          expect(['map', 'combat']).toContain(g.state.screen);
          if (g.state.screen === 'combat') expect(ch.outcome?.effects.some(e => e.type === 'fight')).toBe(true);
          expect(g.state.hp).toBeGreaterThan(0);
        }
      });
    }
  });

  it('un choix trop cher est bloqué', () => {
    const ev = content().events.find(e => e.choices.some(c => c.require?.gold))!;
    const i = ev.choices.findIndex(c => c.require?.gold);
    const g = Game.newRun(content(), S, 'EV-PRIX');
    room(g, 'event');
    g.state.event!.id = ev.id;
    g.state.gold = 0;
    expect(g.choiceBlock(i)).toMatch(/monedas/);
    g.eventChoose(i);
    expect(g.state.event!.choice).toBeNull();
  });
});

describe('reliques et synergies', () => {
  const fightWith = (relics: Record<string, number>, seed: string, enemy = 'escudo-saltarin') => {
    const g = Game.newRun(content(), S, seed);
    g.state.relics = { ...relics };
    (g as unknown as Internal).startFight(enemy);
    return g;
  };

  it('La casa de don Quijote : +1 PV à chaque bonne réponse', () => {
    const g = fightWith({ lanza: 1, sirvienta: 1, galgo: 1 }, 'SYN-1');
    expect(g.activeSynergies().map(s => s.id)).toContain('casa-de-don-quijote');
    g.state.hp = 5;
    g.answer(canonicalValue(g.question!));
    expect(g.state.hp).toBe(6);
  });

  it('une synergie incomplète ne fait rien mais s’affiche en progression', () => {
    const g = fightWith({ lanza: 1 }, 'SYN-2');
    expect(g.activeSynergies()).toHaveLength(0);
    expect(g.synergyProgress().find(x => x.synergy.id === 'casa-de-don-quijote')?.owned).toBe(1);
  });

  it('El autor : toutes les questions possibles passent à l’écrit', () => {
    const g = fightWith({ autor: 1 }, 'COL-1');
    for (let i = 0; i < 12 && g.state.screen === 'combat'; i++) {
      const c = g.state.combat!;
      if (c.fb) {
        g.proceed();
        continue;
      }
      const q = g.question!;
      if (isWritable(q)) expect(c.q.mode).toBe('write');
      g.answer(canonicalValue(q));
    }
  });

  it('El escudo del escudero : la première erreur du combat ne blesse pas', () => {
    const g = fightWith({ 'escudo-escudero': 1 }, 'MAS-1');
    const hp = g.state.hp;
    const c = g.state.combat!;
    g.answer(c.q.mode === 'qcm' ? c.q.options.find(o => o !== canonicalValue(g.question!))! : 'zzz');
    expect(g.state.hp).toBe(hp);
  });

  it('El honor : on revient une fois à 0 PV', () => {
    const g = fightWith({ 'honor': 1 }, 'REV-1');
    g.state.hp = 1;
    const c = g.state.combat!;
    g.answer(c.q.mode === 'qcm' ? c.q.options.find(o => o !== canonicalValue(g.question!))! : 'zzz');
    expect(g.state.hp).toBe(Math.ceil(g.state.maxHp / 2));
    expect(g.state.reviveUsed).toBe(true);
  });

  it('Fiel compañero : annule l’attaque de l’ennemi', () => {
    const g = fightWith({}, 'INC-1');
    g.state.inv['fiel-companero'] = 1;
    expect(g.usePower('fiel-companero')).toBe(true);
    const hp = g.state.hp;
    const c = g.state.combat!;
    g.answer(c.q.mode === 'qcm' ? c.q.options.find(o => o !== canonicalValue(g.question!))! : 'zzz');
    expect(g.state.hp).toBe(hp);
  });

  it('El libro de don Quijote : un Léxico gratuit par combat', () => {
    for (let i = 0; i < 30; i++) {
      const g = fightWith({ 'libro-dq': 1 }, `DIC-${i}`);
      g.state.inv.lexico = 0;
      if (!g.question!.translation) continue;
      expect(g.usePower('lexico')).toBe(true);
      expect(g.state.combat!.used.translate).toBe(true);
      expect(g.freeTranslateAvailable()).toBe(false);
      return;
    }
    throw new Error('aucune question traduisible trouvée');
  });

  it('après le jefe, on choisit une relique puis on passe à l’acte suivant', () => {
    const g = fightWith({}, 'BOSS-1', 'gran-libro');
    for (let i = 0; i < 60 && g.state.screen === 'combat'; i++) {
      if (g.state.combat!.fb) g.proceed();
      else g.answer(canonicalValue(g.question!));
    }
    expect(g.state.screen).toBe('reward');
    expect(g.state.offerKind).toBe('jefe');
    expect(g.state.offer!.every(o => g.item(o.id)!.kind === 'reliquia')).toBe(true);
    const map0 = g.state.map;
    g.take(0);
    expect(g.state.act).toBe(1);
    expect(g.state.screen).toBe('map');
    expect(g.state.map).not.toEqual(map0);
    expect(g.state.node).toBeNull();
  });
});
