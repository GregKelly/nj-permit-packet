// The tax record's dwelling-unit count (DWELL) as a check on the home type the
// contractor picks. It never sets the home type: a count of 1 can't tell a
// detached house from a twin, and the record can be wrong. The contractor's choice counts.

/** The unit counts that fit each home type. */
const FITS: Record<string, (units: number) => boolean> = {
  detached_1f: (n) => n === 1,
  detached_2f: (n) => n === 2,
  attached: (n) => n === 1 || n === 2,
  three_or_more_units: (n) => n >= 3,
};

export const HOME_TYPE_LABELS: Record<string, string> = {
  detached_1f: 'Detached one-family house',
  detached_2f: 'Detached two-family house',
  attached: 'Attached home (twin or townhouse)',
  three_or_more_units: 'Building with three or more homes',
  non_residential: 'Not a home (commercial or other)',
};

/** A note when the home type doesn't fit the tax record's unit count; null when it fits or there's no count. */
export function unitsMismatch(homeType: string, units: number | null): string | null {
  const fits = FITS[homeType];
  if (units === null || !fits || fits(units)) return null;
  const label = HOME_TYPE_LABELS[homeType].toLowerCase();
  return `Tax records list ${units} dwelling unit${units === 1 ? '' : 's'} at this property, which doesn't fit "${label}". Check the home type before you continue. Your choice is what counts; Permit Packet handles one- and two-family homes only.`;
}
