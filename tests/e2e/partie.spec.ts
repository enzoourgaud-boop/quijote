import { expect, test } from '@playwright/test';
import { answerCurrent, loadBank, playToEnd } from './helpers';

const data = loadBank();

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => localStorage.setItem('molinos:prefs', JSON.stringify({ sound: false, petals: false, motion: 'reduced' })));
  await page.reload();
});

test('une partie entière, du profil jusqu’au code de fin', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await expect(page.getByRole('heading', { name: '¿Quién juega?' })).toBeVisible();
  await page.fill('#pseudo', 'Bot');
  await page.click('text=Créer et jouer');
  await page.fill('input[placeholder="au hasard"]', 'MOLINO-42');
  await page.getByRole('button', { name: 'Commencer le chemin' }).click();
  const modes = await playToEnd(page, data);
  await expect(page.locator('h1')).toHaveText('¡Felicidades!');
  // le code de fin est affiché, avec son QR
  await expect(page.locator('.codigo')).toHaveText(/^[0-9A-Z]{5}-[0-9A-Z]{5}-[0-9A-Z]{5}-[0-9A-Z]{4}$/);
  await expect(page.locator('svg.qr')).toBeVisible();
  // nouveautés débloquées
  await expect(page.locator('.desbloqueos')).toContainText('Nivel de caballero 1');
  // plusieurs façons de répondre ont été utilisées
  expect(Object.keys(modes).length).toBeGreaterThanOrEqual(4);
  expect(errors).toEqual([]);
  // la collection et le carnet sont remplis
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.getByRole('button', { name: /Álbum \d+\/42/ })).not.toHaveText(/Álbum 0\//);
});

test('une partie courte entière (les trois actes raccourcis)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.fill('#pseudo', 'Bot');
  await page.click('text=Créer et jouer');
  await page.fill('input[placeholder="au hasard"]', 'LANZA-21');
  await page.getByLabel(/Partie courte/).check();
  await page.getByRole('button', { name: 'Commencer le chemin' }).click();
  await playToEnd(page, data);
  await expect(page.locator('.stats')).toBeVisible();
  expect(errors).toEqual([]);
});

test('l’élève choisit ce qu’il veut travailler', async ({ page }) => {
  await page.fill('#pseudo', 'Bot');
  await page.click('text=Créer et jouer');
  await page.locator('.temas-eleccion label:has-text("Conjugación") input').check();
  await expect(page.locator('.temas-eleccion')).toContainText('seulement sur : Conjugación');
  await page.getByRole('button', { name: 'Commencer le chemin' }).click();
  await page.locator('.sala.puede').first().click();
  for (let i = 0; i < 4; i++) {
    await expect(page.locator('.qa .tag').first()).toHaveText('Conjugación');
    await answerCurrent(page, data);
    const next = page.locator('.combate .fb .btn');
    if (await next.count()) await next.click();
    if (!(await page.locator('.combate .qa[data-qid]').count())) break;
  }
});

test('espace professeur : code de classe appliqué côté élève', async ({ page, context }) => {
  await page.goto('./#prof');
  await page.fill('#prof-code', 'profe2026');
  await page.click('text=Entrer');
  await page.locator('label.check:has-text("Vocabulario") input').click();
  await page.locator('label.check:has-text("Activer le chrono") input').click();
  const code = (await page.locator('.codigo').textContent())!.trim();
  const eleve = await context.newPage();
  await eleve.goto(`./#classe-${code}`);
  await eleve.fill('#pseudo', 'Élève');
  await eleve.click('text=Créer et jouer');
  await expect(eleve.locator('.clase')).toContainText('Avec chrono');
  await eleve.getByRole('button', { name: 'Commencer le chemin' }).click();
  await eleve.locator('.sala.puede').first().click();
  await expect(eleve.locator('.qa .tag')).not.toHaveText('Vocabulario');
  await expect(eleve.locator('.crono')).toHaveCount(1); // le professeur a activé le chrono (coupé par défaut)
});

test('le jeu fonctionne hors ligne une fois chargé', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'service worker testé sous Chromium');
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await page.fill('#pseudo', 'Hors ligne');
  await page.click('text=Créer et jouer');
  await page.getByRole('button', { name: 'Commencer le chemin' }).click();
  await page.locator('.sala.puede').first().click();
  await expect(page.locator('.qa[data-qid]')).toBeVisible();
  await context.setOffline(false);
});

test('navigation au clavier : options et première question', async ({ page }) => {
  await page.fill('#pseudo', 'Clavier');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: /Options/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Options' })).toBeVisible();
  await expect(page.locator('.opciones-panel input').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Commencer le chemin' }).focus();
  await page.keyboard.press('Enter');
  // la première salle accessible a le focus : Entrée y entre
  await expect(page.locator('.sala.puede').first()).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.qa[data-qid]')).toBeVisible();
});

/* ======================= Version 1.1 ======================= */

async function startRun(page: import('@playwright/test').Page, seed: string, pseudo = 'Bot') {
  await page.fill('#pseudo', pseudo);
  await page.click('text=Créer et jouer');
  await page.fill('input[placeholder="au hasard"]', seed);
  await page.getByRole('button', { name: 'Commencer le chemin' }).click();
}

/** Part visible d'un élément dans la fenêtre (0 à 1), et position de son bas. */
const VISIBLE = `(sel) => {
  var els = Array.from(document.querySelectorAll(sel)).filter(function (e) { return e.offsetParent !== null; });
  var el = els[els.length - 1];
  if (!el) return null;
  var r = el.getBoundingClientRect();
  var h = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
  return { ratio: r.height ? h / r.height : 0, inside: r.top >= 0 && r.bottom <= innerHeight + 1 };
}`;
const visible = (page: import('@playwright/test').Page, sel: string) =>
  page.evaluate(`(${VISIBLE})(${JSON.stringify(sel)})`) as Promise<{ ratio: number; inside: boolean } | null>;

const CONTROLS: Record<string, string> = {
  qcm: '.combate .ops .op', tf: '.combate .vf .op', write: '.combate .escr button', order: '.combate .tablero .btn', match: '.combate .tablero .btn', place: '.combate .tablero .pie .btn',
};

for (const [name, w, h] of [['PC de collège', 1366, 768], ['PC, fenêtre basse', 1366, 625], ['tablette', 768, 1024], ['téléphone', 360, 640]] as const) {
  test(`le combat tient à l’écran : ${name} (${w} × ${h})`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await startRun(page, `ECRAN-${w}`);
    const seen: Record<string, number> = {};
    let n = 0, simple = 0, simpleOk = 0;
    for (let step = 0; step < 400 && n < 24; step++) {
      if (await page.locator('.stats').count()) break;
      if (await page.locator('.mapa').count()) {
        // de préférence un combat
        const fights = page.locator('.sala.puede.combat, .sala.puede.elite, .sala.puede.boss');
        await ((await fights.count()) ? fights.first() : page.locator('.sala.puede').first()).click();
        continue;
      }
      const qa = page.locator('.combate .qa[data-qid]:not(:has(.fb))');
      if (await qa.count()) {
        const mode = (await qa.getAttribute('data-mode'))!;
        const ctrl = await visible(page, CONTROLS[mode]);
        expect(ctrl, `contrôle de réponse (${mode})`).not.toBeNull();
        // QCM, vrai/faux, écrit : on répond sans défiler (toujours sur PC et tablette, presque toujours sur téléphone)
        if (mode === 'qcm' || mode === 'tf' || mode === 'write') {
          simple++;
          if (ctrl!.inside) simpleOk++;
          else if (w >= 700) expect(ctrl!.inside, `réponse visible sans défiler (${mode}, question ${n + 1})`).toBe(true);
        }
        // s'il faut défiler jusqu'au bouton (plateaux, longues questions sur téléphone), la scène de combat reste à l'écran
        if (!ctrl!.inside) await page.locator(CONTROLS[mode]).last().scrollIntoViewIfNeeded();
        expect((await visible(page, '.escenario'))!.ratio, `scène visible en répondant (${mode})`).toBeGreaterThan(0.8);
        await answerCurrent(page, data, n % 3 === 1);
        await expect(page.locator('.combate .fb .btn')).toBeVisible();
        await page.waitForTimeout(150);
        expect((await visible(page, '.combate .fb .btn'))!.inside, `« Continuer » visible (${mode})`).toBe(true);
        expect((await visible(page, '.escenario'))!.ratio, `scène visible au retour (${mode})`).toBeGreaterThan(0.8);
        seen[mode] = (seen[mode] ?? 0) + 1;
        n++;
        await page.locator('.combate .fb .btn').click();
        continue;
      }
      if (await answerCurrent(page, data)) continue;
      const next = page.locator('.fb .btn, .resultado .btn, .elige .item:not([disabled]), .eleccion:not([disabled]), button:has-text("Ouvrir le coffre"), button:has-text("Essayer d’ouvrir"), button:has-text("Reprendre le chemin")');
      if (await next.count()) await next.first().click();
      else await page.waitForTimeout(40);
    }
    expect(n).toBeGreaterThanOrEqual(15);
    expect(Object.keys(seen).length).toBeGreaterThanOrEqual(3);
    expect(simpleOk / simple, 'part des questions simples répondues sans défiler').toBeGreaterThanOrEqual(0.9);
  });
}

test('le chrono se coupe en cours de partie et s’arrête quand les options sont ouvertes', async ({ page }) => {
  await startRun(page, 'CHRONO-11');
  // le chrono est coupé par défaut : on l'active d'abord dans les options
  await page.getByRole('button', { name: /Options/ }).click();
  await page.locator('label:has-text("Chrono") input[type=checkbox]').check();
  await page.keyboard.press('Escape');
  await page.locator('.sala.puede').first().click();
  const crono = page.locator('.crono');
  await expect(crono).toBeVisible();
  const seconds = async () => Number(((await crono.locator('b').textContent()) ?? '').replace(/\D/g, ''));
  // options ouvertes : le temps ne s'écoule plus
  await page.getByRole('button', { name: /Options/ }).click();
  await expect(page.getByRole('dialog', { name: 'Options' })).toBeVisible();
  const before = await seconds();
  await page.waitForTimeout(2600);
  expect(await seconds()).toBe(before);
  // chrono décoché : il disparaît tout de suite, et ne revient pas à la question suivante
  await page.locator('label:has-text("Chrono") input[type=checkbox]').uncheck();
  await expect(crono).toHaveCount(0);
  await page.keyboard.press('Escape');
  await answerCurrent(page, data);
  await page.locator('.combate .fb .btn').click();
  if (await page.locator('.combate .qa[data-qid]').count()) await expect(crono).toHaveCount(0);
});

test('páginas perdidas : les questions ratées attendent au début de la partie suivante', async ({ page }) => {
  await startRun(page, 'ALMAS-11');
  await page.locator('.sala.puede').first().click();
  // deux erreurs, puis retour au menu
  const missed: string[] = [];
  for (let k = 0; k < 2; k++) {
    if (!(await page.locator('.combate .qa[data-qid]:not(:has(.fb))').count())) break;
    missed.push((await page.locator('.combate .qa').getAttribute('data-qid'))!);
    await answerCurrent(page, data, true);
    await expect(page.locator('.hud .chip.almas')).toContainText(String(k + 1));
    await page.locator('.combate .fb .btn').click();
  }
  expect(missed.length).toBe(2);
  await page.getByRole('button', { name: /Revenir au menu/ }).click();
  await expect(page.locator('.almas-aviso')).toContainText('2 páginas perdidas');
  // nouvelle partie : l'échauffement propose ces deux questions
  await page.getByRole('button', { name: 'Nouvelle partie' }).click();
  await expect(page.getByRole('heading', { name: 'Tus páginas perdidas' })).toBeVisible();
  const first = (await page.locator('.qa.quiz').getAttribute('data-qid'))!;
  expect(missed).toContain(first);
  await answerCurrent(page, data);
  await expect(page.locator('.calentamiento .fb')).toContainText('Página recuperada');
  await expect(page.locator('.calentamiento')).toContainText('16 PV');
  await page.getByRole('button', { name: 'Page suivante' }).click();
  await answerCurrent(page, data, true);
  await page.getByRole('button', { name: 'Commencer le chemin' }).click();
  // sur la carte : 16 PV au lieu de 15, et une âme attend encore
  await expect(page.locator('.mapa')).toBeVisible();
  await expect(page.locator('.hud')).toContainText('16/16');
  await expect(page.locator('.hud .chip.almas')).toContainText('1');
});
