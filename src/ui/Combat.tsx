/** Écran de combat : scène rétro (ennemi, joueur, dialogue), question, correction, pouvoirs. */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Game } from '../engine/game';
import { AnswerArea, Prompt, Solution } from './Answer';
import { BattleScene } from './battle/BattleScene';
import { Hud, Powers } from './components';
import { play } from './sfx';

function Crono({ game, paused }: { game: Game; paused: boolean }) {
  const [, setTick] = useState(0);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  useEffect(() => {
    let last = performance.now();
    const t = setInterval(() => {
      const now = performance.now();
      const dt = Math.min(now - last, 1000);
      last = now;
      // le temps ne s'écoule ni dans un onglet caché ni quand le panneau d'options est ouvert
      if (document.hidden || pausedRef.current) return;
      if (!game.tick(dt)) setTick(x => x + 1);
    }, 200);
    return () => clearInterval(t);
  }, [game]);
  const c = game.state.combat;
  if (!c || !c.timeMax) return null;
  const s = Math.ceil(c.timeLeft / 1000);
  return (
    <div class={`crono ${c.timeLeft <= 5000 ? 'urge' : ''} ${paused ? 'pausa' : ''}`} role="timer" aria-label={paused ? 'Chrono en pause' : `Temps restant : ${s} secondes`}>
      <span aria-hidden="true">{paused ? '⏸️' : c.intent.kind === 'rush' && !c.canceled ? '⏱️💨' : '⏱️'}</span>
      <div class="bar" aria-hidden="true">
        <i style={{ width: `${(100 * c.timeLeft) / c.timeMax}%` }} />
      </div>
      <b aria-hidden="true">{s} s</b>
    </div>
  );
}

export function Combat({ game, paused = false }: { game: Game; paused?: boolean }) {
  const s = game.state, c = s.combat!, q = game.question!, e = game.enemy!;
  const fb = c.fb;
  const contRef = useRef<HTMLButtonElement>(null);
  const qKey = `${c.turn}:${c.q.id}`;
  const dead = c.hp <= 0;

  useEffect(() => {
    if (fb) {
      contRef.current?.focus({ preventScroll: true });
      // le bouton « Continuer » doit être visible sans chercher ; la scène, elle, reste collée à l'écran
      contRef.current?.scrollIntoView({ block: 'nearest' });
    } else window.scrollTo({ top: 0 });
  }, [qKey, !!fb]);
  // sons du combat
  useEffect(() => {
    if (!fb) {
      if (c.turn === 1) play('fight');
      return;
    }
    const fx = fb.fx;
    if (fb.outcome === 'casi') play('casi');
    else if (fb.outcome === 'ok' || fb.outcome === 'oracle') play(fx.includes('crit') || fx.includes('combo') ? 'crit' : 'ok');
    else play('ko');
    if (fx.includes('enemyHit') || fx.includes('reflect')) play('hit');
    if (fx.includes('playerHit')) play('hurt');
    if (fx.includes('blocked') || fx.includes('mask') || fx.includes('shieldHit')) play('shield');
    if (fx.includes('heal') || fx.includes('playerHeal') || fx.includes('revive')) play('heal');
    if (fx.includes('steal')) play('coin');
    if (fx.includes('phase')) play('phase');
  }, [qKey, !!fb]);

  // questions « hautes » (plateaux, image à lire) : sur petit écran, la boîte de dialogue leur laisse la place
  const withScene = q.type === 'qcm' && !!q.scene;
  const tall = withScene || c.q.mode === 'place' || c.q.mode === 'order' || c.q.mode === 'match';
  const theme = game.content.sequence.themes.find(t => t.id === q.theme);
  const contLabel = s.hp <= 0 ? 'Voir le bilan' : dead ? `¡Victoria! ${e.name} est vaincu${e.name.startsWith('La ') ? 'e' : ''}` : 'Continuer';

  return (
    <section class="screen combate" aria-label="Combat" data-modo={c.q.mode} data-amplio={tall ? '1' : undefined} data-escena={withScene ? '1' : undefined}>
      <div class="lado-escena">
        <Hud game={game} noHp />
        <BattleScene game={game} />
        <Powers game={game} inCombat={true} compact />
      </div>
      <div class="qa" data-qid={q.id} data-mode={c.q.mode}>
        <div class="tipo">
          <span class="tag" style={{ '--k': theme?.color }}>
            {theme?.label ?? q.theme}
          </span>
          <span class="lbl">
            {q.label ?? ''}
            {c.q.mode === 'write' ? " · à l'écrit" : ''}
          </span>
          {c.q.again && (
            <span class="alma-chip" title="Tu avais raté cette question. Réussis-la pour retrouver cette page : +1 PV.">
              <span aria-hidden="true">📄</span> Página perdida
            </span>
          )}
        </div>
        {!fb && <Crono game={game} paused={paused} />}
        <Prompt q={q} revealed={!!fb} />
        {c.used.translate && (
          <div class="pista">
            <b>Traductor</b> {game.translationText()}
          </div>
        )}
        {c.used.hint && (
          <div class="pista">
            <b>Chuleta</b> {game.hintText()}
          </div>
        )}
        {c.mask && (
          <div class="pista">
            <b>Tijeras</b> <span class="mask">{c.mask}</span>
          </div>
        )}
        <AnswerArea
          q={q}
          asked={c.q}
          scenes={game.content.scenes}
          voices={game.content.sequence.voices}
          done={!!fb}
          given={fb?.given ?? null}
          hidden={c.hidden}
          onAnswer={v => game.answer(v)}
          resetKey={qKey}
        />
        {fb && (
          <div class={`fb ${fb.outcome}`} role="status">
            <h3>{fb.title}</h3>
            <Solution q={q} asked={c.q} verdict={fb.outcome} given={fb.given} scenes={game.content.scenes} />
            {fb.outcome !== 'ok' && fb.outcome !== 'oracle' && <p>{q.explanation}</p>}
            {fb.alert && <p class="alerta">{fb.alert}</p>}
            <div>
              <button class="btn" ref={contRef} onClick={() => game.proceed()}>
                {contLabel}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
