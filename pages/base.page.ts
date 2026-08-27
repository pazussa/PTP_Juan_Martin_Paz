import { expect, type Locator, type Page, type Request, type Response } from '@playwright/test';

export class BasePage {
  readonly root: Locator;

  // La red que provoca ERR_NETWORK_CHANGED tarda en estabilizarse.
  private static readonly transportRetryDelaysMs: readonly number[] = [1_000, 2_000];

  constructor(readonly page: Page) {
    // El tema deja <main> vacío y monta el contenido como hermano, así que
    // `body` es la única raíz común estable; cada POM acota desde aquí.
    this.root = page.locator('body');
  }

  async navigate(path: string): Promise<Response> {
    // Solo GET idempotentes: un HTTP >= 400 u otro error falla de inmediato.
    let lastTransportError: unknown;
    for (const delayMs of [0, ...BasePage.transportRetryDelaysMs]) {
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      try {
        return await this.navigateOnce(path);
      } catch (error) {
        if (!this.isRetriableGetNavigationError(error)) {
          throw error;
        }
        lastTransportError = error;
      }
    }

    throw lastTransportError;
  }

  async followLink(link: Locator): Promise<void> {
    const href = await link.getAttribute('href');
    expect(href, 'el enlace expone un destino navegable').not.toBeNull();

    try {
      await this.withNetworkChangeDetection(() => link.click());
    } catch (error) {
      if (!this.isRetriableGetNavigationError(error)) {
        throw error;
      }

      // El clic fue el primer intento; el href es un GET y usa la misma política.
      const response = await this.navigate(href as string);
      this.expectSuccessfulResponse(response, href as string);
    }
  }

  async goto(path: string): Promise<void> {
    const response = await this.navigate(path);
    this.expectSuccessfulResponse(response, path);
  }

  async expectCommonShell(): Promise<void> {
    await expect(
      this.page.getByRole('banner'),
      'el encabezado principal del sitio está visible',
    ).toBeVisible();
    await expect(
      this.page.getByRole('contentinfo'),
      'el pie de página del sitio está visible',
    ).toBeVisible();
  }

  private async navigateOnce(path: string): Promise<Response> {
    const absoluteExpectedUrl = /^https?:\/\//i.test(path) ? new URL(path) : undefined;
    const expectedPath = new URL(path, 'https://relative-path.invalid').pathname;
    let completedTargetResponse: Response | undefined;
    const captureCompletedTarget = (response: Response): void => {
      const request = response.request();
      if (!request.isNavigationRequest() || request.frame() !== this.page.mainFrame()) {
        return;
      }

      const responseUrl = new URL(response.url());
      if (
        (absoluteExpectedUrl === undefined || responseUrl.origin === absoluteExpectedUrl.origin) &&
        this.normalizedPath(responseUrl.pathname) === this.normalizedPath(expectedPath)
      ) {
        completedTargetResponse = response;
      }
    };

    this.page.on('response', captureCompletedTarget);
    let response: Response | null;
    try {
      response = await this.withNetworkChangeDetection(() =>
        this.page.goto(path, { waitUntil: 'domcontentloaded' }),
      );
    } catch (error) {
      const currentUrl = new URL(this.page.url());
      const completedOrigin =
        completedTargetResponse === undefined
          ? undefined
          : new URL(completedTargetResponse.url()).origin;
      const targetFinishedDespiteWrapper =
        completedTargetResponse !== undefined &&
        currentUrl.origin === completedOrigin &&
        this.normalizedPath(currentUrl.pathname) === this.normalizedPath(expectedPath);

      if (targetFinishedDespiteWrapper) {
        return completedTargetResponse as Response;
      }
      throw error;
    } finally {
      this.page.off('response', captureCompletedTarget);
    }

    expect(response, `la navegación a ${path} devuelve una respuesta HTTP`).not.toBeNull();

    return response as Response;
  }

  private normalizedPath(pathname: string): string {
    return pathname === '/' ? pathname : pathname.replace(/\/$/, '');
  }

  private isRetriableGetNavigationError(error: unknown): boolean {
    const message = String(error);
    // Cuando Chromium solo expone su wrapper chrome-error, la causa real la
    // anexa withNetworkChangeDetection; sin ella, el wrapper es la única señal.
    return (
      message.includes('ERR_NETWORK_CHANGED') ||
      message.includes('interrupted by another navigation to "chrome-error://')
    );
  }

  private expectSuccessfulResponse(response: Response, path: string): void {
    expect(
      response.status(),
      `la navegación a ${path} responde con estado menor que 400`,
    ).toBeLessThan(400);
  }

  private async withNetworkChangeDetection<T>(operation: () => Promise<T>): Promise<T> {
    let networkChanged = false;
    const mainFrame = this.page.mainFrame();
    const observeFailedNavigation = (request: Request): void => {
      if (!request.isNavigationRequest() || request.frame() !== mainFrame) {
        return;
      }

      networkChanged =
        networkChanged ||
        (request.failure()?.errorText.includes('ERR_NETWORK_CHANGED') ?? false);
    };

    this.page.on('requestfailed', observeFailedNavigation);
    try {
      return await operation();
    } catch (error) {
      if (networkChanged && !String(error).includes('ERR_NETWORK_CHANGED')) {
        throw new Error(`${String(error)}\nCausa de transporte: ERR_NETWORK_CHANGED`, {
          cause: error,
        });
      }
      throw error;
    } finally {
      this.page.off('requestfailed', observeFailedNavigation);
    }
  }
}
