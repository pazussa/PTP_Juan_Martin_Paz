export function createUnknownTrackingNumber(): string {
  const trackingNumber = process.env.PQRS_UNKNOWN_TRACKING_NUMBER ?? '999999999999999';
  if (!/^\d{15}$/.test(trackingNumber)) {
    throw new Error('PQRS_UNKNOWN_TRACKING_NUMBER debe contener exactamente 15 dígitos.');
  }

  return trackingNumber;
}
