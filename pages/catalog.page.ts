import { expect, type Locator, type Page } from '@playwright/test';
import type { CatalogModule } from '../test-data/catalogs';
import { BasePage } from './base.page';

export class CatalogPage extends BasePage {
  readonly filtersButton: Locator;
  readonly resultsSummary: Locator;
  readonly productNames: Locator;
  readonly productLinks: Locator;

  constructor(page: Page) {
    super(page);
    this.filtersButton = page.getByRole('button', { name: 'Filtros', exact: true });
    this.resultsSummary = this.root.getByText(/^\s*\d+\s+Resultados?\s*$/i);
    this.productNames = this.root.locator('h4[id^="title-"]');
    this.productLinks = this.root
      .locator('a[href*="/producto/"]')
      .filter({ has: page.locator('img[id^="image-"]') });
  }

  async open(catalog: CatalogModule): Promise<void> {
    await this.goto(catalog.path);
  }

  async expectLoaded(catalog: CatalogModule): Promise<void> {
    await expect(this.page, `${catalog.name} abre la URL de su categoría`).toHaveURL(
      new RegExp(`${catalog.path.replaceAll('/', '\\/')}(?:[?#].*)?$`),
    );
    await expect(this.page, `${catalog.name} muestra el título correcto`).toHaveTitle(catalog.title);
    await expect(
      this.filtersButton,
      `${catalog.name} permite abrir los filtros`,
    ).toBeVisible();
    await expect(
      this.resultsSummary,
      `${catalog.name} informa cuántos productos encontró`,
    ).toBeVisible();
    await expect(
      this.productNames.first(),
      `${catalog.name} presenta al menos un producto con nombre`,
    ).toBeVisible();
    await expect(
      this.productLinks.first(),
      `${catalog.name} presenta un enlace a un detalle de producto`,
    ).toBeVisible();
    await expect(
      this.productLinks.first(),
      `${catalog.name} enlaza una ficha de producto publicada`,
    ).toHaveAttribute('href', /\/producto\//);

    const resultText = await this.resultsSummary.textContent();
    const resultCount = Number.parseInt((resultText ?? '0').replace(/\D/g, ''), 10);
    const publishedProductCount = await this.productNames.count();

    expect(resultCount, `${catalog.name} informa al menos un resultado`).toBeGreaterThan(0);
    expect(
      publishedProductCount,
      `${catalog.name} muestra al menos una tarjeta en la página actual`,
    ).toBeGreaterThan(0);
    expect(
      publishedProductCount,
      `las tarjetas publicadas de ${catalog.name} no superan el total informado`,
    ).toBeLessThanOrEqual(resultCount);

    await expect(
      this.productLinks,
      `cada tarjeta publicada de ${catalog.name} tiene un enlace de producto`,
    ).toHaveCount(publishedProductCount);
  }

  async openFirstProduct(catalog: CatalogModule): Promise<void> {
    const firstProductHeading = this.productNames.first();
    const firstProductName = (await firstProductHeading.textContent())?.trim() ?? '';
    const headingId = await firstProductHeading.getAttribute('id');
    const productId = headingId?.replace(/^title-/, '') ?? '';
    const firstProductLink = this.productLinks.filter({
      has: this.page.locator(`img[id="image-${productId}"]`),
    });

    expect(
      firstProductName,
      `la primera tarjeta de ${catalog.name} tiene un nombre no vacío`,
    ).not.toBe('');
    expect(
      productId,
      `la primera tarjeta de ${catalog.name} conserva un identificador de producto numérico`,
    ).toMatch(/^\d+$/);
    await expect(
      firstProductLink,
      `el nombre y el enlace de la primera tarjeta de ${catalog.name} pertenecen al mismo producto`,
    ).toHaveCount(1);
    await expect(
      firstProductLink,
      `la primera tarjeta de ${catalog.name} apunta a una ficha`,
    ).toHaveAttribute('href', /\/producto\/[^/]+\/?$/);
    await this.followLink(firstProductLink);
    await expect(this.page, `la primera tarjeta de ${catalog.name} abre una ficha`).toHaveURL(
      /\/producto\/[^/]+\/?$/,
    );
    await expect(
      this.page.getByRole('heading', { name: firstProductName, level: 1 }),
      `la ficha abierta conserva el nombre ${firstProductName}`,
    ).toBeVisible();
  }
}
