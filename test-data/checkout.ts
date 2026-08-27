import type { ProfileData, SafeCustomerContext } from './account';

export type CheckoutData = {
  readonly document: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone: string;
  readonly gender: 'option_1' | 'option_2' | 'option_3';
  readonly country: 'CO';
  readonly state: 'ANT';
  readonly city: 'Medellín';
  readonly address: string;
  readonly postcode: string;
  readonly orderNote: string;
};

const checkoutGender = (profile: ProfileData): CheckoutData['gender'] => {
  if (profile.gender === 'Masculino') {
    return 'option_1';
  }
  if (profile.gender === 'Femenino') {
    return 'option_2';
  }
  return 'option_3';
};

export function createCheckoutData(customer: SafeCustomerContext): CheckoutData {
  return {
    document: customer.registration.document,
    firstName: customer.profile.firstName,
    lastName: customer.profile.lastName,
    email: customer.registration.email,
    phone: customer.profile.phone,
    gender: checkoutGender(customer.profile),
    country: 'CO',
    state: 'ANT',
    city: 'Medellín',
    address: 'Calle 1 # 1-1 - PRUEBA QA NO DESPACHAR',
    postcode: '050001',
    orderNote:
      'PEDIDO AUTOMATIZADO QA - NO DESPACHAR - CANCELAR ADMINISTRATIVAMENTE - ' +
      `REFERENCIA ${customer.registration.document}.`,
  };
}
