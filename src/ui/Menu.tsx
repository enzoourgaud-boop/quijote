/** Écrans de menu : profils, accueil, album, succès, carnet, bilan de fin. */
import qrcode from 'qrcode-generator';
import { useEffect, useRef, useState } from 'preact/hooks';
import { codeDataFromRun, encodeCode } from '../engine/code';
import { ASCENSION_RULES, type Game, type RunState, type Settings } from '../engine/game';
import { ACHIEVEMENTS, allCards, characterUnlocked, type Leitner, type Meta, notionStats, type Unlocks } from '../engine/meta';
import { answerText, isChoice } from '../engine/questions';
import { cleanSeed } from '../engine/rng';
import { describeSettings, parseClassLink } from '../engine/classCode';
import type { Content } from '../engine/schema';
import { fillBlanks } from '../engine/answer';
import { AVATARS, type Profile } from '../profiles';
import { drawEnemy, drawPlayer } from './battle/sprites';
import { Carta, Figure } from './components';

/* ======================= petits éléments ======================= */

export function PlayerPreview({ palette, size = 72 }: { palette: Record<string, string>; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) drawPlayer(ref.current, palette);
  }, [JSON.stringify(palette)]);
  return <canvas ref={ref} class="sprite mini" style={{ width: `${size}px` }} aria-hidden="true" />;
}

function MiniSprite({ emoji, top }: { emoji: string; top?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) drawEnemy(ref.current, emoji, top);
  }, [emoji, top]);
  return <canvas ref={ref} class="sprite carta-spr" aria-hidden="true" />;
}

function QrCode({ text }: { text: string }) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const rects: string[] = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) rects.push(`M${c + 2},${r + 2}h1v1h-1z`);
  return (
    <svg class="qr" viewBox={`0 0 ${n + 4} ${n + 4}`} role="img" aria-label={`QR code du code ${text}`}>
      <rect width={n + 4} height={n + 4} fill="#fff" />
      <path d={rects.join('')} fill="#000" />
    </svg>
  );
}

/* ======================= Profils ======================= */

export function ProfileScreen({ list, current, onPick, onCreate, onDelete, onBack }: {
  list: Profile[]; current: string | null; onPick: (id: string) => void; onCreate: (name: string, avatar: string) => void;
  onDelete: (id: string) => void; onBack?: () => void;
}) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[list.length % AVATARS.length]);
  const [confirm, setConfirm] = useState<string | null>(null);
  return (
    <section class="screen perfiles">
      <h1>¿Quién juega?</h1>
      <p class="lead">Choisis ton profil. Ta progression (cartes, succès, carnet d’erreurs) est gardée sur cet appareil uniquement.</p>
      {list.length > 0 && (
        <div class="lista-perfiles" role="list">
          {list.map(p => (
            <div class={`perfil ${p.id === current ? 'actual' : ''}`} role="listitem" key={p.id}>
              <button class="perfil-btn" onClick={() => onPick(p.id)}>
                <span class="avatar" aria-hidden="true">{p.avatar}</span>
                <b>{p.name}</b>
              </button>
              {confirm === p.id ? (
                <span class="confirmar">
                  Effacer toute la progression de {p.name} ?{' '}
                  <button class="link peligro" onClick={() => { onDelete(p.id); setConfirm(null); }}>Oui, effacer</button>{' '}
                  <button class="link" onClick={() => setConfirm(null)}>Non</button>
                </span>
              ) : (
                <button class="link" onClick={() => setConfirm(p.id)} aria-label={`Supprimer le profil ${p.name}`}>Supprimer</button>
              )}
            </div>
          ))}
        </div>
      )}
      <form
        class="nuevo-perfil"
        onSubmit={e => {
          e.preventDefault();
          if (name.trim()) onCreate(name, avatar);
          setName('');
        }}
      >
        <h2>Nouveau profil</h2>
        <label for="pseudo">Ton pseudo</label>
        <input id="pseudo" type="text" maxLength={20} value={name} placeholder="Un surnom" onInput={e => setName((e.target as HTMLInputElement).value)} autocomplete="off" />
        <p class="muted aviso-rgpd">Conseil : choisis un surnom plutôt que ton vrai nom.</p>
        <span class="lbl">Ton avatar</span>
        <div class="avatares" role="radiogroup" aria-label="Avatar">
          {AVATARS.map(a => (
            <button type="button" key={a} role="radio" aria-checked={a === avatar} class={a === avatar ? 'sel' : ''} onClick={() => setAvatar(a)}>
              {a}
            </button>
          ))}
        </div>
        <div class="fila">
          <button class="btn" type="submit" disabled={!name.trim()}>
            Créer et jouer
          </button>
          {onBack && (
            <button class="btn sec" type="button" onClick={onBack}>
              Retour
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

/* ======================= Accueil ======================= */

export function Title({ content, profile, meta, saved, settings, onSettings, onStart, onResume, onNav, initialSeed, pending = 0, classe, onClassCode, onClearClass }: {
  content: Content; profile: Profile; meta: Meta; saved: RunState | null; settings: Settings;
  onSettings: (s: Settings) => void; onStart: (o: { seed: string; character: string; ascension: number; short: boolean }) => void; onResume: () => void;
  onNav: (screen: 'profiles' | 'collection' | 'achievements' | 'carnet' | 'prof') => void; initialSeed: string; pending?: number;
  classe: { code: string; seed: string } | null; onClassCode: (code: string) => string | null; onClearClass: () => void;
}) {
  const seq = content.sequence;
  const [seed, setSeed] = useState(initialSeed);
  const [short, setShort] = useState(false);
  const [classInput, setClassInput] = useState('');
  const [classErr, setClassErr] = useState<string | null>(null);
  const chars = seq.characters;
  const [character, setCharacter] = useState(() => (chars.find(c => characterUnlocked(content, meta, c.id) && c.id === localPick()) ?? chars[0]).id);
  const [asc, setAsc] = useState(Math.min(meta.maxAscension, Number(localAsc()) || 0));
  const bosses = seq.acts.map(a => ({ e: content.enemies.find(e => e.id === a.boss)!, c: a.color })).filter(x => x.e);
  const totalCards = allCards(content).length;
  return (
    <section class="screen portada">
      <div class="barra-perfil">
        <button class="chip-perfil" onClick={() => onNav('profiles')} aria-label={`Profil : ${profile.name}. Changer de profil`}>
          <span aria-hidden="true">{profile.avatar}</span> {profile.name} <span class="muted">· changer</span>
        </button>
        <nav class="menu-meta" aria-label="Ma progression">
          <button class="btn sec" onClick={() => onNav('carnet')}>📓 Mon carnet</button>
          <button class="btn sec" onClick={() => onNav('collection')}>📚 Álbum {meta.cards.length}/{totalCards}</button>
          <button class="btn sec" onClick={() => onNav('achievements')}>🏆 Succès {meta.achievements.length}/{ACHIEVEMENTS.length}</button>
        </nav>
      </div>
      <span class="lbl">{seq.tagline}</span>
      <h1>{seq.title}</h1>
      <p class="lead">{seq.intro}</p>
      <div class="cartas">
        {bosses.map(b => (
          <Carta key={b.e.id} enemy={b.e} color={b.c} />
        ))}
      </div>

      {saved && (
        <div class="fila">
          <button class="btn" onClick={onResume}>
            Reprendre la partie (acte {saved.act + 1})
          </button>
          <span class="muted">ou commence une nouvelle partie ci-dessous.</span>
        </div>
      )}

      <h2>Choisis ton personnage</h2>
      <div class="personajes" role="radiogroup" aria-label="Personnage">
        {chars.map(c => {
          const open = characterUnlocked(content, meta, c.id);
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={character === c.id}
              class={`personaje ${character === c.id ? 'sel' : ''} ${open ? '' : 'bloqueado'}`}
              disabled={!open}
              onClick={() => { setCharacter(c.id); savePick(c.id); }}
            >
              <PlayerPreview palette={c.palette} />
              <span class="nm">
                {c.name} <small>{c.title}</small>
              </span>
              <span class="ds">{open ? c.description : `🔒 ${c.unlock.type === 'default' ? '' : c.unlock.label}`}</span>
            </button>
          );
        })}
      </div>

      <div class="opciones clase">
        {classe ? (
          <>
            <span>
              <b>Réglages de la classe</b>{classe.code ? ` (code ${classe.code})` : ''} : {describeSettings(settings, seq).join(' · ')}
              {classe.seed ? ` · défi ${classe.seed}` : ''}
            </span>
            <button class="link" onClick={onClearClass}>Retirer</button>
          </>
        ) : (
          <form
            class="fila"
            onSubmit={e => {
              e.preventDefault();
              const err = onClassCode(classInput);
              setClassErr(err);
              if (!err) {
                const l = parseClassLink(classInput);
                if (l?.seed) setSeed(l.seed);
                setClassInput('');
              }
            }}
          >
            <label for="code-classe">Code de classe</label>
            <input id="code-classe" type="text" value={classInput} maxLength={40} placeholder="donné par ton professeur" onInput={e => setClassInput((e.target as HTMLInputElement).value)} autocomplete="off" />
            <button class="btn sec" type="submit" disabled={!classInput.trim()}>Valider</button>
            {classErr && <span class="error" role="alert">{classErr}</span>}
          </form>
        )}
      </div>

      <div class="opciones">
        <label class="nivel">
          <span>Nivel de caballero</span>
          <select value={asc} onChange={e => { const v = Number((e.target as HTMLSelectElement).value); setAsc(v); saveAsc(v); }} disabled={meta.maxAscension === 0}>
            {Array.from({ length: meta.maxAscension + 1 }, (_, i) => (
              <option key={i} value={i}>
                {i === 0 ? '0 · normal' : `${i} ${'🛡️'.repeat(Math.min(i, 5))}`}
              </option>
            ))}
          </select>
        </label>
        <span class="muted reglas-asc">
          {asc === 0
            ? meta.maxAscension === 0 ? 'Gagne une partie pour débloquer le Nivel de caballero 1.' : 'Le chemin normal.'
            : `En plus : ${ASCENSION_RULES.slice(1, asc + 1).join(' ')}`}
        </span>
        <label>
          <span>Graine</span>
          <input type="text" value={seed} placeholder="au hasard" maxLength={24} onInput={e => setSeed((e.target as HTMLInputElement).value)} aria-describedby="seed-help" />
        </label>
        <label>
          <input type="checkbox" checked={settings.chrono} onChange={e => onSettings({ ...settings, chrono: (e.target as HTMLInputElement).checked })} />
          Chrono
        </label>
        <span id="seed-help" class="muted" style={{ fontSize: '.85rem', flexBasis: '100%' }}>
          Graine : même graine = même chemin pour toute la classe (défi de classe). Laisse vide pour un chemin au hasard.
        </span>
      </div>
      {pending > 0 && (
        <p class="almas-aviso">
          <span aria-hidden="true">📄</span> <b>{pending} página{pending > 1 ? 's' : ''} perdida{pending > 1 ? 's' : ''}</b> : {pending > 1 ? 'des questions ratées t\'attendent' : 'une question ratée t\'attend'} au
          début de la partie. Chaque page retrouvée donne +1 PV.
        </p>
      )}
      <fieldset class="duracion">
        <legend>Durée de la partie</legend>
        <label>
          <input type="radio" name="duracion" checked={!short} onChange={() => setShort(false)} />
          <span>Partie normale <span class="muted">(15 à 25 min)</span></span>
        </label>
        <label>
          <input type="radio" name="duracion" checked={short} onChange={() => setShort(true)} />
          <span>Partie courte <span class="muted">(8 à 10 min, les trois actes raccourcis)</span></span>
        </label>
      </fieldset>
      <div class="fila">
        <button class={`btn ${saved ? 'sec' : ''}`} onClick={() => onStart({ seed: cleanSeed(seed), character, ascension: asc, short })}>
          {saved ? 'Nouvelle partie' : 'Commencer le chemin'}
        </button>
        {meta.runs > 0 && (
          <span class="muted">
            {meta.runs} partie{meta.runs > 1 ? 's' : ''} · {meta.wins} victoire{meta.wins > 1 ? 's' : ''} · record : {meta.bestWon} combats
          </span>
        )}
      </div>
      <div class="reglas">
        <div>
          <b>Réponds pour attaquer</b>En espagnol, sur quatre thèmes : {content.sequence.themes.map(t => t.label).join(', ')}.
        </div>
        <div>
          <b>Lis l'intention</b>La bulle de l'ennemi annonce ce qu'il fera si tu te trompes.
        </div>
        <div>
          <b>Tes erreurs reviennent</b>Une question ratée devient une « página perdida » du livre de don Quijote : elle t'attend au début de la partie suivante. La réussir te rend 1 PV.
        </div>
        <div>
          <b>Collectionne</b>Chaque ennemi vaincu et chaque objet trouvé t'offre une carte pour ton album.
        </div>
      </div>
      <p class="pie-prof">
        <button class="link" onClick={() => onNav('prof')}>Espace professeur</button>
      </p>
    </section>
  );
}

const savePick = (id: string) => {
  try { localStorage.setItem('molinos:pick', id); } catch { /* rien */ }
};
const localPick = () => {
  try { return localStorage.getItem('molinos:pick'); } catch { return null; }
};
const saveAsc = (n: number) => {
  try { localStorage.setItem('molinos:asc', String(n)); } catch { /* rien */ }
};
const localAsc = () => {
  try { return localStorage.getItem('molinos:asc'); } catch { return null; }
};

/* ======================= Collection ======================= */

export function CollectionScreen({ content, meta, onBack }: { content: Content; meta: Meta; onBack: () => void }) {
  const cards = allCards(content);
  const [open, setOpen] = useState<string | null>(null);
  const sel = cards.find(c => c.key === open);
  return (
    <section class="screen">
      <div class="fila"><button class="btn sec" onClick={onBack}>← Retour</button></div>
      <h1>El álbum</h1>
      <p class="lead">
        {meta.cards.length} carte{meta.cards.length > 1 ? 's' : ''} sur {cards.length}. Bats un ennemi ou trouve un objet pour gagner sa carte.
      </p>
      {sel && (
        <div class="carta-detalle" role="dialog" aria-label={sel.name}>
          <div class="carta grande" style={{ '--c': sel.kind === 'enemy' ? 'var(--rosa)' : 'var(--turquesa)' }}>
            <span class="num">{sel.card}</span>
            <div class="fig"><MiniSprite emoji={sel.emoji} top={sel.top} /></div>
            <div class="nom">{sel.name}</div>
          </div>
          <div>
            <span class="lbl">{sel.desc}</span>
            <p class="frase" lang="es">« {sel.phrase} »</p>
            <button class="btn sec" onClick={() => setOpen(null)}>Fermer</button>
          </div>
        </div>
      )}
      <div class="tablero-loteria">
        {cards.map(c => {
          const got = meta.cards.includes(c.key);
          return got ? (
            <button key={c.key} class={`carta mini-carta ${c.kind}`} onClick={() => setOpen(c.key)} aria-label={`Carte ${c.card} : ${c.name}`}>
              <span class="num">{c.card}</span>
              <div class="fig"><Figure emoji={c.emoji} />{c.top && <span class="top">{c.top}</span>}</div>
              <div class="nom">{c.name}</div>
            </button>
          ) : (
            <div key={c.key} class="carta mini-carta oculta" aria-label={`Carte ${c.card} : pas encore trouvée`}>
              <span class="num">{c.card}</span>
              <div class="fig">?</div>
              <div class="nom">???</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ======================= Succès ======================= */

export function AchievementsScreen({ meta, onBack }: { meta: Meta; onBack: () => void }) {
  return (
    <section class="screen">
      <div class="fila"><button class="btn sec" onClick={onBack}>← Retour</button></div>
      <h1>Succès</h1>
      <p class="lead">{meta.achievements.length} sur {ACHIEVEMENTS.length}.</p>
      <ul class="logros">
        {ACHIEVEMENTS.map(a => {
          const got = meta.achievements.includes(a.id);
          return (
            <li key={a.id} class={got ? 'ok' : ''}>
              <span class="ico" aria-hidden="true">{got ? a.icon : '🔒'}</span>
              <span>
                <b>{a.name}</b>
                <small>{a.desc}</small>
              </span>
              <span class="sr-only">{got ? 'obtenu' : 'pas encore obtenu'}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ======================= Carnet ======================= */

export function CarnetScreen({ content, leitner, onBack }: { content: Content; leitner: Leitner; onBack: () => void }) {
  const stats = notionStats(content, leitner);
  const seen = Object.keys(leitner).length;
  const mastered = Object.values(leitner).filter(e => e[0] >= 4).length;
  const weak = stats.filter(n => n.questions.length > 0);
  const maxW = Math.max(1, ...weak.map(n => n.weakness));
  return (
    <section class="screen">
      <div class="fila"><button class="btn sec" onClick={onBack}>← Retour</button></div>
      <h1>Mon carnet</h1>
      <p class="lead">
        Tu as déjà vu {seen} question{seen > 1 ? 's' : ''} sur {content.questions.filter(q => !q.disabled).length}, et tu en maîtrises {mastered}.
        Les questions ratées reviennent plus souvent dans tes prochaines parties, jusqu’à ce que tu les réussisses plusieurs fois.
      </p>
      {!weak.length ? (
        <p class="muted">Rien à revoir pour l’instant. Joue une partie !</p>
      ) : (
        <>
          <h2>Les notions à revoir</h2>
          <ul class="nociones">
            {weak.map(n => (
              <li key={n.id}>
                <details>
                  <summary>
                    <span class="nocion-nom">{n.label}</span>
                    <span class="barra-debil" aria-hidden="true"><i style={{ width: `${(100 * n.weakness) / maxW}%` }} /></span>
                    <span class="muted">{n.questions.length} question{n.questions.length > 1 ? 's' : ''} à revoir</span>
                  </summary>
                  <ul class="carnet">
                    {n.questions.slice(0, 8).map(q => (
                      <li key={q.id}>
                        <div class="q">{q.label ? `${q.label} · ` : ''}{q.prompt}</div>
                        <div class="a" lang="es">{isChoice(q) || q.type === 'ordre' ? fillBlanks(q.prompt, q.answer) : answerText(q, content.scenes)}</div>
                        <div class="r">{q.explanation}</div>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/* ======================= Bilan de fin ======================= */

export function Over({ game, unlocks, onMenu, onReplay }: { game: Game; unlocks: Unlocks | null; onMenu: () => void; onReplay: () => void }) {
  const s = game.state, content = game.content, seq = content.sequence;
  const win = s.result === 'win';
  const tot = s.stats.ok + s.stats.ko + s.stats.casi;
  const pct = tot ? Math.round((100 * s.stats.ok) / tot) : 0;
  const minutes = Math.max(1, Math.round((s.stats.endedAt - s.stats.startedAt) / 60000));
  const enemy = game.enemy;
  const data = codeDataFromRun(content, s);
  const code = encodeCode(data, seq.id);
  const missed = data.missed.map(i => seq.notions[i]?.label).filter(Boolean);
  const ch = seq.characters.find(c => c.id === s.character);
  const cards = allCards(content);
  return (
    <section class="screen">
      <h1>{win ? seq.victoryTitle : seq.defeatTitle}</h1>
      <p class="lead">
        {win ? seq.victory : `${enemy?.name ?? 'Le chemin'} t'a arrêté à l'acte ${s.act + 1}. Relis ton carnet d'erreurs, puis reprends le chemin.`}
      </p>
      <div class="stats">
        <div><b>{s.stats.won}</b>combats gagnés</div>
        <div><b>{win ? seq.acts.length : s.act + 1}/{seq.acts.length}</b>{win ? 'actes terminés' : 'acte atteint'}</div>
        <div><b>{s.stats.ok}</b>bonnes réponses</div>
        <div><b>{pct} %</b>de réussite</div>
        <div><b>{minutes} min</b>de partie</div>
        {(s.stats.freed ?? 0) > 0 && <div><b>{s.stats.freed}</b>{s.stats.freed === 1 ? 'página recuperada' : 'páginas recuperadas'}</div>}
      </div>

      {unlocks && (unlocks.cards.length > 0 || unlocks.achievements.length > 0 || unlocks.characters.length > 0 || unlocks.ascension !== null) && (
        <div class="desbloqueos">
          <h2>Nouveau !</h2>
          {unlocks.ascension !== null && <p class="nuevo">🛡️ Nivel de caballero {unlocks.ascension} débloqué : {ASCENSION_RULES[unlocks.ascension]}</p>}
          {unlocks.characters.map(id => {
            const c = seq.characters.find(x => x.id === id)!;
            return <p class="nuevo" key={id}><PlayerPreview palette={c.palette} size={36} /> Nouveau personnage : <b>{c.name}, {c.title}</b></p>;
          })}
          {unlocks.achievements.map(a => <p class="nuevo" key={a.id}>{a.icon} Succès : <b>{a.name}</b> <span class="muted">({a.desc})</span></p>)}
          {unlocks.cards.length > 0 && (
            <div>
              <p class="nuevo">📚 {unlocks.cards.length} nouvelle{unlocks.cards.length > 1 ? 's' : ''} carte{unlocks.cards.length > 1 ? 's' : ''} pour l’album :</p>
              <div class="cartas-nuevas">
                {unlocks.cards.map(k => {
                  const c = cards.find(x => x.key === k);
                  return c ? <span class="carta-chip" key={k}><b>{c.card}</b> <Figure emoji={c.emoji} /> {c.name}</span> : null;
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div class="codigo-fin">
        <QrCode text={code} />
        <div>
          <span class="lbl">Code pour le professeur</span>
          <p class="codigo" aria-label={`Code : ${code.split('').join(' ')}`}>{code}</p>
          <p class="muted">
            Montre ce code (ou ce QR) à ton professeur, ou recopie-le. Il contient seulement ton résultat{missed.length ? ' et les notions à revoir' : ''}, rien d’autre.
          </p>
          {missed.length > 0 && <p class="muted">Notions à revoir : {missed.join(' · ')}.</p>}
          {ch && <p class="muted">Personnage : {ch.name} · Nivel de caballero {s.ascension} · graine {s.seed}</p>}
        </div>
      </div>

      <div class="fila">
        <button class="btn" onClick={onReplay}>Rejouer</button>
        <button class="btn sec" onClick={onMenu}>Menu</button>
      </div>

      {s.errors.length ? (
        <>
          <h2>Carnet d'erreurs</h2>
          <p class="muted">
            📄 Les questions que tu n'as pas encore réussies sont tes <b>páginas perdidas</b> : elles t'attendront au début de ta prochaine partie. Chaque page retrouvée te donnera +1 PV.
          </p>
          <ul class="carnet">
            {s.errors.map(e => (
              <li key={e.id}>
                <div class="q">{e.prompt}</div>
                {e.given && <div class="g">Ta réponse : {e.given}</div>}
                <div class="a" lang="es">{e.answer}</div>
                <div class="r">{e.explanation}</div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p class="muted">Aucune erreur dans cette partie. ¡Increíble!</p>
      )}
    </section>
  );
}
