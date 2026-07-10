/** Shared timestamp formatter for the shipment-detail panels. */
export const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
