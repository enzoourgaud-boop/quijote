/**
 * Espace professeur (protégé par un simple code, sans vraie sécurité) :
 * réglages de classe, banque de questions, import / export, décodage des codes élèves, séquence.
 * Tout reste sur l'appareil du professeur.
 */
import qrcode from 'qrcode-generator';
import { useMemo, useState } from 'preact/hooks';
import { emptyOverlay, type Overlay, teacher } from '../content/teacher';
import { rawContent } from '../content/load';
import { CHRONO_FACTORS, describeSettings, encodeClass, WRITE_FACTORS } from '../engine/classCode';
import { decodeCode } from '../engine/code';
import { checkCoherence, parseContent, type RawContent } from '../engine/content';
import { fromCsv, toCsv } from '../engine/csv';
import type { Settings } from '../engine/game';
import { answerText } from '../engine/questions';
import { cleanSeed } from '../engine/rng';
import { type Content, levelNum, type Question, QuestionSchema, QUESTION_TYPES } from '../engine/schema';

type Tab = 'reglages' | 'questions' | 'import' | 'codes' | 'sequence';

/* ======================= outils ======================= */

/** Téléchargement d'un fichier ; renvoie false si le navigateur l'a bloqué. */
function download(name: string, text: string, mime: string): boolean {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch {
    return false;
  }
}

function Qr({ text, size = 180 }: { text: string; size?: number }) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + 2},${r + 2}h1v1h-1z`;
  return (
    <svg class="qr" style={{ width: `${size}px`, height: `${size}px` }} viewBox={`0 0 ${n + 4} ${n + 4}`} role="img" aria-label="QR code du lien de classe">
      <rect width={n + 4} height={n + 4} fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  );
}

/** Zone de texte à copier (solution de repli quand le téléchargement est bloqué). */
function CopyBox({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState('');
  return (
    <div class="copiar">
      <label class="lbl">{label}</label>
      <textarea readOnly value={text} rows={6} onFocus={e => (e.target as HTMLTextAreaElement).select()} />
      <div class="fila">
        <button
          class="btn sec"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setDone('Copié.');
            } catch {
              setDone('Copie impossible ici : sélectionne le texte et fais Ctrl+C.');
            }
          }}
        >
          Copier
        </button>
        <span class="muted" role="status">{done}</span>
      </div>
    </div>
  );
}

/* ======================= Verrou ======================= */

function Lock({ onOpen, onBack }: { onOpen: () => void; onBack: () => void }) {
  const [v, setV] = useState('');
  const [err, setErr] = useState(false);
  return (
    <section class="screen prof">
      <h1>Espace professeur</h1>
      <form
        class="nuevo-perfil"
        onSubmit={e => {
          e.preventDefault();
          if (v.trim() === teacher.code()) onOpen();
          else setErr(true);
        }}
      >
        <label for="prof-code">Code d’accès</label>
        <input id="prof-code" type="password" value={v} onInput={e => { setV((e.target as HTMLInputElement).value); setErr(false); }} autocomplete="off" />
        {err && <p class="error" role="alert">Code incorrect.</p>}
        <div class="fila">
          <button class="btn" type="submit">Entrer</button>
          <button class="btn sec" type="button" onClick={onBack}>Retour au jeu</button>
        </div>
      </form>
    </section>
  );
}

/* ======================= Réglages de classe ======================= */

function ClassTab({ content, settings, onApply }: { content: Content; settings: Settings; onApply: (s: Settings, seed: string) => void }) {
  const seq = content.sequence;
  const [s, setS] = useState<Settings>(settings);
  const [seed, setSeed] = useState('');
  const [newCode, setNewCode] = useState('');
  const [msg, setMsg] = useState('');
  const themes = seq.themes.map(t => t.id);
  const types = QUESTION_TYPES.map(t => t.id);
  const toggle = (list: string[] | null, all: string[], id: string): string[] | null => {
    const cur = list ?? all;
    const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
    const ordered = all.filter(x => next.includes(x));
    return ordered.length === all.length ? null : ordered.length ? ordered : cur;
  };
  const code = encodeClass(s, seq);
  const seedC = cleanSeed(seed);
  const hash = `classe-${code}${seedC ? `-${seedC}` : ''}`;
  const link = `${location.origin}${location.pathname}#${hash}`;
  const count = content.questions.filter(q => !q.disabled && (!s.themes || s.themes.includes(q.theme)) && (!s.types || s.types.includes(q.type))).length;
  return (
    <div class="prof-panel">
      <p class="muted">Choisis les réglages, puis donne aux élèves le <b>code de classe</b> (ou fais scanner le QR code). Ils le saisissent sur l’écran d’accueil du jeu.</p>
      <fieldset>
        <legend>Thèmes</legend>
        {seq.themes.map(t => (
          <label key={t.id} class="check">
            <input type="checkbox" checked={!s.themes || s.themes.includes(t.id)} onChange={() => setS({ ...s, themes: toggle(s.themes, themes, t.id) })} />
            {t.label}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Types de questions</legend>
        {QUESTION_TYPES.map(t => (
          <label key={t.id} class="check">
            <input type="checkbox" checked={!s.types || s.types.includes(t.id)} onChange={() => setS({ ...s, types: toggle(s.types, types, t.id) })} />
            {t.label}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Chrono</legend>
        <label class="check">
          <input type="checkbox" checked={s.chrono} onChange={e => setS({ ...s, chrono: (e.target as HTMLInputElement).checked })} />
          Activer le chrono
        </label>
        <label class="check">
          Durée
          <select disabled={!s.chrono} value={s.chronoFactor} onChange={e => setS({ ...s, chronoFactor: Number((e.target as HTMLSelectElement).value) })}>
            {[...CHRONO_FACTORS].sort((a, b) => a - b).map(f => (
              <option key={f} value={f}>{f === 1 ? 'normale' : f < 1 ? `plus courte (×${f})` : `plus longue (×${f})`}</option>
            ))}
          </select>
        </label>
      </fieldset>
      <fieldset>
        <legend>Réponses écrites</legend>
        <select value={s.writeFactor} onChange={e => setS({ ...s, writeFactor: Number((e.target as HTMLSelectElement).value) })}>
          {[...WRITE_FACTORS].sort((a, b) => a - b).map(f => (
            <option key={f} value={f}>{f === 0 ? 'jamais (tout en QCM)' : f === 1 ? 'normal' : f < 1 ? 'moins souvent' : f === 1.5 ? 'plus souvent' : 'beaucoup plus souvent'}</option>
          ))}
        </select>
      </fieldset>
      <fieldset>
        <legend>Accent oublié à l’écrit</legend>
        {([['casi', '« ¡Casi! » : ni faux, ni juste (conseillé)'], ['accept', 'compté juste'], ['strict', 'compté faux']] as const).map(([v, l]) => (
          <label key={v} class="check">
            <input type="radio" name="accents" checked={s.accents === v} onChange={() => setS({ ...s, accents: v })} />
            {l}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Défi de classe (facultatif)</legend>
        <label class="check">
          Graine
          <input type="text" value={seed} maxLength={24} placeholder="ex. LANZA-12" onInput={e => setSeed((e.target as HTMLInputElement).value)} />
        </label>
        <p class="muted">Avec une graine, toute la classe joue la même carte avec les mêmes salles.</p>
      </fieldset>

      <div class="codigo-fin">
        <Qr text={link} />
        <div>
          <span class="lbl">Code de classe</span>
          <p class="codigo">{code}{seedC ? `-${seedC}` : ''}</p>
          <p class="muted">{describeSettings(s, seq).join(' · ')} · {count} questions</p>
          <p class="muted">Lien : <a href={`#${hash}`}>{link}</a></p>
          <div class="fila">
            <button class="btn" onClick={() => { onApply(s, seedC); setMsg('Réglages appliqués sur cet appareil.'); }}>Appliquer sur cet appareil</button>
            <span class="muted" role="status">{msg}</span>
          </div>
        </div>
      </div>

      <fieldset>
        <legend>Code d’accès de l’espace professeur</legend>
        <label class="check">
          Nouveau code
          <input type="text" value={newCode} onInput={e => setNewCode((e.target as HTMLInputElement).value)} autocomplete="off" />
        </label>
        <button class="btn sec" disabled={newCode.trim().length < 4} onClick={() => { teacher.setCode(newCode.trim()); setNewCode(''); setMsg('Code d’accès changé.'); }}>
          Changer le code
        </button>
        <p class="muted">Ce code n’est pas une vraie protection : il évite seulement que les élèves modifient la banque par erreur.</p>
      </fieldset>
    </div>
  );
}

/* ======================= Éditeur de question ======================= */

const lines = (v: string) => v.split('\n').map(x => x.trim()).filter(Boolean);

function questionToForm(q: Question): Record<string, string> {
  const r = q as Record<string, unknown>;
  return {
    id: q.id, type: q.type, theme: q.theme, level: String(q.level), notions: q.notions.join(','), label: q.label ?? '', prompt: q.prompt,
    promptLang: q.promptLang, answer: typeof r.answer === 'string' ? r.answer : '', answerLang: q.answerLang,
    accept: Array.isArray(r.accept) ? (r.accept as string[]).join('\n') : '', distractors: Array.isArray(r.distractors) ? (r.distractors as string[]).join('\n') : '',
    writable: r.writable ? '1' : '', say: typeof r.say === 'string' ? r.say : '', translation: q.translation, explanation: q.explanation, source: q.source,
    tokens: Array.isArray(r.tokens) ? (r.tokens as string[]).join(' | ') : '', extra: Array.isArray(r.extra) ? (r.extra as string[]).join(' | ') : '',
    pairs: Array.isArray(r.pairs) ? (r.pairs as [string, string][]).map(p => `${p[0]} = ${p[1]}`).join('\n') : '',
    scene: r.scene ? JSON.stringify(r.scene, null, 1) : '', emoji: q.emoji ?? '', disabled: q.disabled ? '1' : '',
  };
}

function formToObject(f: Record<string, string>): Record<string, unknown> {
  const o: Record<string, unknown> = {
    id: f.id.trim(), type: f.type, theme: f.theme, level: f.level === 'jefe' ? 'jefe' : Number(f.level),
    notions: f.notions.split(',').filter(Boolean), prompt: f.prompt.trim(), promptLang: f.promptLang, answerLang: f.answerLang,
    translation: f.translation.trim(), explanation: f.explanation.trim(), source: f.source,
  };
  if (f.label.trim()) o.label = f.label.trim();
  if (f.emoji.trim()) o.emoji = f.emoji.trim();
  if (f.disabled) o.disabled = true;
  const t = f.type;
  if (['qcm', 'ecrit', 'ecoute', 'ordre', 'vrai-faux'].includes(t)) o.answer = f.answer.trim();
  if (['qcm', 'ecrit', 'ecoute', 'ordre'].includes(t)) o.accept = lines(f.accept);
  if (['qcm', 'ecrit', 'ecoute'].includes(t)) o.distractors = lines(f.distractors);
  if (['qcm', 'ecoute'].includes(t)) o.writable = !!f.writable;
  if (t === 'ecoute' && f.say.trim()) o.say = f.say.trim();
  if (t === 'ordre') {
    const toks = f.tokens.split('|').map(x => x.trim()).filter(Boolean);
    if (toks.length) o.tokens = toks;
    o.extra = f.extra.split('|').map(x => x.trim()).filter(Boolean);
  }
  if (t === 'association') o.pairs = lines(f.pairs).map(l => l.split('=').map(x => x.trim())).filter(p => p.length === 2);
  if (t === 'scene' || (t === 'qcm' && f.scene.trim())) {
    try {
      o.scene = JSON.parse(f.scene);
    } catch {
      o.scene = f.scene;
    }
  }
  return o;
}

function emptyForm(content: Content): Record<string, string> {
  return {
    id: `prof-${Date.now().toString(36)}`, type: 'qcm', theme: content.sequence.themes[0].id, level: '1', notions: content.sequence.notions[0]?.id ?? '',
    label: '', prompt: '', promptLang: 'es', answer: '', answerLang: 'es', accept: '', distractors: '', writable: '', say: '', translation: '',
    explanation: '', source: content.sequence.sources[0]?.id ?? '', tokens: '', extra: '', pairs: '', scene: '', emoji: '', disabled: '',
  };
}

function Editor({ content, initial, isNew, onSave, onCancel, onRevert, onRemove }: {
  content: Content; initial: Record<string, string>; isNew: boolean; onSave: (q: Question) => void; onCancel: () => void;
  onRevert?: () => void; onRemove?: () => void;
}) {
  const [f, setF] = useState(initial);
  const seq = content.sequence;
  const set = (k: string) => (e: Event) => setF({ ...f, [k]: (e.target as HTMLInputElement).value });
  const obj = formToObject(f);
  const parsed = QuestionSchema.safeParse(obj);
  const problems: string[] = parsed.success ? [] : parsed.error.issues.map(i => `${i.path.join('.') || 'question'} : ${i.message}`);
  if (parsed.success) {
    for (const i of checkCoherence({ ...content, questions: [parsed.data] })) if (i.where.startsWith('question')) problems.push(`${i.level === 'erreur' ? '' : '(attention) '}${i.message}`);
    if (isNew && content.questions.some(q => q.id === parsed.data.id)) problems.push('cet identifiant existe déjà');
  }
  const blocking = !parsed.success || problems.some(p => !p.startsWith('(attention)'));
  const t = f.type;
  const field = (k: string, label: string, opts: { area?: boolean; help?: string; rows?: number } = {}) => (
    <label class="campo">
      <span>{label}</span>
      {opts.area ? <textarea rows={opts.rows ?? 3} value={f[k]} onInput={set(k)} /> : <input type="text" value={f[k]} onInput={set(k)} />}
      {opts.help && <small class="muted">{opts.help}</small>}
    </label>
  );
  return (
    <div class="editor" role="region" aria-label="Édition d’une question">
      <h3>{isNew ? 'Nouvelle question' : `Modifier ${f.id}`}</h3>
      <div class="editor-grid">
        <label class="campo">
          <span>Identifiant</span>
          <input type="text" value={f.id} onInput={set('id')} readOnly={!isNew} />
        </label>
        <label class="campo">
          <span>Type</span>
          <select value={t} onChange={set('type')} disabled={!isNew}>
            {QUESTION_TYPES.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </label>
        <label class="campo">
          <span>Thème</span>
          <select value={f.theme} onChange={set('theme')}>{seq.themes.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
        </label>
        <label class="campo">
          <span>Niveau</span>
          <select value={f.level} onChange={set('level')}>{['1', '2', '3', 'jefe'].map(x => <option key={x} value={x}>{x}</option>)}</select>
        </label>
        <label class="campo">
          <span>Source</span>
          <select value={f.source} onChange={set('source')}>{seq.sources.map(x => <option key={x.id} value={x.id}>{x.title}</option>)}</select>
        </label>
        <label class="campo">
          <span>Langue de l’énoncé</span>
          <select value={f.promptLang} onChange={set('promptLang')}><option value="es">espagnol</option><option value="fr">français</option></select>
        </label>
      </div>
      <fieldset class="nociones-check">
        <legend>Notions</legend>
        {seq.notions.map(n => {
          const on = f.notions.split(',').includes(n.id);
          return (
            <label key={n.id} class="check">
              <input type="checkbox" checked={on} onChange={() => setF({ ...f, notions: (on ? f.notions.split(',').filter(x => x !== n.id) : [...f.notions.split(',').filter(Boolean), n.id]).join(',') })} />
              {n.label}
            </label>
          );
        })}
      </fieldset>
      {field('label', 'Consigne courte (facultatif, en français)')}
      {field('prompt', t === 'vrai-faux' ? 'Affirmation' : t === 'ordre' ? 'Phrase à traduire / aide (affichée)' : 'Énoncé', { area: true, help: ['qcm', 'ecrit'].includes(t) ? 'Mets ___ pour un trou. Plusieurs trous : réponse « es / está ».' : undefined })}
      {t === 'vrai-faux' ? (
        <label class="campo">
          <span>Réponse</span>
          <select value={f.answer} onChange={set('answer')}><option value="">—</option><option value="verdadero">Verdadero</option><option value="falso">Falso</option></select>
        </label>
      ) : ['qcm', 'ecrit', 'ecoute', 'ordre'].includes(t) ? field('answer', t === 'ordre' ? 'Phrase correcte' : 'Bonne réponse') : null}
      {['qcm', 'ecrit', 'ecoute', 'ordre'].includes(t) && field('accept', 'Autres réponses acceptées (une par ligne)', { area: true, rows: 2 })}
      {['qcm', 'ecrit', 'ecoute'].includes(t) && field('distractors', 'Mauvaises réponses (au moins 3, une par ligne)', { area: true, rows: 3 })}
      {['qcm', 'ecoute'].includes(t) && (
        <label class="check">
          <input type="checkbox" checked={!!f.writable} onChange={e => setF({ ...f, writable: (e.target as HTMLInputElement).checked ? '1' : '' })} />
          Peut aussi être posée à l’écrit
        </label>
      )}
      {t === 'ecoute' && field('say', 'Texte lu à voix haute (facultatif : sinon, la bonne réponse)')}
      {t === 'ordre' && field('tokens', 'Étiquettes dans l’ordre, séparées par | (facultatif : sinon, mot par mot)')}
      {t === 'ordre' && field('extra', 'Étiquettes pièges, séparées par | (facultatif)')}
      {t === 'association' && field('pairs', 'Paires « mot = image » (une par ligne, 3 à 5)', { area: true, rows: 5 })}
      {(t === 'scene' || t === 'qcm') && field('scene', t === 'scene' ? 'Scène (JSON)' : 'Image de scène (JSON, facultatif)', { area: true, rows: 4, help: 'Ex. {"decor":"mancha","items":[{"object":"dulcinea","col":"toboso"}]}' })}
      {field('translation', 'Traduction (pour le pouvoir Traductor)')}
      {field('explanation', 'Explication / règle (en français, affichée après une erreur)', { area: true, rows: 2 })}
      {problems.length > 0 && (
        <ul class="problemas" role="alert">
          {problems.map((p, i) => <li key={i}>{p}</li>)}
        </ul>
      )}
      <div class="fila">
        <button class="btn" disabled={blocking} onClick={() => parsed.success && onSave(parsed.data)}>Enregistrer</button>
        <button class="btn sec" onClick={onCancel}>Annuler</button>
        {onRevert && <button class="link" onClick={onRevert}>Revenir à la version d’origine</button>}
        {onRemove && <button class="link peligro" onClick={onRemove}>Supprimer la question</button>}
      </div>
    </div>
  );
}

/* ======================= Banque de questions ======================= */

function QuestionsTab({ content, overlay, original, onOverlay }: { content: Content; overlay: Overlay; original: Set<string>; onOverlay: (o: Overlay) => void }) {
  const [filter, setFilter] = useState({ text: '', theme: '', type: '', level: '', status: '' });
  const [page, setPage] = useState(0);
  const [edit, setEdit] = useState<{ q: Question | null } | null>(null);
  const seq = content.sequence;
  const all = content.questions;
  const shown = all.filter(q => {
    if (filter.theme && q.theme !== filter.theme) return false;
    if (filter.type && q.type !== filter.type) return false;
    if (filter.level && String(q.level) !== filter.level) return false;
    if (filter.status === 'off' && !q.disabled) return false;
    if (filter.status === 'on' && q.disabled) return false;
    if (filter.status === 'mod' && !overlay.upserts[q.id]) return false;
    if (filter.text) {
      const t = filter.text.toLowerCase();
      if (!`${q.id} ${q.prompt} ${answerText(q, content.scenes)}`.toLowerCase().includes(t)) return false;
    }
    return true;
  });
  const PER = 40;
  const pages = Math.max(1, Math.ceil(shown.length / PER));
  const save = (q: Question) => {
    onOverlay({ ...overlay, upserts: { ...overlay.upserts, [q.id]: q as never }, removed: overlay.removed.filter(x => x !== q.id) });
    setEdit(null);
  };
  const toggle = (q: Question) => save({ ...q, disabled: !q.disabled || undefined } as Question);
  const revert = (id: string) => {
    const up = { ...overlay.upserts };
    delete up[id];
    onOverlay({ ...overlay, upserts: up });
    setEdit(null);
  };
  const remove = (id: string) => {
    const up = { ...overlay.upserts };
    delete up[id];
    onOverlay({ ...overlay, upserts: up, removed: original.has(id) ? [...new Set([...overlay.removed, id])] : overlay.removed });
    setEdit(null);
  };
  const f = (k: keyof typeof filter) => (e: Event) => {
    setFilter({ ...filter, [k]: (e.target as HTMLInputElement).value });
    setPage(0);
  };

  if (edit) {
    const q = edit.q;
    return (
      <Editor
        content={content}
        initial={q ? questionToForm(q) : emptyForm(content)}
        isNew={!q}
        onSave={save}
        onCancel={() => setEdit(null)}
        onRevert={q && original.has(q.id) && overlay.upserts[q.id] ? () => revert(q.id) : undefined}
        onRemove={q ? () => remove(q.id) : undefined}
      />
    );
  }
  return (
    <div class="prof-panel">
      <div class="filtros">
        <input type="search" placeholder="Rechercher…" value={filter.text} onInput={f('text')} aria-label="Rechercher une question" />
        <select value={filter.theme} onChange={f('theme')} aria-label="Thème"><option value="">Tous les thèmes</option>{seq.themes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
        <select value={filter.type} onChange={f('type')} aria-label="Type"><option value="">Tous les types</option>{QUESTION_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
        <select value={filter.level} onChange={f('level')} aria-label="Niveau"><option value="">Tous les niveaux</option>{['1', '2', '3', 'jefe'].map(l => <option key={l} value={l}>{l}</option>)}</select>
        <select value={filter.status} onChange={f('status')} aria-label="État"><option value="">Toutes</option><option value="on">Actives</option><option value="off">Désactivées</option><option value="mod">Modifiées par moi</option></select>
        <button class="btn" onClick={() => setEdit({ q: null })}>+ Nouvelle question</button>
      </div>
      <p class="muted">{shown.length} question{shown.length > 1 ? 's' : ''} · {all.filter(q => !q.disabled).length} actives sur {all.length}</p>
      <div class="tabla-wrap">
        <table class="tabla">
          <thead>
            <tr><th>Active</th><th>Énoncé</th><th>Réponse</th><th>Type</th><th>Niv.</th><th></th></tr>
          </thead>
          <tbody>
            {shown.slice(page * PER, page * PER + PER).map(q => (
              <tr key={q.id} class={q.disabled ? 'off' : ''}>
                <td><input type="checkbox" checked={!q.disabled} onChange={() => toggle(q)} aria-label={`Activer ${q.id}`} /></td>
                <td>
                  <span class="qid">{q.id}{overlay.upserts[q.id] ? (original.has(q.id) ? ' · modifiée' : ' · ajoutée') : ''}</span>
                  {q.label ? <small class="muted">{q.label} · </small> : null}
                  {q.prompt.length > 110 ? q.prompt.slice(0, 110) + '…' : q.prompt}
                </td>
                <td lang="es">{answerText(q, content.scenes).slice(0, 60)}</td>
                <td>{QUESTION_TYPES.find(t => t.id === q.type)?.label}</td>
                <td>{levelNum(q.level) === 4 ? 'jefe' : q.level}</td>
                <td><button class="link" onClick={() => setEdit({ q })}>Modifier</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div class="fila">
          <button class="btn sec" disabled={page === 0} onClick={() => setPage(page - 1)}>← Précédentes</button>
          <span class="muted">Page {page + 1} / {pages}</span>
          <button class="btn sec" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Suivantes →</button>
        </div>
      )}
    </div>
  );
}

/* ======================= Import / export ======================= */

function ImportTab({ content, overlay, onOverlay }: { content: Content; overlay: Overlay; onOverlay: (o: Overlay) => void }) {
  const [report, setReport] = useState<{ ok: Question[]; errors: string[]; isNew: number; changed: number } | null>(null);
  const [copy, setCopy] = useState<{ text: string; label: string } | null>(null);
  const [paste, setPaste] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [msg, setMsg] = useState('');
  const byId = new Map(content.questions.map(q => [q.id, q]));
  const mine = content.questions.filter(q => overlay.upserts[q.id]);

  const exp = (name: string, text: string, mime: string, label: string) => {
    download(name, text, mime);
    setCopy({ text, label });
  };
  const analyse = (text: string, name = '') => {
    const errors: string[] = [];
    let qs: Question[] = [];
    const isCsv = name.toLowerCase().endsWith('.csv') || (!text.trim().startsWith('[') && !text.trim().startsWith('{'));
    if (isCsv) {
      const r = fromCsv(text);
      qs = r.questions;
      errors.push(...r.errors.map(e => `ligne ${e.line}${e.id ? ` (${e.id})` : ''} : ${e.message}`));
    } else {
      try {
        const data = JSON.parse(text);
        const arr = Array.isArray(data) ? data : Array.isArray(data?.questions) ? data.questions : [];
        arr.forEach((q: unknown, i: number) => {
          const r = QuestionSchema.safeParse(q);
          if (r.success) qs.push(r.data);
          else errors.push(`question ${i + 1} : ${r.error.issues.map(x => `${x.path.join('.')} ${x.message}`).join(' ; ')}`);
        });
      } catch (e) {
        errors.push(`JSON illisible : ${(e as Error).message}`);
      }
    }
    // cohérence (thèmes, notions, sources, distracteurs…)
    const coh = checkCoherence({ ...content, questions: qs }).filter(i => i.level === 'erreur' && i.where.startsWith('question'));
    const bad = new Set(coh.map(i => i.where.replace(/^question /, '')));
    errors.push(...coh.map(i => `${i.where} : ${i.message}`));
    const ok = qs.filter(q => !bad.has(q.id));
    const isNew = ok.filter(q => !byId.has(q.id)).length;
    const changed = ok.filter(q => byId.has(q.id) && JSON.stringify(byId.get(q.id)) !== JSON.stringify(q)).length;
    setReport({ ok, errors, isNew, changed });
  };
  const apply = () => {
    if (!report) return;
    const up = { ...overlay.upserts };
    for (const q of report.ok) if (JSON.stringify(byId.get(q.id)) !== JSON.stringify(q)) up[q.id] = q as never;
    onOverlay({ ...overlay, upserts: up, removed: overlay.removed.filter(id => !report.ok.some(q => q.id === id)) });
    setMsg(`${report.isNew + report.changed} question(s) ajoutée(s) ou modifiée(s).`);
    setReport(null);
    setPaste('');
  };

  return (
    <div class="prof-panel">
      <h3>Exporter</h3>
      <div class="fila">
        <button class="btn sec" onClick={() => exp('banque-questions.csv', toCsv(content.questions), 'text/csv;charset=utf-8', 'Banque complète (CSV)')}>Toute la banque (CSV pour tableur)</button>
        <button class="btn sec" onClick={() => exp('banque-questions.json', JSON.stringify(content.questions, null, 2), 'application/json', 'Banque complète (JSON)')}>Toute la banque (JSON)</button>
        <button class="btn sec" disabled={!mine.length} onClick={() => exp('professeur.json', JSON.stringify(mine, null, 2), 'application/json', 'Mes ajouts et modifications (JSON)')}>Mes ajouts et modifications ({mine.length})</button>
      </div>
      <p class="muted">
        Le CSV s’ouvre dans Excel ou LibreOffice (séparateur point-virgule). Pour que <b>tous les élèves</b> aient tes questions, place le fichier JSON dans
        <code> content/sequences/{content.sequence.id}/questions/</code> de ton dépôt (voir le README).
      </p>
      {copy && <CopyBox text={copy.text} label={`${copy.label} : si le téléchargement n’a pas démarré, copie ce texte`} />}

      <h3>Importer</h3>
      <label class="campo">
        <span>Fichier JSON ou CSV</span>
        <input
          type="file"
          accept=".json,.csv,text/csv,application/json"
          onChange={async e => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) analyse(await file.text(), file.name);
          }}
        />
      </label>
      <label class="campo">
        <span>… ou colle le contenu ici</span>
        <textarea rows={4} value={paste} onInput={e => setPaste((e.target as HTMLTextAreaElement).value)} />
      </label>
      <button class="btn sec" disabled={!paste.trim()} onClick={() => analyse(paste)}>Analyser</button>
      {report && (
        <div class="informe" role="status">
          <p>
            <b>{report.ok.length}</b> question(s) valide(s) : {report.isNew} nouvelle(s), {report.changed} modifiée(s), {report.ok.length - report.isNew - report.changed} identique(s).
          </p>
          {report.errors.length > 0 && (
            <>
              <p class="error">{report.errors.length} problème(s) : ces lignes seront ignorées.</p>
              <ul class="problemas">{report.errors.slice(0, 30).map((e, i) => <li key={i}>{e}</li>)}</ul>
            </>
          )}
          <button class="btn" disabled={!report.isNew && !report.changed} onClick={apply}>Ajouter à la banque</button>
        </div>
      )}
      <p class="muted" role="status">{msg}</p>

      <h3>Tout annuler</h3>
      {confirmReset ? (
        <p>
          Effacer toutes tes modifications ({Object.keys(overlay.upserts).length} question(s) ajoutée(s) ou modifiée(s), {overlay.removed.length} supprimée(s)) ?{' '}
          <button class="link peligro" onClick={() => { onOverlay(emptyOverlay()); setConfirmReset(false); }}>Oui, revenir à la banque d’origine</button>{' '}
          <button class="link" onClick={() => setConfirmReset(false)}>Non</button>
        </p>
      ) : (
        <button class="btn sec" onClick={() => setConfirmReset(true)}>Revenir à la banque d’origine</button>
      )}
    </div>
  );
}

/* ======================= Codes élèves ======================= */

function CodesTab({ content }: { content: Content }) {
  const [text, setText] = useState('');
  const seq = content.sequence;
  const rows = text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => {
      const m = l.match(/^(.*?)[\s:;,]*([0-9A-Za-z]{5}[-\s]?[0-9A-Za-z]{5}[-\s]?[0-9A-Za-z]{5}[-\s]?[0-9A-Za-z]{4})\s*$/);
      const name = m ? m[1].trim() : '';
      const code = m ? m[2] : l;
      return { name, code, r: decodeCode(code, seq.id) };
    });
  const missedCount = new Map<number, number>();
  for (const x of rows) if (x.r.ok) for (const i of x.r.data.missed) missedCount.set(i, (missedCount.get(i) ?? 0) + 1);
  const valid = rows.filter(x => x.r.ok).length;
  return (
    <div class="prof-panel">
      <p class="muted">Colle les codes de fin de partie, un par ligne. Tu peux mettre un prénom avant le code (ex. « Lupita : HC8BA-351GA-HMQ00-W9S0 ») : il reste sur ton appareil.</p>
      <textarea rows={6} value={text} onInput={e => setText((e.target as HTMLTextAreaElement).value)} aria-label="Codes des élèves" placeholder="HC8BA-351GA-HMQ00-W9S0" />
      {rows.length > 0 && (
        <>
          <div class="tabla-wrap">
            <table class="tabla">
              <thead>
                <tr><th>Élève</th><th>Résultat</th><th>Réussite</th><th>Combats</th><th>Durée</th><th>Date</th><th>Notions à revoir</th></tr>
              </thead>
              <tbody>
                {rows.map((x, i) =>
                  x.r.ok ? (
                    <tr key={i}>
                      <td>{x.name || '—'}</td>
                      <td>{x.r.data.win ? '🏆 victoire' : `acte ${x.r.data.act}`}{x.r.data.ascension ? ` · 💀${x.r.data.ascension}` : ''}<br /><small class="muted">{seq.characters[x.r.data.character]?.name}</small></td>
                      <td>{x.r.data.ok}/{x.r.data.total} ({x.r.data.total ? Math.round((100 * x.r.data.ok) / x.r.data.total) : 0} %)</td>
                      <td>{x.r.data.won}</td>
                      <td>{x.r.data.minutes} min</td>
                      <td>{x.r.data.date.toLocaleDateString('fr-FR')}</td>
                      <td><small>{x.r.data.missed.map(n => seq.notions[n]?.label ?? `notion ${n}`).join(' · ') || '—'}</small></td>
                    </tr>
                  ) : (
                    <tr key={i} class="off">
                      <td>{x.name || '—'}</td>
                      <td colSpan={6}><span class="error">{x.code} : {x.r.error}</span></td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
          {valid > 1 && missedCount.size > 0 && (
            <>
              <h3>Notions les plus ratées ({valid} codes)</h3>
              <ul class="nociones-prof">
                {[...missedCount].sort((a, b) => b[1] - a[1]).map(([n, c]) => (
                  <li key={n}><span class="barra-debil" aria-hidden="true"><i style={{ width: `${(100 * c) / valid}%` }} /></span> {seq.notions[n]?.label} : {c} élève{c > 1 ? 's' : ''}</li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ======================= Séquence ======================= */

function SequenceTab({ content, fromPack, onReload }: { content: Content; fromPack: boolean; onReload: () => void }) {
  const [copy, setCopy] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[] | null>(null);
  const [confirm, setConfirm] = useState(false);
  const base = useMemo(() => teacher.pack() ?? rawContent(), [fromPack]);
  const importPack = (text: string) => {
    try {
      const raw = JSON.parse(text) as RawContent;
      const r = parseContent(raw);
      const errs = r.issues.filter(i => i.level === 'erreur').map(i => `${i.where} : ${i.message}`);
      if (!r.content) {
        setIssues(errs.length ? errs : ['Ce fichier n’est pas une séquence complète.']);
        return;
      }
      teacher.savePack(raw);
      setIssues(errs.length ? [`Séquence importée (${r.content.questions.length} questions valides). Lignes ignorées :`, ...errs] : [`Séquence « ${r.content.sequence.title} » importée.`]);
      onReload();
    } catch (e) {
      setIssues([`Fichier illisible : ${(e as Error).message}`]);
    }
  };
  return (
    <div class="prof-panel">
      <p>
        Séquence active : <b>{content.sequence.title}</b> ({content.questions.length} questions, {content.enemies.length} ennemis, {content.events.length} événements)
        {fromPack ? ' · importée sur cet appareil' : ' · séquence intégrée au jeu'}.
      </p>
      <p class="muted">
        Le moteur du jeu ne connaît rien de don Quijote : tout est dans les fichiers de la séquence. Pour en préparer une autre (la Navidad, la Semana Santa…),
        exporte ce « pack », modifie-le (ou fais-le modifier), puis réimporte-le. Le plus simple pour toute la classe reste de créer un nouveau dossier dans
        <code> content/sequences/</code> du dépôt (voir le README).
      </p>
      <div class="fila">
        <button class="btn sec" onClick={() => { const t = JSON.stringify(base, null, 2); download(`sequence-${content.sequence.id}.json`, t, 'application/json'); setCopy(t); }}>Exporter la séquence complète</button>
        <label class="btn sec file-btn">
          Importer une séquence
          <input type="file" accept=".json,application/json" class="sr-only" onChange={async e => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) importPack(await f.text()); }} />
        </label>
        {fromPack &&
          (confirm ? (
            <span>
              Revenir à la séquence intégrée ? <button class="link peligro" onClick={() => { teacher.savePack(null); setConfirm(false); onReload(); }}>Oui</button>{' '}
              <button class="link" onClick={() => setConfirm(false)}>Non</button>
            </span>
          ) : (
            <button class="btn sec" onClick={() => setConfirm(true)}>Revenir à la séquence intégrée</button>
          ))}
      </div>
      {issues && <ul class="problemas" role="status">{issues.slice(0, 40).map((x, i) => <li key={i}>{x}</li>)}</ul>}
      {copy && <CopyBox text={copy} label="Séquence complète (si le téléchargement n’a pas démarré, copie ce texte)" />}
    </div>
  );
}

/* ======================= Page ======================= */

export function TeacherSpace({ content, fromPack, settings, onApplySettings, onReload, onBack }: {
  content: Content; fromPack: boolean; settings: Settings; onApplySettings: (s: Settings, seed: string) => void; onReload: () => void; onBack: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('reglages');
  const [overlay, setOverlayState] = useState<Overlay>(() => teacher.overlay());
  const original = useMemo(() => {
    const raw = teacher.pack() ?? rawContent();
    return new Set(raw.questions.flatMap(f => (Array.isArray(f.data) ? (f.data as { id?: string }[]).map(q => String(q?.id)) : [])));
  }, [fromPack]);
  if (!open) return <Lock onOpen={() => setOpen(true)} onBack={onBack} />;
  const setOverlay = (o: Overlay) => {
    teacher.saveOverlay(o);
    setOverlayState(o);
    onReload();
  };
  const TABS: [Tab, string][] = [['reglages', 'Réglages de classe'], ['questions', 'Questions'], ['import', 'Import / export'], ['codes', 'Codes élèves'], ['sequence', 'Séquence']];
  return (
    <section class="screen prof">
      <div class="fila">
        <button class="btn sec" onClick={onBack}>← Retour au jeu</button>
        <h1>Espace professeur</h1>
      </div>
      <div class="pestanas" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} class={tab === id ? 'sel' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === 'reglages' && <ClassTab content={content} settings={settings} onApply={onApplySettings} />}
        {tab === 'questions' && <QuestionsTab content={content} overlay={overlay} original={original} onOverlay={setOverlay} />}
        {tab === 'import' && <ImportTab content={content} overlay={overlay} onOverlay={setOverlay} />}
        {tab === 'codes' && <CodesTab content={content} />}
        {tab === 'sequence' && <SequenceTab content={content} fromPack={fromPack} onReload={onReload} />}
      </div>
    </section>
  );
}
