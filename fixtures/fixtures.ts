import { test as base, expect } from '@playwright/test';
import { withPurchaseSession, type PurchaseSession } from './purchase-session';
import { AccountPage } from '../pages/account.page';
import { CartPage } from '../pages/cart.page';
import { CatalogPage } from '../pages/catalog.page';
import { CheckoutPage } from '../pages/checkout.page';
import { GiftCardPage } from '../pages/gift-card.page';
import { OrdersPage } from '../pages/orders.page';
import { PqrsPage } from '../pages/pqrs.page';

type AppFixtures = {
  cookieConsentHandler: void;
  accountPage: AccountPage;
  cartPage: CartPage;
  catalogPage: CatalogPage;
  checkoutPage: CheckoutPage;
  giftCardPage: GiftCardPage;
  ordersPage: OrdersPage;
  pqrsPage: PqrsPage;
  purchaseSession: PurchaseSession;
};

export const test = base.extend<AppFixtures>({
  cookieConsentHandler: [
    async ({ page }, use) => {
      const acceptCookiesButton = page.getByRole('button', {
        name: /^(?:Aceptar todo|Accept all)$/i,
      });
      const consentDialog = page.getByRole('dialog').filter({ has: acceptCookiesButton });

      await page.addLocatorHandler(consentDialog, async () => {
        await consentDialog
          .getByRole('button', { name: /^(?:Aceptar todo|Accept all)$/i })
          .click();
      });
      await use();
    },
    { auto: true },
  ],
  accountPage: async ({ page }, use) => {
    await use(new AccountPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  catalogPage: async ({ page }, use) => {
    await use(new CatalogPage(page));
  },
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
  giftCardPage: async ({ page }, use) => {
    await use(new GiftCardPage(page));
  },
  ordersPage: async ({ page }, use) => {
    await use(new OrdersPage(page));
  },
  pqrsPage: async ({ page }, use) => {
    await use(new PqrsPage(page));
  },
  // Depende de cartPage: su teardown retira el bono antes de cerrar la página.
  purchaseSession: async ({ cartPage }, use, testInfo) => {
    await withPurchaseSession(cartPage, testInfo, use);
  },
});

export { expect };
