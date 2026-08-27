import { writeFile } from 'node:fs/promises';
import type { TestInfo } from '@playwright/test';
import type { SafeCustomerContext } from '../test-data/account';
import { giftCard } from '../test-data/products';
import {
  readCustomerContext,
  recordPurchaseIntent,
  releaseAuthenticatedSession,
} from '../test-data/runtime';
import type { CartPage } from '../pages/cart.page';

/**
 * Ciclo de vida de la orden técnica: constancia del submit, evidencia, limpieza
 * del carrito y borrado de la sesión. Vive fuera del escenario para que este
 * exprese solo pasos de negocio, y su limpieza corre en el teardown de la
 * fixture, de modo que también se aplica cuando el test falla.
 */
export type PurchaseSession = {
  /** Cliente creado por E01, sin contraseña. */
  readonly customer: SafeCustomerContext;
  markGiftCardAdded(): void;
  recordSubmissionAttempt(): Promise<void>;
  markOrderVerified(orderId: string): Promise<void>;
};

export async function withPurchaseSession(
  cartPage: CartPage,
  testInfo: TestInfo,
  use: (session: PurchaseSession) => Promise<void>,
): Promise<void> {
  const customer = await readCustomerContext();
  let giftCardAdded = false;
  let verifiedOrderId = '';

  await use({
    customer,
    markGiftCardAdded: () => {
      giftCardAdded = true;
    },
    recordSubmissionAttempt: () =>
      recordPurchaseIntent(customer.registration.document, giftCard.name),
    markOrderVerified: async (orderId) => {
      verifiedOrderId = orderId;
      await attachOrderEvidence(testInfo, orderId);
    },
  });

  // Sin orden comprobada se conserva la sesión, que permite reconciliar después.
  if (verifiedOrderId === '') {
    if (giftCardAdded) {
      await cartPage.removeGiftCardIfPresent();
    }
    return;
  }

  await releaseAuthenticatedSession();
}

/** Evidencia mínima: nunca credenciales, cookies ni enlaces de pago. */
async function attachOrderEvidence(testInfo: TestInfo, orderId: string): Promise<void> {
  const evidencePath = testInfo.outputPath('orden-tecnica.json');

  await writeFile(
    evidencePath,
    JSON.stringify(
      {
        orderId,
        product: giftCard.name,
        purpose: 'orden automatizada de QA; no despachar y cancelar administrativamente',
      },
      null,
      2,
    ),
    'utf8',
  );
  await testInfo.attach('orden-tecnica', {
    path: evidencePath,
    contentType: 'application/json',
  });
}
