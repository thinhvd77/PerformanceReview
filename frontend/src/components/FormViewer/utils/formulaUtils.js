// formulaUtils.js
// Utilities for building Excel formulas

import {
    QUALITATIVE_BASE_SCORE_DEFAULT,
    DISCIPLINE_BASE_SCORE,
    isQualitativeLabel,
    isDisciplineLabel,
} from "./formCalculations.js";

/**
 * Build parent row formula based on criteria type and child addresses
 * 
 * This function generates Excel formulas for parent rows (sections I-V) that aggregate
 * scores from their child rows. The formula varies based on the criteria type:
 * 
 * - Qualitative criteria: MAX(base - SUM(children), 0) - Starts with base score, subtracts violations
 * - Discipline criteria: MAX(IF(base-SUM(children)<0, 0, base-SUM(children)), 0) - Similar but with nested IF
 * - Bonus criteria ("cộng"): MIN(SUM(children), 10) - Sum children, max 10 points
 * - Minus criteria ("trừ"): MIN(SUM(children), 10) - Sum children, max 10 points
 * - Award criteria ("thưởng"): MIN(SUM(children), 5) - Sum children, max 5 points
 * 
 * @param {string} criteriaLabel - The criteria label from the parent row (e.g., "Chỉ tiêu định tính")
 * @param {string[]} childAddresses - Array of Excel addresses for child row scores (e.g., ["G10", "G11"])
 * @param {number} qualitativeBaseScore - Base score for qualitative criteria (default from formCalculations)
 * @returns {string} Excel formula string (e.g., "=MAX(25-SUM(G10,G11), 0)")
 * 
 * @example
 * // Qualitative with children
 * buildParentFormula("Chỉ tiêu định tính", ["G10", "G11"], 25)
 * // Returns: "=MAX(25-SUM(G10,G11), 0)"
 * 
 * @example
 * // Bonus with children
 * buildParentFormula("Điểm cộng (tối đa 10 điểm)", ["G20", "G21"])
 * // Returns: "=MIN(SUM(G20,G21), 10)"
 * 
 * @example
 * // Qualitative without children
 * buildParentFormula("Chỉ tiêu định tính", [], 25)
 * // Returns: "=25"
 */
export function buildParentFormula(
    criteriaLabel,
    childAddresses,
    qualitativeBaseScore = QUALITATIVE_BASE_SCORE_DEFAULT
) {
    const addrs = (childAddresses || []).filter(Boolean);
    const effectiveQualitativeBase =
        qualitativeBaseScore ?? QUALITATIVE_BASE_SCORE_DEFAULT;

    // Qualitative criteria (Chỉ tiêu định tính)
    // Start with base score, subtract violations (each child is a deduction)
    if (isQualitativeLabel(criteriaLabel)) {
        if (!addrs.length) return `=${effectiveQualitativeBase}`;
        return `=MAX(${effectiveQualitativeBase}-SUM(${addrs.join(",")}, 0)`;
    }

    // Discipline criteria (Ý thức chấp hành kỷ luật)
    // Similar to qualitative but with nested IF for validation
    if (isDisciplineLabel(criteriaLabel)) {
        if (!addrs.length) return `=${DISCIPLINE_BASE_SCORE}`;
        const sumExpr =
            addrs.length === 1 ? addrs[0] : `SUM(${addrs.join(",")})`;
        const baseMinusExpr = `${DISCIPLINE_BASE_SCORE}-${sumExpr}`;
        return `=MAX(IF(${baseMinusExpr}<0,0,${baseMinusExpr}), 0)`;
    }

    // No children - no formula needed
    if (!addrs.length) return "";

    // Bonus criteria ("cộng") - Sum children, max 10 points
    if (criteriaLabel.includes("cộng")) {
        return `=MIN(SUM(${addrs.join(",")}), 10)`;
    }

    // Minus criteria ("trừ") - Sum children, max 10 points
    if (criteriaLabel.includes("trừ")) {
        return `=MIN(SUM(${addrs.join(",")}), 10)`;
    }

    // Award criteria ("thưởng") - Sum children, max 5 points
    if (criteriaLabel.includes("thưởng")) {
        return `=MIN(SUM(${addrs.join(",")}), 5)`;
    }

    // Fallback - empty formula
    return "";
}
