// Normalization & Smart Customer Matching Utility for Laos Logistics
import { Customer, WarehouseParcel } from '../types';

/**
 * Normalizes Lao phone numbers into canonical 8-digit string.
 * Discards dummy phone numbers like "0", "00", "020", or empty.
 * Examples:
 * "59977559" -> "59977559"
 * "2059977559" -> "59977559"
 * "02059977559" -> "59977559"
 * "+856 20 59977559" -> "59977559"
 * "22212741" -> "22212741"
 * "2022212741" -> "22212741"
 * "0" -> ""
 * "020" -> ""
 */
export function normalizePhone(raw?: string | null): string {
  if (!raw) return '';
  const clean = String(raw).replace(/[^0-9]/g, '');
  if (!clean) return '';

  // Discard placeholder/dummy phone numbers such as "0", "00", "020", "20"
  if (clean === '0' || clean === '00' || clean === '020' || clean === '20' || clean.length < 6) {
    return '';
  }

  // Lao country code: 856 20...
  if (clean.startsWith('85620') && clean.length >= 13) {
    return clean.slice(-8);
  }
  if (clean.startsWith('856') && clean.length >= 11) {
    const after = clean.slice(3);
    if (after.startsWith('20')) return after.slice(-8);
    if (after.startsWith('020')) return after.slice(-8);
    return clean.slice(-8);
  }

  // Lao domestic prefix: 020 ... (11 digits: 020XXXXXXXX)
  if (clean.startsWith('020') && clean.length === 11) {
    return clean.slice(3);
  }

  // 20 ... (10 digits: 20XXXXXXXX)
  if (clean.startsWith('20') && clean.length === 10) {
    return clean.slice(2);
  }

  // Standard 8 digits (e.g. 59977559 or 22212741)
  if (clean.length === 8) {
    return clean;
  }

  // If longer, take last 8
  if (clean.length > 8) {
    return clean.slice(-8);
  }

  return clean;
}

/**
 * Checks if a phone number is the shop owner's order phone number (59977559 / 2059977559)
 * Used when ordering on behalf of multiple distinct customers.
 */
export function isShopOrderPhone(rawPhone?: string | null): boolean {
  const norm = normalizePhone(rawPhone);
  return norm === '59977559';
}

/**
 * Formats canonical phone to standard display: "020 5997 7559"
 */
export function formatLaoPhoneDisplay(raw?: string | null): string {
  if (!raw) return '';
  const norm = normalizePhone(raw);
  if (!norm) return raw === '0' ? '' : (String(raw).trim() || '');
  if (norm.length === 8) {
    return `020 ${norm.slice(0, 4)} ${norm.slice(4)}`;
  }
  return String(raw).trim();
}

/**
 * Clean & separate customer name and phone when warehouse manifests bundle them:
 * Examples:
 * - "hch 59977559", phone: "" -> name: "hch", phone: "59977559"
 * - "hch 0", phone: "" -> name: "hch", phone: "0"
 * - "hch", phone: "59977559" -> name: "hch", phone: "59977559"
 * - "hch", phone: "0" -> name: "hch", phone: "0"
 * - "vinut 2022212741", phone: "" -> name: "vinut", phone: "2022212741"
 * - "vnut 22212741", phone: "" -> name: "vnut", phone: "22212741"
 * - "koung 59977559", phone: "" -> name: "koung", phone: "59977559"
 * - "mei 59977559", phone: "" -> name: "mei", phone: "59977559"
 * - "ying 59977559", phone: "" -> name: "ying", phone: "59977559"
 */
export function cleanCustomerNameAndPhone(
  rawName?: string | null,
  rawPhone?: string | null
): { name: string; phone: string } {
  let name = (rawName || '').trim();
  let phone = (rawPhone || '').trim();

  // Pattern A: Name followed by space/separator and phone digits or single 0
  const trailingPhoneRegex = /^(.*?)[,\s_\/-]+((?:020|20|85620)?\d{6,10}|0)$/i;
  const matchTrailing = name.match(trailingPhoneRegex);

  if (matchTrailing) {
    const extractedName = matchTrailing[1].trim();
    const extractedPhone = matchTrailing[2].trim();
    if (extractedName) {
      name = extractedName;
      // If original phone was missing or "0", adopt the extracted phone
      if (!phone || phone === '0' || phone === '00') {
        phone = extractedPhone;
      }
    }
  }

  // Pattern B: attached number, e.g. "hch0" or "hch59977559"
  const attachedRegex = /^([a-zA-Z\u0E80-\u0EFF]+)\s*(0|(?:020|20)?\d{7,8})$/i;
  const matchAttached = name.match(attachedRegex);
  if (matchAttached) {
    const extractedName = matchAttached[1].trim();
    const extractedPhone = matchAttached[2].trim();
    if (extractedName && (!phone || phone === '0' || phone === '00')) {
      name = extractedName;
      phone = extractedPhone;
    }
  }

  return { name, phone };
}

/**
 * Computes Levenshtein distance between two strings
 */
function levenshteinDistance(s1: string, s2: string): number {
  const a = s1.toLowerCase();
  const b = s2.toLowerCase();
  const costs: number[] = [];

  for (let i = 0; i <= a.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= b.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (a.charAt(i - 1) !== b.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[b.length] = lastValue;
  }
  return costs[b.length];
}

/**
 * Strips vowels and numbers to get consonant skeleton
 * e.g. "vinut" -> "vnt", "vnut" -> "vnt"
 */
function getConsonantSkeleton(name: string): string {
  return name
    .toLowerCase()
    .replace(/[0-9aeiouy\s_.-]/g, '')
    // Lao vowels and tones
    .replace(/[ະາິີຶືຸູົຼຽເແໂໃໄ່້໊໋]/g, '');
}

/**
 * Checks if two customer names are likely the same person:
 * Accounts for:
 * 1. Exact match (case insensitive): "hch" === "HCH"
 * 2. Transposed/repeated letter typos for short customer codes (e.g. hch, chc, chh, hhc)
 * 3. Vowel-drop skeleton match (e.g. "vinut" vs "vnut")
 * 4. Typo tolerance using Levenshtein distance
 * 
 * Distinct names like "mei", "ying", "koung", "somxay" will NEVER match "hch".
 */
export function areNamesSimilar(name1?: string | null, name2?: string | null): boolean {
  const n1 = (name1 || '').trim().toLowerCase();
  const n2 = (name2 || '').trim().toLowerCase();

  // If one is empty, cannot compare
  if (!n1 || !n2) return false;

  // 1. Exact match (case insensitive): "hch" === "hch", "ying" === "ying"
  if (n1 === n2) return true;

  // EXPLICIT SEPARATION RULE: "mei" and "mie" are strictly DIFFERENT customers! Never match them!
  if ((n1 === 'mei' && n2 === 'mie') || (n1 === 'mie' && n2 === 'mei')) {
    return false;
  }

  // EXPLICIT MATCH RULE 1: "18" and "1*" (keyboard Shift+8 typo or wildcard)
  if ((n1 === '18' && n2 === '1*') || (n1 === '1*' && n2 === '18')) {
    return true;
  }

  // EXPLICIT MATCH RULE 2: "ck" and "k*" (or "kc" and "k*", "ck" and "*k")
  if (
    (n1 === 'ck' && n2 === 'k*') || (n1 === 'k*' && n2 === 'ck') ||
    (n1 === 'kc' && n2 === 'k*') || (n1 === 'k*' && n2 === 'kc') ||
    (n1 === 'ck' && n2 === '*k') || (n1 === '*k' && n2 === 'ck')
  ) {
    return true;
  }

  // Asterisk wildcard matching for short codes (length 2-4)
  // e.g. "1*" matches "18", "k*" matches "kc" or "ck"
  if (n1.length === n2.length && n1.length <= 4 && (n1.includes('*') || n2.includes('*'))) {
    let diff = 0;
    for (let i = 0; i < n1.length; i++) {
      if (n1[i] !== '*' && n2[i] !== '*' && n1[i] !== n2[i]) {
        diff++;
      }
    }
    if (diff === 0) return true;
  }

  // 2. Anagram / transposed / repeated character typos for short warehouse codes (<= 4 chars)
  // ONLY for codes WITHOUT vowels (e.g. hch, chc, chh, hhc, hc, ch).
  // Strictly prevent anagrams on names with vowels like "mei" vs "mie" or "noi" vs "nio"!
  const hasVowels1 = /[aeiou]/.test(n1);
  const hasVowels2 = /[aeiou]/.test(n2);
  if (!hasVowels1 && !hasVowels2 && n1.length <= 4 && n2.length <= 4) {
    const chars1 = new Set(n1.split(''));
    const chars2 = new Set(n2.split(''));

    // Check if both strings consist of the exact same set of unique characters (e.g. {'h', 'c'})
    if (chars1.size === chars2.size && Array.from(chars1).every(c => chars2.has(c))) {
      return true;
    }
  }

  // 3. Vowel-drop skeleton match for names:
  // e.g. "vinut" vs "vnut" -> both start with 'v' and consonant skeleton is "vnt" === "vnt"
  // Note: Short rhyming names like "ying" vs "sing" have different initial consonants ('y' vs 's') and different skeletons ('ng' vs 'sng').
  if (n1[0] === n2[0]) {
    const sk1 = getConsonantSkeleton(n1);
    const sk2 = getConsonantSkeleton(n2);
    if (sk1 && sk2 && sk1.length >= 3 && sk1 === sk2) {
      return true;
    }
  }

  // 4. Typo tolerance using Levenshtein distance for longer names only:
  // CRITICAL RULE: Monosyllabic / short names (<= 5 chars) like "ying", "sing", "ving", "koung", "mei", "mie"
  // MUST NEVER match each other because changing 1 consonant/vowel is a completely DIFFERENT person!
  const minLen = Math.min(n1.length, n2.length);

  // For longer names (>= 6 chars), ONLY match if they share the SAME initial letter:
  // e.g. "khamsavanh" vs "khamsavang" (starts with 'k', length 10, dist 1)
  if (minLen >= 6 && n1[0] === n2[0]) {
    const dist = levenshteinDistance(n1, n2);
    if (dist <= 1) return true;
    if (minLen >= 8 && dist <= 2) return true;
  }

  return false;
}

/**
 * Core customer matching algorithm based on user's exact business rules:
 * - Phone 59977559 is the SHOP OWNER'S PERSONAL NUMBER used for ordering on behalf of customers.
 *   Therefore, parcels with 59977559 belong to DIFFERENT customers unless names match/typo:
 *   - "hch", "chc", "chh", "HCH", "hch 0" -> SAME CUSTOMER ("hch")
 *   - "18", "1*" -> SAME CUSTOMER ("18")
 *   - "ck", "k*" -> SAME CUSTOMER ("ck")
 *   - "mei", "mei 0" -> SEPARATE CUSTOMER ("mei")
 *   - "mie", "mie 0" -> SEPARATE CUSTOMER ("mie") (mei and mie are NEVER merged!)
 *   - "ying", "ying 0" -> SEPARATE CUSTOMER ("ying")
 *   - "koung" -> SEPARATE CUSTOMER ("koung")
 * - "18" and "1*", and "ck" and "k*" with same phone -> SAME CUSTOMER
 * - For normal customer phones (not 59977559):
 *   - Same phone + Similar name (vinut & vnut, 18 & 1*, ck & k*) -> SAME CUSTOMER
 *   - Same phone + Different name (somxay & phonsay, mei & mie) -> DIFFERENT CUSTOMERS
 * - Same name + One has phone & One has phone 0/blank -> SAME CUSTOMER
 */
export function areSameCustomer(
  c1: { name?: string | null; phone?: string | null },
  c2: { name?: string | null; phone?: string | null }
): boolean {
  // First clean both records to separate name and embedded phone/0
  const clean1 = cleanCustomerNameAndPhone(c1.name, c1.phone);
  const clean2 = cleanCustomerNameAndPhone(c2.name, c2.phone);

  const n1Lower = (clean1.name || '').trim().toLowerCase();
  const n2Lower = (clean2.name || '').trim().toLowerCase();

  // EXPLICIT SEPARATION RULE: "mei" and "mie" are strictly DIFFERENT customers!
  // Even if they share the same phone (or 59977559), they must NEVER be merged!
  if ((n1Lower === 'mei' && n2Lower === 'mie') || (n1Lower === 'mie' && n2Lower === 'mei')) {
    return false;
  }

  const p1 = normalizePhone(clean1.phone);
  const p2 = normalizePhone(clean2.phone);

  const namesMatch = areNamesSimilar(clean1.name, clean2.name);

  // USER RULE: "18" and "1*", and "ck" and "k*" with same phone are the same customer!
  const is18Pair = (n1Lower === '18' && n2Lower === '1*') || (n1Lower === '1*' && n2Lower === '18');
  const isCkPair = 
    (n1Lower === 'ck' && n2Lower === 'k*') || (n1Lower === 'k*' && n2Lower === 'ck') ||
    (n1Lower === 'kc' && n2Lower === 'k*') || (n1Lower === 'k*' && n2Lower === 'kc') ||
    (n1Lower === 'ck' && n2Lower === '*k') || (n1Lower === '*k' && n2Lower === 'ck');

  // Special Rule for Shop Master Ordering Phone (59977559):
  // Since 59977559 is used to order for many customers, customer identity
  // MUST strictly depend on name similarity!
  // e.g. "hch", "chc", "chh", "HCH" match each other, "18" & "1*" match, "ck" & "k*" match,
  // but "mei" and "ying" and "mie" DO NOT!
  if (p1 === '59977559' || p2 === '59977559') {
    if (namesMatch || is18Pair || isCkPair) return true;
    return false;
  }

  // Case 1: Both records have valid real phone numbers
  if (p1 && p2) {
    // If phone numbers are different, they are different customers
    if (p1 !== p2) return false;

    // Both phone numbers match!
    // Check if names match, or if 18 & 1*, or ck & k*:
    if (namesMatch || is18Pair || isCkPair) {
      return true;
    }

    // Different names with same phone -> different customers sharing a phone
    return false;
  }

  // Case 2: One has a valid phone and the other has "0" or blank, OR both lack phone:
  // e.g. "hch 59977559" & "hch 0" OR "mei 59977559" & "mei 0" OR "18" & "1*"
  if (namesMatch || is18Pair || isCkPair) {
    return true;
  }

  return false;
}

/**
 * Deduplicate and consolidate an array of customers
 * Merges entries that belong to the same person, cleans dissimilar aliases, and retains valid phone numbers.
 */
export function consolidateCustomers(list: Customer[]): Customer[] {
  const merged: Customer[] = [];

  for (const c of list) {
    const cleanCurrent = cleanCustomerNameAndPhone(c.name, c.phone);

    const existingIndex = merged.findIndex(existing => {
      const cleanExisting = cleanCustomerNameAndPhone(existing.name, existing.phone);
      return areSameCustomer(cleanExisting, cleanCurrent);
    });

    if (existingIndex !== -1) {
      // Merge into merged[existingIndex]
      const existing = merged[existingIndex];

      // Canonical name selection
      let bestName = existing.name;
      // Prefer standard 'hch' if any alias is 'hch'
      if (cleanCurrent.name.toLowerCase() === 'hch' || existing.name.toLowerCase() === 'hch') {
        bestName = 'hch';
      } else if (cleanCurrent.name.toLowerCase() === '18' || existing.name.toLowerCase() === '18') {
        bestName = '18';
      } else if (cleanCurrent.name.toLowerCase() === 'ck' || existing.name.toLowerCase() === 'ck') {
        bestName = 'ck';
      } else if (cleanCurrent.name && cleanCurrent.name.length >= existing.name.length && areNamesSimilar(cleanCurrent.name, existing.name)) {
        bestName = cleanCurrent.name;
      }

      // Collect name aliases, strictly ensuring dissimilar names (like mei or ying) are purged!
      const rawAliases = new Set([
        ...(existing.nameAliases || [existing.name]),
        ...(c.nameAliases || [c.name]),
        c.name,
        cleanCurrent.name
      ]);
      const validNameAliases = Array.from(rawAliases).filter(alias =>
        alias && areNamesSimilar(alias, bestName)
      );

      const phoneAliases = new Set([
        ...(existing.phoneAliases || []),
        ...(c.phoneAliases || [])
      ]);
      if (existing.phone && existing.phone !== '0') phoneAliases.add(existing.phone);
      if (c.phone && c.phone !== '0') phoneAliases.add(c.phone);
      if (cleanCurrent.phone && cleanCurrent.phone !== '0') phoneAliases.add(cleanCurrent.phone);

      const normExisting = normalizePhone(existing.phone);
      const normCurrent = normalizePhone(c.phone) || normalizePhone(cleanCurrent.phone);

      // Prefer the real phone number over '0' or blank!
      let bestPhone = existing.phone;
      if (!normExisting && normCurrent) {
        bestPhone = formatLaoPhoneDisplay(normCurrent);
      }

      merged[existingIndex] = {
        ...existing,
        name: bestName,
        phone: bestPhone,
        village: existing.village || c.village || '',
        district: existing.district || c.district || '',
        province: existing.province || c.province || 'ນະຄອນຫຼວງວຽງຈັນ',
        notes: existing.notes || c.notes || '',
        totalParcels: Math.max(existing.totalParcels || 0, c.totalParcels || 0),
        totalSpent: Math.max(existing.totalSpent || 0, c.totalSpent || 0),
        lastActive: (existing.lastActive && c.lastActive)
          ? (existing.lastActive > c.lastActive ? existing.lastActive : c.lastActive)
          : (existing.lastActive || c.lastActive || ''),
        nameAliases: validNameAliases,
        phoneAliases: Array.from(phoneAliases).filter(Boolean)
      };
    } else {
      const normP = normalizePhone(cleanCurrent.phone) || normalizePhone(c.phone);
      const cleanAliases = Array.from(new Set([...(c.nameAliases || [c.name]), c.name, cleanCurrent.name]))
        .filter(alias => alias && areNamesSimilar(alias, cleanCurrent.name || c.name));

      merged.push({
        ...c,
        name: cleanCurrent.name || c.name,
        phone: normP ? formatLaoPhoneDisplay(normP) : '',
        nameAliases: cleanAliases.length > 0 ? cleanAliases : [cleanCurrent.name || c.name],
        phoneAliases: Array.from(new Set([...(c.phoneAliases || []), c.phone, cleanCurrent.phone].filter(p => p && p !== '0')))
      });
    }
  }

  return merged;
}

/**
 * Intelligent customer database builder and synchronizer:
 * Aggregates all parcels and ensures every customer is represented with strict separation:
 * - "hch", "chc", "chh", "HCH", "hch 0" -> single profile for "hch"
 * - "mei" -> separate profile for "mei"
 * - "ying" -> separate profile for "ying"
 * - "koung" -> separate profile for "koung"
 */
export function syncCustomersWithParcels(
  parcels: WarehouseParcel[],
  existingCustomers: Customer[] = []
): Customer[] {
  const result: Customer[] = [];

  parcels.forEach((p) => {
    const rawName = (p.customerName || '').trim();
    const rawPhone = (p.customerPhone || '').trim();
    if (!rawName && !rawPhone) return;

    const { name: cleanName, phone: cleanPhone } = cleanCustomerNameAndPhone(rawName, rawPhone);
    const normPhone = normalizePhone(cleanPhone);
    const displayPhone = formatLaoPhoneDisplay(cleanPhone);

    // 1. Look for matching customer already added in current batch
    let existingIndex = result.findIndex((c) =>
      areSameCustomer(
        { name: c.name, phone: c.phone },
        { name: cleanName, phone: cleanPhone }
      )
    );

    // 2. If not yet in result, check if it matches an existing saved customer
    if (existingIndex === -1 && existingCustomers.length > 0) {
      const savedIndex = existingCustomers.findIndex((c) =>
        areSameCustomer(
          { name: c.name, phone: c.phone },
          { name: cleanName, phone: cleanPhone }
        )
      );

      if (savedIndex !== -1) {
        const saved = existingCustomers[savedIndex];
        result.push({
          ...saved,
          name: saved.name || cleanName,
          phone: saved.phone || (normPhone ? displayPhone : ''),
          notes: saved.notes || ''
        });
        existingIndex = result.length - 1;
      }
    }

    if (existingIndex !== -1) {
      const existing = result[existingIndex];
      const nameAliases = new Set(existing.nameAliases || [existing.name]);
      const phoneAliases = new Set(existing.phoneAliases || (existing.phone ? [existing.phone] : []));

      // Strictly ensure dissimilar names are not added to aliases
      if (cleanName && areNamesSimilar(cleanName, existing.name)) {
        nameAliases.add(cleanName);
      }
      if (rawName && areNamesSimilar(rawName, existing.name)) {
        nameAliases.add(rawName);
      }
      if (rawPhone && rawPhone !== '0') phoneAliases.add(rawPhone);
      if (cleanPhone && cleanPhone !== '0') phoneAliases.add(cleanPhone);

      // Prefer real phone number over 0 or empty
      let resolvedPhone = existing.phone;
      if (!normalizePhone(existing.phone) && normPhone) {
        resolvedPhone = displayPhone;
      }

      // Canonical name selection: prefer standard clean names 'hch', '18', 'ck'
      let canonicalName = existing.name;
      if (cleanName.toLowerCase() === 'hch' || existing.name.toLowerCase() === 'hch') {
        canonicalName = 'hch';
      } else if (cleanName.toLowerCase() === '18' || existing.name.toLowerCase() === '18') {
        canonicalName = '18';
      } else if (cleanName.toLowerCase() === 'ck' || existing.name.toLowerCase() === 'ck') {
        canonicalName = 'ck';
      }

      result[existingIndex] = {
        ...existing,
        name: canonicalName,
        phone: resolvedPhone,
        village: existing.village || p.customerAddress || '',
        nameAliases: Array.from(nameAliases).filter(Boolean),
        phoneAliases: Array.from(phoneAliases).filter(Boolean)
      };
    } else {
      // Create new customer
      const newCustomer: Customer = {
        id: `cust-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        name: cleanName || 'ລູກຄ້າ',
        phone: normPhone ? displayPhone : '',
        village: p.customerAddress || '',
        district: '',
        province: 'ນະຄອນຫຼວງວຽງຈັນ',
        notes: '',
        totalParcels: 0,
        totalSpent: 0,
        lastActive: p.date || new Date().toISOString().split('T')[0],
        nameAliases: cleanName ? [cleanName] : [],
        phoneAliases: normPhone ? [rawPhone, cleanPhone].filter(p => p && p !== '0') : []
      };
      result.push(newCustomer);
    }
  });

  // Also retain existing customers who have notes or were manually created even if not in parcels
  existingCustomers.forEach(ec => {
    const alreadyIn = result.some(r => r.id === ec.id || areSameCustomer(r, ec));
    if (!alreadyIn && (ec.notes || ec.totalSpent > 0)) {
      result.push({ ...ec });
    }
  });

  // Calculate live totals and statistics for each customer based on current parcels
  const updated = result.map((cust) => {
    const cleanCust = cleanCustomerNameAndPhone(cust.name, cust.phone);

    const matchingParcels = parcels.filter((p) => {
      const cleanP = cleanCustomerNameAndPhone(p.customerName || '', p.customerPhone || '');
      return areSameCustomer(cleanCust, cleanP);
    });

    const totalCount = matchingParcels.length;
    const spentAmount = matchingParcels
      .filter((p) => p.status === 'delivered')
      .reduce((sum, p) => sum + (p.customerPrice || 0), 0);

    const latestDate = matchingParcels.reduce((latest, p) => {
      if (!latest) return p.date;
      return p.date > latest ? p.date : latest;
    }, cust.lastActive);

    return {
      ...cust,
      totalParcels: totalCount,
      totalSpent: spentAmount,
      lastActive: latestDate || cust.lastActive
    };
  });

  return updated;
}
