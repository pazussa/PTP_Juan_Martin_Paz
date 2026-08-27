import { test } from '../../fixtures/fixtures';
import { createCheckoutData } from '../../test-data/checkout';
import { assertPurchaseCanProceed } from '../../test-data/runtime';

test.describe(
  'E03 - Orden de compra de un producto',
  { tag: ['@client', '@gift-card', '@purchase', '@mutating'] },
  () => {
    test.describe.configure({ mode: 'serial', retries: 0, timeout: 150_000 });
    test.skip(
      process.env.RUN_PURCHASE_TESTS !== '1',
      'RUN_PURCHASE_TESTS=1 habilita el registro de una orden técnica real.',
    );

    test('el cliente autenticado registra una orden de compra pendiente para un bono de $50.000', async ({
      accountPage,
      cartPage,
      checkoutPage,
      giftCardPage,
      ordersPage,
      purchaseSession,
    }, testInfo) => {
      const { customer } = purchaseSession;
      const checkoutData = createCheckoutData(customer);

      const existingOrderId = await test.step(
        'Paso 1: Confirmar que el cliente modificado continúa autenticado',
        async () => {
          await accountPage.open();
          await accountPage.expectAuthenticatedAccount(customer.profile.firstName);
          return ordersPage.findExistingTechnicalOrderId();
        },
      );

      // La cuenta ya tiene su orden: se valida y no se vuelve a comprar.
      if (existingOrderId !== null) {
        await test.step(
          `Reconciliación: validar la orden ${existingOrderId} sin repetir el pedido`,
          async () => {
            await purchaseSession.markOrderVerified(await ordersPage.expectSingleTechnicalOrder());
          },
        );
        return;
      }

      await assertPurchaseCanProceed();

      await test.step('Paso 2: Preparar el carrito y seleccionar un bono de $50.000', async () => {
        await cartPage.removeGiftCardIfPresent();
        await giftCardPage.openCategory();
        await giftCardPage.expectCategoryLoaded();
        await giftCardPage.openProductFromCategory();
        await giftCardPage.expectProductLoaded();
        purchaseSession.markGiftCardAdded();
        await giftCardPage.addLowestAmountToCart();
      });

      await test.step('Paso 3: Validar producto, cantidad y precio en el carrito', async () => {
        await cartPage.open();
        await cartPage.expectGiftCardReadyForCheckout();
        await cartPage.continueToCheckout();
      });

      await test.step('Paso 4: Completar la facturación técnica en Medellín', async () => {
        await checkoutPage.expectLoaded();
        await checkoutPage.continueAuthenticatedCustomerToBilling();
        await checkoutPage.fillBilling(checkoutData);
        await checkoutPage.continueBillingToPayment();
        await checkoutPage.expectOrderReady();
      });

      // Si el submit pierde su resultado, el error se reporta solo después de
      // comprobar Pedidos: la orden pudo crearse igual.
      let submissionFailure: unknown;
      await test.step(
        'Paso 5: Realizar el pedido una sola vez y entregar el flujo a Wompi',
        async () => {
          await purchaseSession.recordSubmissionAttempt();
          try {
            const submission = await checkoutPage.registerOrderOnce();
            await testInfo.attach('resultado-pasarela', {
              body: Buffer.from(JSON.stringify(submission, null, 2)),
              contentType: 'application/json',
            });
          } catch (error) {
            submissionFailure = error;
          }
        },
      );

      await test.step('Paso 6: Comprobar la orden creada en Mi cuenta > Pedidos', async () => {
        await ordersPage.open();
        await purchaseSession.markOrderVerified(await ordersPage.expectSingleTechnicalOrder());
      });

      if (submissionFailure !== undefined) {
        throw submissionFailure;
      }
    });
  },
);
