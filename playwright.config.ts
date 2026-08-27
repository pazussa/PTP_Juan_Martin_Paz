import { defineConfig, devices, type VideoMode } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'node:path';
import { authStatePath } from './test-data/runtime';

dotenv.config({ path: path.resolve(__dirname, '.env'), quiet: true });

const supportedVideoModes = new Set<VideoMode>([
  'off',
  'on',
  'retain-on-failure',
  'on-first-retry',
]);
const requestedVideoMode = process.env.VIDEO ?? 'on';
if (!supportedVideoModes.has(requestedVideoMode as VideoMode)) {
  throw new Error(
    `VIDEO debe ser uno de estos valores: ${[...supportedVideoModes].join(', ')}.`,
  );
}
const videoMode = requestedVideoMode as VideoMode;

const baseURL = process.env.BASE_URL ?? 'https://www.bon-bonite.com';
const parsedBaseURL = new URL(baseURL);
if (!['http:', 'https:'].includes(parsedBaseURL.protocol)) {
  throw new Error('BASE_URL debe utilizar el protocolo http o https.');
}

const slowMo = Number(process.env.SLOWMO ?? 0);
if (!Number.isFinite(slowMo) || slowMo < 0) {
  throw new Error('SLOWMO debe ser un número mayor o igual que cero.');
}

const isCi = process.env.CI === '1';
const isPurchaseRun = process.env.RUN_PURCHASE_TESTS === '1';
const isMutatingRun = process.env.RUN_MUTATING_TESTS === '1' || isPurchaseRun;

export default defineConfig({
  globalSetup: './fixtures/global-setup.ts',
  testDir: './tests',
  outputDir: './test-results',
  preserveOutput: 'always',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  // El destino es producción y aplica rate limiting: la serialización es deliberada.
  fullyParallel: false,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  workers: 1,
  // Los pasos internos del reporte HTML registran valores de fill(), incluidas
  // contraseñas. Las corridas mutantes conservan consola/video, pero no HTML/trace.
  reporter: isMutatingRun
    ? [['list']]
    : [
        ['list'],
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
      ],
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    headless: process.env.HEADLESS === '1',
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure',
    trace: isMutatingRun ? 'off' : 'on-first-retry',
    video: {
      mode: videoMode,
      size: { width: 1280, height: 720 },
    },
    launchOptions: {
      slowMo,
    },
  },
  projects: [
    {
      name: 'account-setup',
      testMatch: /01-account-lifecycle\.spec\.ts/,
      retries: 0,
    },
    {
      name: 'public-chromium',
      testMatch: /02-public-modules\.spec\.ts/,
    },
    {
      name: 'purchase-chromium',
      testMatch: /03-gift-card-purchase\.spec\.ts/,
      dependencies: ['account-setup'],
      retries: 0,
      use: {
        storageState: authStatePath,
      },
    },
  ],
});
