const path = require('node:path');
const dotenv = require('dotenv');
const { chromium, errors, expect } = require('@playwright/test');

dotenv.config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });

function redactError(error) {
  let output = error instanceof Error ? (error.stack ?? error.message) : String(error);

  for (const secret of [process.env.LOGIN_DOCUMENT, process.env.LOGIN_PASSWORD]) {
    if (secret) {
      output = output.split(secret).join('[DATO REDACTADO]');
    }
  }

  return output;
}

async function navigateOnce(page, url) {
  let networkChanged = false;
  const mainFrame = page.mainFrame();
  const observeFailedNavigation = (request) => {
    if (!request.isNavigationRequest() || request.frame() !== mainFrame) {
      return;
    }
    networkChanged =
      networkChanged ||
      Boolean(request.failure()?.errorText.includes('ERR_NETWORK_CHANGED'));
  };

  page.on('requestfailed', observeFailedNavigation);
  try {
    return await page.goto(url, { waitUntil: 'domcontentloaded' });
  } catch (error) {
    if (networkChanged && !String(error).includes('ERR_NETWORK_CHANGED')) {
      throw new Error(`${String(error)}\nCausa de transporte: ERR_NETWORK_CHANGED`, {
        cause: error,
      });
    }
    throw error;
  } finally {
    page.off('requestfailed', observeFailedNavigation);
  }
}

async function navigateWithNetworkRetry(page, url) {
  try {
    return await navigateOnce(page, url);
  } catch (error) {
    if (!String(error).includes('ERR_NETWORK_CHANGED')) {
      throw error;
    }
    return navigateOnce(page, url);
  }
}

async function main() {
  const baseURL = process.env.BASE_URL;
  const document = process.env.LOGIN_DOCUMENT;
  const password = process.env.LOGIN_PASSWORD;

  if (!baseURL) {
    throw new Error('Falta BASE_URL en .env');
  }

  const url = process.argv[2] || baseURL;
  const browser = await chromium.launch({
    headless: false,
    args: ['--remote-debugging-port=9222'],
  });
  const context = await browser.newContext({
    baseURL,
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
  });
  const page = await context.newPage();

  await navigateWithNetworkRetry(page, url);

  const acceptCookies = page.getByRole('button', {
    name: /^(?:Aceptar todo|Accept all)$/i,
  });
  try {
    await acceptCookies.click({ timeout: 5_000 });
  } catch (error) {
    if (!(error instanceof errors.TimeoutError)) {
      throw error;
    }
  }

  const consentDialog = page.getByRole('dialog').filter({ has: acceptCookies });
  await page.addLocatorHandler(consentDialog, async () => {
    await consentDialog
      .getByRole('button', { name: /^(?:Aceptar todo|Accept all)$/i })
      .click();
  });

  if (document && password && page.url().includes('/mi-cuenta')) {
    const documentField = page.locator('#username');
    const passwordField = page.locator('#password');

    await documentField.fill(document);
    await passwordField.fill(password);
    await expect
      .poll(async () => (await passwordField.inputValue()) === password, {
        message: 'la contraseña queda en el campo correcto sin exponer su valor',
      })
      .toBe(true);
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
  }

  console.log('Inspector abierto. En otra terminal ejecuta:');
  console.log('  playwright-cli attach --cdp=http://127.0.0.1:9222');
  console.log('  playwright-cli snapshot');
  console.log('Al terminar usa playwright-cli detach.');

  await page.pause();
  await context.close();
  await browser.close();
}

main().catch((error) => {
  console.error('No se pudo abrir el inspector:', redactError(error));
  process.exitCode = 1;
});
