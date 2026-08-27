import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';

const exactText = (value: string): RegExp =>
  new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
const requiredFieldName = (value: string): RegExp =>
  new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s*\\*)?$`);

export class PqrsPage extends BasePage {
  readonly trackingNumber: Locator;
  readonly trackingButton: Locator;
  readonly requestForm: Locator;
  readonly store: Locator;
  readonly date: Locator;
  readonly customerName: Locator;
  readonly address: Locator;
  readonly documentType: Locator;
  readonly documentNumber: Locator;
  readonly phone: Locator;
  readonly email: Locator;
  readonly requestType: Locator;
  readonly cause: Locator;
  readonly description: Locator;
  readonly attachments: Locator;
  readonly consent: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.trackingNumber = page.getByRole('textbox', {
      name: 'Número de radicado',
      exact: true,
    });
    this.trackingButton = page.getByRole('button', { name: 'Consultar', exact: true });
    const submitButton = page.getByRole('button', { name: /^Crear PQRS$/i });
    this.requestForm = page.locator('form').filter({ has: submitButton });
    // Los Select2 no exponen nombre accesible; `name` es el contrato estable.
    this.store = this.requestForm.locator('select[name="select-1"]');
    this.date = this.requestForm.getByRole('textbox', { name: 'Fecha', exact: true });
    this.customerName = this.requestForm.getByRole('textbox', {
      name: requiredFieldName('Nombre completo del cliente'),
    });
    this.address = this.requestForm.getByRole('textbox', {
      name: requiredFieldName('Dirección y ciudad'),
    });
    this.documentType = this.requestForm.locator('select[name="select-2"]');
    this.documentNumber = this.requestForm.getByRole('textbox', {
      name: requiredFieldName('Número de documento'),
    });
    this.phone = this.requestForm.getByRole('textbox', { name: requiredFieldName('Teléfono') });
    this.email = this.requestForm.getByRole('textbox', {
      name: requiredFieldName('Correo electrónico'),
    });
    this.requestType = this.requestForm.locator('select[name="select-3"]');
    this.cause = this.requestForm.locator('select[name="select-4"]');
    this.description = this.requestForm.getByRole('textbox', {
      name: requiredFieldName('Descripción de la solicitud'),
    });
    this.attachments = this.requestForm.getByRole('button', {
      name: requiredFieldName('Adjuntar archivos (máximo 3)'),
    });
    // La casilla actual tampoco expone un nombre accesible en el árbol.
    this.consent = this.requestForm.locator('input[name="consent-1"]');
    this.submitButton = this.requestForm.getByRole('button', { name: /^Crear PQRS$/i });
  }

  async open(): Promise<void> {
    await this.goto('/pqrs/');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page, 'PQRS conserva su URL pública').toHaveURL(/\/pqrs\/?$/);
    await expect(this.page, 'PQRS muestra el título correcto').toHaveTitle(
      'PQRS – Bon-Bonite Sitio Oficial',
    );
    await expect(
      this.trackingNumber,
      'PQRS permite escribir un número de radicado para consultarlo',
    ).toBeVisible();
    await expect(
      this.trackingButton,
      'PQRS permite consultar el número de radicado',
    ).toBeVisible();

    for (const field of [
      this.store,
      this.date,
      this.customerName,
      this.address,
      this.documentType,
      this.documentNumber,
      this.phone,
      this.email,
      this.requestType,
      this.description,
      this.attachments,
      this.consent,
    ]) {
      await expect(field, 'el formulario PQRS presenta sus controles utilizables').toBeVisible();
    }
    await expect(
      this.cause,
      'el formulario PQRS incluye el selector condicional de causal',
    ).toBeAttached();

    const dateParts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Bogota',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).formatToParts(new Date());
    const datePart = (type: Intl.DateTimeFormatPartTypes) =>
      dateParts.find((part) => part.type === type)?.value ?? '';
    const expectedDate = `${datePart('day')}/${datePart('month')}/${datePart('year')}`;

    await expect(this.date, `la fecha PQRS corresponde a hoy ${expectedDate}`).toHaveValue(
      expectedDate,
    );
    await expect(this.date, 'la fecha automática de PQRS es de solo lectura').toHaveJSProperty(
      'readOnly',
      true,
    );
    await expect(
      this.attachments,
      'PQRS permite adjuntar hasta tres archivos',
    ).toHaveAttribute('data-limit', '3');
    await expect(
      this.attachments,
      'PQRS permite seleccionar varios adjuntos',
    ).toHaveJSProperty('multiple', true);
    await expect(
      this.attachments,
      'cada archivo PQRS admite como máximo 8 MB',
    ).toHaveAttribute('data-size', '8388608');
    await expect(this.submitButton, 'el formulario PQRS ofrece la acción Crear PQRS').toBeVisible();
  }

  async expectAvailableOptions(): Promise<void> {
    for (const documentOption of [
      'Cédula de Ciudadanía (CC)',
      'Cédula de Extranjería (CE)',
      'Pasaporte (PP)',
      'Número de Identificación Tributaria (NIT)',
      'Identificador Único de Cliente (IDC)',
      'Documento de Identificación Extranjero (DE)',
    ]) {
      await expect(
        this.documentType.locator('option').filter({ hasText: exactText(documentOption) }),
        `PQRS acepta el tipo de documento ${documentOption}`,
      ).toHaveCount(1);
    }

    for (const requestOption of [
      'Solicitud de reversión total',
      'Solicitud de reversión parcial',
      'Consultas y solicitudes de información',
      'Orientación en proceso de compra o pago del crédito',
      'Queja',
      'Reclamo',
      'Felicitación',
    ]) {
      await expect(
        this.requestType.locator('option').filter({ hasText: exactText(requestOption) }),
        `PQRS ofrece el tipo ${requestOption}`,
      ).toHaveCount(1);
    }

    await this.requestType.selectOption({ label: 'Solicitud de reversión total' });
    await expect(
      this.requestType,
      'PQRS conserva el tipo Solicitud de reversión total seleccionado',
    ).toHaveValue('Solicitud de reversión total');
    await expect(
      this.cause,
      'PQRS presenta el selector Causal para una reversión total',
    ).toBeVisible();
    await expect(
      this.cause,
      'PQRS permite elegir una causal para una reversión total',
    ).toBeEnabled();

    for (const causeOption of [
      'Víctima de un fraude',
      'Operación no solicitada',
      'Producto no entregado dentro del término de 30 días calendario',
      'Producto recibido no corresponda al comprado, o este no cumpla con las informadas sobre él',
      'Producto recibido se encuentra defectuoso',
    ]) {
      await expect(
        this.cause.locator('option').filter({ hasText: exactText(causeOption) }),
        `PQRS ofrece la causal ${causeOption}`,
      ).toHaveCount(1);
    }
  }

  async queryUnknownTrackingNumber(trackingNumber: string): Promise<void> {
    expect(
      trackingNumber,
      'el radicado técnico utiliza únicamente 15 dígitos',
    ).toMatch(/^\d{15}$/);

    await this.trackingNumber.fill(trackingNumber);
    await expect(
      this.trackingNumber,
      `la consulta conserva el radicado técnico ${trackingNumber}`,
    ).toHaveValue(trackingNumber);

    const notFoundMessage = this.page.getByText(
      'No se encontró información para ese número de radicado.',
      { exact: true },
    );

    // La consulta es de solo lectura, así que repetir el par clic→resultado es
    // seguro y cubre que el aviso de cookies absorba el clic (BB-010).
    await expect(
      async () => {
        await this.trackingButton.click({ timeout: 5_000 });
        await expect(notFoundMessage).toBeVisible({ timeout: 3_000 });
      },
      'PQRS responde de forma controlada a un radicado numérico inexistente',
    ).toPass({ intervals: [500, 1_000, 2_000], timeout: 30_000 });
    await expect(
      this.trackingNumber,
      'PQRS no vacía el radicado consultado al mostrar el resultado',
    ).toHaveValue(trackingNumber);
  }
}
