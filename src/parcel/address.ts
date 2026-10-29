// Street addresses as typed and as the parcel data writes them. The data mixes
// spellings ("OAKVIEW AVENUE", "VALLEY ST", "1653-55 SPRINGFIELD AVE", "57-A NEWARK WAY",
// "489-91 VALLEY ST + REAR"), so both sides are put in one form before comparing.

const SUFFIXES: Record<string, string> = {
  AVENUE: 'AVENUE', AVE: 'AVENUE', AV: 'AVENUE',
  STREET: 'STREET', ST: 'STREET',
  ROAD: 'ROAD', RD: 'ROAD', RAOD: 'ROAD',
  PLACE: 'PLACE', PL: 'PLACE',
  DRIVE: 'DRIVE', DR: 'DRIVE',
  COURT: 'COURT', CT: 'COURT',
  LANE: 'LANE', LN: 'LANE',
  TERRACE: 'TERRACE', TER: 'TERRACE', TERR: 'TERRACE',
  BOULEVARD: 'BOULEVARD', BLVD: 'BOULEVARD',
  PARKWAY: 'PARKWAY', PKWY: 'PARKWAY',
  CIRCLE: 'CIRCLE', CIR: 'CIRCLE',
  CRESCENT: 'CRESCENT', CRES: 'CRESCENT',
  WAY: 'WAY',
  PARK: 'PARK',
};
const DIRECTIONS: Record<string, string> = { N: 'NORTH', S: 'SOUTH', E: 'EAST', W: 'WEST' };
/** Words the data adds after the street that aren't part of its name. */
const EXTRAS = new Set(['REAR', '+']);

export interface StreetAddress {
  /** House number range: "489-91" is 489 to 491; a single number has from = to. Null if there's no number. */
  from: number | null;
  to: number | null;
  /** A unit letter written onto the number ("57-A", "53B"). */
  unit: string | null;
  /** Street name words, abbreviations expanded: ["OAKVIEW"], ["SOUTH", "ORANGE"]. */
  name: string[];
  /** AVENUE, STREET, … or null when none was written (or it's one we don't know). */
  suffix: string | null;
}

/** "34 Oakview Ave" or "1653-55 SPRINGFIELD AVE" → its parts. */
export function parseStreet(text: string): StreetAddress {
  const words = text
    .toUpperCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[.,#]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !EXTRAS.has(w) && !/^HSE/.test(w));
  let from: number | null = null;
  let to: number | null = null;
  let unit: string | null = null;
  const num = words[0]?.match(/^(\d+)(?:-?([A-Z]))?(?:-(\d+))?$/);
  if (num) {
    words.shift();
    from = Number(num[1]);
    unit = num[2] ?? null;
    to = num[3] ? Number(num[1].slice(0, Math.max(0, num[1].length - num[3].length)) + num[3]) : from;
    if (to < from) to = from;
  }
  let suffix: string | null = null;
  const last = words[words.length - 1];
  if (words.length > 1 && last && SUFFIXES[last]) {
    suffix = SUFFIXES[last];
    words.pop();
  }
  return { from, to, unit, name: words.map((w) => DIRECTIONS[w] ?? w), suffix };
}

/** The word to search the data with: the longest word of the street name. */
export function searchWord(a: StreetAddress): string | null {
  return a.name.reduce<string | null>((best, w) => (!best || w.length > best.length ? w : best), null);
}

/** Does a parcel's address (from the data) match the address the contractor typed? */
export function sameAddress(typed: StreetAddress, parcel: StreetAddress): boolean {
  if (typed.name.join(' ') !== parcel.name.join(' ')) return false;
  if (typed.suffix && parcel.suffix && typed.suffix !== parcel.suffix) return false;
  if (typed.from === null || parcel.from === null || parcel.to === null) return false;
  if (typed.from < parcel.from || typed.from > parcel.to) return false;
  return !typed.unit || !parcel.unit || typed.unit === parcel.unit;
}

/** "MAPLEWOOD TWP" → "Maplewood"; "ATLANTIC CITY CITY" → "Atlantic City". */
export function townName(munName: string): string {
  const words = munName.trim().split(/\s+/);
  if (words.length > 1 && ['TWP', 'TOWNSHIP', 'CITY', 'BORO', 'BOROUGH', 'TOWN', 'VILLAGE'].includes(words[words.length - 1])) words.pop();
  return words.map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}
