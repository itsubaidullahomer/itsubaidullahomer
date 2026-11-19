const MAX = 40;

/**
 * Turns the last part of a /for/… link into a business name that is safe to show.
 * "smith-septic" becomes "Smith Septic"; a name typed with capitals is kept as typed.
 * Anything that is not a letter, a number or ordinary name punctuation is dropped.
 */
export function businessFromSlug(raw: string): string | null {
  let text = raw;
  try {
    text = decodeURIComponent(raw);
  } catch {
    // A malformed escape: fall through with the raw text.
  }
  text = text
    .replace(/[-_+]+/g, " ")
    .replace(/[^\p{L}\p{N} &'’.,]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!/[\p{L}\p{N}]/u.test(text)) return null;
  if (text.length > MAX) text = text.slice(0, MAX).trim();
  if (text === text.toLowerCase()) {
    text = text.replace(/(^|\s)(\p{L})/gu, (_, space: string, letter: string) => space + letter.toUpperCase());
  }
  return text;
}

/** The link to send a business: its name, lower-cased, with hyphens. */
export function slugForBusiness(name: string) {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
}

/** A web address for the drawings: "Smith Septic" becomes smithseptic.com. */
export function domainForBusiness(name: string) {
  const joined = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return joined ? `${joined.slice(0, 22)}.com` : null;
}
