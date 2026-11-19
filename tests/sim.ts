/** Bot de simulation : joue des parties entières sans interface (tests et équilibrage). */
import { canonicalValue, wrongValue } from '../src/engine/questions';
import { DEFAULT_SETTINGS, Game, type QuizState, type Settings } from '../src/engine/game';
import { Rng } from '../src/engine/rng';
import type { Content } from '../src/engine/schema';

export interface SimResult {
  win: boolean;
  won: number;
  minutes: number;
  answers: number;
  act: number;
  rooms: Record<string, number>;
  /** Identifiants des questions posées, dans l'ordre (échauffement compris). */
  asked: string[];
  freed: number;
  warmup: number;
  maxHp: number;
}

export interface SimOptions {
  /** Questions ratées aux parties précédentes (« almas pendientes »). */
  pending?: string[];
  /** Branche des observateurs sur la partie (révision de Leitner, par exemple). */
  attach?: (g: Game) => void;
}

/** Durées estimées d'un élève de 5e (secondes). */
export const T = { qcm: 9, write: 16, tf: 7, order: 18, match: 15, place: 20, feedback: 4, reward: 10, shop: 25, map: 4, event: 25, rest: 8, chest: 8 };

export function simulate(content: Content, seed: string, accuracy: number, settings: Settings = { ...DEFAULT_SETTINGS }, opts: SimOptions = {}): SimResult {
  const g = Game.newRun(content, settings, seed, 0, { pending: opts.pending });
  opts.attach?.(g);
  const bot = new Rng(`bot-${seed}-${accuracy}`);
  let sec = 0, answers = 0, guard = 0, warmup = 0;
  const rooms: Record<string, number> = {};
  const asked: string[] = [];
  const reply = (quiz: { q: QuizState['q'] }) => {
    const q = g.getQuestion(quiz.q.id)!;
    asked.push(q.id);
    answers++;
    sec += T[quiz.q.mode];
    if (bot.chance(accuracy)) return canonicalValue(q);
    return wrongValue(q, quiz.q.options);
  };
  while (g.state.screen !== 'over' && guard++ < 20000) {
    const s = g.state;
    switch (s.screen) {
      case 'warmup': {
        const w = s.warmup!;
        if (w.quiz.fb) {
          g.warmupNext();
          sec += T.feedback;
        } else {
          warmup++;
          g.warmupAnswer(reply(w.quiz));
        }
        break;
      }
      case 'map': {
        const n = bot.pick(g.reachable());
        rooms[n.type] = (rooms[n.type] ?? 0) + 1;
        g.choose(n.id);
        sec += T.map;
        break;
      }
      case 'combat': {
        const c = s.combat!;
        if (c.fb) {
          g.proceed();
          sec += T.feedback;
          break;
        }
        if (s.hp <= 5 && (s.inv.queso ?? 0) > 0) g.usePower('queso');
        g.answer(reply(c));
        break;
      }
      case 'reward':
        g.take(0);
        sec += T.reward;
        break;
      case 'shop':
        if (s.hp < s.maxHp * 0.6) while (g.buyMeal());
        for (let i = 0; i < (s.offer?.length ?? 0); i++) g.buy(i);
        while (g.buyMeal());
        g.leaveShop();
        sec += T.shop;
        break;
      case 'rest':
        if (s.rest!.result) g.roomContinue();
        else {
          const up = g.upgradable();
          if (s.hp < s.maxHp * 0.7 || !up.length) g.restHeal();
          else g.restUpgrade(up[0]);
          sec += T.rest;
        }
        break;
      case 'chest': {
        const ch = s.chest!;
        if (ch.result) g.roomContinue();
        else if (ch.quiz) g.chestAnswer(reply(ch.quiz));
        else {
          g.chestOpen();
          sec += T.chest;
        }
        break;
      }
      case 'event': {
        const st = s.event!;
        if (st.result) g.eventContinue();
        else if (st.quiz) g.eventAnswer(reply(st.quiz));
        else {
          const ev = g.currentEvent!;
          const ok = ev.choices.map((_, i) => i).filter(i => !g.choiceBlock(i));
          g.eventChoose(bot.pick(ok));
          sec += T.event;
        }
        break;
      }
    }
  }
  return { win: g.state.result === 'win', won: g.state.stats.won, minutes: sec / 60, answers, act: g.state.act, rooms, asked, freed: g.state.stats.freed ?? 0, warmup, maxHp: g.state.maxHp };
}
