/**
 * Custom Hook: useColumnIndices
 * 
 * Consolidates all column index finding logic into a single reusable hook.
 * This hook computes and returns all column indices needed for form operations.
 */

import { useMemo } from "react";
import {
    findScoreColumnIndex,
    findPlanColumnIndex,
    findActualColumnIndex,
    findNoteColumnIndex,
    findPrevActualColumnIndex,
    findPrevPlanColumnIndex,
    findAnnualPlanColumnIndex,
} from "../utils/columnUtils.js";

/**
 * Custom hook to compute all column indices from template
 * 
 * @param {Object} template - Form template containing schema with table columns
 * @returns {Object} Column indices object containing:
 *   - scoreColIdx: Score column index
 *   - planColIdx: Plan column index
 *   - actualColIdx: Actual column index
 *   - noteColIdx: Note column index
 *   - prevActualColIdx: Previous quarter actual column index
 *   - prevPlanColIdx: Previous quarter plan column index
 *   - annualPlanColIdx: Annual plan column index
 */
export function useColumnIndices(template) {
    const columns = template?.schema?.table?.columns || [];

    const scoreColIdx = useMemo(
        () => findScoreColumnIndex(columns),
        [columns]
    );

    const planColIdx = useMemo(
        () => findPlanColumnIndex(columns),
        [columns]
    );

    const actualColIdx = useMemo(
        () => findActualColumnIndex(columns),
        [columns]
    );

    const noteColIdx = useMemo(
        () => findNoteColumnIndex(columns),
        [columns]
    );

    const prevActualColIdx = useMemo(
        () => findPrevActualColumnIndex(columns),
        [columns]
    );

    const prevPlanColIdx = useMemo(
        () => findPrevPlanColumnIndex(columns),
        [columns]
    );

    const annualPlanColIdx = useMemo(
        () => findAnnualPlanColumnIndex(columns),
        [columns]
    );

    return {
        scoreColIdx,
        planColIdx,
        actualColIdx,
        noteColIdx,
        prevActualColIdx,
        prevPlanColIdx,
        annualPlanColIdx,
    };
}
