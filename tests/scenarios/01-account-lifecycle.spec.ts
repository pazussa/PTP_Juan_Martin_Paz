import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from '../../fixtures/fixtures';
import { createUniqueAccount, toSafeCustomerContext } from '../../test-data/account';
import {
  assertNoUnresolvedPurchaseIntent,
  authStatePath,
  customerContextPath,
} from '../../test-data/runtime';

test.describe(
  'E01 - Registro, login y administración de cuenta',
  { tag: ['@client', '@account', '@mutating'] },
  () => {
    test.describe.configure({ mode: 'serial', retries: 0 });
    test.skip(
      process.env.RUN_MUTATING_TESTS !== '1' && process.env.RUN_PURCHASE_TESTS !== '1',
      'RUN_MUTATING_TESTS=1 o RUN_PURCHASE_TESTS=1 habilita la cuenta técnica.',
    );

    test('un cliente nuevo se registra, vuelve a ingresar y modifica sus datos', async ({
      accountPage,
      page,
    }, testInfo) => {
      await assertNoUnresolvedPurchaseIntent();
      const account = createUniqueAccount(testInfo.workerIndex);
      const safeCustomer = toSafeCustomerContext(account);
      const plannedAccountPath = testInfo.outputPath('cuenta-tecnica-planeada.json');
      const plannedAccount = JSON.stringify(
        {
          document: safeCustomer.registration.document,
          purpose: safeCustomer.purpose,
        },
        null,
        2,
      );

      await writeFile(plannedAccountPath, plannedAccount, 'utf8');
      await testInfo.attach('cuenta-tecnica-planeada', {
        path: plannedAccountPath,
        contentType: 'application/json',
      });

      await test.step('Paso 1: Validar el acceso público y los requisitos de registro', async () => {
        await accountPage.open();
        await accountPage.expectGuestAccess();
        await accountPage.showRegistration();
        await accountPage.expectRegistrationRequirements();
        await accountPage.expectRegistrationPasswordRules();
      });

      await test.step(
        `Paso 2: Registrar la cédula técnica ${safeCustomer.registration.document} y volver a iniciar sesión`,
        async () => {
          await accountPage.register(account.registration);
        },
      );

      await test.step('Paso 3: Abrir Datos de la cuenta recién registrada', async () => {
        await accountPage.openPersonalData();
      });

      await test.step(
        `Paso 4: Modificar nombre, apellido, fecha, género y teléfono ${account.profile.phone}`,
        async () => {
          await accountPage.updateProfile(account.profile);
          await accountPage.expectProfileUpdated(account.profile);
        },
      );

      await test.step('Paso 5: Preparar la sesión autenticada para la compra', async () => {
        await mkdir(path.dirname(authStatePath), { recursive: true });
        await page.context().storageState({ path: authStatePath });
        await writeFile(customerContextPath, JSON.stringify(safeCustomer, null, 2), 'utf8');
      });
    });
  },
);
