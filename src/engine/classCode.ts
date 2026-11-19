/**
 * Code de classe : les réglages du professeur tiennent en 6 caractères.
 * Il passe par un lien (#classe-XXXXXX), un QR code projeté au tableau, ou se tape à la main.
 * Une graine de « défi de classe » peut suivre : #classe-XXXXXX-VELA-12
 */
import type { AccentPolicy } from './answer';
import type { Settings } from './game';
import { QUESTION_TYPES, type Sequence } from './schema';

const ALPHA = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const CHRONO_FACTORS = [1, 0.75, 1.25, 1.5, 2, 0.5];
export const WRITE_FACTORS = [1, 0, 0.5, 1.5, 2];
const ACCENTS: AccentPolicy[] = ['casi', 'accept', 'strict'];

const nearest = (list: number[], v: number) => list.reduce((best, x, i) => (Math.abs(x - v) < Math.abs(list[best] - v) ? i : best), 0);

function mask<T>(all: T[], on: T[] | null): number {
  if (!on) return (1 << all.length) - 1;
  return all.reduce((m, x, i) => (on.includes(x) ? m | (1 << i) : m), 0);
}
function unmask<T>(all: T[], m: number): T[] | null {
  const on = all.filter((_, i) => m & (1 << i));
  return on.length === all.length || !on.length ? null : on;
}

function check(v: number): number {
  let c = 5;
  for (let i = 0; i < 26; i += 4) c = (c * 7 + ((v >>> i) & 15)) & 15;
  return c;
}

export function encodeClass(s: Settings, seq: Sequence): string {
  const themes = seq.themes.map(t => t.id).slice(0, 8);
  const types = QUESTION_TYPES.map(t => t.id);
  let v = 1; // version (2 bits)
  v |= mask(themes, s.themes) << 2;
  v |= mask(types, s.types as string[] | null) << 10;
  v |= (s.chrono ? 1 : 0) << 17;
  v |= nearest(CHRONO_FACTORS, s.chronoFactor) << 18;
  v |= nearest(WRITE_FACTORS, s.writeFactor) << 21;
  v |= Math.max(0, ACCENTS.indexOf(s.accents)) << 24;
  v = (v | (check(v) << 26)) >>> 0;
  let out = '';
  for (let i = 0; i < 6; i++) out += ALPHA[(v >>> (i * 5)) & 31];
  return out;
}

export function decodeClass(code: string, seq: Sequence): Partial<Settings> | null {
  const c = code.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1').slice(0, 6);
  if (c.length !== 6) return null;
  let v = 0;
  for (let i = 0; i < 6; i++) {
    const n = ALPHA.indexOf(c[i]);
    if (n < 0) return null;
    v |= n << (i * 5);
  }
  v >>>= 0;
  const data = v & ((1 << 26) - 1);
  if ((v >>> 26) !== check(data) || (data & 3) !== 1) return null;
  const themes = seq.themes.map(t => t.id).slice(0, 8);
  const types = QUESTION_TYPES.map(t => t.id);
  return {
    themes: unmask(themes, (data >>> 2) & 255),
    types: unmask(types, (data >>> 10) & 127),
    chrono: ((data >>> 17) & 1) === 1,
    chronoFactor: CHRONO_FACTORS[(data >>> 18) & 7] ?? 1,
    writeFactor: WRITE_FACTORS[(data >>> 21) & 7] ?? 1,
    accents: ACCENTS[(data >>> 24) & 3] ?? 'casi',
  };
}

/** Lit « #classe-XXXXXX » ou « #classe-XXXXXX-GRAINE-12 » (ou la même chose sans le #). */
export function parseClassLink(hashOrCode: string): { code: string; seed: string } | null {
  const m = hashOrCode.trim().replace(/^#/, '').match(/^(?:classe-)?([0-9A-Za-z]{6})(?:-(.+))?$/);
  return m ? { code: m[1].toUpperCase(), seed: (m[2] ?? '').toUpperCase() } : null;
}

/** Résumé lisible des réglages (affiché aux élèves et au professeur). */
export function describeSettings(s: Partial<Settings>, seq: Sequence): string[] {
  const out: string[] = [];
  if (s.themes) out.push(`Thèmes : ${s.themes.map(t => seq.themes.find(x => x.id === t)?.label ?? t).join(', ')}`);
  if (s.types) out.push(`Types : ${s.types.map(t => QUESTION_TYPES.find(x => x.id === t)?.label ?? t).join(', ')}`);
  // le chrono est coupé par défaut : on ne signale que le cas où il est activé
  if (s.chrono) out.push(s.chronoFactor && s.chronoFactor !== 1 ? `Avec chrono ×${s.chronoFactor}` : 'Avec chrono');
  if (s.writeFactor === 0) out.push('Pas de réponse écrite');
  else if (s.writeFactor && s.writeFactor !== 1) out.push(`Réponses écrites ×${s.writeFactor}`);
  if (s.accents === 'accept') out.push('Accents oubliés acceptés');
  if (s.accents === 'strict') out.push('Accents exigés');
  return out.length ? out : ['Réglages par défaut'];
}
