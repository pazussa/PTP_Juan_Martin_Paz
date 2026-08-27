import {
  expect,
  type Locator,
  type Page,
  type Request,
  type Response,
} from '@playwright/test';
import type { CheckoutData } from '../test-data/checkout';
import { giftCard } from '../test-data/products';
import { BasePage } from './base.page';

type CheckoutAjaxBody = {
  readonly result?: unknown;
  readonly redirect?: unknown;
};

export type OrderSubmission =
  | { readonly outcome: 'gateway-loaded'; readonly gatewayHost: string }
  | { readonly outcome: 'network-unknown' };

const isWompiHost = (hostname: string): boolean =>
  /^(?:[a-z0-9-]+\.)*wompi\.co$/i.test(hostname.replace(/\.$/, ''));

export class CheckoutPage extends BasePage {
  readonly heading: Locator;
  readonly continueButton: Locator;
  readonly cartStepSummary: Locator;
  readonly checkoutGiftCardSummary: Locator;
  readonly checkoutForm: Locator;
  readonly billingDocumentType: Locator;
  readonly billingDocument: Locator;
  readonly billingFirstName: Locator;
  readonly billingLastName: Locator;
  readonly billingGender: Locator;
  readonly billingEmail: Locator;
  readonly billingPhone: Locator;
  readonly billingCountry: Locator;
  readonly billingState: Locator;
  readonly billingCity: Locator;
  readonly billingAddress: Locator;
  readonly billingPostcode: Locator;
  readonly orderNotes: Locator;
  readonly orderReview: Locator;
  readonly wompiPaymentMethod: Locator;
  readonly privacyAuthorization: Locator;
  readonly placeOrderButton: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Finalizar compra', level: 1 });
    this.continueButton = page
      .getByRole('button', { name: 'Continuar', exact: true })
      .filter({ visible: true });
    // Acotado a #step1 para excluir el minicart del encabezado, contaminado por
    // caché según BB-005. Por contención: el tema anida la cantidad en el nombre.
    this.cartStepSummary = page.locator('#step1');
    this.checkoutGiftCardSummary = this.cartStepSummary
      .getByText(giftCard.name)
      .filter({ visible: true });
    this.checkoutForm = page.locator('form[name="checkout"]');
    // IDs contractuales de WooCommerce; los Select2 visuales no exponen un nombre estable.
    this.billingDocumentType = this.checkoutForm.locator('#billing_tipo_documento');
    this.billingDocument = this.checkoutForm.locator('#billing_user_login');
    this.billingFirstName = this.checkoutForm.locator('#billing_first_name');
    this.billingLastName = this.checkoutForm.locator('#billing_last_name');
    this.billingGender = this.checkoutForm.locator('#billing_gender');
    this.billingEmail = this.checkoutForm.locator('#billing_email');
    this.billingPhone = this.checkoutForm.locator('#billing_phone');
    this.billingCountry = this.checkoutForm.locator('#billing_country');
    this.billingState = this.checkoutForm.locator('#billing_state');
    this.billingCity = this.checkoutForm.locator('#billing_city');
    this.billingAddress = this.checkoutForm.locator('#billing_address_1');
    this.billingPostcode = this.checkoutForm.locator('#billing_postcode');
    this.orderNotes = this.checkoutForm.locator('#order_comments');
    this.orderReview = this.checkoutForm.locator('#order_review');
    this.wompiPaymentMethod = this.checkoutForm.locator('#payment_method_wompi');
    this.privacyAuthorization = this.checkoutForm.locator('#terms');
    this.placeOrderButton = this.checkoutForm.locator('#place_order');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page, 'el checkout conserva su URL canónica').toHaveURL(
      /\/finalizar-compra\/?$/,
    );
    await expect(this.page, 'el checkout muestra el título correcto').toHaveTitle(
      'Finalizar compra – Bon-Bonite Sitio Oficial',
    );
    await expect(this.heading, 'el checkout identifica la pantalla Finalizar compra').toBeVisible();
    await expect(
      this.checkoutGiftCardSummary,
      'el primer paso del checkout muestra un solo resumen visible del bono',
    ).toHaveCount(1);
    // La cantidad aquí es una columna en escritorio y "Cantidad: 1" en móvil; la
    // unidad única ya la garantizan el carrito y el resumen final.
    await expect(
      this.cartStepSummary,
      'el primer paso liquida el bono por su valor de $50.000',
    ).toContainText(/Subtotal[\s\S]*\$50[.,]000/i);
    await expect(this.continueButton, 'el resumen inicial ofrece un solo Continuar').toHaveCount(1);
    await expect(this.continueButton, 'el resumen inicial permite continuar').toBeEnabled();
  }

  async continueAuthenticatedCustomerToBilling(): Promise<void> {
    await expect(this.continueButton, 'el primer paso conserva un Continuar único').toHaveCount(1);
    await this.continueButton.click();
    await expect(
      this.billingFirstName,
      'la sesión autenticada avanza directamente a Detalles de facturación',
    ).toBeVisible();
    await expect(
      this.page.getByRole('heading', { name: 'Detalles de facturación', level: 3 }),
      'el checkout presenta la etapa de facturación',
    ).toBeVisible();
  }

  async fillBilling(data: CheckoutData): Promise<void> {
    await this.billingDocumentType.selectOption('CC');
    await expect(
      this.billingDocument,
      'facturación precarga la cédula de la cuenta autenticada',
    ).toHaveValue(data.document);
    await expect(
      this.billingDocument,
      'la cédula autenticada no puede sustituirse durante el checkout',
    ).toHaveJSProperty('readOnly', true);
    await this.billingFirstName.fill(data.firstName);
    await this.billingLastName.fill(data.lastName);
    await this.billingGender.selectOption(data.gender);
    await this.billingEmail.fill(data.email);
    await this.billingPhone.fill(data.phone);
    await this.billingCountry.selectOption(data.country);
    await this.billingState.selectOption(data.state);

    await expect(this.billingCity, 'Antioquia habilita el selector de ciudad').toBeEnabled();
    await expect(
      this.billingCity.locator('option').filter({ hasText: /^Medellín$/ }),
      'Antioquia ofrece Medellín como ciudad de facturación',
    ).toHaveCount(1);

    const reviewResponsePromise = this.page.waitForResponse(
      (response) =>
        this.isWooCommerceAjax(response, 'update_order_review') &&
        this.requestContainsFormValue(response.request(), 'billing_city', data.city),
    );
    await this.billingCity.selectOption({ label: data.city });
    const reviewResponse = await reviewResponsePromise;
    expect(
      reviewResponse.status(),
      'WooCommerce actualiza envío, total y medio de pago',
    ).toBeLessThan(400);

    await this.billingAddress.fill(data.address);
    await this.billingPostcode.fill(data.postcode);
    await this.orderNotes.fill(data.orderNote);

    await expect(this.billingFirstName, 'facturación conserva el nombre técnico').toHaveValue(
      data.firstName,
    );
    await expect(this.billingLastName, 'facturación conserva el apellido técnico').toHaveValue(
      data.lastName,
    );
    await expect(this.billingEmail, 'facturación conserva el correo técnico').toHaveValue(
      data.email,
    );
    await expect(this.billingCity, 'facturación conserva Medellín como ciudad').toHaveValue(
      data.city,
    );
    await expect(
      this.orderNotes,
      'la orden queda marcada como prueba QA que no debe despacharse',
    ).toHaveValue(data.orderNote);
  }

  async continueBillingToPayment(): Promise<void> {
    await expect(
      this.continueButton,
      'la facturación completa muestra un único botón para avanzar al pago',
    ).toHaveCount(1);
    await expect(this.continueButton, 'la facturación completa permite avanzar al pago').toBeEnabled();
    // La capa visual del tema intercepta el mouse; Enter activa el mismo botón accesible.
    await this.continueButton.press('Enter');
    await expect(
      this.page.getByText('Paga a través de Wompi.', { exact: true }),
      'la etapa Pago explica la pasarela disponible',
    ).toBeVisible();
  }

  async expectOrderReady(): Promise<void> {
    await expect(
      this.orderReview.getByText(giftCard.name).filter({ visible: true }),
      'el resumen final contiene un solo bono de $50.000',
    ).toHaveCount(1);
    await expect(
      this.orderReview,
      'el resumen final conserva exactamente una unidad y subtotal de $50.000',
    ).toContainText(/Cantidad:\s*1[\s\S]*Subtotal[\s\S]*\$50[.,]000/i);

    const reviewText = await this.orderReview.innerText();
    // Anclado a inicio de línea para no capturar la fila SUBTOTAL.
    const totalMatch = reviewText.match(/(?:^|\n)Total\s*\$\s*([\d.,]+)/i);
    expect(totalMatch, 'el resumen final expone un total COP interpretable').not.toBeNull();
    const totalCop = Number((totalMatch?.[1] ?? '').replace(/\D/g, ''));
    expect(totalCop, 'el total nunca es inferior al valor del bono').toBeGreaterThanOrEqual(50_000);
    expect(totalCop, 'el total autorizado no supera $60.000 COP').toBeLessThanOrEqual(60_000);
    await expect(
      this.orderReview.getByText('Wompi', { exact: true }),
      'el checkout muestra Wompi como pasarela de pago',
    ).toBeVisible();
    await expect(
      this.wompiPaymentMethod,
      'el control nativo de Wompi está disponible en el checkout',
    ).toBeAttached();
    await expect(
      this.checkoutForm.locator('input[name="payment_method"]'),
      'Wompi es el único medio de pago publicado para esta orden',
    ).toHaveCount(1);
    await expect(this.wompiPaymentMethod, 'el medio de pago usa el valor wompi').toHaveValue(
      'wompi',
    );
    await expect(
      this.wompiPaymentMethod,
      'Wompi queda seleccionado como medio de pago',
    ).toBeChecked();
    await this.privacyAuthorization.check();
    await expect(
      this.privacyAuthorization,
      'el cliente autoriza el tratamiento de datos para la orden',
    ).toBeChecked();
    await expect(
      this.placeOrderButton,
      'la acción final conserva un nombre accesible de creación de pedido',
    ).toHaveAccessibleName(/^(?:Registrar Orden|Realizar el pedido)$/i);
    await expect(
      this.placeOrderButton,
      'la acción final envía el formulario de checkout',
    ).toHaveAttribute('type', 'submit');
    await expect(this.placeOrderButton, 'la orden queda lista para registrarse').toBeEnabled();
  }

  async registerOrderOnce(): Promise<OrderSubmission> {
    // Fijado antes del POST: la redirección a Wompi puede cambiar page.url()
    // mientras Playwright aún entrega la respuesta AJAX.
    const checkoutOrigin = new URL(this.page.url()).origin;
    let checkoutRequestCount = 0;
    const observeCheckoutRequest = (request: Request): void => {
      if (this.isWooCommerceRequest(request, 'checkout', checkoutOrigin)) {
        checkoutRequestCount += 1;
      }
    };
    this.page.on('request', observeCheckoutRequest);
    const checkoutCapturePromise = this.page
      .waitForResponse(
        (response) => this.isWooCommerceAjax(response, 'checkout', checkoutOrigin),
        { timeout: 30_000 },
      )
      .then(async (response) => {
        const body = (await response.json()) as CheckoutAjaxBody;
        return { kind: 'captured' as const, response, body };
      })
      .catch(() => ({ kind: 'unavailable' as const }));

    try {
      await this.placeOrderButton.click();
    } catch {
      // El submit no se repite: la respuesta capturada o el historial dirán si
      // el primer clic alcanzó a crear la orden.
    }

    const checkoutCapture = await checkoutCapturePromise;
    this.page.off('request', observeCheckoutRequest);
    expect(
      checkoutRequestCount,
      'la interfaz nunca emite más de un POST de checkout',
    ).toBeLessThanOrEqual(1);
    if (checkoutCapture.kind === 'unavailable') {
      // Perder la respuesta tras el submit es ambiguo: llegar a Wompi es la
      // confirmación observable; si no, el escenario reconcilia desde Pedidos.
      const loadedGatewayHost = await this.waitForWompiGatewayHost();
      if (loadedGatewayHost !== null) {
        return { outcome: 'gateway-loaded', gatewayHost: loadedGatewayHost };
      }
      const currentUrl = this.safeCurrentUrl();
      if (
        currentUrl !== null &&
        currentUrl.protocol === 'https:' &&
        currentUrl.origin !== checkoutOrigin
      ) {
        throw new Error(
          'El navegador salió del checkout hacia un dominio HTTPS no autorizado. La posible orden se reconciliará y el escenario fallará sin reenviar.',
        );
      }
      return { outcome: 'network-unknown' };
    }

    expect(
      checkoutRequestCount,
      'el registro observado corresponde a un único POST de checkout',
    ).toBe(1);
    expect(
      checkoutCapture.response.status(),
      'WooCommerce acepta la única solicitud de registro de orden',
    ).toBeLessThan(400);
    const responseBody = checkoutCapture.body;
    expect(responseBody.result, 'WooCommerce confirma el resultado de la orden').toBe('success');
    expect(responseBody.redirect, 'WooCommerce devuelve el destino de la pasarela').toEqual(
      expect.any(String),
    );

    const redirectUrl = responseBody.redirect as string;
    const redirect = new URL(redirectUrl, this.page.url());
    expect(
      redirect.protocol,
      'el destino de pago utiliza HTTPS',
    ).toBe('https:');
    expect(
      isWompiHost(redirect.hostname),
      'WooCommerce declara un destino dentro del dominio oficial wompi.co',
    ).toBe(true);

    const loadedGatewayHost = await this.waitForWompiGatewayHost();
    if (loadedGatewayHost === null) {
      throw new Error(
        'WooCommerce aceptó la orden, pero Chromium no confirmó la carga del dominio oficial de Wompi. Se debe reconciliar Pedidos sin repetir el submit.',
      );
    }

    return { outcome: 'gateway-loaded', gatewayHost: loadedGatewayHost };
  }

  private isWooCommerceAjax(
    response: Response,
    action: string,
    expectedOrigin = new URL(this.page.url()).origin,
  ): boolean {
    return this.isWooCommerceRequest(response.request(), action, expectedOrigin);
  }

  private isWooCommerceRequest(
    request: Request,
    action: string,
    expectedOrigin: string,
  ): boolean {
    const requestUrl = new URL(request.url());
    return (
      requestUrl.origin === expectedOrigin &&
      requestUrl.searchParams.get('wc-ajax') === action &&
      request.method() === 'POST'
    );
  }

  private requestContainsFormValue(request: Request, field: string, value: string): boolean {
    let requestBody = request.postData() ?? '';
    for (let pass = 0; pass < 2; pass += 1) {
      try {
        requestBody = decodeURIComponent(requestBody.replace(/\+/g, ' '));
      } catch {
        break;
      }
    }
    return requestBody.includes(`${field}=${value}`);
  }

  private async waitForWompiGatewayHost(): Promise<string | null> {
    try {
      await this.page.waitForURL(
        (url) => url.protocol === 'https:' && isWompiHost(url.hostname),
        { timeout: 30_000, waitUntil: 'domcontentloaded' },
      );
      return new URL(this.page.url()).hostname;
    } catch {
      return null;
    }
  }

  private safeCurrentUrl(): URL | null {
    try {
      return new URL(this.page.url());
    } catch {
      return null;
    }
  }
}
