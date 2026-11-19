/**
 * Générateur pseudo-aléatoire à graine (mulberry32).
 * Même graine → même partie : même carte, mêmes ennemis, mêmes questions (à réponses égales).
 * L'état tient dans un seul entier, ce qui permet de sauvegarder une partie en cours.
 */

export function hashSeed(seed: string): number {
  // FNV-1a 32 bits puis mélange final
  let h = 0x811c9dc5;
  for (const ch of seed.trim().toUpperCase()) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return h >>> 0;
}

export class Rng {
  state: number;
  constructor(seedOrState: string | number) {
    this.state = typeof seedOrState === 'number' ? seedOrState >>> 0 : hashSeed(seedOrState);
  }
  /** Nombre dans [0, 1[ */
  next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(n: number): number {
    return Math.floor(this.next() * n);
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  pick<T>(arr: readonly T[]): T {
    if (!arr.length) throw new Error('pick() sur une liste vide');
    return arr[this.int(arr.length)];
  }
  shuffle<T>(arr: readonly T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  /** Tirage pondéré : weight(x) ≥ 0. */
  weighted<T>(arr: readonly T[], weight: (x: T) => number): T {
    const ws = arr.map(x => Math.max(0, weight(x)));
    const total = ws.reduce((s, w) => s + w, 0);
    if (total <= 0) return this.pick(arr);
    let r = this.next() * total;
    for (let i = 0; i < arr.length; i++) {
      r -= ws[i];
      if (r < 0) return arr[i];
    }
    return arr[arr.length - 1];
  }
}

const WORDS = [
  'MOLINO', 'LANZA', 'GIGANTE', 'LIBRO', 'CABALLO', 'BURRO', 'ESCUDO', 'QUESO', 'PUEBLO', 'MANCHA',
  'TOBOSO', 'ROCINANTE', 'RUCIO', 'GALGO', 'ESCUDERO', 'CABALLERO', 'DULCINEA', 'SANCHO', 'MAGO', 'TEATRO',
];

/** Graine lisible, à recopier au tableau : « MOLINO-42 ». */
export function randomSeed(rand: () => number = Math.random): string {
  return `${WORDS[Math.floor(rand() * WORDS.length)]}-${10 + Math.floor(rand() * 90)}`;
}

export function cleanSeed(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9ÁÉÍÓÚÑÜ-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
}
