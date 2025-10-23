/**
 * Table utility functions
 * Functions for table manipulation and address management
 */

/**
 * Deep clone a table object using JSON serialization
 * @param {Object} source - Table object to clone
 * @returns {Object|null} Cloned table or null/undefined if source is falsy
 */
export const cloneTable = (source) =>
    source ? JSON.parse(JSON.stringify(source)) : source;

/**
 * Merge multiple address arrays, removing duplicates
 * Addresses are sorted to ensure deterministic ordering (prevents infinite loops)
 * @param {Array} list - Primary list of addresses
 * @param {Array|string} extras - Additional address(es) to merge
 * @returns {Array} Merged array of unique addresses, sorted
 */
export const mergeAddresses = (list = [], extras = []) => {
    const seen = new Set();

    // Process primary list
    const base = Array.isArray(list) ? list : [];
    base.forEach((addr) => {
        const trimmed = String(addr || "").trim();
        if (trimmed) seen.add(trimmed);
    });

    // Process extras (can be array or single value)
    const extraList = Array.isArray(extras) ? extras : [extras];
    extraList.forEach((addr) => {
        const trimmed = String(addr || "").trim();
        if (trimmed) seen.add(trimmed);
    });

    // Sort addresses to ensure deterministic order (e.g., E10, E11, E12)
    // This prevents formula differences that trigger unnecessary re-renders
    return Array.from(seen).sort((a, b) => {
        // Extract column letter and row number for proper sorting
        const matchA = a.match(/^([A-Z]+)(\d+)$/);
        const matchB = b.match(/^([A-Z]+)(\d+)$/);

        if (matchA && matchB) {
            const [, colA, rowA] = matchA;
            const [, colB, rowB] = matchB;

            // First compare by column
            if (colA !== colB) return colA.localeCompare(colB);

            // Then by row number
            return parseInt(rowA, 10) - parseInt(rowB, 10);
        }

        // Fallback to string comparison
        return a.localeCompare(b);
    });
};

/**
 * Convert column number to Excel column letter
 * @param {number} num - Column number (1-based)
 * @returns {string} Excel column letter (A, B, ..., Z, AA, AB, ...)
 */
export const numToCol = (num) => {
    let s = "",
        n = num;
    while (n > 0) {
        const m = (n - 1) % 26;
        s = String.fromCharCode(65 + m) + s;
        n = Math.floor((n - 1) / 26);
    }
    return s;
};
