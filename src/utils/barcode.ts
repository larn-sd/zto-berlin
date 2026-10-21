/**
 * Barcode normalization and sanitization utilities
 * Handles hardware scanner guns, GS1 AIM prefixes, invisible control characters, and flexible matching.
 */

export function cleanScannedBarcode(raw: string): string {
  if (!raw) return '';

  let code = raw;

  // 1. Remove invisible ASCII control characters (0x00 - 0x1F, 0x7F) like EOT, GS, RS, US, CR, LF, TAB
  code = code.replace(/[\x00-\x1F\x7F]/g, '');

  // 2. Strip standard GS1 AIM identifiers (e.g. ]C1, ]e0, ]d2, ]Q3, etc.) common from 2D and modern 1D scanners
  code = code.replace(/^\][a-zA-Z0-9]{2}/, '');

  // 3. Remove leading/trailing whitespaces and full-width spaces
  code = code.trim().replace(/[\u3000\u00A0]/g, '');

  return code;
}

/**
 * Compare two barcode strings with maximum tolerance:
 * 1. Exact match (case insensitive)
 * 2. Stripped alphanumeric match (ignoring dashes, slashes, spaces)
 * 3. Partial tracking match if one ends with or contains the other (min 6 chars)
 */
export function isBarcodeMatch(codeA: string, codeB: string): boolean {
  if (!codeA || !codeB) return false;

  const a = cleanScannedBarcode(codeA).toUpperCase();
  const b = cleanScannedBarcode(codeB).toUpperCase();

  if (a === b) return true;

  // Stripped alphanumeric
  const aAlpha = a.replace(/[^A-Z0-9]/g, '');
  const bAlpha = b.replace(/[^A-Z0-9]/g, '');

  if (aAlpha && bAlpha && aAlpha === bAlpha) return true;

  // Substring match for long shipping tracking codes (e.g., 77130496046222)
  if (aAlpha.length >= 8 && bAlpha.length >= 8) {
    if (aAlpha.includes(bAlpha) || bAlpha.includes(aAlpha)) return true;
  }

  return false;
}
