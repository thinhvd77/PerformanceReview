/**
 * Section Handlers
 * Functions for managing child row addition and removal in sections II-V
 */

import { numToCol } from "../utils/tableUtils.js";
import { isQualitativeLabel } from "../utils/formCalculations.js";
import { resolveSectionOptions } from "../constants/sectionOptions.js";
import { buildParentFormula } from "../utils/formulaUtils.js";

/**
 * Handle adding a child row to a section (II-V)
 * Returns state updates to be applied by the component
 * 
 * @param {Object} params - Processing parameters
 * @param {number} params.rowIndex - Parent row index
 * @param {string} params.rowKey - Row key for criteria selection tracking
 * @param {string} params.label - Label for the new child row
 * @param {Object} params.table - Current table state
 * @param {Object} params.childrenScoreAddrs - Current children score addresses
 * @param {number} params.virtualRowNo - Current virtual row number
 * @param {number} params.scoreColIdx - Score column index
 * @param {number} params.planColIdx - Plan column index
 * @param {number} params.actualColIdx - Actual column index
 * @param {number} params.noteColIdx - Note column index
 * @param {number} params.qualitativeBaseScore - Base score for qualitative criteria
 * @returns {Object} State updates {table, childrenScoreAddrs, virtualRowNo, criteriaSelectValue}
 */
export function handleSectionChooseLogic({
    rowIndex,
    rowKey,
    label,
    table,
    childrenScoreAddrs,
    virtualRowNo,
    scoreColIdx,
    planColIdx,
    actualColIdx,
    noteColIdx,
    qualitativeBaseScore,
}) {
    if (!table) return null;

    const scoreColLetter = numToCol(scoreColIdx + 1);
    const childScoreAddr = `${scoreColLetter}${virtualRowNo}`;
    const existingAddrs = childrenScoreAddrs[rowIndex] || [];
    const nextAddrs = [...existingAddrs, childScoreAddr];

    // Check if this is debt recovery criterion
    const isDebtRecoveryCriterion = String(label)
        .toLowerCase()
        .includes("thực hiện chỉ tiêu thu hồi nợ đã xlrr");

    // Check if this belongs to qualitative section (Section II)
    const currentParentRow = table.rows?.[rowIndex];
    const parentCriteria = String(
        currentParentRow?.cells?.[1]?.value || ""
    ).trim();
    const isQualitativeCriterion = isQualitativeLabel(parentCriteria);

    const cols = table.columns?.length || 0;

    // 1) Create new child row
    const newRow = {
        cells: Array.from({ length: cols }, (_, cIdx) => ({
            addr: null,
            value: cIdx === 1 ? label : "", // Column "Tiêu chí" = selected label (column B)
            rowSpan: 1,
            colSpan: 1,
            hidden: false,
            input: false,
        })),
    };

    // Special handling for debt recovery criterion
    if (
        isDebtRecoveryCriterion &&
        planColIdx != null &&
        actualColIdx != null
    ) {
        // Create virtual addresses for "Plan" and "Actual"
        const planAddr = `${numToCol(planColIdx + 1)}${virtualRowNo}`;
        const actualAddr = `${numToCol(actualColIdx + 1)}${virtualRowNo}`;

        // "Plan this quarter" cell is input
        newRow.cells[planColIdx] = {
            ...newRow.cells[planColIdx],
            addr: planAddr,
            input: true,
            value: "",
        };

        // "Actual this quarter" cell is input
        newRow.cells[actualColIdx] = {
            ...newRow.cells[actualColIdx],
            addr: actualAddr,
            input: true,
            value: "",
        };

        // "Score by completion level" cell is formula: =MAX(0, 10-(actual/plan*10))
        newRow.cells[scoreColIdx] = {
            ...newRow.cells[scoreColIdx],
            addr: childScoreAddr,
            input: false,
            formula: `=MAX(0, 10-(${actualAddr}/${planAddr}*10))`,
            value: "",
        };
    } else if (isQualitativeCriterion) {
        // Special handling for qualitative criteria
        // Allow direct input of deduction points at "Score by completion level" column
        newRow.cells[scoreColIdx] = {
            ...newRow.cells[scoreColIdx],
            addr: childScoreAddr,
            input: true,
            value: "",
        };
        // Add input cell for notes column
        if (noteColIdx != null && noteColIdx !== scoreColIdx) {
            newRow.cells[noteColIdx] = {
                ...newRow.cells[noteColIdx],
                addr: `${numToCol(noteColIdx + 1)}${virtualRowNo}`,
                input: true,
                value: "",
            };
        }
    } else {
        // Normal handling for other criteria
        // "Score by completion level" cell of child row is input with virtual address
        newRow.cells[scoreColIdx] = {
            ...newRow.cells[scoreColIdx],
            addr: childScoreAddr,
            input: true,
            value: "",
        };
        // Add input cell next to "Score by completion level"
        if (noteColIdx != null && noteColIdx !== scoreColIdx) {
            newRow.cells[noteColIdx] = {
                ...newRow.cells[noteColIdx],
                addr: `${numToCol(noteColIdx + 1)}${virtualRowNo}`,
                input: true,
                value: "",
            };
        }
    }

    const nextRows = [...(table.rows || [])];

    // 2) Update SUM(...) formula for parent row's score cell
    const parentRow = nextRows[rowIndex];
    const parentCells = [...(parentRow?.cells || [])];
    const criteria = String(parentRow?.cells?.[1]?.value || "").trim();
    parentCells[scoreColIdx] = {
        ...parentCells[scoreColIdx],
        formula: buildParentFormula(criteria, nextAddrs, qualitativeBaseScore),
    };
    nextRows[rowIndex] = { ...parentRow, cells: parentCells };

    // 3) Find insertion position by counting existing child rows
    // Child rows have empty STT column (column 0)
    let insertIdx = rowIndex + 1;
    while (insertIdx < nextRows.length) {
        const row = nextRows[insertIdx];
        const stt = String(row?.cells?.[0]?.value || "").trim();

        // Stop when we encounter a row with STT value (indicates a parent row)
        if (stt) {
            break;
        }

        insertIdx++;
    }

    // Insert child row after all existing children
    nextRows.splice(insertIdx, 0, newRow);

    // 4) Prepare state updates
    const updatedTable = { ...table, rows: nextRows };
    const updatedChildrenScoreAddrs = {
        ...childrenScoreAddrs,
        [rowIndex]: nextAddrs,
    };
    const nextVirtualRowNo = virtualRowNo + 1;

    // 5) Prepare criteria select reset value
    const parentRowForReset = table.rows?.[rowIndex];
    const criteriaForReset = String(
        parentRowForReset?.cells?.[1]?.value || ""
    ).trim();
    const key = criteriaForReset || `row-${rowIndex}`;
    const defaultOption = resolveSectionOptions(criteriaForReset)[0];
    const criteriaSelectValue = defaultOption
        ? { key, value: defaultOption.value }
        : null;

    return {
        table: updatedTable,
        childrenScoreAddrs: updatedChildrenScoreAddrs,
        virtualRowNo: nextVirtualRowNo,
        criteriaSelectValue,
    };
}

/**
 * Handle removing a child row from a section
 * Returns state updates to be applied by the component
 * 
 * @param {Object} params - Processing parameters
 * @param {number} params.rowIndex - Child row index to remove
 * @param {string} params.childScoreAddr - Child score address to remove
 * @param {Object} params.table - Current table state
 * @param {Object} params.childrenScoreAddrs - Current children score addresses
 * @param {Object} params.childAddrToParentRow - Mapping from child addr to parent row index
 * @param {number} params.scoreColIdx - Score column index
 * @param {number} params.qualitativeBaseScore - Base score for qualitative criteria
 * @returns {Object|null} State updates {table, childrenScoreAddrs, cellInputsToDelete} or null
 */
export function handleRemoveChildLogic({
    rowIndex,
    childScoreAddr,
    table,
    childrenScoreAddrs,
    childAddrToParentRow,
    scoreColIdx,
    qualitativeBaseScore,
}) {
    const parentRowIndex = childAddrToParentRow[childScoreAddr];
    if (parentRowIndex === undefined || !table) return null;

    // Get all addresses from the row to be deleted for cleanup
    const rowToDelete = table.rows?.[rowIndex];
    const addressesToCleanup = [];
    if (rowToDelete?.cells) {
        rowToDelete.cells.forEach((cell) => {
            if (cell?.addr && (cell.input || cell.formula)) {
                addressesToCleanup.push(cell.addr);
            }
        });
    }

    const nextRows = [...(table.rows || [])];

    // 1) Delete child row at current position
    nextRows.splice(rowIndex, 1);

    // 2) Update SUM(...) formula for parent row's score cell
    const remainingAddrs = (childrenScoreAddrs[parentRowIndex] || []).filter(
        (a) => a !== childScoreAddr
    );
    const parentRow = nextRows[parentRowIndex];
    if (parentRow && parentRow.cells) {
        const parentCells = [...parentRow.cells];
        const criteria = String(parentRow?.cells?.[1]?.value || "").trim();
        parentCells[scoreColIdx] = {
            ...parentCells[scoreColIdx],
            formula: buildParentFormula(
                criteria,
                remainingAddrs,
                qualitativeBaseScore
            ),
        };
        nextRows[parentRowIndex] = { ...parentRow, cells: parentCells };
    }

    // 3) Prepare state updates
    const updatedTable = { ...table, rows: nextRows };
    const updatedChildrenScoreAddrs = {
        ...childrenScoreAddrs,
        [parentRowIndex]: remainingAddrs,
    };

    return {
        table: updatedTable,
        childrenScoreAddrs: updatedChildrenScoreAddrs,
        cellInputsToDelete: addressesToCleanup,
    };
}
