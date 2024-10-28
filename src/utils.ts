export function parseNumber(value?: string): number | null {
  if (!value) return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

export function isValidBitcoinTxHex(txHex: string) {
  if (!txHex || typeof txHex !== "string") {
    return false;
  }

  // Check if the string only contains valid hexadecimal characters
  const hexRegex = /^[0-9a-fA-F]*$/;
  if (!hexRegex.test(txHex)) {
    return false;
  }

  // Check if the length is even (each byte is represented by 2 hex characters)
  if (txHex.length % 2 !== 0) {
    return false;
  }

  // Check minimum transaction size (version[4] + input count[1] + output count[1] + locktime[4] = 10 bytes minimum)
  if (txHex.length < 20) {
    // 10 bytes * 2 characters per byte
    return false;
  }

  try {
    // Basic structure validation
    const version = txHex.slice(0, 8); // 4 bytes for version

    // Validate version (should be 1 or 2 for most transactions)
    const versionNum = parseInt(version, 16);
    if (versionNum < 1 || versionNum > 2) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}
