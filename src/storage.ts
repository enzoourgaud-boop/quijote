/**
 * Sauvegarde locale tolérante aux pannes.
 * Si localStorage est bloqué (navigation privée, ENT verrouillé, quota plein),
 * le jeu continue en mémoire et l'interface affiche un avertissement discret.
 * Aucune donnée ne quitte l'appareil.
 */

// préfixe propre au jeu : El Camino (même adresse github.io) utilise « camino: »
const PREFIX = 'molinos:';
const memory = new Map<string, string>();

function probe(): boolean {
  try {
    const k = `${PREFIX}__test`;
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

let persistent = typeof window !== 'undefined' && probe();
const failures = new Set<() => void>();

export const storage = {
  /** true si les données survivent à la fermeture du navigateur. */
  get persistent() {
    return persistent;
  },
  onFailure(fn: () => void) {
    failures.add(fn);
    return () => failures.delete(fn);
  },
  get<T>(key: string, fallback: T): T {
    let raw: string | null | undefined = memory.get(key);
    if (persistent) {
      try {
        raw = window.localStorage.getItem(PREFIX + key);
      } catch {
        /* lecture bloquée : on garde la copie en mémoire */
      }
    }
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown): boolean {
    const raw = JSON.stringify(value);
    memory.set(key, raw);
    if (!persistent) return false;
    try {
      window.localStorage.setItem(PREFIX + key, raw);
      return true;
    } catch {
      persistent = false;
      failures.forEach(f => f());
      return false;
    }
  },
  remove(key: string) {
    memory.delete(key);
    try {
      if (persistent) window.localStorage.removeItem(PREFIX + key);
    } catch {
      /* rien */
    }
  },
};
