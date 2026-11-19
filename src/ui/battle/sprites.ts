/**
 * Sprites « pixel art » originaux, dessinés dans un <canvas> basse résolution puis agrandis
 * sans lissage (image-rendering: pixelated).
 * - Ennemis : leur emoji (ou dessin de figures.ts) est rendu en 32×32, palette réduite et contour sombre.
 * - Joueur : dessiné pixel par pixel (vu de dos : chapeau, tunique, lance).
 */

import { figureSrc } from '../figures';

const OUTLINE: [number, number, number] = [29, 31, 51]; // --noche

/** Réduit les couleurs (look rétro) et ajoute un contour sombre d'un pixel. */
function pixelize(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const solid = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = d[i * 4 + 3];
    if (a < 110) {
      d[i * 4 + 3] = 0;
      continue;
    }
    solid[i] = 1;
    d[i * 4 + 3] = 255;
    for (let k = 0; k < 3; k++) d[i * 4 + k] = Math.min(255, Math.round(d[i * 4 + k] / 51) * 51 + 12);
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (solid[i]) continue;
      const near = (x > 0 && solid[i - 1]) || (x < w - 1 && solid[i + 1]) || (y > 0 && solid[i - w]) || (y < h - 1 && solid[i + w]);
      if (near) {
        d[i * 4] = OUTLINE[0];
        d[i * 4 + 1] = OUTLINE[1];
        d[i * 4 + 2] = OUTLINE[2];
        d[i * 4 + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';

/** Dessine un ennemi (emoji + éventuel accessoire au-dessus) dans le canvas. */
export function drawEnemy(canvas: HTMLCanvasElement, emoji: string, top?: string, res = 32): void {
  canvas.width = res;
  canvas.height = res;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  ctx.clearRect(0, 0, res, res);
  const finish = () => {
    if (top) {
      ctx.font = `${Math.round(res * 0.42)}px ${EMOJI_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(top, res / 2, res * 0.16);
    }
    try {
      pixelize(ctx, res, res);
    } catch {
      /* canvas illisible : on garde le dessin brut */
    }
  };
  const src = figureSrc(emoji);
  if (src) {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, res * 0.08, res * 0.08, res * 0.84, res * 0.84);
      finish();
    };
    img.src = src;
    return;
  }
  ctx.font = `${Math.round(res * (top ? 0.74 : 0.86))}px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, res / 2, res * (top ? 0.6 : 0.54));
  finish();
}

/* ---------- Joueur, vu de dos (20 × 22) : chapeau, tunique, ceinture, lance ---------- */
const PAL: Record<string, string> = {
  K: '#1d1f33', H: '#8a5a2b', h: '#5a3a1a', b: '#e9a23b', N: '#3b2a1a',
  P: '#c0603a', p: '#7a3a22', T: '#f4e3b5', S: '#e9b98a', L: '#4a4e6e', W: '#8a5a2b', F: '#c8ccd4', f: '#9aa3b2',
};
const PLAYER = [
  '.................F..',
  '................FfF.',
  '.................F..',
  '.......KKKKK.....W..',
  '......KHHHHHK....W..',
  '...KKKHHbbbHHKKK.W..',
  '..KHHHHHHHHHHHHHKW..',
  '...KKhhhhhhhhhKK.W..',
  '......KNNNNNK....W..',
  '.....KPPPPPPPK..SW..',
  '....KPPPPPPPPPKSSW..',
  '...KPPPPPPPPPPPKKW..',
  '...KPTTTTTTTTTPK.W..',
  '...KPPPPPPPPPPPK.W..',
  '...KpPPPPPPPPPpK.W..',
  '...KppppppppppK..W..',
  '....KLLLLKLLLLK..W..',
  '....KLLLLKLLLLK..W..',
  '....KLLLK.KLLLK..W..',
  '....KKKKK.KKKKK.....',
  '....................',
  '....................',
];

export const PLAYER_W = 20;
export const PLAYER_H = PLAYER.length;

export function drawPlayer(canvas: HTMLCanvasElement, palette: Partial<Record<string, string>> = {}): void {
  canvas.width = PLAYER_W;
  canvas.height = PLAYER_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, PLAYER_W, PLAYER_H);
  PLAYER.forEach((row, y) => {
    [...row.padEnd(PLAYER_W, '.')].slice(0, PLAYER_W).forEach((ch, x) => {
      const col = palette[ch] ?? PAL[ch];
      if (!col) return;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    });
  });
}
