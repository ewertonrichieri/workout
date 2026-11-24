const DEGREE_SIGN = /\s*°\s*/g;
const DEGREE_WORD = " degree ";
const CAMEL_CASE_BOUNDARY = /([a-z])([A-Z])/g;
const COMBINING_MARKS = /[̀-ͯ]/g;
const NON_ALPHANUMERIC = /[^a-z0-9]+/g;
const MIN_PLURAL_TOKEN_LENGTH = 3;

/** Qualifiers that only describe the media (camera angle, model), not a different exercise. */
const MEDIA_ONLY_QUALIFIERS = /\((?:male|female|side pov|back pov)\)/gi;

/** Broken encodings found in the sources, mapped to the intended text. Order matters. */
const MOJIBAKE_REPLACEMENTS: ReadonlyArray<readonly [string, string]> = [
  ["Ð²Â°", "°"],
  ["Â°", "°"],
];

function foldToWords(text: string): string[] {
  return text
    .replace(DEGREE_SIGN, DEGREE_WORD)
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(NON_ALPHANUMERIC, " ")
    .split(" ")
    .filter(Boolean);
}

const ES_PLURAL_ENDING = /(?:ss|ch|sh|x)es$/;

function singularize(token: string): string {
  if (token.length < MIN_PLURAL_TOKEN_LENGTH || !token.endsWith("s") || token.endsWith("ss")) return token;
  return ES_PLURAL_ENDING.test(token) ? token.slice(0, -2) : token.slice(0, -1);
}

/** Normalizes a muscle or equipment term from any source ("hipFlexors" → "hip flexors"). */
export function normalizeTerm(term: string): string {
  return foldToWords(term.replace(CAMEL_CASE_BOUNDARY, "$1 $2")).join(" ");
}

/** Removes qualifiers such as "(side pov)" that only describe the media. */
export function stripMediaQualifiers(name: string): string {
  return name.replace(MEDIA_ONLY_QUALIFIERS, " ").replace(/\s+/g, " ").trim();
}

/** Key used to compare exercise names across sources. */
export function buildNameMatchKey(name: string): string {
  return foldToWords(stripMediaQualifiers(name)).map(singularize).join(" ");
}

export function toSlug(text: string): string {
  return foldToWords(text).join("-");
}

export function repairMojibake(text: string): string {
  return MOJIBAKE_REPLACEMENTS.reduce((repaired, [broken, fixed]) => repaired.replaceAll(broken, fixed), text);
}
