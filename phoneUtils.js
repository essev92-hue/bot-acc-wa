// src/phoneUtils.js
// Mendukung semua nomor telepon di dunia menggunakan libphonenumber-js

import { parsePhoneNumber, isValidPhoneNumber, getCountries, getCountryCallingCode } from "libphonenumber-js";

/**
 * Format nomor telepon ke format internasional yang bersih
 * Support: +62, 08xx, 8xx (Indonesia), +1, +44, +86, +91, dll.
 * @param {string} input - Nomor telepon raw input
 * @param {string} defaultCountry - Kode negara default jika tidak ada +prefix (misal: "ID")
 * @returns {{ formatted: string, valid: boolean, country: string, flag: string }}
 */
export function formatPhone(input, defaultCountry = "ID") {
  try {
    // Bersihkan karakter non-digit kecuali + di awal
    let cleaned = input.trim().replace(/[\s\-().]/g, "");

    // Handle format lokal Indonesia: 08xx → +628xx
    if (/^0\d+$/.test(cleaned)) {
      cleaned = "+62" + cleaned.slice(1);
    }

    if (!cleaned.startsWith("+")) {
      cleaned = "+" + cleaned;
    }

    if (!isValidPhoneNumber(cleaned)) {
      // Coba parse dengan negara default
      const parsed = parsePhoneNumber(cleaned, defaultCountry);
      if (parsed && parsed.isValid()) {
        return {
          formatted: parsed.formatInternational(),
          valid: true,
          country: parsed.country ?? "??",
          flag: countryFlag(parsed.country),
        };
      }
      return { formatted: input, valid: false, country: "??", flag: "🌐" };
    }

    const parsed = parsePhoneNumber(cleaned);
    return {
      formatted: parsed.formatInternational(),
      valid: true,
      country: parsed.country ?? "??",
      flag: countryFlag(parsed.country),
    };
  } catch {
    return { formatted: input, valid: false, country: "??", flag: "🌐" };
  }
}

/**
 * Konversi kode negara ISO ke emoji bendera
 * Bekerja untuk semua negara di dunia (Unicode Regional Indicator Symbols)
 */
export function countryFlag(countryCode) {
  if (!countryCode || countryCode.length !== 2) return "🌐";
  const codePoints = [...countryCode.toUpperCase()].map(
    (c) => 0x1f1e6 + c.charCodeAt(0) - 65
  );
  return String.fromCodePoint(...codePoints);
}

/**
 * Normalisasi teks nama — support semua Unicode:
 * Latin, Arab, Cina, Jepang, Korea, Cyrillic, Thai, dll.
 */
export function normalizeName(name) {
  if (!name) return "(tanpa nama)";
  // Trim whitespace & normalize Unicode (NFC = composed form)
  return name.trim().normalize("NFC");
}

/**
 * Truncate teks panjang, support Unicode (tidak memotong di tengah karakter)
 */
export function truncate(text, maxLen = 30) {
  if (!text) return "";
  const arr = [...text]; // spread menghormati emoji & karakter multibyte
  if (arr.length <= maxLen) return text;
  return arr.slice(0, maxLen).join("") + "…";
}
