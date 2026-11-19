/** Panneau d'options de confort : son, taille du texte, police dyslexie, animations, pages qui volent, chrono. */
import { useEffect, useRef } from 'preact/hooks';
import type { Settings } from '../engine/game';
import type { Prefs, TextSize } from '../prefs';
import { play } from './sfx';

export function OptionsPanel({ prefs, onPrefs, settings, onSettings, onClose }: {
  prefs: Prefs; onPrefs: (p: Prefs) => void; settings: Settings; onSettings: (s: Settings) => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('input, select, button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      // garder le focus dans le panneau
      if (e.key === 'Tab' && ref.current) {
        const els = [...ref.current.querySelectorAll<HTMLElement>('input, select, button')].filter(x => !x.hasAttribute('disabled'));
        const first = els[0], last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, []);
  const set = (p: Partial<Prefs>) => onPrefs({ ...prefs, ...p });
  const SIZES: [TextSize, string][] = [['normal', 'Normal'], ['grand', 'Grand'], ['projecteur', 'Vidéoprojecteur (très grand)']];
  return (
    <div class="velo" onClick={e => e.target === e.currentTarget && onClose()}>
      <div class="opciones-panel" role="dialog" aria-modal="true" aria-labelledby="opt-titulo" ref={ref}>
        <h2 id="opt-titulo">Options</h2>
        <fieldset>
          <legend>Son</legend>
          <label class="check">
            <input type="checkbox" checked={prefs.sound} onChange={e => { set({ sound: (e.target as HTMLInputElement).checked }); setTimeout(() => play('ok'), 50); }} />
            Effets sonores
          </label>
          <label class="check">
            Volume
            <input type="range" min={0.1} max={1} step={0.1} value={prefs.volume} disabled={!prefs.sound}
              onChange={e => { set({ volume: Number((e.target as HTMLInputElement).value) }); setTimeout(() => play('coin'), 50); }} />
          </label>
        </fieldset>
        <fieldset>
          <legend>Lecture</legend>
          <label class="check">
            Taille du texte
            <select value={prefs.size} onChange={e => set({ size: (e.target as HTMLSelectElement).value as TextSize })}>
              {SIZES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label class="check">
            <input type="checkbox" checked={prefs.dyslexia} onChange={e => set({ dyslexia: (e.target as HTMLInputElement).checked })} />
            Police adaptée à la dyslexie (OpenDyslexic)
          </label>
        </fieldset>
        <fieldset>
          <legend>Mouvement</legend>
          <label class="check">
            <input type="checkbox" checked={prefs.motion === 'reduced'} onChange={e => set({ motion: (e.target as HTMLInputElement).checked ? 'reduced' : 'auto' })} />
            Réduire les animations
          </label>
          <label class="check">
            <input type="checkbox" checked={prefs.petals} onChange={e => set({ petals: (e.target as HTMLInputElement).checked })} />
            Pages qui volent sur l’accueil
          </label>
        </fieldset>
        <fieldset>
          <legend>Temps</legend>
          <label class="check">
            <input type="checkbox" checked={settings.chrono} onChange={e => onSettings({ ...settings, chrono: (e.target as HTMLInputElement).checked })} />
            Chrono (sans chrono, on prend tout son temps)
          </label>
        </fieldset>
        <div class="fila">
          <button class="btn" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
