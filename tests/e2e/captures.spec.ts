/**
 * Captures d'écran pour le résumé d'étape (pas un test) : CAPTURES=docs/etape-1 npx playwright test captures
 * (ajouter COURT=1 pour jouer une partie courte)
 * Joue une partie et photographie la première occurrence de chaque écran.
 */
import { mkdirSync } from 'node:fs';
import { test } from '@playwright/test';
import { answerCurrent, loadBank } from './helpers';

const DIR = process.env.CAPTURES;
const data = loadBank();
const MODES: Record<string, string> = { qcm: 'qcm', write: 'ecrit', order: 'ordre', match: 'association', place: 'scene', tf: 'vrai-faux' };

test('captures d’écran', async ({ page }, info) => {
  test.skip(!DIR, 'captures seulement sur demande (variable CAPTURES)');
  test.setTimeout(600_000);
  const dev = info.project.name === 'telephone' ? 'telephone' : 'pc';
  mkdirSync(DIR!, { recursive: true });
  let k = 0;
  const shot = async (name: string) => page.screenshot({ path: `${DIR}/${String(++k).padStart(2, '0')}-${dev}-${name}.jpg`, type: 'jpeg', quality: 80 });
  const seen = new Set<string>();
  const once = async (name: string) => {
    if (seen.has(name)) return;
    seen.add(name);
    await page.waitForTimeout(1200); // laisse finir l'animation d'entrée du combat
    await shot(name);
  };

  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => localStorage.setItem('molinos:prefs', JSON.stringify({ sound: false, petals: true, motion: 'reduced' })));
  await page.reload();
  await page.fill('#pseudo', 'Lector');
  await page.click('text=Créer et jouer');
  await page.fill('input[placeholder="au hasard"]', 'MOLINO-42');
  // COURT=1 : partie courte
  if (process.env.COURT) await page.getByLabel(/Partie courte/).check();
  await once('accueil');
  await page.getByRole('button', { name: 'Commencer le chemin' }).click();

  let n = 0;
  for (let step = 0; step < 4000; step++) {
    if (await page.locator('.stats').count()) break;
    if (await page.locator('.mapa').count()) {
      await once('carte');
      await page.locator('.sala.puede').first().click();
      continue;
    }
    const choice = page.locator('.eleccion:not([disabled])');
    if (await choice.count()) {
      await once('rencontre');
      await choice.first().click();
      continue;
    }
    const open = page.locator('button:has-text("Ouvrir le coffre"), button:has-text("Essayer d’ouvrir")');
    if (await open.count()) {
      await open.first().click();
      continue;
    }
    const qa = page.locator('.qa[data-qid]:not(:has(.fb))').first();
    if (await qa.count()) {
      const mode = (await qa.getAttribute('data-mode'))!;
      const qid = (await qa.getAttribute('data-qid'))!;
      const inFight = (await page.locator('.batalla').count()) > 0;
      if (inFight && MODES[mode]) await once(`combat-${data.bank[qid]?.type === 'ecoute' ? 'ecoute' : MODES[mode]}`);
      const wrong = ++n % 6 === 0;
      await answerCurrent(page, data, wrong);
      if (wrong && inFight) await once('correction');
      continue;
    }
    const next = page.locator('.fb .btn, .resultado .btn');
    if (await next.count()) {
      await next.first().click();
      continue;
    }
    if (await page.locator('.ofrenda-dibujo').count()) {
      await once('repos');
      await page.locator('.elige .item:not([disabled])').first().click();
      continue;
    }
    if (await page.locator('h2:has-text("Choisis"), h2:has-text("choisis")').count()) {
      await once('recompense');
      await page.locator('.elige .item').first().click();
      continue;
    }
    const leave = page.locator('button:has-text("Reprendre le chemin")');
    if (await leave.count()) {
      await once('boutique');
      await leave.click();
      continue;
    }
    await page.waitForTimeout(40);
    // sur téléphone, quelques écrans suffisent
    if (dev === 'telephone' && seen.size >= 6) break;
  }
  if (await page.locator('.stats').count()) await once('fin');
});
