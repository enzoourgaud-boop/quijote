/** Petits composants visuels partagés. */
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { Game } from '../engine/game';
import type { Enemy, Intent, Item } from '../engine/schema';

/** Relit l'interface à chaque changement du moteur. */
export function useGame(game: Game | null) {
  const [, setTick] = useState(0);
  const force = () => setTick(x => x + 1);
  useEffect(() => (game ? game.subscribe(force) : undefined), [game]);
}

/* ---------- papel picado ---------- */
const COLS = ['#ff3d8b', '#ff9f1c', '#22d1c6', '#9b6cff', '#ffd23f', '#3ddc84'];
const circ = (cx: number, cy: number, r: number) => `M${cx - r},${cy}a${r},${r} 0 1,0 ${r * 2},0a${r},${r} 0 1,0 ${-r * 2},0Z`;
const dia = (cx: number, cy: number, s: number) => `M${cx},${cy - s}L${cx + s},${cy}L${cx},${cy + s}L${cx - s},${cy}Z`;
const OUTER = 'M0,0H52V50L47.7,56L43.3,50L39,56L34.7,50L30.3,56L26,50L21.7,56L17.3,50L13,56L8.7,50L4.3,56L0,50Z';
const HOLES = (() => {
  let h = circ(26, 24, 5);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    h += circ(26 + 11 * Math.cos(a), 24 + 11 * Math.sin(a), 2.6);
  }
  return h + dia(8, 9, 3.5) + dia(44, 9, 3.5) + dia(8, 41, 3.5) + dia(44, 41, 3.5);
})();

export function PapelPicado() {
  return (
    <div class="picado" aria-hidden="true">
      {Array.from({ length: 26 }, (_, i) => (
        <svg viewBox="0 0 52 58" key={i}>
          <path fill={COLS[i % COLS.length]} fill-rule="evenodd" d={OUTER + HOLES} />
        </svg>
      ))}
    </div>
  );
}

/** Icônes dessinées (quand aucun emoji ne convient). Dans le JSON : "emoji": "svg:papel-picado". */
export function Figure({ emoji }: { emoji: string }) {
  if (emoji === 'svg:papel-picado') {
    return (
      <svg viewBox="-6 -4 64 66" width="1em" height="1em" style={{ verticalAlign: '-.1em' }}>
        <path d="M-4,0H56" stroke="#6a5878" stroke-width="3" />
        <path fill="#ff3d8b" fill-rule="evenodd" d={OUTER + HOLES} />
      </svg>
    );
  }
  return <>{emoji}</>;
}

/* ---------- carte de lotería ---------- */
export function Carta({ enemy, color, cls = '', children }: { enemy: Pick<Enemy, 'name' | 'emoji' | 'top' | 'card'> & { kind?: Enemy['kind'] }; color: string; cls?: string; children?: ComponentChildren }) {
  return (
    <div class={`carta ${enemy.kind ?? ''} ${cls}`} style={{ '--c': color }} role="img" aria-label={`Carte n° ${enemy.card} : ${enemy.name}`}>
      <span class="num" aria-hidden="true">{enemy.card}</span>
      <div class="fig" aria-hidden="true">
        <Figure emoji={enemy.emoji} />
        {enemy.top && <span class="top">{enemy.top}</span>}
      </div>
      <div class="nom" aria-hidden="true">{enemy.name}</div>
      {children}
    </div>
  );
}

/* ---------- intention de l'ennemi ---------- */
export function intentInfo(game: Game, it: Intent): { ico: string; text: string; sub: string } {
  const c = game.state.combat!, e = game.enemy!;
  const base = e.attack + c.attackBonus;
  const mult = c.juicio ? 2 : 1;
  const hit = (n: number) => `si tu te trompes : −${n * mult} PV`;
  switch (it.kind) {
    case 'attack': {
      const d = (it.value ?? e.attack) + c.attackBonus;
      return { ico: d > base + 1 ? '⚔️' : '🗡️', text: `Attaque ${d * mult}`, sub: hit(d) };
    }
    case 'shield': return { ico: '🛡️', text: `Bouclier +${it.value ?? 2}`, sub: `absorbe tes prochains dégâts · ${hit(base)}` };
    case 'heal': return { ico: '💚', text: `Soin +${it.value ?? 2}`, sub: `à la fin du tour · ${hit(base)}` };
    case 'steal': return { ico: '🪙', text: `Vol de ${it.value ?? 2} monedas`, sub: `si tu te trompes · −${base * mult} PV` };
    case 'rush': return { ico: '⏱️', text: `Chrono −${it.value ?? 5} s`, sub: `cette question est plus courte · ${hit(base)}` };
    case 'poison': return { ico: '☠️', text: `Poison ${it.value ?? 3}`, sub: `si tu te trompes : −1 PV par question · −${base * mult} PV` };
    case 'fog': return { ico: '🌫️', text: 'Brouillard', sub: `pouvoirs bloqués pour cette question · ${hit(base)}` };
    case 'stealItem': return { ico: '🎒', text: 'Vol de pouvoir', sub: `si tu te trompes, il te prend une aide · −${base * mult} PV` };
    case 'listen': return { ico: '🔊', text: '¿Me oyes?', sub: `la question est à écouter · ${hit(base)}` };
  }
}

export const MODIFIERS: Record<string, { ico: string; label: string; desc: string }> = {
  soloEscrito: { ico: '✍️', label: 'Solo escrito', desc: 'Toutes les réponses sont à écrire.' },
  prisa: { ico: '⚡', label: 'Prisa', desc: 'Le chrono est divisé par deux.' },
  niebla: { ico: '🌫️', label: 'Niebla', desc: 'Pas de traduction ni de règle : ces aides sont inutilisables.' },
};

/* ---------- objets ---------- */
export function ItemCard({ item, onClick, price, sold, disabled }: { item: Item; onClick: () => void; price?: number; sold?: boolean; disabled?: boolean }) {
  const rare = item.rarity === 'comun' ? 'Commune' : item.rarity === 'rara' ? 'Rare' : 'Légendaire';
  return (
    <button class={`item ${item.rarity}`} onClick={onClick} disabled={disabled}>
      <span class="ico" aria-hidden="true">{item.emoji}</span>
      <span class="tp">{item.kind === 'reliquia' ? 'Relique permanente' : 'Aide à usage unique'} · {rare}</span>
      <span class="nm">{item.name}</span>
      <span class="ds">{item.description}</span>
      {price !== undefined && <span class="px">{sold ? 'Acheté' : `🪙 ${price}`}</span>}
    </button>
  );
}

export function Powers({ game, inCombat, compact = false }: { game: Game; inCombat: boolean; compact?: boolean }) {
  const s = game.state;
  // en combat, les reliques (passives) sont réduites à leur icône : un appui affiche ce qu'elles font
  const [info, setInfo] = useState<string | null>(null);
  const tell = (key: string) => (compact ? { onClick: () => setInfo(x => (x === key ? null : key)), 'aria-expanded': info === key } : {});
  const aides = Object.keys(s.inv).filter(id => s.inv[id] > 0 && game.item(id));
  // Traductor gratuit du Diccionario
  const freeId = inCombat && game.freeTranslateAvailable() ? game.content.items.find(i => i.effect === 'translate')?.id : undefined;
  if (freeId && !aides.includes(freeId)) aides.unshift(freeId);
  const relics = Object.keys(s.relics).filter(id => game.item(id));
  const syn = game.synergyProgress();
  return (
    <div class={`poderes ${compact ? 'compacto' : ''}`} role="group" aria-label="Tes pouvoirs">
      <span class="lbl">Tes pouvoirs</span>
      {aides.map(id => {
        const it = game.item(id)!;
        const block = game.powerBlock(id);
        const dis = it.effect === 'heal' ? !!block : !inCombat || !!block;
        const up = game.isUpgraded(id);
        const n = s.inv[id] ?? 0;
        const free = id === freeId && game.freeTranslateAvailable();
        const desc = up && it.upgrade ? it.upgrade : it.description;
        return (
          <button class={`pod ${it.rarity} ${up ? 'mejor' : ''}`} key={id} disabled={dis} title={`${desc}${block && !it.auto ? ` (${block})` : ''}`} onClick={() => game.usePower(id)}>
            <span aria-hidden="true">{it.emoji}</span>
            {it.name}
            {up ? '+' : ''}
            {it.auto ? ' (auto)' : ''}
            {n > 0 && <em aria-label={`${n} disponible(s)`}>{n}</em>}
            {free && <em class="gratis" title="Gratuit grâce au Diccionario">gratis</em>}
          </button>
        );
      })}
      {relics.map(id => {
        const it = game.item(id)!;
        return (
          <span class={`pod rel ${it.rarity} ${info === id ? 'abierto' : ''}`} key={id} title={`${it.name} : ${it.description}`} tabIndex={0} role={compact ? 'button' : undefined} aria-label={`${it.name} (relique) : ${it.description}`} {...tell(id)} onKeyDown={ev => compact && (ev.key === 'Enter' || ev.key === ' ') && (ev.preventDefault(), setInfo(x => (x === id ? null : id)))}>
            <span aria-hidden="true">{it.emoji}</span>
            <span class="nm">{it.name}</span>
            {s.relics[id] > 1 && <em>{s.relics[id]}</em>}
          </span>
        );
      })}
      {syn.map(({ synergy, owned }) => {
        const done = owned === synergy.items.length;
        const names = synergy.items.map(id => `${game.item(id)?.emoji ?? ''}${(s.relics[id] ?? 0) > 0 ? '✓' : '…'}`).join(' ');
        return (
          <span class={`pod sinergia ${done ? 'on' : ''} ${info === synergy.id ? 'abierto' : ''}`} key={synergy.id} tabIndex={0} title={`${synergy.name} : ${synergy.description}`} role={compact ? 'button' : undefined} aria-label={`Ensemble ${synergy.name} : ${owned} sur ${synergy.items.length}. ${synergy.description}`} {...tell(synergy.id)} onKeyDown={ev => compact && (ev.key === 'Enter' || ev.key === ' ') && (ev.preventDefault(), setInfo(x => (x === synergy.id ? null : synergy.id)))}>
            <span aria-hidden="true">{synergy.emoji}</span>
            <span class="nm">{synergy.name}</span>
            <em>
              {owned}/{synergy.items.length}
            </em>
            <small aria-hidden="true">{names}</small>
          </span>
        );
      })}
      {!aides.length && !relics.length && <span class="muted">Aucun pour l'instant. Gagne un combat pour en choisir un.</span>}
      {compact && info && (() => {
        const it = game.item(info);
        const sy = syn.find(x => x.synergy.id === info)?.synergy;
        const txt = it ? `${it.name} : ${it.description}` : sy ? `${sy.name} : ${sy.description}` : '';
        return txt ? <p class="pod-info" role="status">{txt}</p> : null;
      })()}
    </div>
  );
}

export function Hud({ game, hit, noHp }: { game: Game; hit?: boolean; noHp?: boolean }) {
  const s = game.state;
  const act = game.act;
  const th = game.streakThreshold;
  const floor = game.currentNode ? game.currentNode.floor + 1 : 0;
  return (
    <header class={`hud ${hit ? 'hit' : ''}`}>
      {!noHp && <div class="hp">
        <span class="lbl">Vida</span>
        <div class="bar" role="meter" aria-label="Tes points de vie" aria-valuemin={0} aria-valuemax={s.maxHp} aria-valuenow={s.hp}>
          <i style={{ width: `${(100 * s.hp) / s.maxHp}%` }} />
        </div>
        <b>
          {s.hp}/{s.maxHp}
        </b>
      </div>}
      <span class={`chip ${s.streak >= th ? 'on' : ''}`} title="Bonnes réponses d'affilée">🔥 {s.streak}</span>
      <span class="chip" title="Monedas">🪙 {s.gold}</span>
      {s.poison > 0 && <span class="chip veneno" title="Poison : −1 PV par question">☠️ {s.poison}</span>}
      {game.pendingCount > 0 && (
        <span class="chip almas" title="Páginas perdidas : des questions ratées qui reviendront. Réussis-les pour les retrouver (+1 PV chacune)." aria-label={`${game.pendingCount} páginas perdidas`}>
          📄 {game.pendingCount}
        </span>
      )}
      {act && (
        <div class="ruta" aria-label={`Acte ${s.act + 1} sur ${game.content.sequence.acts.length}, étage ${floor} sur ${s.map.floors}`}>
          <span>
            Acte {s.act + 1} · {act.name}
          </span>
          {Array.from({ length: s.map.floors }, (_, i) => (
            <i key={i} class={`${i === s.map.floors - 1 ? 'jefe' : ''} ${i < floor - 1 ? 'ok' : i === floor - 1 ? 'act' : ''}`} />
          ))}
        </div>
      )}
    </header>
  );
}
