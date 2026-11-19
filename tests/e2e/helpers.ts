/**
 * Outils du test de bout en bout : répondre à la question affichée comme un élève, quel que soit son type.
 * La bonne réponse est lue dans la banque JSON de la séquence.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from '@playwright/test';

const SEQ = join(import.meta.dirname, '..', '..', 'content', 'sequences', 'quijote');

type Q = Record<string, unknown> & { id: string; answer?: string; tokens?: string[]; pairs?: [string, string][]; scene?: { decor: string; items: { object: string; row?: string; col?: string }[] } };

export function loadBank() {
  const bank: Record<string, Q> = {};
  for (const f of readdirSync(join(SEQ, 'questions'))) for (const q of JSON.parse(readFileSync(join(SEQ, 'questions', f), 'utf8')) as Q[]) bank[q.id] = q;
  const scenes = JSON.parse(readFileSync(join(SEQ, 'scenes.json'), 'utf8')) as {
    decors: { id: string; rows: [string, string][]; cols: [string, string][] }[];
    objects: { id: string; es: string }[];
  };
  return { bank, scenes };
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Répond à la question affichée. Renvoie le mode, ou null s'il n'y a pas de question à l'écran. */
export async function answerCurrent(page: Page, data: ReturnType<typeof loadBank>, wrong = false): Promise<string | null> {
  const qa = page.locator('.qa[data-qid]:not(:has(.fb))').first();
  if (!(await qa.count())) return null;
  const id = (await qa.getAttribute('data-qid'))!;
  const mode = (await qa.getAttribute('data-mode'))!;
  const q = data.bank[id];
  if (!q) throw new Error(`question inconnue ${id}`);
  const scope = page.locator(`.qa[data-qid="${id}"]`);
  if (mode === 'qcm') {
    for (const o of await scope.locator('.op:not([disabled])').all()) {
      const t = (await o.textContent())!.slice(1);
      if ((t === q.answer) !== wrong) {
        await o.click();
        break;
      }
    }
  } else if (mode === 'write') {
    await scope.locator('.escr input').fill(wrong ? 'zzz' : q.answer!);
    await scope.locator('.escr button[type=submit]').click();
  } else if (mode === 'tf') {
    await scope.locator((q.answer === 'verdadero') !== wrong ? '.vf-si' : '.vf-no').click();
  } else if (mode === 'order') {
    const toks = q.tokens ?? q.answer!.split(/\s+/);
    for (const t of wrong ? [...toks].reverse() : toks) await scope.locator('.banco .ficha', { hasText: new RegExp(`^${esc(t)}$`) }).first().click();
    await scope.locator('.tablero .btn').first().click();
  } else if (mode === 'match') {
    const imgs = q.pairs!.map(p => p[1]);
    for (let i = 0; i < q.pairs!.length; i++) {
      await scope.locator('.palabra', { hasText: q.pairs![i][0] }).first().click();
      await scope.locator(`.imagen[data-img="${wrong ? imgs[(i + 1) % imgs.length] : q.pairs![i][1]}"]`).click();
    }
    await scope.locator('.tablero .btn').first().click();
  } else if (mode === 'place') {
    const decor = data.scenes.decors.find(d => d.id === q.scene!.decor)!;
    const free = new Set(decor.rows.flatMap(r => decor.cols.map(c => `${r[0]}|${c[0]}`)));
    for (const it of q.scene!.items) if (it.row && it.col) free.delete(`${it.row}|${it.col}`);
    const items = q.scene!.items;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const target = wrong ? items[(i + 1) % items.length] : it;
      let cell = target.row && target.col ? `${target.row}|${target.col}` : null;
      if (!cell) {
        cell = [...free].find(c => c.endsWith(`|${target.col}`)) ?? [...free][0];
        free.delete(cell);
      }
      const es = data.scenes.objects.find(o => o.id === it.object)!.es;
      await scope.locator('.pieza', { hasText: es }).first().click();
      await scope.locator(`.celda[data-cell="${cell}"]`).click();
    }
    await scope.locator('.tablero .pie .btn').click();
  }
  return mode;
}

/** Joue toutes les salles jusqu'à l'écran de fin. Renvoie les modes de réponse rencontrés. */
export async function playToEnd(page: Page, data: ReturnType<typeof loadBank>, wrongEvery = 7): Promise<Record<string, number>> {
  const modes: Record<string, number> = {};
  let n = 0;
  for (let step = 0; step < 4000; step++) {
    if (await page.locator('.stats').count()) return modes;
    if (await page.locator('.mapa').count()) {
      await page.locator('.sala.puede').first().click();
      continue;
    }
    const choice = page.locator('.eleccion:not([disabled])');
    if (await choice.count()) {
      await choice.first().click();
      continue;
    }
    const open = page.locator('button:has-text("Ouvrir le coffre"), button:has-text("Essayer d’ouvrir")');
    if (await open.count()) {
      await open.first().click();
      continue;
    }
    const mode = await answerCurrent(page, data, ++n % wrongEvery === 0);
    if (mode) {
      modes[mode] = (modes[mode] ?? 0) + 1;
      continue;
    }
    n--;
    const next = page.locator('.fb .btn, .resultado .btn');
    if (await next.count()) {
      await next.first().click();
      continue;
    }
    if (await page.locator('.ofrenda-dibujo').count()) {
      await page.locator('.elige .item:not([disabled])').first().click();
      continue;
    }
    if (await page.locator('h2:has-text("Choisis"), h2:has-text("choisis")').count()) {
      await page.locator('.elige .item').first().click();
      continue;
    }
    const leave = page.locator('button:has-text("Reprendre le chemin")');
    if (await leave.count()) {
      await leave.click();
      continue;
    }
    await page.waitForTimeout(40);
  }
  throw new Error('la partie ne s’est pas terminée');
}
