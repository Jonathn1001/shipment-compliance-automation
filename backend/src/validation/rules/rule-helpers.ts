/** True when a canonical string value is absent or blank. */
export const isBlank = (value: string | null | undefined): boolean =>
  value === null || value === undefined || value.trim() === '';
