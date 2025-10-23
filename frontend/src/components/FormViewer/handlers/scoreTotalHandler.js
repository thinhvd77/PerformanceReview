/**
 * Score Total Handler
 * 
 * Handles computation of row A total score formula.
 * Formula: A = I + II + III - IV + V
 * This represents the final score calculated from all section scores.
 */

import { findRowBySTT, getCellAddressBySTT } from "../utils/rowUtils.js";

/**
 * Computes the total score formula for row A
 * 
 * The formula aggregates scores from all major sections:
 * - Adds: Section I, II, III, V (positive contributions)
 * - Subtracts: Section IV (deductions)
 * 
 * Handles various edge cases:
 * - All sections present: =SUM(I,II,III,V)-IV
 * - No section IV: =SUM(I,II,III,V)
 * - Only section IV: =0-IV
 * - No sections: returns null (no formula needed)
 * 
 * @param {Object} params - Computation parameters
 * @param {Object} params.table - Current form table structure
 * @param {number} params.scoreColIdx - Index of score column
 * @returns {Object|null} Updated table with row A formula, or null if no update needed
 */
export function computeRowATotalFormula({ table, scoreColIdx }) {
    if (!table?.rows || scoreColIdx == null) return null;

    // Helper to get score cell address for a section by STT
    const getScoreAddrOf = (stt) =>
        getCellAddressBySTT(table.rows, stt, scoreColIdx);

    // Get cell addresses for all sections
    const addrI = getScoreAddrOf("I");
    const addrII = getScoreAddrOf("II");
    const addrIII = getScoreAddrOf("III");
    const addrIV = getScoreAddrOf("IV");
    const addrV = getScoreAddrOf("V");

    // Collect addresses for positive contributions (I, II, III, V)
    const plusAddrs = [addrI, addrII, addrIII, addrV].filter(Boolean);
    const hasPlus = plusAddrs.length > 0;
    const hasIV = !!addrIV;

    // Find row A
    const rowA = findRowBySTT(table.rows, "A");
    if (!rowA || !rowA.cells?.[scoreColIdx]) return null;

    // Build formula based on available sections
    let desiredFormula = "";
    if (hasPlus && hasIV) {
        // Both positive and negative sections present
        desiredFormula = `=SUM(${plusAddrs.join(",")})-${addrIV}`;
    } else if (hasPlus) {
        // Only positive sections present
        desiredFormula = `=SUM(${plusAddrs.join(",")})`;
    } else if (hasIV) {
        // Only negative section present
        desiredFormula = `=0-${addrIV}`;
    } else {
        // No sections found - cannot build formula
        return null;
    }

    const current = rowA.cells[scoreColIdx].formula || "";

    // Only update if formula has changed (avoid unnecessary re-renders)
    if (current === desiredFormula) {
        return null;
    }

    // Create updated table with new formula
    const nextRows = table.rows.map((r) => {
        const stt = String(r?.cells?.[0]?.value || "").trim();
        if (stt !== "A") return r;

        // Update row A with new formula
        const cells = r.cells.slice();
        cells[scoreColIdx] = {
            ...cells[scoreColIdx],
            formula: desiredFormula,
        };
        return { ...r, cells };
    });

    return { ...table, rows: nextRows };
}
