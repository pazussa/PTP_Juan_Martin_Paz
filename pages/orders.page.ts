import { expect, type Locator, type Page } from '@playwright/test';
import { giftCard } from '../test-data/products';
import { BasePage } from './base.page';

/** Historial privado: la única fuente de verdad sobre si una compra se registró. */
export class OrdersPage extends BasePage {
  readonly accountNavigation: Locator;
  readonly ordersLink: Locator;
  readonly emailConfirmationNotice: Locator;

  constructor(page: Page) {
    super(page);
    this.accountNavigation = page.getByRole('navigation', { name: 'Páginas de cuenta' });
    this.ordersLink = this.accountNavigation.getByRole('link', {
      name: 'Pedidos',
      exact: true,
    });
    // Sin `exact`: el elemento contiene además un enlace de verificación.
    this.emailConfirmationNotice = this.root.getByText(
      'Confirma tu dirección de correo electrónico para comprobar si hay pedidos anteriores.',
    );
  }

  async open(): Promise<void> {
    if (!/\/mi-cuenta\/?$/.test(this.page.url())) {
      await this.goto('/mi-cuenta/');
    }

    await expect(
      this.accountNavigation,
      'la cuenta autenticada conserva su navegación privada',
    ).toBeVisible();
    await this.followLink(this.ordersLink);
    await expect(this.page, 'Pedidos abre el historial de la cuenta').toHaveURL(
      /\/mi-cuenta\/orders\/?$/,
    );
    await expect(this.page, 'el historial muestra el título Pedidos').toHaveTitle(
      'Pedidos – Bon-Bonite Sitio Oficial',
    );
  }

  /** Devuelve la orden previa, si la hay, para reconciliar en vez de duplicarla. */
  async findExistingTechnicalOrderId(): Promise<string | null> {
    await this.open();
    await this.expectHistoryLoaded();

    const orderLinks = this.orderDetailLinks();
    const orderCount = await orderLinks.count();

    expect(
      orderCount,
      'la cuenta técnica contiene como máximo una orden previa',
    ).toBeLessThanOrEqual(1);

    return orderCount === 0 ? null : this.orderIdFromLink(orderLinks.first());
  }

  /** Comprueba la única orden esperada y abre su detalle privado. */
  async expectSingleTechnicalOrder(): Promise<string> {
    const orderLinks = this.orderDetailLinks();
    // El historial carga por AJAX y la orden recién creada tarda en aparecer.
    await expect(orderLinks, 'la cuenta nueva contiene una sola orden técnica').toHaveCount(1, {
      timeout: 30_000,
    });

    const orderLink = orderLinks.first();
    const orderId = await this.orderIdFromLink(orderLink);

    // Por contención: el tema anida textos vecinos en un mismo contenedor, así
    // que un regex anclado al texto completo del elemento no coincidiría.
    await expect(
      this.root.getByText(/Pendiente de pago/i).filter({ visible: true }).first(),
      'la orden sin cobro conserva el estado Pendiente de pago',
    ).toBeVisible();
    await this.followLink(orderLink);
    await expect(this.page, `la orden ${orderId} abre su detalle privado`).toHaveURL(
      new RegExp(`/mi-cuenta/view-order/${orderId}/?$`),
    );
    await expect(
      this.root.getByText(giftCard.name).filter({ visible: true }).first(),
      `la orden ${orderId} conserva el bono de ${giftCard.amountLabel}`,
    ).toBeVisible();
    await expect(
      this.page.getByRole('heading', { name: 'Detalles del pedido' }).first(),
      `la orden ${orderId} presenta su detalle`,
    ).toBeVisible();

    return orderId;
  }

  /** Sin esta espera, un historial que aún carga se confundiría con uno vacío. */
  private async expectHistoryLoaded(): Promise<void> {
    await expect(
      this.emailConfirmationNotice.or(this.orderDetailLinks().first()).first(),
      'el historial privado termina de cargar su contenido de pedidos',
    ).toBeVisible({ timeout: 30_000 });
  }

  private orderDetailLinks(): Locator {
    return this.root.getByRole('link', { name: /^Ver número del pedido \d+$/i });
  }

  private async orderIdFromLink(orderLink: Locator): Promise<string> {
    const href = await orderLink.getAttribute('href');
    expect(href, 'la orden técnica expone un enlace de detalle').not.toBeNull();

    const orderMatch = href?.match(/\/view-order\/(\d+)\/?/);
    expect(orderMatch, 'el enlace de la orden contiene un identificador numérico').not.toBeNull();

    return orderMatch?.[1] ?? '';
  }
}
