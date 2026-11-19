/** Plateaux de réponse des types de questions « manipulables » : vrai/faux, ordre, association, scène, écoute. */
import { useEffect, useState } from 'preact/hooks';
import type { Asked } from '../engine/game';
import type { Question, SceneRef, Scenes } from '../engine/schema';
import { pointerDrag } from './drag';
import { Figure } from './components';
import { figureName } from './figures';
import { canSpeak, speak, stopSpeaking, voicesReady } from './speech';

const FR_POS: Record<string, string> = {
  arriba: 'en haut', abajo: 'en bas', fondo: 'au fond', segundo: 'au second plan', primero: 'au premier plan',
  izquierda: 'à gauche', centro: 'au centre', derecha: 'à droite',
  p1: 'place 1', p2: 'place 2', pueblo: 'au village de don Quichotte', toboso: 'au Toboso',
};

/* ======================= Vrai / faux ======================= */

export function TrueFalse({ done, given, answer, onPick }: { done: boolean; given: string | null; answer: string; onPick: (v: string) => void }) {
  useEffect(() => {
    if (done) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'v' || k === '1') onPick('verdadero');
      if (k === 'f' || k === '2') onPick('falso');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [done]);
  const cls = (v: string) => (done ? (v === answer ? 'good' : v === given ? 'bad' : '') : '');
  return (
    <div class="vf" role="group" aria-label="Vrai ou faux">
      <button class={`op vf-si ${cls('verdadero')}`} disabled={done} onClick={() => onPick('verdadero')}>
        <kbd aria-hidden="true">V</kbd>
        <span lang="es">✔ Verdadero</span>
      </button>
      <button class={`op vf-no ${cls('falso')}`} disabled={done} onClick={() => onPick('falso')}>
        <kbd aria-hidden="true">F</kbd>
        <span lang="es">✘ Falso</span>
      </button>
    </div>
  );
}

/* ======================= Remettre dans l'ordre ======================= */

export function OrderBoard({ asked, done, onSubmit }: { asked: Asked; done: boolean; onSubmit: (v: string) => void }) {
  const opts = asked.options;
  const [line, setLine] = useState<number[]>([]);
  useEffect(() => setLine([]), [asked]);
  const bank = opts.map((_, i) => i).filter(i => !line.includes(i));

  const toLine = (i: number, at?: number) =>
    setLine(l => {
      const rest = l.filter(x => x !== i);
      const pos = at === undefined ? rest.length : Math.min(at, rest.length);
      return [...rest.slice(0, pos), i, ...rest.slice(pos)];
    });
  const toBank = (i: number) => setLine(l => l.filter(x => x !== i));
  const moveBy = (i: number, d: number) =>
    setLine(l => {
      const p = l.indexOf(i), q = p + d;
      if (p < 0 || q < 0 || q >= l.length) return l;
      const n = [...l];
      [n[p], n[q]] = [n[q], n[p]];
      return n;
    });

  const drag = (i: number) => (e: PointerEvent) => {
    if (done) return;
    pointerDrag(e, e.currentTarget as HTMLElement, (t, x) => {
      if (!t) return;
      if (t.dataset.drop === 'banco') return toBank(i);
      if (t.dataset.drop === 'linea') {
        // position : avant la première étiquette dont le centre est à droite du doigt
        const chips = [...t.querySelectorAll<HTMLElement>('[data-tok]')].filter(c => Number(c.dataset.tok) !== i);
        let at = chips.length;
        for (let k = 0; k < chips.length; k++) {
          const r = chips[k].getBoundingClientRect();
          if (x < r.left + r.width / 2) {
            at = k;
            break;
          }
        }
        toLine(i, at);
      }
    });
  };

  const chip = (i: number, inLine: boolean) => (
    <button
      key={i}
      type="button"
      class="ficha"
      data-tok={i}
      lang="es"
      disabled={done}
      onPointerDown={drag(i) as never}
      onClick={() => (inLine ? toBank(i) : toLine(i))}
      onKeyDown={e => {
        if (!inLine) return;
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          moveBy(i, -1);
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          moveBy(i, 1);
        }
      }}
      aria-label={`${opts[i]}${inLine ? ' (dans la phrase : flèches pour déplacer, Entrée pour retirer)' : ' (ajouter à la phrase)'}`}
    >
      {opts[i]}
    </button>
  );

  return (
    <div class="tablero orden">
      <div class="linea" data-drop="linea" aria-label="Ta phrase">
        {line.length ? line.map(i => chip(i, true)) : <span class="vacio">Touche ou glisse les étiquettes ici, dans l’ordre.</span>}
      </div>
      <div class="banco" data-drop="banco" aria-label="Étiquettes disponibles">
        {bank.map(i => chip(i, false))}
      </div>
      {!done && (
        <div class="fila">
          <button class="btn" disabled={!line.length} onClick={() => onSubmit(JSON.stringify(line.map(i => opts[i])))}>
            Valider
          </button>
          {line.length > 0 && (
            <button class="link" onClick={() => setLine([])}>
              Tout recommencer
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ======================= Associer mot et image ======================= */

const COLORS = ['#ff9f1c', '#22d1c6', '#ff3d8b', '#9b6cff', '#3ddc84'];

export function MatchBoard({ q, asked, done, onSubmit }: { q: Extract<Question, { type: 'association' }>; asked: Asked; done: boolean; onSubmit: (v: string) => void }) {
  const words = q.pairs.map(p => p[0]);
  const imgs = asked.options;
  const [links, setLinks] = useState<Record<string, string>>({});
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => {
    setLinks({});
    setSel(null);
  }, [asked]);

  const link = (w: string, img: string) => {
    setLinks(l => {
      const n = Object.fromEntries(Object.entries(l).filter(([k, v]) => k !== w && v !== img));
      n[w] = img;
      return n;
    });
    setSel(null);
  };
  const wordOf = (img: string) => Object.keys(links).find(w => links[w] === img);
  const color = (w?: string) => (w ? COLORS[words.indexOf(w) % COLORS.length] : undefined);
  const correct = (w: string) => q.pairs.find(p => p[0] === w)?.[1];

  return (
    <div class="tablero emparejar">
      <div class="columna" role="group" aria-label="Mots">
        {words.map((w, i) => {
          const ok = done ? links[w] === correct(w) : undefined;
          return (
            <button
              key={w}
              type="button"
              class={`palabra ${sel === w ? 'sel' : ''} ${links[w] ? 'unida' : ''} ${ok === true ? 'good' : ok === false ? 'bad' : ''}`}
              style={{ '--k': color(w) }}
              lang="es"
              disabled={done}
              aria-pressed={sel === w}
              onPointerDown={((e: PointerEvent) => {
                if (done) return;
                pointerDrag(e as PointerEvent, e.currentTarget as HTMLElement, t => {
                  if (t?.dataset.img) link(w, t.dataset.img);
                });
              }) as never}
              onClick={() => setSel(sel === w ? null : w)}
            >
              <span class="num" aria-hidden="true">{i + 1}</span>
              {w}
              {done && ok === false && <span class="sol-img"> → <Figure emoji={correct(w) ?? ""} /></span>}
            </button>
          );
        })}
      </div>
      <div class="columna imagenes" role="group" aria-label="Images">
        {imgs.map(img => {
          const w = wordOf(img);
          return (
            <button
              key={img}
              type="button"
              class={`imagen ${w ? 'unida' : ''}`}
              style={{ '--k': color(w) }}
              data-drop="img"
              data-img={img}
              disabled={done}
              onClick={() => sel && link(sel, img)}
              aria-label={`Image ${figureName(img)}${w ? `, reliée à « ${w} »` : ''}${sel ? `. Relier à « ${sel} »` : ''}`}
            >
              <span class="emo" aria-hidden="true"><Figure emoji={img} /></span>
              {w && <span class="num" aria-hidden="true">{words.indexOf(w) + 1}</span>}
            </button>
          );
        })}
      </div>
      {!done && (
        <div class="fila pie">
          <span class="muted">{sel ? `Touche l’image de « ${sel} ».` : 'Touche un mot, puis son image (ou glisse le mot sur l’image).'}</span>
          <button class="btn" disabled={Object.keys(links).length < words.length} onClick={() => onSubmit(JSON.stringify(links))}>
            Valider
          </button>
        </div>
      )}
    </div>
  );
}

/* ======================= Scènes ======================= */

/** Dessin d'une scène (décor de scenes.json) avec ses cases. */
export function SceneView({ scenes, decorId, placed, onCell, cellsInteractive, highlight }: {
  scenes: Scenes; decorId: string; placed: Record<string, string>; onCell?: (cell: string) => void; cellsInteractive?: boolean;
  highlight?: Record<string, 'good' | 'bad'>;
}) {
  const d = scenes.decors.find(x => x.id === decorId);
  if (!d) return null;
  const objAt = (cell: string) => Object.keys(placed).find(o => placed[o] === cell);
  return (
    <div class={`decorado decor-${d.id}`} style={{ '--filas': d.rows.length, '--cols': d.cols.length }} role="group" aria-label={`Scène : ${d.name}`}>
      <div class="decor-fondo" aria-hidden="true" />
      <div class="celdas">
        {d.rows.map(([r], ri) =>
          d.cols.map(([c]) => {
            const cell = `${r}|${c}`;
            const o = objAt(cell);
            const obj = o ? scenes.objects.find(x => x.id === o) : null;
            const label = `${FR_POS[r] ?? r}, ${FR_POS[c] ?? c}${obj ? ` : ${obj.fr}` : ''}`;
            const style = { '--escala': d.scale?.[ri] ?? 1 };
            return cellsInteractive ? (
              <button key={cell} type="button" class={`celda ${obj ? 'llena' : ''} ${highlight?.[o ?? ''] ?? ''}`} data-drop="celda" data-cell={cell} style={style} onClick={() => onCell?.(cell)} aria-label={label}>
                {obj && <span class="obj" aria-hidden="true">{obj.emoji}</span>}
              </button>
            ) : (
              <div key={cell} class={`celda ${highlight?.[o ?? ''] ?? ''}`} style={style} aria-label={obj ? label : undefined}>
                {obj && <span class="obj" aria-hidden="true">{obj.emoji}</span>}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}

export function sceneCells(ref: SceneRef): Record<string, string> {
  return Object.fromEntries(ref.items.filter(i => i.row && i.col).map(i => [i.object, `${i.row}|${i.col}`]));
}

export function PlaceBoard({ q, asked, scenes, done, onSubmit }: {
  q: Extract<Question, { type: 'scene' }>; asked: Asked; scenes: Scenes; done: boolean; onSubmit: (v: string) => void;
}) {
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => {
    setPlaced({});
    setSel(null);
  }, [asked]);
  const put = (o: string, cell: string) => {
    setPlaced(p => {
      const n = Object.fromEntries(Object.entries(p).filter(([k, v]) => k !== o && v !== cell));
      n[o] = cell;
      return n;
    });
    setSel(null);
  };
  const onCell = (cell: string) => {
    if (done) return;
    const occupant = Object.keys(placed).find(o => placed[o] === cell);
    if (sel) put(sel, cell);
    else if (occupant) {
      // reprendre un objet déjà posé
      setPlaced(p => Object.fromEntries(Object.entries(p).filter(([k]) => k !== occupant)));
      setSel(occupant);
    }
  };
  // correction : chaque objet bien ou mal placé
  const highlight: Record<string, 'good' | 'bad'> = {};
  if (done)
    for (const it of q.scene.items) {
      const got = placed[it.object]?.split('|');
      highlight[it.object] = got && (!it.row || it.row === got[0]) && (!it.col || it.col === got[1]) ? 'good' : 'bad';
    }
  const tray = asked.options.filter(o => !placed[o]);
  return (
    <div class="tablero colocar">
      <SceneView scenes={scenes} decorId={q.scene.decor} placed={placed} onCell={onCell} cellsInteractive={!done} highlight={done ? highlight : undefined} />
      {!done && (
        <>
          <div class="bandeja" data-drop="bandeja" role="group" aria-label="Objets à placer">
            {tray.map(o => {
              const obj = scenes.objects.find(x => x.id === o)!;
              return (
                <button
                  key={o}
                  type="button"
                  class={`pieza ${sel === o ? 'sel' : ''}`}
                  aria-pressed={sel === o}
                  onPointerDown={((e: PointerEvent) => {
                    pointerDrag(e as PointerEvent, e.currentTarget as HTMLElement, t => {
                      if (t?.dataset.cell) put(o, t.dataset.cell);
                    });
                  }) as never}
                  onClick={() => setSel(sel === o ? null : o)}
                >
                  <span class="emo" aria-hidden="true">{obj.emoji}</span>
                  <span lang="es">{obj.es}</span>
                </button>
              );
            })}
            {!tray.length && <span class="muted">Tout est placé. Touche un objet sur la scène pour le déplacer.</span>}
          </div>
          <div class="fila pie">
            <span class="muted">{sel ? `Touche la case où mettre « ${scenes.objects.find(x => x.id === sel)?.es} ».` : 'Touche un objet, puis sa place (ou glisse-le sur la scène).'}</span>
            <button class="btn" disabled={tray.length > 0} onClick={() => onSubmit(JSON.stringify(placed))}>
              Valider
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ======================= Écoute ======================= */

/** Lecture à voix haute ; à défaut de voix espagnole, la phrase s'affiche quelques secondes. */
export function ListenBar({ text, voices, auto }: { text: string; voices: string[]; auto: boolean }) {
  const [state, setState] = useState<'wait' | 'voice' | 'flash' | 'hidden'>('wait');
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let alive = true;
    setState('wait');
    setShown(0);
    voicesReady().then(() => {
      if (!alive) return;
      if (canSpeak(voices)) {
        setState('voice');
        if (auto) speak(text, voices);
      } else setState('flash');
    });
    return () => {
      alive = false;
      stopSpeaking();
    };
  }, [text]);
  useEffect(() => {
    if (state !== 'flash') return;
    const t = setTimeout(() => setState('hidden'), 5000);
    return () => clearTimeout(t);
  }, [state, shown]);

  if (state === 'wait') return <div class="escucha"><span class="muted">Préparation de la voix…</span></div>;
  if (state === 'voice')
    return (
      <div class="escucha" role="group" aria-label="Écoute">
        <button class="btn altavoz" onClick={() => speak(text, voices)}>
          🔊 Écouter
        </button>
        <button class="btn sec" onClick={() => speak(text, voices, 0.6)}>
          🐢 Plus lentement
        </button>
      </div>
    );
  return (
    <div class="escucha sin-voz">
      <p class="muted">Pas de voix espagnole sur cet appareil : lis la phrase, elle disparaît au bout de 5 secondes.</p>
      {state === 'flash' ? (
        <p class="flash-texto" lang="es">
          « {text} »
        </p>
      ) : (
        shown < 1 && (
          <button
            class="link"
            onClick={() => {
              setShown(shown + 1);
              setState('flash');
            }}
          >
            Revoir la phrase (une fois)
          </button>
        )
      )}
    </div>
  );
}
