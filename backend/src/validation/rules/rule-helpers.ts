/** True when a canonical string value is absent or blank. */
export const isBlank = (value: string | null | undefined): boolean =>
  value === null || value === undefined || value.trim() === '';

/**
 * Render an untrusted value for inclusion in an issue explanation. Strips control
 * characters and caps the length, so a hostile or oversized field value cannot
 * bloat the stored explanation or smuggle control bytes into any downstream sink
 * (logs, CSV/PDF export). Purely defensive — the UI already escapes for HTML.
 */
export function quote(value: unknown, max = 120): string {
  const clean = Array.from(String(value))
    .map((ch) => {
      const code = ch.charCodeAt(0);
      return code < 0x20 || code === 0x7f ? ' ' : ch;
    })
    .join('')
    .trim();
  const capped = clean.length > max ? `${clean.slice(0, max)}…` : clean;
  return `"${capped}"`;
}
