/**
 * Scène de combat façon RPG rétro sur console portable : ennemi en haut à droite, joueur de dos
 * en bas à gauche, cadres de PV et boîte de dialogue qui s'écrit lettre par lettre.
 * Toutes les animations sont en CSS ; elles disparaissent avec prefers-reduced-motion.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Fx, Game } from '../../engine/game';
import { intentInfo, MODIFIERS } from '../components';
import { drawEnemy, drawPlayer } from './sprites';
import { motionReduced } from '../../prefs';

function EnemySprite({ emoji, top }: { emoji: string; top?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) drawEnemy(ref.current, emoji, top);
  }, [emoji, top]);
  return <canvas ref={ref} class="sprite" width={32} height={32} aria-hidden="true" />;
}

function PlayerSprite({ palette }: { palette: Record<string, string> }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) drawPlayer(ref.current, palette);
  }, [JSON.stringify(palette)]);
  return <canvas ref={ref} class="sprite jugador" width={20} height={22} aria-hidden="true" />;
}

const reduced = motionReduced;

/** Boîte de dialogue : les messages s'écrivent l'un après l'autre. Un clic affiche tout. */
export function Dialog({ messages, id, sr }: { messages: string[]; id: string; sr?: string[] }) {
  // espaces insécables de la typographie française (« ! » jamais seul en début de ligne)
  const full = messages.join('\n').replace(/ ([!?:;»])/g, '\u00a0$1').replace(/« /g, '«\u00a0');
  const [n, setN] = useState(reduced() ? full.length : 0);
  useEffect(() => {
    if (reduced()) {
      setN(full.length);
      return;
    }
    setN(0);
    const t = setInterval(() => setN(x => (x >= full.length ? x : x + 2)), 22);
    return () => clearInterval(t);
  }, [id]);
  const shown = full.slice(0, n);
  const done = n >= full.length;
  return (
    <div class="dialogo" onClick={() => setN(full.length)} role="log" aria-live="polite">
      {/* lecteur d'écran : le titre du retour est déjà annoncé par l'encadré de correction */}
      <p class="sr-only">{sr ? sr.join('\n') : full}</p>
      <div aria-hidden="true">
        {shown.split('\n').map((l, i) => (
          <p key={i}>{l}</p>
        ))}
      </div>
      {done && <span class="flecha" aria-hidden="true">▼</span>}
    </div>
  );
}

function hpClass(hp: number, max: number) {
  const r = hp / max;
  return r > 0.5 ? 'alto' : r > 0.2 ? 'medio' : 'bajo';
}

function HpBar({ hp, max, late, label }: { hp: number; max: number; late: string; label: string }) {
  return (
    <div class="pv" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={hp}>
      <span class="pv-lbl" aria-hidden="true">PV</span>
      <div class={`pv-barra ${hpClass(hp, max)} ${late}`}>
        <i style={{ width: `${(100 * hp) / max}%` }} />
      </div>
    </div>
  );
}

const has = (fx: Fx[] | undefined, ...k: Fx[]) => !!fx && k.some(x => fx.includes(x));

export function BattleScene({ game }: { game: Game }) {
  const s = game.state, c = s.combat!, e = game.enemy!, act = game.act, fb = c.fb, fx = fb?.fx;
  const info = intentInfo(game, c.intent);
  const ch = game.content.sequence.characters.find(x => x.id === s.character);
  const mod = e.modifier ? MODIFIERS[e.modifier] : null;
  const phase = game.phase;
  const turnKey = `${e.id}-${c.turn}-${fb ? 'fb' : 'q'}`;
  const ok = fb && (fb.outcome === 'ok' || fb.outcome === 'oracle');
  const ko = fb && (fb.outcome === 'ko' || fb.outcome === 'timeout');

  // animations déclenchées par le retour
  const join = (...c: unknown[]) => c.filter(Boolean).join(' ');
  // mouvement (déplacement du sprite)
  const enemyMove = join(
    ok && has(fx, 'crit', 'combo') && has(fx, 'enemyHit') && 'critico',
    ok && has(fx, 'vanish') && 'esquiva',
    ko && !has(fx, 'canceled') && 'ataca',
    has(fx, 'enemyDown') && 'cae',
    fb?.outcome === 'casi' && 'duda',
  );
  // clignotement / couleur
  const enemyBlink = join(
    ((ok && has(fx, 'enemyHit', 'shieldHit', 'abanico')) || has(fx, 'reflect')) && 'golpeado',
    has(fx, 'phase') && 'fase',
  );
  const playerMove = join(ok && 'lanza', has(fx, 'playerDown') && 'cae', fb?.outcome === 'casi' && 'salta');
  const playerBlink = join((has(fx, 'playerHit') || (has(fx, 'poison') && fb && fb.dmgToPlayer > 0)) && 'herido', has(fx, 'revive') && 'revive');
  const stageCls = [
    has(fx, 'playerHit') && 'temblor flash',
    ok && has(fx, 'crit') && 'temblor-suave',
    has(fx, 'phase') && 'flash-fuerte',
    c.turn === 1 && !fb && 'primera',
  ].filter(Boolean).join(' ');

  // messages de la boîte de dialogue
  const seq = game.content.sequence;
  let messages: string[];
  if (!fb) {
    messages = c.turn === 1 ? [`${e.name} surgit sur le chemin !`, ...(e.taunt ? [`« ${e.taunt} »`] : [])] : [];
    if (phase && c.turn === 1) messages.push(`Phase 1 : ${phase.name}.`);
    messages.push(c.juicio ? `Juicio ! ${e.name} va juger ta réponse (dégâts doublés).` : `${e.name} prépare : ${info.text}.`);
  } else {
    messages = [fb.title, ...fb.lines, ...(fb.alert ? [fb.alert] : [])];
  }

  const proj = ok ? (has(fx, 'combo') ? 3 : 1) : 0;

  return (
    <div class="batalla">
      <div class={`escenario fondo-${act.id} ${stageCls}`} style={{ '--c': act.color }}>
        <div class="estrellas" aria-hidden="true" />
        <div class="horizonte" aria-hidden="true" />
        {c.turn === 1 && !fb && <div class="cortina" key={`intro-${e.id}`} aria-hidden="true" />}

        {/* cadre de l'ennemi */}
        <div class="marco marco-enemigo">
          <div class="marco-titulo">
            <b>{e.name}</b>
            <span class="nv">N°{e.card}</span>
          </div>
          <HpBar hp={c.hp} max={c.maxHp} late={fb && ok ? 'tarde-ok' : ''} label={`Vie de ${e.name} : ${c.hp} sur ${c.maxHp}`} />
          <div class="marco-estado">
            {c.shield > 0 && <span title="Bouclier">🛡️{c.shield}</span>}
            {c.abanico > 0 && <span title="Capa : seules les réponses écrites la traversent">🧥{c.abanico}</span>}
            {c.attackBonus > 0 && <span title="Attaque renforcée">⚔️+{c.attackBonus}</span>}
            {c.weakTheme && <span title="Thème qui lui fait mal">🎨 {seq.themes.find(t => t.id === c.weakTheme)?.label}</span>}
            {phase && <span class="fase">{phase.name}</span>}
            {mod && (
              <span class="modif" title={mod.desc}>
                {mod.ico} {mod.label}
              </span>
            )}
            <span class="pv-num">
              {c.hp}/{c.maxHp}
            </span>
          </div>
        </div>

        {/* ennemi */}
        <div class="lado lado-enemigo">
          <div class="plataforma" aria-hidden="true" />
          <div class="entra-enemigo">
            <div class={`spr-wrap ${enemyMove}`} key={`e-${turnKey}`}>
              <div class={`capa ${enemyBlink}`}>
                <div class="flota">
                  <EnemySprite emoji={e.emoji} top={e.top} />
                </div>
              </div>
              {c.shield > 0 && !has(fx, 'enemyDown') && <div class="burbuja" aria-hidden="true" />}
            </div>
          </div>
          {!fb && (
            <div class="bocadillo" key={`b-${c.turn}`} aria-hidden="true" title={info.sub}>
              <span>{c.juicio ? '⚖️' : info.ico}</span> {info.text}
            </div>
          )}
          {fb && ok && (
            <span class={`numero ${fb.dmgToEnemy ? '' : 'cero'}`} key={`n-${turnKey}`} aria-hidden="true">
              {fb.dmgToEnemy ? `−${fb.dmgToEnemy}` : has(fx, 'vanish') ? '¡Fallo!' : has(fx, 'abanico') ? '🧥' : '0'}
            </span>
          )}
          {fb && ok && has(fx, 'crit') && fb.dmgToEnemy > 0 && (
            <span class="etiqueta critico-txt" aria-hidden="true">
              {has(fx, 'combo') ? `¡Combo ×${fb.combo}!` : '¡Crítico!'}
            </span>
          )}
          {has(fx, 'heal') && <span class="destellos verde" aria-hidden="true" />}
          {has(fx, 'canceled') && <span class="humo" aria-hidden="true">☁️</span>}
          {fb?.outcome === 'casi' && <span class="etiqueta casi-txt" aria-hidden="true">?</span>}
        </div>

        {/* joueur */}
        <div class="lado lado-jugador">
          <div class="plataforma" aria-hidden="true" />
          <div class="entra-jugador">
            <div class={`spr-wrap ${playerMove}`} key={`p-${turnKey}`}>
              <div class={`capa ${playerBlink}`}>
                <div class="respira">
                  <PlayerSprite palette={ch?.palette ?? {}} />
                </div>
              </div>
            </div>
          </div>
          {fb && fb.dmgToPlayer > 0 && (
            <span class="numero contra" key={`np-${turnKey}`} aria-hidden="true">
              −{fb.dmgToPlayer}
            </span>
          )}
          {has(fx, 'blocked', 'mask') && <span class="etiqueta bloqueo" aria-hidden="true">{has(fx, 'blocked') ? '🛡️' : '🎭'}</span>}
          {has(fx, 'poison') && <span class="burbujas-veneno" aria-hidden="true" />}
          {has(fx, 'playerHeal', 'revive') && <span class="destellos verde" aria-hidden="true" />}
        </div>

        {/* projectiles et objets volants */}
        {Array.from({ length: proj }, (_, i) => (
          <span class={`proyectil ${has(fx, 'crit') ? 'grande' : ''}`} key={`pr-${turnKey}-${i}`} style={{ animationDelay: `${0.15 + i * 0.09}s` }} aria-hidden="true">
            {has(fx, 'crit') ? '✒️' : '🌼'}
          </span>
        ))}
        {has(fx, 'steal') && (
          <span class="vuela-monedas" key={`m-${turnKey}`} aria-hidden="true">
            🪙🪙
          </span>
        )}
        {has(fx, 'stealItem') && (
          <span class="vuela-monedas" key={`o-${turnKey}`} aria-hidden="true">
            🎒
          </span>
        )}
        {c.fog && !fb && <div class="bruma" aria-hidden="true" />}

        {/* cadre du joueur */}
        <div class="marco marco-jugador">
          <div class="marco-titulo">
            <b>{ch?.name ?? 'Tú'}</b>
            <span class="nv">{s.ascension ? `🛡️${s.ascension}` : `Acte ${s.act + 1}`}</span>
          </div>
          <HpBar hp={s.hp} max={s.maxHp} late={fb && !ok ? 'tarde-ko' : ''} label={`Tes points de vie : ${s.hp} sur ${s.maxHp}`} />
          <div class="marco-estado">
            {s.poison > 0 && <span title="Poison">☠️{s.poison}</span>}
            <span class="pv-num">
              {s.hp}/{s.maxHp}
            </span>
          </div>
        </div>
      </div>
      <Dialog messages={messages} id={turnKey} sr={fb ? messages.slice(1) : undefined} />
    </div>
  );
}
