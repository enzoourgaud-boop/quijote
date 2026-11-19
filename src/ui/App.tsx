/** Racine : chargement du contenu, profils, sauvegarde, révision de Leitner, aiguillage des écrans. */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { loadActiveContent } from '../content/load';
import { emptyOverlay, teacher } from '../content/teacher';
import { decodeClass, parseClassLink } from '../engine/classCode';
import type { Content } from '../engine/schema';
import { DEFAULT_SETTINGS, Game, type RunState, type Settings } from '../engine/game';
import { applyRun, type Leitner, leitnerUpdate, leitnerWeight, type Meta, pendingAlmas, type Unlocks } from '../engine/meta';
import { randomSeed } from '../engine/rng';
import { profiles, type Profile } from '../profiles';
import { storage } from '../storage';
import { Combat } from './Combat';
import { Horizonte, useGame } from './components';
import { AchievementsScreen, CarnetScreen, CollectionScreen, Over, ProfileScreen, Title } from './Menu';
import { ChestScreen, EventScreen, MapScreen, RestScreen, WarmupScreen } from './Rooms';
import { Reward, Shop } from './screens';
import { Transition } from './Transition';
import { OptionsPanel } from './Options';
import { Petals } from './Petals';
import { play } from './sfx';
import { loadPrefs, type Prefs, savePrefs } from '../prefs';
import type { ComponentType } from 'preact';

type TeacherProps = Parameters<typeof import('./Teacher').TeacherSpace>[0];


function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...storage.get<Partial<Settings>>('settings', {}) };
}

function urlSeed(): string {
  try {
    return new URLSearchParams(location.search).get('graine') ?? '';
  } catch {
    return '';
  }
}

export function App() {
  const [active, setActive] = useState(loadActiveContent);
  const reload = () => setActive(loadActiveContent());
  const { content, issues } = active;
  if (!content) {
    return (
      <main id="app">
        <section class="screen">
          <h1>Contenu invalide</h1>
          <p>Le jeu ne peut pas démarrer : les fichiers de contenu contiennent des erreurs.</p>
          <ul>
            {issues.filter(i => i.level === 'erreur').slice(0, 30).map((i, k) => (
              <li key={k}>
                <b>{i.where}</b> : {i.message}
              </li>
            ))}
          </ul>
          <p>
            <button class="btn" onClick={() => { teacher.saveOverlay(emptyOverlay()); teacher.savePack(null); reload(); }}>
              Annuler les modifications du professeur sur cet appareil
            </button>
          </p>
        </section>
      </main>
    );
  }
  return <Main content={content} fromPack={active.fromPack} reload={reload} />;
}

type MenuScreen = 'title' | 'profiles' | 'collection' | 'achievements' | 'carnet' | 'prof';

/** Réglages venus d'un lien de classe (#classe-XXXXXX), appliqués au démarrage. */
function classFromHash(content: Content): { settings: Partial<Settings>; seed: string; code: string } | null {
  try {
    const l = parseClassLink(location.hash);
    if (!l || !location.hash.startsWith('#classe-')) return null;
    const d = decodeClass(l.code, content.sequence);
    return d ? { settings: d, seed: l.seed, code: l.code } : null;
  } catch {
    return null;
  }
}

function Main({ content, fromPack, reload }: { content: Content; fromPack: boolean; reload: () => void }) {
  const fromLink = useMemo(() => classFromHash(content), []);
  const [settings, setSettingsState] = useState<Settings>(() => {
    const base = loadSettings();
    if (!fromLink) return base;
    const s = { ...DEFAULT_SETTINGS, ...fromLink.settings };
    storage.set('settings', s);
    storage.set('classe', { code: fromLink.code, seed: fromLink.seed });
    return s;
  });
  const [classe, setClasse] = useState(() => storage.get<{ code: string; seed: string } | null>('classe', null));
  const [profile, setProfile] = useState<Profile | null>(() => profiles.current());
  const [list, setList] = useState(() => profiles.list());
  const [meta, setMeta] = useState<Meta | null>(() => (profile ? profiles.meta(profile.id) : null));
  const leitner = useRef<Leitner>(profile ? profiles.leitner(profile.id) : {});
  const [saved, setSaved] = useState<RunState | null>(() => (profile ? profiles.run(profile.id) : null));
  const [game, setGame] = useState<Game | null>(null);
  const [menu, setMenu] = useState<MenuScreen>(() => (typeof location !== 'undefined' && location.hash === '#prof' ? 'prof' : 'title'));
  const [unlocks, setUnlocks] = useState<Unlocks | null>(null);
  const [persistent, setPersistent] = useState(storage.persistent);
  const [prefs, setPrefsState] = useState<Prefs>(loadPrefs);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [Teacher, setTeacher] = useState<ComponentType<TeacherProps> | null>(null);
  const setPrefs = (p: Prefs) => {
    setPrefsState(p);
    savePrefs(p);
  };
  const initialSeed = useMemo(() => urlSeed() || fromLink?.seed || classe?.seed || '', []);
  useGame(game);
  const gameRef = useRef<Game | null>(null);
  gameRef.current = game;
  /** Questions ratées qui attendent le joueur (« almas pendientes »), limitées à celles encore dans la banque. */
  const pending = () => {
    const ok = new Set(content.questions.filter(q => !q.disabled).map(q => q.id));
    return pendingAlmas(leitner.current).filter(id => ok.has(id));
  };

  useEffect(() => storage.onFailure(() => setPersistent(false)) as () => void, []);

  const switchProfile = (p: Profile | null) => {
    setProfile(p);
    setList(profiles.list());
    setMeta(p ? profiles.meta(p.id) : null);
    leitner.current = p ? profiles.leitner(p.id) : {};
    setSaved(p ? profiles.run(p.id) : null);
    setGame(null);
    setMenu('title');
  };

  /** Branche la révision de Leitner et la sauvegarde sur une partie. */
  const attach = (g: Game) => {
    if (!profile) return g;
    const pid = profile.id;
    g.weightOf = q => leitnerWeight(leitner.current, q.id);
    g.onRecord = (q, v) => {
      leitner.current = leitnerUpdate(leitner.current, q.id, v);
      profiles.saveLeitner(pid, leitner.current);
    };
    return g;
  };

  // sauvegarde continue et bilan de fin
  useEffect(() => {
    if (!game || !profile) return;
    const pid = profile.id;
    let recorded = false;
    return game.subscribe(() => {
      const s = game.state;
      if (s.screen === 'over') {
        profiles.clearRun(pid);
        if (!recorded) {
          recorded = true;
          const before = profiles.meta(pid);
          const r = applyRun(content, before, s, leitner.current, game.activeSynergies().length);
          profiles.saveMeta(pid, r.meta);
          setMeta(r.meta);
          setUnlocks(r.unlocks);
        }
      } else profiles.saveRun(pid, s);
    });
  }, [game, profile]);

  const screen = game?.state.screen ?? menu;
  const room = game ? `${game.state.act}-${game.state.node}` : '';
  // l'écran de combat a sa propre mise en page (scène toujours visible, guirlande réduite)
  useEffect(() => {
    document.documentElement.classList.toggle('en-combate', screen === 'combat');
    return () => document.documentElement.classList.remove('en-combate');
  }, [screen]);
  useEffect(() => {
    window.scrollTo({ top: 0 });
    // clavier et lecteur d'écran : le focus va au titre du nouvel écran (si rien d'autre ne l'a pris)
    requestAnimationFrame(() => {
      const a = document.activeElement;
      if (!a || a === document.body || !document.getElementById('app')?.contains(a)) {
        const h = document.querySelector<HTMLElement>('#app h1, #app h2');
        if (h) {
          h.tabIndex = -1;
          h.focus({ preventScroll: true });
        }
      }
    });
    if (screen === 'map' && game?.state.node) play('step');
    if (screen === 'reward' || screen === 'shop' || screen === 'chest') play('coin');
    if (screen === 'over') play(game?.state.result === 'win' ? 'victory' : 'defeat');
  }, [screen, room]);
  useEffect(() => {
    if (unlocks && (unlocks.cards.length || unlocks.achievements.length || unlocks.characters.length)) setTimeout(() => play('unlock'), 1600);
  }, [unlocks]);
  // liens #prof et #classe-XXXXXX ouverts alors que le jeu tourne déjà (sans rechargement)
  useEffect(() => {
    const onHash = () => {
      if (location.hash === '#prof') {
        setGame(null);
        setMenu('prof');
        return;
      }
      const c = classFromHash(content);
      if (c) {
        setSettings({ ...DEFAULT_SETTINGS, ...c.settings });
        const info = { code: c.code, seed: c.seed };
        storage.set('classe', info);
        setClasse(info);
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  // l'espace professeur est chargé seulement quand on l'ouvre (le jeu des élèves reste léger)
  useEffect(() => {
    if (menu === 'prof' && !Teacher) void import('./Teacher').then(m => setTeacher(() => m.TeacherSpace));
  }, [menu]);

  const setSettings = (s: Settings) => {
    setSettingsState(s);
    storage.set('settings', s);
    // la partie en cours suit les réglages tout de suite (couper le chrono au milieu d'un combat, par exemple)
    gameRef.current?.updateSettings(s);
  };
  /** Code de classe saisi par l'élève. Renvoie un message d'erreur, ou null. */
  const applyClassCode = (raw: string): string | null => {
    const l = parseClassLink(raw);
    const d = l && decodeClass(l.code, content.sequence);
    if (!l || !d) return 'Code de classe inconnu : vérifie les 6 caractères.';
    setSettings({ ...DEFAULT_SETTINGS, ...d });
    const c = { code: l.code, seed: l.seed };
    storage.set('classe', c);
    setClasse(c);
    return null;
  };
  const clearClass = () => {
    setSettings({ ...DEFAULT_SETTINGS });
    storage.remove('classe');
    setClasse(null);
  };
  const start = (o: { seed: string; character: string; ascension: number; short?: boolean }) => {
    if (!profile) return;
    const g = attach(Game.newRun(content, settings, o.seed || randomSeed(), Date.now(), { character: o.character, ascension: o.ascension, pending: pending(), short: o.short }));
    profiles.saveRun(profile.id, g.state);
    setSaved(null);
    setUnlocks(null);
    setGame(g);
  };
  const resume = () => {
    if (!saved || !profile) return;
    try {
      const g = new Game(content, settings, saved);
      if ((!g.enemy && saved.screen === 'combat') || !saved.map?.nodes) throw new Error('partie illisible');
      setGame(attach(g));
    } catch {
      profiles.clearRun(profile.id);
      setSaved(null);
    }
  };
  const toMenu = () => {
    setSaved(profile ? profiles.run(profile.id) : null);
    setGame(null);
    setMenu('title');
  };

  if (menu === 'prof') {
    return (
      <>
        <Horizonte />
        <main id="app">
          {!Teacher ? <p class="muted">Chargement de l’espace professeur…</p> : <Teacher
            content={content}
            fromPack={fromPack}
            settings={settings}
            onApplySettings={(s, seed) => {
              setSettings(s);
              const c = { code: '', seed };
              storage.set('classe', c);
              setClasse(c);
            }}
            onReload={reload}
            onBack={() => {
              if (location.hash === '#prof') history.replaceState(null, '', location.pathname + location.search);
              setMenu('title');
            }}
          />}
        </main>
      </>
    );
  }

  // pas encore de profil : on en crée un
  if (!profile || !meta || menu === 'profiles') {
    return (
      <>
        <Horizonte />
        <main id="app">
          <ProfileScreen
            list={list}
            current={profile?.id ?? null}
            onPick={id => {
              profiles.select(id);
              switchProfile(profiles.current());
            }}
            onCreate={(name, avatar) => switchProfile(profiles.create(name, avatar))}
            onDelete={id => {
              profiles.remove(id);
              const cur = profiles.current();
              setList(profiles.list());
              if (profile?.id === id) switchProfile(cur);
            }}
            onBack={profile ? () => setMenu('title') : undefined}
          />
        </main>
      </>
    );
  }

  const petals = prefs.petals && (screen === 'title' || screen === 'map' || screen === 'over');
  return (
    <>
      {petals && <Petals key={screen === 'over' ? 'fin' : 'calme'} burst={screen === 'over' && game?.state.result === 'win'} />}
      <Horizonte />
      <button class="btn-opciones" onClick={() => setOptionsOpen(true)} aria-label="Options : son, taille du texte, police, animations" title="Options">
        ⚙️
      </button>
      {optionsOpen && <OptionsPanel prefs={prefs} onPrefs={setPrefs} settings={settings} onSettings={setSettings} onClose={() => setOptionsOpen(false)} />}
      {game && game.state.screen !== 'combat' && <Transition key={`${screen}-${room}`} />}
      <main id="app">
        {!persistent && (
          <p class="banner" role="status">
            Ce navigateur bloque la sauvegarde : tu peux jouer, mais ta progression ne sera pas gardée sur cet appareil.
          </p>
        )}
        {!game && menu === 'title' && (
          <Title
            content={content}
            profile={profile}
            meta={meta}
            saved={saved}
            settings={settings}
            onSettings={setSettings}
            onStart={start}
            onResume={resume}
            onNav={m => setMenu(m)}
            initialSeed={initialSeed}
            pending={pending().length}
            classe={classe}
            onClassCode={applyClassCode}
            onClearClass={clearClass}
          />
        )}
        {!game && menu === 'collection' && <CollectionScreen content={content} meta={meta} onBack={() => setMenu('title')} />}
        {!game && menu === 'achievements' && <AchievementsScreen meta={meta} onBack={() => setMenu('title')} />}
        {!game && menu === 'carnet' && <CarnetScreen content={content} leitner={leitner.current} onBack={() => setMenu('title')} />}
        {game && game.state.screen === 'warmup' && <WarmupScreen game={game} />}
        {game && game.state.screen === 'map' && <MapScreen game={game} />}
        {game && game.state.screen === 'combat' && <Combat game={game} paused={optionsOpen} />}
        {game && game.state.screen === 'event' && <EventScreen game={game} />}
        {game && game.state.screen === 'rest' && <RestScreen game={game} />}
        {game && game.state.screen === 'chest' && <ChestScreen game={game} />}
        {game && game.state.screen === 'reward' && <Reward game={game} />}
        {game && game.state.screen === 'shop' && <Shop game={game} />}
        {game && game.state.screen === 'over' && (
          <Over game={game} unlocks={unlocks} onMenu={toMenu} onReplay={() => start({ seed: '', character: game.state.character, ascension: game.state.ascension })} />
        )}
        {game && game.state.screen !== 'over' && (
          <p>
            <button class="link" onClick={toMenu}>
              Revenir au menu (la partie est sauvegardée)
            </button>
          </p>
        )}
      </main>
    </>
  );
}
