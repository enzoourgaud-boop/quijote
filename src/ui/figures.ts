/**
 * Dessins originaux (SVG) quand aucun emoji ne convient ou n'existe sur les vieux PC.
 * Dans le JSON du contenu : "emoji": "svg:molino". Utilisés par les cartes, l'association mot / image et le combat.
 */
const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${body}</svg>`;

const SAILS = (cx: number, cy: number, len: number, w: number) =>
  [45, 135, 225, 315]
    .map(a => `<g transform="rotate(${a} ${cx} ${cy})"><rect x="${cx - w / 2}" y="${cy - len}" width="${w}" height="${len - 3}" fill="#f6ecd2" stroke="#3b2a1a" stroke-width="2"/><path d="M${cx} ${cy - len + 2}V${cy - 4}M${cx - w / 2} ${cy - len / 2}H${cx + w / 2}" stroke="#3b2a1a" stroke-width="1.5"/></g>`)
    .join('');

export const FIGURES: Record<string, { name: string; svg: string }> = {
  molino: {
    name: 'un moulin',
    svg: svg(`<path d="M22 60 26 26h12l4 34z" fill="#f6ecd2" stroke="#3b2a1a" stroke-width="2"/><path d="M23 26 32 15l9 11z" fill="#8a5a2b" stroke="#3b2a1a" stroke-width="2"/><rect x="29" y="46" width="6" height="14" fill="#5a3a1a"/>${SAILS(32, 24, 22, 7)}<circle cx="32" cy="24" r="3" fill="#3b2a1a"/>`),
  },
  gigante: {
    name: 'un géant',
    svg: svg(`${SAILS(32, 20, 20, 7)}<path d="M18 62 22 30h20l4 32z" fill="#c9a46a" stroke="#3b2a1a" stroke-width="2"/><circle cx="32" cy="20" r="11" fill="#e9b98a" stroke="#3b2a1a" stroke-width="2"/><path d="M25 16l5 2M39 16l-5 2" stroke="#3b2a1a" stroke-width="2.5" stroke-linecap="round"/><circle cx="28" cy="20" r="1.8" fill="#3b2a1a"/><circle cx="36" cy="20" r="1.8" fill="#3b2a1a"/><path d="M27 26q5-3 10 0" stroke="#3b2a1a" stroke-width="2" fill="none"/>`),
  },
  lanza: {
    name: 'une lance',
    svg: svg(`<path d="M10 56 50 12" stroke="#8a5a2b" stroke-width="5" stroke-linecap="round"/><path d="M50 12 58 4 55 16z" fill="#c8ccd4" stroke="#3b2a1a" stroke-width="2"/><path d="M44 19l8 1-6 6z" fill="#d1495b" stroke="#3b2a1a" stroke-width="1.5"/><path d="M14 50l6 6" stroke="#3b2a1a" stroke-width="4" stroke-linecap="round"/>`),
  },
  caballero: {
    name: 'un chevalier masqué',
    svg: svg(`<path d="M30 6q10-4 14 6-6-3-10 0z" fill="#d1495b" stroke="#3b2a1a" stroke-width="1.5"/><path d="M16 30q0-20 16-20t16 20v16q0 12-16 14Q16 58 16 46z" fill="#9aa3b2" stroke="#3b2a1a" stroke-width="2.5"/><rect x="20" y="28" width="24" height="6" rx="2" fill="#1d1f33"/><path d="M24 40h16M24 46h16M32 34v20" stroke="#3b2a1a" stroke-width="2"/><circle cx="27" cy="31" r="1.5" fill="#f2d16b"/><circle cx="37" cy="31" r="1.5" fill="#f2d16b"/>`),
  },
  mago: {
    name: 'un magicien',
    svg: svg(`<path d="M32 2 46 30H18z" fill="#5b3a9e" stroke="#3b2a1a" stroke-width="2"/><path d="M12 30h40l-4 5H16z" fill="#5b3a9e" stroke="#3b2a1a" stroke-width="2"/><path d="M30 12l1.5 3 3 .4-2.2 2.1.6 3L30 19l-2.9 1.5.6-3-2.2-2.1 3-.4z" fill="#f2d16b"/><path d="M20 35h24v6q0 14-12 14T20 41z" fill="#e9b98a" stroke="#3b2a1a" stroke-width="2"/><path d="M21 38h22v6H21z" fill="#1d1f33"/><circle cx="27" cy="41" r="1.6" fill="#f2d16b"/><circle cx="37" cy="41" r="1.6" fill="#f2d16b"/><path d="M24 50q8 12 16 0v8q-8 6-16 0z" fill="#f6ecd2" stroke="#3b2a1a" stroke-width="1.5"/>`),
  },
};

const key = (emoji: string) => (emoji.startsWith('svg:') ? emoji.slice(4) : '');

/** Adresse de l'image (data:) d'un dessin, ou null si ce n'est pas un dessin connu. */
export function figureSrc(emoji: string): string | null {
  const f = FIGURES[key(emoji)];
  return f ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(f.svg)}` : null;
}

/** Nom lisible (lecteurs d'écran) d'un emoji ou d'un dessin. */
export function figureName(emoji: string): string {
  return FIGURES[key(emoji)]?.name ?? emoji;
}
