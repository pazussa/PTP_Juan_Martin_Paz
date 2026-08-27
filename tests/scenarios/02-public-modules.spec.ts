import { test } from '../../fixtures/fixtures';
import { catalogModules } from '../../test-data/catalogs';
import { createUnknownTrackingNumber } from '../../test-data/pqrs';

test.describe(
  'E02 - Catálogos y servicio PQRS',
  { tag: ['@client', '@public', '@catalog', '@pqrs', '@smoke'] },
  () => {
    test.describe.configure({ timeout: 150_000 });

    test('los cinco catálogos publican productos y PQRS consulta un radicado no existente', async ({
      catalogPage,
      pqrsPage,
    }) => {
      for (const [index, catalog] of catalogModules.entries()) {
        await test.step(
          `Paso 1.${index + 1}: Abrir ${catalog.name} y validar productos navegables`,
          async () => {
            await catalogPage.open(catalog);
            await catalogPage.expectLoaded(catalog);
            await catalogPage.expectCommonShell();
            await catalogPage.openFirstProduct(catalog);
          },
        );
      }

      const trackingNumber = createUnknownTrackingNumber();

      await test.step('Paso 2: Abrir PQRS y validar controles, fecha y adjuntos', async () => {
        await pqrsPage.open();
        await pqrsPage.expectLoaded();
      });

      await test.step('Paso 3: Validar tipos de documento, solicitudes y causales', async () => {
        await pqrsPage.expectAvailableOptions();
      });

      await test.step(
        `Paso 4: Consultar el radicado numérico no existente ${trackingNumber}`,
        async () => {
          await pqrsPage.queryUnknownTrackingNumber(trackingNumber);
        },
      );
    });
  },
);
