import { defineConfig, devices } from '@playwright/test';

/** Test de bout en bout sur la version construite (npm run build), comme en ligne. */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 240_000,
  fullyParallel: false,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4173/', trace: 'off' },
  webServer: { command: 'npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173/', reuseExistingServer: true },
  projects: [
    { name: 'ordinateur', use: { ...devices['Desktop Chrome'] } },
    { name: 'telephone', use: { ...devices['Pixel 7'] }, grep: /partie entière|partie courte|clavier|captures/ },
  ],
});
