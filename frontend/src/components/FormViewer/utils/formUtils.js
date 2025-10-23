/**
 * Form utility functions
 * Pure functions for text normalization, number parsing, and formatting
 */

/**
 * Normalize text for comparison
 * Removes Vietnamese diacritics, converts to lowercase, and trims whitespace
 * @param {*} value - Value to normalize
 * @returns {string} Normalized text
 */
export const normalizeText = (value) =>
    String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

/**
 * Parse number from any locale format
 * Supports Vietnamese (1.000.000,50) and English (1,000,000.50) formats
 * Also handles percentages (50% -> 0.5)
 * @param {*} value - Value to parse
 * @returns {number|null} Parsed number or null if invalid
 */
export const parseNumberAnyLocale = (value) => {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;

    let s = String(value).trim();
    if (!s) return null;

    // Check for percentage
    const hasPercent = s.includes("%");
    s = s.replace(/%/g, "");

    // Handle different decimal separators
    if (s.includes(",") && !s.includes(".")) {
        // Vietnamese format: 1.000,50 -> 1000.50
        s = s.replace(/\./g, "").replace(",", ".");
    } else {
        // English format: 1,000.50 -> 1000.50
        s = s.replace(/,/g, "");
    }

    const n = Number(s);
    if (!Number.isFinite(n)) return null;

    return hasPercent ? n / 100 : n;
};

/**
 * Format number as Vietnamese percentage
 * @param {number} ratio - Ratio to format (0.5 -> 50%)
 * @returns {string} Formatted percentage string or empty if invalid
 */
export const formatPercentVi = (ratio) => {
    if (ratio === null || ratio === undefined || !Number.isFinite(ratio))
        return "";

    const nf = new Intl.NumberFormat("vi-VN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });

    return `${nf.format(ratio * 100)}%`;
};
