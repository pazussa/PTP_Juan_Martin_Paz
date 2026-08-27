import { randomBytes } from 'node:crypto';

export type RegistrationData = {
  readonly document: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly password: string;
};

export type ProfileData = {
  readonly firstName: string;
  readonly lastName: string;
  readonly birthDate: string;
  readonly gender: 'Masculino' | 'Femenino' | 'Otro';
  readonly phone: string;
};

export type CustomerAccount = {
  readonly registration: RegistrationData;
  readonly profile: ProfileData;
};

export type SafeCustomerContext = {
  readonly registration: Omit<RegistrationData, 'password'>;
  readonly profile: ProfileData;
  readonly purpose: string;
};

export function createUniqueAccount(workerIndex: number): CustomerAccount {
  const timestamp = Date.now().toString();
  const emailDomain = process.env.TEST_EMAIL_DOMAIN ?? 'example.com';
  const documentEntropy = (
    randomBytes(8).readBigUInt64BE() % 1_000_000_000n
  ).toString().padStart(9, '0');
  const passwordEntropy = randomBytes(16).toString('hex');

  return {
    registration: {
      // Diez dígitos con sufijo criptográfico, incluso entre procesos simultáneos.
      document: `9${documentEntropy}`,
      firstName: `QA${timestamp.slice(-4)}`,
      lastName: 'Bonbonite',
      email: `qa.bonbonite.${timestamp}.${workerIndex}@${emailDomain}`,
      password: `B0n!${passwordEntropy}Aa`,
    },
    profile: {
      firstName: `QA Editado ${timestamp.slice(-4)}`,
      lastName: 'Automatización',
      birthDate: '1990-01-01',
      gender: 'Otro',
      phone: '3000000000',
    },
  };
}

export function toSafeCustomerContext(account: CustomerAccount): SafeCustomerContext {
  return {
    registration: {
      document: account.registration.document,
      firstName: account.registration.firstName,
      lastName: account.registration.lastName,
      email: account.registration.email,
    },
    profile: account.profile,
    purpose: 'registro, login, modificación de perfil y orden técnica de QA',
  };
}
