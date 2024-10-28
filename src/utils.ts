export function parseNumber(value?: string): number | null {
  if (!value) return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

export function isValidTxHash(hash: string) {
  if (!hash || typeof hash !== "string") {
    return false;
  }

  return /^[0-9a-f]{64}$/i.test(hash);
}
