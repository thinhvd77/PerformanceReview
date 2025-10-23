/**
 * Form Calculation Utilities
 * 
 * This module contains calculation helper functions used throughout the FormViewer component.
 * Includes score calculations, label checking, and cell value resolution.
 */

import {
    normalizeText,
    parseNumberAnyLocale,
} from "./formUtils.js";

import {
    QUALITATIVE_LABEL_NORMALIZED,
    DISCIPLINE_LABEL_NORMALIZED,
    DISCIPLINE_LABEL_ALT_NORMALIZED,
} from "../constants/sectionOptions.js";

// =============================================================================
// Score Configuration Constants
// =============================================================================

/**
 * Normalized label for "Điểm chuẩn" benchmark column
 * @constant {string}
 */
export const QUALITATIVE_BENCHMARK_LABEL_NORMALIZED = normalizeText("Điểm chuẩn");

/**
 * Default base score for qualitative criteria (Chỉ tiêu định tính)
 * @constant {number}
 */
export const QUALITATIVE_BASE_SCORE_DEFAULT = 20;

/**
 * Default base score for discipline criteria (Kỷ luật)
 * @constant {number}
 */
export const DISCIPLINE_BASE_SCORE = 10;

// =============================================================================
// Label Checking Functions
// =============================================================================

/**
 * Check if a value matches the qualitative criteria label
 * @param {string} value - The value to check
 * @returns {boolean} True if the value matches qualitative label
 */
export const isQualitativeLabel = (value) =>
    normalizeText(value) === QUALITATIVE_LABEL_NORMALIZED;

/**
 * Check if a value matches the discipline criteria label
 * @param {string} value - The value to check
 * @returns {boolean} True if the value matches discipline label (either variant)
 */
export const isDisciplineLabel = (value) => {
    const normalized = normalizeText(value);
    return (
        normalized === DISCIPLINE_LABEL_NORMALIZED ||
        normalized === DISCIPLINE_LABEL_ALT_NORMALIZED
    );
};

// =============================================================================
// Cell Value Resolution
// =============================================================================

/**
 * Resolve the numeric value from a table cell considering formulas, inputs, and computed values
 * 
 * @param {Object} cell - The cell object to resolve
 * @param {Object} cellInputs - User input values mapped by cell address
 * @param {Object} computedByAddr - Computed formula results mapped by cell address
 * @returns {number|null} The resolved numeric value, or null if not resolvable
 * 
 * @example
 * const value = resolveCellNumericValue(cell, cellInputs, computedByAddr);
 * if (value !== null) {
 *   console.log(`Cell value: ${value}`);
 * }
 */
export const resolveCellNumericValue = (cell, cellInputs, computedByAddr) => {
    if (!cell) return null;

    let raw = null;

    if (cell.addr) {
        if (cell.formula) {
            // Formula cell: use computed value if available, fallback to cell.value
            if (
                computedByAddr &&
                Object.prototype.hasOwnProperty.call(computedByAddr, cell.addr)
            ) {
                raw = computedByAddr[cell.addr];
            } else {
                raw = cell.value;
            }
        } else if (cell.input) {
            // Input cell: use user input if available, fallback to cell.value
            raw = cellInputs?.[cell.addr];
            if (raw === undefined || raw === null || raw === "") {
                raw = cell.value;
            }
        } else {
            // Other addressable cells: check inputs, fallback to cell.value
            raw = cellInputs?.[cell.addr];
            if (raw === undefined || raw === null || raw === "") {
                raw = cell.value;
            }
        }
    } else {
        // Non-addressable cell: use direct value
        raw = cell.value;
    }

    return parseNumberAnyLocale(raw);
};

// =============================================================================
// Score Calculation Functions
// =============================================================================

/**
 * Extract the qualitative base score from the table's benchmark column
 * 
 * Searches for a column containing "Điểm chuẩn" (normalized) and extracts
 * the score from the "Chỉ tiêu định tính" row.
 * 
 * @param {Object} tableData - The table data object containing rows and columns
 * @returns {number|null} The base score if found, null otherwise
 * 
 * @example
 * const baseScore = getQualitativeBaseScoreFromTable(table);
 * console.log(baseScore); // 20 (or custom value from table)
 */
export const getQualitativeBaseScoreFromTable = (tableData) => {
    if (!tableData?.rows || !Array.isArray(tableData.columns)) return null;

    // Find the benchmark column (Điểm chuẩn)
    const benchmarkColIdx = tableData.columns.findIndex((col) => {
        const normalized = normalizeText(col?.label);
        if (!normalized) return false;
        return normalized.includes(QUALITATIVE_BENCHMARK_LABEL_NORMALIZED);
    });

    if (benchmarkColIdx < 0) return null;

    // Find the qualitative criteria row (Chỉ tiêu định tính)
    const targetRow = tableData.rows.find((row) =>
        isQualitativeLabel(row?.cells?.[1]?.value)
    );

    if (!targetRow?.cells?.[benchmarkColIdx]) return null;

    // Try to extract numeric value from cell
    const cell = targetRow.cells[benchmarkColIdx];
    const candidates = [cell?.value, cell?.text, cell?.displayValue];

    // Also check formula if present
    if (typeof cell?.formula === "string") {
        candidates.push(cell.formula.replace(/^=/, ""));
    }

    // Parse first valid number found
    for (const candidate of candidates) {
        const parsed = parseNumberAnyLocale(candidate);
        if (parsed != null) return parsed;
    }

    return null;
};

/**
 * Apply default base scores to qualitative and discipline rows in the table
 * 
 * Updates the score column formulas for:
 * - Qualitative criteria (Chỉ tiêu định tính): Uses qualitative base score
 * - Discipline criteria (Kỷ luật): Uses discipline base score
 * 
 * @param {Object} tableData - The table data object to update
 * @param {number} scoreColIdx - Index of the score column
 * @returns {Object} Updated table data object (new object if changes made)
 * 
 * @example
 * const updatedTable = applyBaseScoreDefaults(table, scoreColIdx);
 * setTable(updatedTable);
 */
export const applyBaseScoreDefaults = (tableData, scoreColIdx) => {
    if (!tableData?.rows || scoreColIdx == null) return tableData;

    // Get qualitative base score from table or use default
    const qualitativeBaseScore =
        getQualitativeBaseScoreFromTable(tableData) ??
        QUALITATIVE_BASE_SCORE_DEFAULT;

    let changed = false;

    const nextRows = tableData.rows.map((row) => {
        if (!row?.cells) return row;

        // Get criteria label from column B (index 1)
        const criteria = String(row.cells?.[1]?.value || "").trim();
        const targetCell = row.cells?.[scoreColIdx];

        if (!targetCell) return row;

        // Determine desired formula based on criteria type
        let desiredFormula = null;

        if (isQualitativeLabel(criteria)) {
            desiredFormula = `=${qualitativeBaseScore}`;
        } else if (isDisciplineLabel(criteria)) {
            desiredFormula = `=${DISCIPLINE_BASE_SCORE}`;
        }

        // Skip if no formula needed or formula already correct
        if (!desiredFormula || targetCell.formula === desiredFormula) {
            return row;
        }

        // Update the formula
        changed = true;
        const nextCells = row.cells.map((cell, idx) =>
            idx === scoreColIdx ? { ...cell, formula: desiredFormula } : cell
        );

        return { ...row, cells: nextCells };
    });

    // Return new table object only if changes were made
    return changed ? { ...tableData, rows: nextRows } : tableData;
};
