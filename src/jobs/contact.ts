// Contact details typed on the screens: checked, and written one way (the test profile's, 973-555-0101).

/** A 10-digit phone number in any common format (a leading 1 is dropped) as 973-555-0101, or null if it isn't one. */
export function tidyPhone(s: string): string | null {
  let d = s.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : null;
}

/** A 9-digit FEIN as 00-0000000, or null if it isn't one. */
export function tidyFein(s: string): string | null {
  const d = s.replace(/\D/g, '');
  return d.length === 9 ? `${d.slice(0, 2)}-${d.slice(2)}` : null;
}

export const isZip = (s: string) => /^\d{5}$/.test(s.trim());

export const PHONE_HINT = 'a 10-digit phone number, like 973-555-0101';

/** The same checks for the browser (`pattern` and `title`), so a bad entry is caught before a form is sent. */
export const PATTERNS = {
  phone: { pattern: String.raw`\D*(1\D*)?(\d\D*){10}`, title: 'A 10-digit phone number, like 973-555-0101' },
  zip: { pattern: String.raw`\d{5}`, title: 'A 5-digit ZIP code' },
  fein: { pattern: String.raw`\D*(\d\D*){9}`, title: 'A 9-digit FEIN, like 12-3456789' },
};
