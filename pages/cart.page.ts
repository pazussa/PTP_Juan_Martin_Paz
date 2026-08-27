import { expect, type Locator, type Page } from '@playwright/test';
import { giftCard } from '../test-data/products';
import { BasePage } from './base.page';

export class CartPage extends BasePage {
  readonly checkoutLink: Locator;
  readonly emptyCartHeading: Locator;
  readonly cartRemovalConfirmation: Locator;

  constructor(page: Page) {
    super(page);
    this.checkoutLink = this.root.getByRole('link', {
      name: 'Finalizar compra',
      exact: true,
    });
    this.emptyCartHeading = page.getByRole('heading', {
      name: 'Tu carrito está vacío',
      exact: true,
    });
    this.cartRemovalConfirmation = page
      .getByRole('alert')
      .filter({ hasText: 'eliminado' });
  }

  async open(): Promise<void> {
    await this.goto('/carrito/');
  }

  async expectGiftCardReadyForCheckout(): Promise<void> {
    const cartRow = this.giftCardCartRow();

    await expect(this.page, 'el carrito abre su URL canónica').toHaveURL(/\/carrito\/?$/);
    await expect(
      this.cartItemRows(),
      'el carrito contiene exactamente un producto antes del checkout',
    ).toHaveCount(1);
    await expect(
      cartRow,
      'el carrito contiene una sola fila para el bono técnico',
    ).toHaveCount(1);
    await expect(
      this.giftCardTextLink(),
      'el carrito identifica el bono de regalo de $50.000',
    ).toBeVisible();
    await expect(
      cartRow.locator('input[name$="[qty]"]').filter({ visible: true }),
      'el carrito conserva una unidad del bono técnico',
    ).toHaveValue('1');
    await expect(
      cartRow,
      'la fila del bono conserva el precio de $50.000',
    ).toContainText(/\$50[.,]000/);
    await expect(
      this.checkoutLink,
      'el carrito permite continuar al checkout',
    ).toHaveAttribute('href', /\/finalizar-compra\/?$/);
  }

  async continueToCheckout(): Promise<void> {
    await this.followLink(this.checkoutLink);
    await expect(this.page, 'Finalizar compra abre su URL canónica').toHaveURL(
      /\/finalizar-compra\/?$/,
    );
  }

  async removeGiftCardIfPresent(): Promise<void> {
    if (!/\/carrito\/?$/.test(this.page.url())) {
      await this.open();
    }

    const cartRow = this.giftCardCartRow();
    const removeLink = cartRow.getByRole('link', {
      name: /^(?:Remove this item|Eliminar este artículo)$/i,
    });

    const state = await this.waitForGiftCardCartState();
    if (state === 'empty') {
      return;
    }

    await expect(cartRow, 'la fila técnica existe antes de retirarla').toHaveCount(1);
    await expect(removeLink, 'la fila técnica ofrece una sola acción de retiro').toHaveCount(1);

    const currentOrigin = new URL(this.page.url()).origin;
    const [removalResponse] = await Promise.all([
      this.page.waitForResponse((response) => {
        const responseUrl = new URL(response.url());
        return (
          responseUrl.origin === currentOrigin &&
          (responseUrl.searchParams.has('remove_item') ||
            responseUrl.searchParams.get('wc-ajax') === 'remove_from_cart')
        );
      }),
      removeLink.click(),
    ]);

    expect(
      removalResponse.status(),
      'el servidor acepta la solicitud para retirar el bono técnico',
    ).toBeLessThan(400);
    await expect(
      this.cartRemovalConfirmation,
      'el sitio confirma que el bono técnico fue eliminado',
    ).toContainText(/Bono de regalo[\s\S]*eliminado/i);
    await expect(cartRow, 'la fila del bono se retira del carrito').toHaveCount(0);
    await expect(
      this.emptyCartHeading,
      'el carrito queda vacío después de retirar el bono técnico',
    ).toBeVisible();
  }

  private giftCardTextLink(): Locator {
    return this.page
      .getByRole('link', { name: giftCard.name, exact: true })
      .filter({ hasNot: this.page.locator('img') });
  }

  private giftCardCartRow(): Locator {
    return this.page
      .getByRole('row')
      .filter({ has: this.giftCardTextLink() })
      .filter({
        has: this.page.getByRole('link', {
          name: /^(?:Remove this item|Eliminar este artículo)$/i,
        }),
      });
  }

  private cartItemRows(): Locator {
    return this.page.getByRole('row').filter({
      has: this.page.getByRole('link', {
        name: /^(?:Remove this item|Eliminar este artículo)$/i,
      }),
    });
  }

  // Público: GiftCardPage lo consulta antes de reintentar el alta al carrito.
  async waitForGiftCardCartState(): Promise<'present' | 'empty'> {
    const cartRow = this.giftCardCartRow();
    const cartState: { value: 'loading' | 'present' | 'empty' } = { value: 'loading' };

    await expect
      .poll(
        async () => {
          if ((await cartRow.count()) === 1 && (await cartRow.isVisible())) {
            cartState.value = 'present';
          } else if (await this.emptyCartHeading.isVisible()) {
            cartState.value = 'empty';
          }
          return cartState.value;
        },
        'el carrito termina de mostrar el bono técnico o el estado vacío',
      )
      .toMatch(/^(?:present|empty)$/);

    return cartState.value as 'present' | 'empty';
  }
}
