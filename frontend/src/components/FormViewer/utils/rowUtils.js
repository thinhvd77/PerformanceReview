/**
 * Row finding utilities for FormViewer
 * Provides consistent methods for locating rows by STT (Roman numerals/numbers) or criteria labels
 */

import { normalizeText } from "./formUtils.js";

/**
 * Find row by STT (Số thứ tự) value in first cell (column A / index 0)
 * @param {Array} rows - Array of row objects
 * @param {string} stt - STT value to search for (e.g., "I", "II", "III", "A", "1")
 * @param {number} cellIndex - Cell index to check for STT (default: 0 for first column)
 * @returns {Object|undefined} Row object if found, undefined otherwise
 */
export function findRowBySTT(rows, stt, cellIndex = 0) {
    if (!rows || !Array.isArray(rows)) return undefined;

    return rows.find(
        (row) => String(row?.cells?.[cellIndex]?.value || "").trim() === stt
    );
}

/**
 * Find row index by STT (Số thứ tự) value in first cell
 * @param {Array} rows - Array of row objects
 * @param {string} stt - STT value to search for
 * @param {number} cellIndex - Cell index to check for STT (default: 0 for first column)
 * @returns {number} Row index, or -1 if not found
 */
export function findRowIndexBySTT(rows, stt, cellIndex = 0) {
    if (!rows || !Array.isArray(rows)) return -1;

    return rows.findIndex(
        (row) => String(row?.cells?.[cellIndex]?.value || "").trim() === stt
    );
}

/**
 * Find row by criteria label (column B / index 1) with normalized text matching
 * @param {Array} rows - Array of row objects
 * @param {string|string[]} criteriaPattern - Pattern(s) to match against criteria label
 * @param {number} cellIndex - Cell index to check for criteria (default: 1 for second column)
 * @param {boolean} useNormalizedText - If true, use normalizeText() for matching
 * @returns {Object|undefined} Row object if found, undefined otherwise
 */
export function findRowByCriteria(rows, criteriaPattern, cellIndex = 1, useNormalizedText = true) {
    if (!rows || !Array.isArray(rows)) return undefined;

    const patterns = Array.isArray(criteriaPattern) ? criteriaPattern : [criteriaPattern];

    return rows.find((row) => {
        const cellValue = String(row?.cells?.[cellIndex]?.value || "").trim();
        const searchText = useNormalizedText ? normalizeText(cellValue) : cellValue;

        return patterns.some(pattern => {
            const searchPattern = useNormalizedText ? normalizeText(pattern) : String(pattern);
            return searchText === searchPattern;
        });
    });
}

/**
 * Find row index by criteria label with normalized text matching
 * @param {Array} rows - Array of row objects
 * @param {string|string[]} criteriaPattern - Pattern(s) to match against criteria label
 * @param {number} cellIndex - Cell index to check for criteria (default: 1 for second column)
 * @param {boolean} useNormalizedText - If true, use normalizeText() for matching
 * @returns {number} Row index, or -1 if not found
 */
export function findRowIndexByCriteria(rows, criteriaPattern, cellIndex = 1, useNormalizedText = true) {
    if (!rows || !Array.isArray(rows)) return -1;

    const patterns = Array.isArray(criteriaPattern) ? criteriaPattern : [criteriaPattern];

    return rows.findIndex((row) => {
        const cellValue = String(row?.cells?.[cellIndex]?.value || "").trim();
        const searchText = useNormalizedText ? normalizeText(cellValue) : cellValue;

        return patterns.some(pattern => {
            const searchPattern = useNormalizedText ? normalizeText(pattern) : String(pattern);
            return searchText === searchPattern;
        });
    });
}

/**
 * Find row index by STT with normalized text matching (for Roman numerals)
 * Useful for finding section rows like III, IV, V
 * @param {Array} rows - Array of row objects
 * @param {string} stt - STT value to search for (will be normalized)
 * @param {number} cellIndex - Cell index to check for STT (default: 0)
 * @returns {number} Row index, or -1 if not found
 */
export function findRowIndexBySTTNormalized(rows, stt, cellIndex = 0) {
    if (!rows || !Array.isArray(rows)) return -1;

    const normalizedSTT = normalizeText(stt);

    return rows.findIndex(
        (row) => normalizeText(row?.cells?.[cellIndex]?.value) === normalizedSTT
    );
}

/**
 * Find parent row index for auto-generated rows (used in AUTO_* rules)
 * Searches for row with specific STT or criteria pattern
 * @param {Array} rows - Array of row objects
 * @param {Object} options - Search options
 * @param {string} [options.stt] - STT to search by (e.g., "iii", "iv", "v")
 * @param {string|string[]} [options.criteria] - Criteria pattern to search by
 * @param {boolean} [options.useNormalizedText] - Use normalized text matching (default: true)
 * @returns {number} Row index, or -1 if not found
 */
export function findParentRowIndex(rows, options = {}) {
    const { stt, criteria, useNormalizedText = true } = options;

    if (stt) {
        return useNormalizedText
            ? findRowIndexBySTTNormalized(rows, stt)
            : findRowIndexBySTT(rows, stt);
    }

    if (criteria) {
        return findRowIndexByCriteria(rows, criteria, 1, useNormalizedText);
    }

    return -1;
}

/**
 * Find cell address of a specific column in a row found by STT
 * Convenience function combining findRowBySTT and cell address extraction
 * @param {Array} rows - Array of row objects
 * @param {string} stt - STT value to search for
 * @param {number} colIdx - Column index to get address from
 * @returns {string|null} Cell address or null if not found
 */
export function getCellAddressBySTT(rows, stt, colIdx) {
    const row = findRowBySTT(rows, stt);
    return row?.cells?.[colIdx]?.addr || null;
}

/**
 * Get multiple cell addresses by STT values
 * @param {Array} rows - Array of row objects
 * @param {string[]} sttList - Array of STT values to search for
 * @param {number} colIdx - Column index to get addresses from
 * @returns {string[]} Array of cell addresses (excludes null/undefined)
 */
export function getCellAddressesBySTTs(rows, sttList, colIdx) {
    if (!Array.isArray(sttList)) return [];

    return sttList
        .map(stt => getCellAddressBySTT(rows, stt, colIdx))
        .filter(Boolean);
}

/**
 * Check if a row has a valid STT (used to detect parent rows vs child rows)
 * Valid STTs are Roman numerals (I-V), numbers, or letters (A-Z)
 * @param {Object} row - Row object to check
 * @param {number} cellIndex - Cell index to check (default: 0)
 * @returns {boolean} True if row has a valid STT
 */
export function hasValidSTT(row, cellIndex = 0) {
    const stt = String(row?.cells?.[cellIndex]?.value || "").trim();
    if (!stt) return false;

    // Check if STT matches Roman numerals, numbers, or letters
    return /^[IVXivx0-9A-Za-z]+$/i.test(stt);
}

/**
 * Find insertion index for new child rows after a parent row
 * Finds the position right after all existing children of the parent
 * @param {Array} rows - Array of row objects
 * @param {number} parentIdx - Parent row index
 * @param {RegExp|Function} stopCondition - Condition to stop searching
 *   - If RegExp: tests against STT value
 *   - If Function: custom test function(row, idx) => boolean
 * @returns {number} Index where new child should be inserted
 */
export function findInsertIndexAfterParent(rows, parentIdx, stopCondition) {
    let insertIdx = parentIdx + 1;

    while (insertIdx < rows.length) {
        const row = rows[insertIdx];

        if (typeof stopCondition === 'function') {
            if (stopCondition(row, insertIdx)) break;
        } else if (stopCondition instanceof RegExp) {
            const stt = String(row?.cells?.[0]?.value || "").trim();
            if (stopCondition.test(stt)) break;
        }

        insertIdx++;
    }

    return insertIdx;
}
