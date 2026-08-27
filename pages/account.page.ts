import { expect, type Locator, type Page } from '@playwright/test';
import type { ProfileData, RegistrationData } from '../test-data/account';
import { BasePage } from './base.page';

export class AccountPage extends BasePage {
  readonly loginDocument: Locator;
  readonly loginPassword: Locator;
  readonly loginButton: Locator;
  readonly showRegistrationButton: Locator;
  readonly registrationDocument: Locator;
  readonly registrationFirstName: Locator;
  readonly registrationLastName: Locator;
  readonly registrationEmail: Locator;
  readonly registrationPassword: Locator;
  readonly registrationPasswordConfirmation: Locator;
  readonly passwordMatchMessage: Locator;
  readonly privacyAuthorization: Locator;
  readonly registerButton: Locator;
  readonly accountNavigation: Locator;
  readonly greeting: Locator;
  readonly accountMenuToggle: Locator;
  readonly accountMenu: Locator;
  readonly logoutLink: Locator;
  readonly personalDataHeading: Locator;
  readonly updateInformationButton: Locator;
  readonly profileFirstName: Locator;
  readonly profileLastName: Locator;
  readonly profileBirthDate: Locator;
  readonly profileGender: Locator;
  readonly profilePhone: Locator;
  readonly saveProfileButton: Locator;
  readonly profileUpdatedMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.loginDocument = page.locator('#username');
    this.loginPassword = page.locator('#password');
    this.loginButton = page.getByRole('button', { name: 'Iniciar Sesión' });
    this.showRegistrationButton = page.locator('#show_register');
    this.registrationDocument = page.locator('#reg_username');
    this.registrationFirstName = page.locator('#first_name');
    this.registrationLastName = page.locator('#last_name');
    this.registrationEmail = page.locator('#reg_email');
    this.registrationPassword = page.locator('#reg_password');
    this.registrationPasswordConfirmation = page.locator('#reg_password2');
    this.passwordMatchMessage = page.locator('#password-match-message');
    this.privacyAuthorization = page.locator('#privacy_policy_reg');
    this.registerButton = page.getByRole('button', { name: 'Registrarme' });
    this.accountNavigation = page.getByRole('navigation', { name: 'Páginas de cuenta' });
    this.greeting = page.getByRole('heading', { name: /^Hola,/ });
    // El ícono solo expone la inicial del usuario. El tema publica variantes
    // desktop/móvil; el viewport determina cuál es la única accionable.
    this.accountMenuToggle = page
      .locator('#user-icon-wrap, #toggle-account-menu-mobile > a')
      .filter({ visible: true });
    this.accountMenu = page
      .locator('#header-account-menu, #header-account-menu-mobile')
      .filter({ visible: true });
    this.logoutLink = this.accountMenu.getByRole('link', {
      name: 'Cerrar Sesión',
      exact: true,
    });
    this.personalDataHeading = page.getByRole('heading', { name: 'Datos Personales' });
    this.updateInformationButton = page.getByRole('button', {
      name: /^Actualizar Información$/i,
    });
    this.profileFirstName = this.root.locator('[name="first_name"]');
    this.profileLastName = this.root.locator('[name="last_name"]');
    this.profileBirthDate = this.root.locator('[name="birth_date"]');
    this.profileGender = this.root.locator('[name="gender"]');
    this.profilePhone = this.root.locator('[name="billing_phone"]');
    this.saveProfileButton = this.root.getByRole('button', { name: 'Guardar', exact: true });
    this.profileUpdatedMessage = this.root.getByText(
      'Datos personales actualizados correctamente',
      { exact: true },
    );
  }

  async open(): Promise<void> {
    await this.goto('/mi-cuenta/');
  }

  async expectGuestAccess(): Promise<void> {
    await expect(this.page, 'Mi cuenta conserva su URL pública').toHaveURL(/\/mi-cuenta\/?$/);
    await expect(this.page, 'Mi cuenta muestra el título público correcto').toHaveTitle(
      'Mi cuenta – Bon-Bonite Sitio Oficial',
    );
    await expect(
      this.page.getByRole('heading', { name: 'Ingresa a tu cuenta' }),
      'Mi cuenta muestra el formulario para iniciar sesión',
    ).toBeVisible();
    await expect(
      this.loginDocument,
      'el inicio de sesión solicita el número de cédula',
    ).toBeVisible();
    await expect(
      this.loginPassword,
      'el inicio de sesión solicita la contraseña',
    ).toBeVisible();
    await expect(this.loginButton, 'el inicio de sesión permite enviar los datos').toBeEnabled();
  }

  async showRegistration(): Promise<void> {
    await this.showRegistrationButton.click();
    await expect(
      this.page.getByRole('heading', { name: 'Crea tu cuenta' }),
      'el formulario para crear una cuenta queda visible',
    ).toBeVisible();
  }

  async expectRegistrationRequirements(): Promise<void> {
    const requiredFields = [
      this.registrationDocument,
      this.registrationFirstName,
      this.registrationLastName,
      this.registrationEmail,
      this.registrationPassword,
      this.registrationPasswordConfirmation,
      this.privacyAuthorization,
    ];

    for (const field of requiredFields) {
      await expect(field, 'cada dato obligatorio del registro está marcado como requerido')
        .toHaveJSProperty('required', true);
    }

    await expect(
      this.registrationEmail,
      'el correo del registro usa validación nativa de tipo email',
    ).toHaveAttribute('type', 'email');
    await expect(
      this.page.getByRole('link', { name: 'Autorizo el tratamiento de mis datos personales' }),
      'el registro enlaza la política de tratamiento de datos',
    ).toHaveAttribute('href', /\/tratamiento-de-datos-personales\/?$/);
  }

  async expectRegistrationPasswordRules(): Promise<void> {
    await this.registrationPassword.fill('1234567');
    await this.registrationPasswordConfirmation.fill('1234567');
    await expect(
      this.passwordMatchMessage,
      'una contraseña de 7 caracteres informa el mínimo de 8',
    ).toContainText('La contraseña debe tener al menos 8 caracteres.');

    await this.registrationPassword.fill('12345678');
    await this.registrationPasswordConfirmation.fill('87654321');
    await expect(
      this.passwordMatchMessage,
      'dos contraseñas de 8 caracteres distintas informan que no coinciden',
    ).toContainText('Las contraseñas no coinciden.');

    await this.registrationPasswordConfirmation.fill('12345678');
    await expect(
      this.passwordMatchMessage,
      'dos contraseñas iguales de 8 caracteres eliminan la advertencia',
    ).toHaveText('');
  }

  async register(data: RegistrationData): Promise<void> {
    await this.registrationDocument.fill(data.document);
    await this.registrationFirstName.fill(data.firstName);
    await this.registrationLastName.fill(data.lastName);
    await this.registrationEmail.fill(data.email);
    await this.registrationPassword.fill(data.password);
    await this.registrationPasswordConfirmation.fill(data.password);

    await expect
      .poll(
        async () => {
          const [passwordValue, confirmationValue] = await Promise.all([
            this.registrationPassword.inputValue(),
            this.registrationPasswordConfirmation.inputValue(),
          ]);
          return passwordValue === data.password && confirmationValue === data.password;
        },
        {
          message: 'la contraseña y su confirmación quedan en los campos correctos',
        },
      )
      .toBe(true);

    await this.privacyAuthorization.check();
    await expect(
      this.privacyAuthorization,
      'el usuario autoriza el tratamiento de sus datos',
    ).toBeChecked();
    await this.registerButton.click();

    await expect
      .poll(
        async () => {
          const [greetingIsVisible, loginIsVisible] = await Promise.all([
            this.greeting.isVisible().catch(() => false),
            this.loginButton.isVisible().catch(() => false),
          ]);

          return greetingIsVisible || loginIsVisible;
        },
        'el registro permite entrar directamente o autenticarse con las credenciales nuevas',
      )
      .toBe(true);

    if (await this.greeting.isVisible()) {
      await this.logout();
    } else {
      await expect(
        this.loginButton,
        'el registro sin auto-login vuelve a mostrar el inicio de sesión',
      ).toBeVisible();
    }

    await this.login(data.document, data.password);
    await this.expectAuthenticatedAccount(data.firstName);
  }

  async login(document: string, password: string): Promise<void> {
    const authenticatedOnFirstAttempt = await this.submitLoginOnce(document, password);

    if (!authenticatedOnFirstAttempt) {
      // El servidor confirmó que no quedó sesión, así que reenviar no repite un
      // login efectivo. Es el único reintento permitido.
      await this.submitLoginOnce(document, password);
    }

    await expect(this.page, 'el inicio de sesión entra en una ruta privada de Mi cuenta').toHaveURL(
      /\/mi-cuenta\/(?:[^?#]*)(?:[?#].*)?$/,
    );
    await expect(
      this.accountNavigation,
      'el inicio de sesión muestra la navegación privada',
    ).toBeVisible();
  }

  /** Envía el formulario una sola vez e informa si la sesión quedó iniciada. */
  private async submitLoginOnce(document: string, password: string): Promise<boolean> {
    await expect(
      this.loginButton,
      'el formulario público de inicio de sesión está disponible',
    ).toBeVisible();
    await this.loginDocument.fill(document);
    await this.loginPassword.fill(password);
    await expect(
      this.loginDocument,
      'la cédula nueva permanece en su campo antes de iniciar sesión',
    ).toHaveValue(document);
    await expect
      .poll(async () => (await this.loginPassword.inputValue()) === password, {
        message: 'la contraseña permanece en su campo sin exponer su valor',
      })
      .toBe(true);
    await this.loginButton.click();

    // El POST no se repite aquí: un GET reconcilia si Chromium terminó en su
    // página de red y el estado observado decide si el llamador puede reenviar.
    const postLoginState: { value: 'waiting' | 'authenticated' | 'network-error' } = {
      value: 'waiting',
    };
    await expect
      .poll(
        async () => {
          if (this.page.url().startsWith('chrome-error://')) {
            postLoginState.value = 'network-error';
          } else if (await this.accountNavigation.isVisible()) {
            postLoginState.value = 'authenticated';
          }
          return postLoginState.value;
        },
        {
          message: 'el login muestra la cuenta privada o una interrupción de red recuperable',
        },
      )
      .toMatch(/^(?:authenticated|network-error)$/);

    if (postLoginState.value === 'authenticated') {
      return true;
    }

    await this.goto('/mi-cuenta/');

    return this.accountNavigation.isVisible();
  }

  async logout(): Promise<void> {
    // El aviso de cookies puede cerrar el menú recién abierto: se reintenta la
    // operación completa, nunca el logout una vez que ya navegó.
    await expect(
      async () => {
        if (new URL(this.page.url()).pathname === '/') {
          return;
        }

        if ((await this.accountMenu.count()) === 0) {
          await expect(
            this.accountMenuToggle,
            'la cuenta autenticada muestra un solo control de menú accionable',
          ).toHaveCount(1, { timeout: 3_000 });
          await this.accountMenuToggle.click({ timeout: 5_000 });
        }

        await expect(this.accountMenu, 'un solo menú de cuenta queda visible').toHaveCount(1, {
          timeout: 3_000,
        });
        await expect(this.logoutLink, 'el menú ofrece cerrar la sesión').toBeVisible({
          timeout: 3_000,
        });
        await this.logoutLink.click({ timeout: 5_000 });
        await expect(this.page, 'cerrar sesión lleva al inicio público').toHaveURL(
          (url) => url.pathname === '/',
          { timeout: 5_000 },
        );
      },
      'la sesión automática termina desde el menú de cuenta',
    ).toPass({ intervals: [250, 500, 1_000], timeout: 20_000 });

    // El cierre redirige al inicio; volver a Mi cuenta comprueba que la sesión sí terminó.
    await this.open();
    await this.expectGuestAccess();
  }

  async expectAuthenticatedAccount(firstName: string): Promise<void> {
    const displayedFirstName = firstName.trim().split(/\s+/)[0] ?? firstName;
    await expect(
      this.greeting,
      `la cuenta autenticada saluda a ${displayedFirstName}`,
    ).toContainText(displayedFirstName);
    await expect(
      this.accountNavigation,
      'la cuenta autenticada muestra su navegación privada',
    ).toBeVisible();

    for (const linkName of ['Pedidos', 'Datos', 'Créditos', 'PQRS']) {
      await expect(
        this.accountNavigation.getByRole('link', { name: linkName, exact: true }),
        `la cuenta autenticada ofrece el módulo ${linkName}`,
      ).toBeVisible();
    }
  }

  async openPersonalData(): Promise<void> {
    await this.followLink(
      this.accountNavigation.getByRole('link', { name: 'Datos', exact: true }),
    );
    await expect(
      this.page,
      'Datos abre la pantalla de detalles de la cuenta',
    ).toHaveURL(/\/mi-cuenta\/edit-account\/?$/);
    await expect(
      this.personalDataHeading,
      'la sección Datos Personales queda visible',
    ).toBeVisible();
  }

  async updateProfile(profile: ProfileData): Promise<void> {
    await this.updateInformationButton.click();

    await expect(this.profileFirstName, 'la edición habilita el campo Nombres').toBeVisible();
    await this.profileFirstName.fill(profile.firstName);
    await this.profileLastName.fill(profile.lastName);
    await this.profileBirthDate.fill(profile.birthDate);
    await this.profileGender.selectOption({ label: profile.gender });
    await this.profilePhone.fill(profile.phone);

    await expect(this.profileFirstName, `el nombre por guardar es ${profile.firstName}`).toHaveValue(
      profile.firstName,
    );
    await expect(this.profileLastName, `el apellido por guardar es ${profile.lastName}`).toHaveValue(
      profile.lastName,
    );
    await expect(this.profileBirthDate, `la fecha por guardar es ${profile.birthDate}`).toHaveValue(
      profile.birthDate,
    );
    await expect(
      this.profileGender.locator('option:checked'),
      `el género por guardar es ${profile.gender}`,
    ).toHaveText(profile.gender);
    await expect(this.profilePhone, `el teléfono por guardar es ${profile.phone}`).toHaveValue(
      profile.phone,
    );

    await this.saveProfileButton.click();
  }

  async expectProfileUpdated(profile: ProfileData): Promise<void> {
    await expect(
      this.profileUpdatedMessage,
      'el sitio confirma que los datos personales se actualizaron',
    ).toBeVisible();

    await this.goto('/mi-cuenta/edit-account/');
    await expect(
      this.personalDataHeading,
      'los datos personales siguen disponibles después de volver a cargarlos',
    ).toBeVisible();
    await this.updateInformationButton.click();

    await expect(
      this.profileFirstName,
      `el servidor conserva el nombre ${profile.firstName}`,
    ).toHaveValue(
      profile.firstName,
    );
    await expect(
      this.profileLastName,
      `el servidor conserva el apellido ${profile.lastName}`,
    ).toHaveValue(
      profile.lastName,
    );
    await expect(
      this.profileBirthDate,
      `el servidor conserva la fecha ${profile.birthDate}`,
    ).toHaveValue(
      profile.birthDate,
    );
    await expect(
      this.profileGender.locator('option:checked'),
      `el servidor conserva el género ${profile.gender}`,
    ).toHaveText(profile.gender);
    await expect(
      this.profilePhone,
      `el servidor conserva el teléfono ${profile.phone}`,
    ).toHaveValue(
      profile.phone,
    );
  }
}
