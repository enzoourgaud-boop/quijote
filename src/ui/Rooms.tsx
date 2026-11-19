/** Carte à embranchements et salles hors combat : événement, Ofrenda (repos), coffre. */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Game, RoomResult } from '../engine/game';
import type { MapNode } from '../engine/map';
import type { RoomType } from '../engine/schema';
import { QuizView } from './Answer';
import { Figure, Hud, Powers } from './components';

const FLOOR_H = 92;

/* ======================= Carte ======================= */

export function MapScreen({ game }: { game: Game }) {
  const s = game.state, map = s.map, act = game.act, rooms = game.content.sequence.rooms;
  const reach = new Set(game.reachable().map(n => n.id));
  const visited = new Set(s.path);
  const byId = new Map(map.nodes.map(n => [n.id, n]));
  const H = map.floors * FLOOR_H;
  const firstRef = useRef<HTMLButtonElement>(null);
  const boss = game.enemyDef(act.boss);

  useEffect(() => {
    firstRef.current?.focus({ preventScroll: true });
    firstRef.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  }, [s.node]);

  const top = (n: MapNode) => n.floor * FLOOR_H + FLOOR_H / 2;
  const edges: { a: MapNode; b: MapNode; on: boolean; next: boolean }[] = [];
  for (const a of map.nodes) for (const id of a.next) {
    const b = byId.get(id)!;
    const on = visited.has(a.id) && visited.has(b.id) && s.path.indexOf(b.id) === s.path.indexOf(a.id) + 1;
    edges.push({ a, b, on, next: a.id === s.node && reach.has(b.id) });
  }
  let firstAssigned = false;
  const label = (t: RoomType) => (t === 'boss' && boss ? boss.name : rooms[t]?.name ?? t);

  return (
    <section class="screen" aria-label="Carte">
      <Hud game={game} />
      <div>
        <h2>
          Acte {s.act + 1} · {act.name}
        </h2>
        <p class="muted">{s.node ? 'Choisis la prochaine salle. Les chemins ne reviennent jamais en arrière.' : 'Choisis ton chemin. Au bout t’attend le jefe de l’acte.'}</p>
      </div>
      <div class="mapa" style={{ height: `${H}px`, '--c': act.color }}>
        <svg class="caminos" viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" aria-hidden="true">
          {edges.map(({ a, b, on, next }, i) => (
            <line key={i} x1={a.x * 100} y1={top(a)} x2={b.x * 100} y2={top(b)} class={on ? 'on' : next ? 'next' : ''} vector-effect="non-scaling-stroke" />
          ))}
        </svg>
        {map.nodes.map(n => {
          const can = reach.has(n.id);
          const isFirst = can && !firstAssigned;
          if (isFirst) firstAssigned = true;
          const cur = n.id === s.node;
          const done = visited.has(n.id) && !cur;
          const info = rooms[n.type];
          return (
            <button
              key={n.id}
              ref={isFirst ? firstRef : undefined}
              class={`sala ${n.type} ${can ? 'puede' : ''} ${cur ? 'aqui' : ''} ${done ? 'hecha' : ''}`}
              style={{ left: `${n.x * 100}%`, top: `${top(n)}px` }}
              disabled={!can}
              onClick={() => game.choose(n.id)}
              aria-label={`Étage ${n.floor + 1} : ${label(n.type)}${can ? ' (accessible)' : cur ? ' (tu es ici)' : done ? ' (déjà visitée)' : ''}. ${info?.help ?? ''}`}
              title={`${label(n.type)} : ${info?.help ?? ''}`}
            >
              <span aria-hidden="true">{n.type === 'boss' && boss ? <Figure emoji={boss.emoji} /> : info?.emoji}</span>
            </button>
          );
        })}
      </div>
      <ul class="leyenda" aria-label="Légende de la carte">
        {(['combat', 'elite', 'event', 'chest', 'shop', 'rest'] as RoomType[]).map(t => (
          <li key={t}>
            <span aria-hidden="true">{rooms[t]?.emoji}</span> <b>{rooms[t]?.name}</b> <span class="muted">{rooms[t]?.help}</span>
          </li>
        ))}
      </ul>
      <Powers game={game} inCombat={false} />
    </section>
  );
}

/* ======================= Résultat d'une salle ======================= */

function Result({ r, onNext, label = 'Continuer' }: { r: RoomResult; onNext: () => void; label?: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [fr, setFr] = useState(false);
  useEffect(() => ref.current?.focus({ preventScroll: true }), []);
  return (
    <div class="fb ok resultado" role="status">
      <p class="relato" lang="es">
        {r.text}
      </p>
      {r.textFr && (
        <p>
          <button class="link" onClick={() => setFr(!fr)} aria-expanded={fr}>
            {fr ? 'Cacher la traduction' : 'Voir en français'}
          </button>
          {fr && <span class="muted"> {r.textFr}</span>}
        </p>
      )}
      {r.lines.length > 0 && (
        <ul class="botin">
          {r.lines.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      )}
      <div>
        <button class="btn" ref={ref} onClick={onNext}>
          {label}
        </button>
      </div>
    </div>
  );
}

/* ======================= Événement ======================= */

export function EventScreen({ game }: { game: Game }) {
  const s = game.state, st = s.event!, ev = game.currentEvent!;
  const [fr, setFr] = useState(false);
  const q = st.quiz ? game.getQuestion(st.quiz.q.id) : null;
  const firstRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (st.choice === null) firstRef.current?.focus({ preventScroll: true });
  }, [ev.id]);
  return (
    <section class="screen evento" aria-label={`Événement : ${ev.title}`}>
      <Hud game={game} />
      <div class="escena">
        <div class="carta voltea" style={{ '--c': game.act.color }} aria-hidden="true">
          <div class="fig">{ev.emoji}</div>
          <div class="nom">{ev.title}</div>
        </div>
        <div class="relato-box">
          <span class="lbl">{game.content.sequence.rooms.event?.name ?? 'Evento'}</span>
          <h2 lang="es">{ev.title}</h2>
          <p class="relato" lang="es">
            {ev.text}
          </p>
          {ev.gloss.length > 0 && (
            <p class="glosa">
              <span class="lbl">Mots utiles</span>{' '}
              {ev.gloss.map(([es, frx], i) => (
                <span key={i}>
                  <b lang="es">{es}</b> = {frx}
                  {i < ev.gloss.length - 1 ? ' · ' : ''}
                </span>
              ))}
            </p>
          )}
          <p>
            <button class="link" onClick={() => setFr(!fr)} aria-expanded={fr}>
              {fr ? 'Cacher la traduction' : 'Voir en français'}
            </button>
            {fr && <span class="muted"> {ev.textFr}</span>}
          </p>
        </div>
      </div>

      {st.choice === null && (
        <div class="elecciones" role="group" aria-label="Que fais-tu ?">
          {ev.choices.map((ch, i) => {
            const block = game.choiceBlock(i);
            return (
              <button class="eleccion" key={i} ref={i === 0 ? firstRef : undefined} disabled={!!block} onClick={() => game.eventChoose(i)}>
                <span lang="es" class="es">{ch.label}</span>
                {ch.labelFr && <span class="frx">{ch.labelFr}</span>}
                {ch.quiz && <span class="tag-q">❓ une question</span>}
                {block && <span class="frx">({block})</span>}
              </button>
            );
          })}
        </div>
      )}

      {st.quiz && q && <QuizView q={q} asked={st.quiz.q} fb={st.quiz.fb} onAnswer={v => game.eventAnswer(v)} scenes={game.content.scenes} voices={game.content.sequence.voices} />}

      {st.result && <Result r={st.result} onNext={() => game.eventContinue()} label={st.pendingFight ? 'Se battre !' : 'Continuer le chemin'} />}
      <Powers game={game} inCombat={false} />
    </section>
  );
}

/* ======================= Ofrenda (repos) ======================= */

export function RestScreen({ game }: { game: Game }) {
  const s = game.state, info = game.content.sequence.rooms.rest;
  const up = game.upgradable();
  const [choosing, setChoosing] = useState(false);
  return (
    <section class="screen" aria-label={info?.name ?? 'Repos'}>
      <Hud game={game} />
      <div class="escena">
        <div class="ofrenda-dibujo" aria-hidden="true">
          <span class="v1">📕</span>
          <span class="v2">🧀</span>
          <span class="f">🏠</span>
          <span class="fl1">🐕</span>
          <span class="fl2">🛡️</span>
          <span class="pan">🍽️</span>
        </div>
        <div class="relato-box">
          <h2>{info?.name}</h2>
          <p>{info?.text}</p>
        </div>
      </div>
      {!s.rest!.result && !choosing && (
        <div class="elige">
          <button class="item" onClick={() => game.restHeal()} disabled={s.hp >= s.maxHp}>
            <span class="ico" aria-hidden="true">💤</span>
            <span class="nm">Se reposer</span>
            <span class="ds">Récupère {game.restHealAmount()} points de vie.</span>
          </button>
          <button class="item rara" onClick={() => setChoosing(true)} disabled={!up.length}>
            <span class="ico" aria-hidden="true">✨</span>
            <span class="nm">Améliorer une aide</span>
            <span class="ds">{up.length ? 'Une de tes aides devient plus puissante pour le reste de la partie.' : 'Aucune aide à améliorer.'}</span>
          </button>
        </div>
      )}
      {!s.rest!.result && choosing && (
        <>
          <h3>Quelle aide améliorer ?</h3>
          <div class="elige">
            {up.map(id => {
              const it = game.item(id)!;
              return (
                <button class={`item ${it.rarity}`} key={id} onClick={() => game.restUpgrade(id)}>
                  <span class="ico" aria-hidden="true">{it.emoji}</span>
                  <span class="nm">{it.name}+</span>
                  <span class="ds">{it.upgrade}</span>
                </button>
              );
            })}
          </div>
          <div>
            <button class="link" onClick={() => setChoosing(false)}>
              Retour
            </button>
          </div>
        </>
      )}
      {s.rest!.result && <Result r={s.rest!.result} onNext={() => game.roomContinue()} label="Continuer le chemin" />}
      <Powers game={game} inCombat={false} />
    </section>
  );
}

/* ======================= Coffre ======================= */

export function ChestScreen({ game }: { game: Game }) {
  const s = game.state, ch = s.chest!, info = game.content.sequence.rooms.chest;
  const q = ch.quiz ? game.getQuestion(ch.quiz.q.id) : null;
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => ref.current?.focus({ preventScroll: true }), []);
  return (
    <section class="screen" aria-label={info?.name ?? 'Coffre'}>
      <Hud game={game} />
      <div class="escena">
        <div class={`cofre ${ch.result ? 'abierto' : ''}`} aria-hidden="true">
          {ch.result ? '✨' : '🎁'}
          {ch.locked && !ch.result && <span class="candado">🔒</span>}
        </div>
        <div class="relato-box">
          <h2>{info?.name}</h2>
          <p>{ch.locked ? 'Un coffre fermé par un cadenas. Pour l’ouvrir, il faut répondre à une question (à l’écrit si possible). Une bonne réponse révèle un trésor rare.' : 'Un coffre posé au bord du chemin.'}</p>
        </div>
      </div>
      {!ch.quiz && !ch.result && (
        <div>
          <button class="btn" ref={ref} onClick={() => game.chestOpen()}>
            {ch.locked ? 'Essayer d’ouvrir le cadenas' : 'Ouvrir le coffre'}
          </button>
        </div>
      )}
      {ch.quiz && q && <QuizView q={q} asked={ch.quiz.q} fb={ch.quiz.fb} onAnswer={v => game.chestAnswer(v)} scenes={game.content.scenes} voices={game.content.sequence.voices} />}
      {ch.result && <Result r={ch.result} onNext={() => game.roomContinue()} label="Continuer le chemin" />}
      <Powers game={game} inCombat={false} />
    </section>
  );
}

/* ======================= Échauffement : páginas perdidas ======================= */

/** Début de partie : les questions ratées aux parties précédentes. Chaque âme libérée donne +1 PV. */
export function WarmupScreen({ game }: { game: Game }) {
  const s = game.state, w = s.warmup!;
  const q = game.getQuestion(w.quiz.q.id);
  const fb = w.quiz.fb;
  const last = w.i + 1 >= w.ids.length;
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (fb) {
      ref.current?.focus({ preventScroll: true });
      ref.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [w.i, !!fb]);
  if (!q) return null;
  return (
    <section class="screen calentamiento" aria-label="Échauffement">
      <div class="escena">
        <div class="almas-dibujo" aria-hidden="true">
          {w.ids.map((id, i) => (
            <span key={id} class={i < w.i || (i === w.i && fb) ? (i === w.i ? (fb!.verdict === 'ok' ? 'libre' : 'queda') : 'pasada') : i === w.i ? 'actual' : ''}>
              📄
            </span>
          ))}
        </div>
        <div class="relato-box">
          <span class="lbl">Avant de partir</span>
          <h2>Tus páginas perdidas</h2>
          <p>
            {w.ids.length > 1 ? `Ces ${w.ids.length} questions t'ont échappé la dernière fois.` : "Cette question t'a échappé la dernière fois."} Chaque bonne réponse te rend une page et te donne{' '}
            <b>+1 PV</b> pour cette partie. Pas de chrono, pas de risque.
          </p>
          <p class="muted" role="status">
            Question {w.i + 1} sur {w.ids.length} · {w.freed} page{w.freed > 1 ? 's' : ''} retrouvée{w.freed > 1 ? 's' : ''} · {s.hp} PV
          </p>
        </div>
      </div>
      <QuizView q={q} asked={w.quiz.q} fb={fb} onAnswer={v => game.warmupAnswer(v)} scenes={game.content.scenes} voices={game.content.sequence.voices}>
        {fb && <p class="alerta">{fb.verdict === 'ok' ? '📄 Página recuperada : +1 PV.' : fb.verdict === 'casi' ? 'Presque : il manque un accent. La page reviendra.' : 'La page reste perdue : elle reviendra pendant la partie.'}</p>}
        {fb && (
          <div>
            <button class="btn" ref={ref} onClick={() => game.warmupNext()}>
              {last ? 'Commencer le chemin' : 'Âme suivante'}
            </button>
          </div>
        )}
      </QuizView>
      {!fb && (
        <p>
          <button class="link" onClick={() => game.warmupSkip()}>
            Passer l'échauffement (les questions reviendront pendant la partie)
          </button>
        </p>
      )}
    </section>
  );
}
