import { expect, type Locator, type Page } from '@playwright/test';
import { giftCard } from '../test-data/products';
import { BasePage } from './base.page';
import { CartPage } from './cart.page';

export class GiftCardPage extends BasePage {
  readonly categoryProductLink: Locator;
  readonly productHeading: Locator;
  readonly productForm: Locator;
  readonly amountSelect: Locator;
  readonly quantity: Locator;
  readonly addToCartButton: Locator;
  readonly buyNowLink: Locator;
  readonly cartConfirmation: Locator;
  // El estado del carrito es dominio de CartPage: se delega, no se duplica.
  private readonly cart: CartPage;

  constructor(page: Page) {
    super(page);
    this.cart = new CartPage(page);
    this.categoryProductLink = this.root
      .locator(`a[href$="${giftCard.productPath}"]`)
      .filter({ has: page.locator('img[id^="image-"]') });
    this.productHeading = page.getByRole('heading', { name: 'Bono de regalo', level: 1 });
    this.amountSelect = page.locator('#pa_valor-bono-regalo');
    this.productForm = page.locator('form').filter({ has: this.amountSelect });
    this.quantity = this.productForm.locator('input[name="quantity"]');
    this.addToCartButton = this.productForm.getByRole('button', { name: 'Añadir al carrito' });
    this.buyNowLink = this.productForm.getByRole('link', { name: 'Comprar Ahora' });
    this.cartConfirmation = page
      .getByRole('alert')
      .filter({ hasText: 'se ha añadido a tu carrito' });
  }

  async openCategory(): Promise<void> {
    await this.goto(giftCard.categoryPath);
  }

  async expectCategoryLoaded(): Promise<void> {
    await expect(this.page, 'Bonos de regalo conserva la URL de categoría').toHaveURL(
      /\/categoria-producto\/bonos-de-regalo\/?$/,
    );
    await expect(this.page, 'Bonos de regalo muestra el título de categoría').toHaveTitle(
      'Bonos de regalo – Bon-Bonite Sitio Oficial',
    );
    await expect(
      this.categoryProductLink,
      'la categoría publica una sola tarjeta para el bono de regalo',
    ).toHaveCount(1);
    await expect(
      this.categoryProductLink,
      'la categoría enlaza la ficha Bono de regalo',
    ).toBeVisible();
  }

  async openProductFromCategory(): Promise<void> {
    await this.followLink(this.categoryProductLink);
    await expect(this.page, 'la categoría abre la ficha del bono').toHaveURL(
      /\/producto\/bono-de-regalo\/?$/,
    );
  }

  async expectProductLoaded(): Promise<void> {
    await expect(this.page, 'la ficha muestra el título Bono de regalo').toHaveTitle(
      'Bono de regalo – Bon-Bonite Sitio Oficial',
    );
    await expect(this.productHeading, 'la ficha identifica el producto Bono de regalo').toBeVisible();

    for (const amount of ['$50.000', '$100.000', '$150.000', '$200.000', '$250.000', '$300.000']) {
      await expect(
        this.productForm.getByRole('button', { name: amount, exact: true }),
        `el bono permite elegir la denominación ${amount}`,
      ).toBeVisible();
    }

    await expect(this.quantity, 'el bono inicia con una unidad').toHaveValue('1');
    await expect(this.quantity, 'la cantidad mínima del bono es una unidad').toHaveAttribute(
      'min',
      '1',
    );
  }

  async addLowestAmountToCart(): Promise<void> {
    await this.selectLowestAmount();
    await expect(
      this.addToCartButton,
      'la ficha permite añadir el bono de $50.000 al carrito',
    ).toBeVisible();
    // Su href lo rellena el tema por JavaScript y puede tardar (BB-010). La
    // compra va por "Añadir al carrito", así que basta comprobar que se ofrece.
    await expect(
      this.buyNowLink,
      'la ficha ofrece además la compra directa del bono',
    ).toBeVisible();

    const firstOutcome = await this.submitGiftCard();
    if (firstOutcome === 'confirmed') {
      return;
    }

    // El POST no es idempotente: se consulta el carrito antes de reintentar,
    // por si el primer envío sí llegó al servidor.
    await this.cart.open();
    const cartStateAfterFirstAttempt = await this.cart.waitForGiftCardCartState();
    if (cartStateAfterFirstAttempt === 'present') {
      return;
    }

    await this.goto(giftCard.productPath);
    await expect(
      this.productHeading,
      'la ficha del bono vuelve a estar disponible antes del único reintento seguro',
    ).toBeVisible();
    await this.selectLowestAmount();

    const retryOutcome = await this.submitGiftCard();
    if (retryOutcome === 'confirmed') {
      return;
    }

    await this.cart.open();
    const cartStateAfterRetry = await this.cart.waitForGiftCardCartState();
    expect(
      cartStateAfterRetry,
      'el servidor conserva el bono después del único reintento por ERR_NETWORK_CHANGED',
    ).toBe('present');
  }

  private async selectLowestAmount(): Promise<void> {
    const lowestAmount = this.productForm.getByRole('button', {
      name: giftCard.amountLabel,
      exact: true,
    });

    // El tema enlaza el listener de variaciones tarde; repetir este clic
    // idempotente hasta ver el select evita una espera fija.
    await expect(
      async () => {
        await lowestAmount.click();
        await expect(this.amountSelect).toHaveValue(giftCard.amountValue, { timeout: 1_000 });
      },
      `la denominación seleccionada es ${giftCard.amountLabel}`,
    ).toPass({ intervals: [250, 500, 1_000], timeout: 15_000 });
  }

  private async submitGiftCard(): Promise<'confirmed' | 'network-changed'> {
    const transportErrorHeading = this.page.getByRole('heading', {
      name: /^(?:Se ha interrumpido la conexión|Your connection was interrupted)$/i,
    });
    const outcome: { value: 'waiting' | 'confirmed' | 'network-changed' } = {
      value: 'waiting',
    };

    try {
      await this.addToCartButton.click();
    } catch (error) {
      if (!String(error).includes('ERR_NETWORK_CHANGED')) {
        throw error;
      }
      return 'network-changed';
    }

    await expect
      .poll(
        async () => {
          if (await this.cartConfirmation.isVisible()) {
            outcome.value = 'confirmed';
          } else if (await transportErrorHeading.isVisible()) {
            outcome.value = 'network-changed';
          }
          return outcome.value;
        },
        {
          message: 'el alta del bono confirma el carrito o informa ERR_NETWORK_CHANGED',
          timeout: 15_000,
        },
      )
      .not.toBe('waiting');

    if (outcome.value === 'confirmed') {
      await expect(
        this.cartConfirmation,
        'el sitio confirma que el bono se añadió al carrito',
      ).toContainText(/Bono de regalo[\s\S]*se ha añadido a tu carrito/i);
    }

    return outcome.value as 'confirmed' | 'network-changed';
  }
}
