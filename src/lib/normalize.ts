const STRIP_SUFFIXES = [
  "llc", "inc", "corp", "corporation", "company", "co",
  "ltd", "limited", "lp", "llp", "pllc", "l.l.c.", "l.p.",
  "trust", "revocable trust", "family trust", "living trust",
  "holdings", "enterprises", "properties", "group", "partners",
  "investments", "development", "developers", "realty",
];

const STRIP_PATTERNS = /[.,\-_#&'"()]/g;

export function normalizeName(name: string): string {
  let n = name.toLowerCase().trim();
  n = n.replace(STRIP_PATTERNS, " ");
  // Remove suffixes
  for (const suffix of STRIP_SUFFIXES) {
    const re = new RegExp(`\\b${suffix}\\b`, "gi");
    n = n.replace(re, "");
  }
  // Collapse whitespace
  n = n.replace(/\s+/g, " ").trim();
  return n;
}

export function namesMatch(a: string, b: string): boolean {
  return normalizeName(a) === normalizeName(b);
}
