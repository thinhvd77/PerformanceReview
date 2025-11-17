// autoBonusProcessor.js
// Processor for AUTO_BONUS_RULES - Section V (Điểm thưởng)

import { normalizeText } from "../utils/formUtils.js";
import { findRowIndexByCriteria } from "../utils/rowUtils.js";
import { mergeAddresses, numToCol } from "../utils/tableUtils.js";
import { buildParentFormula } from "../utils/formulaUtils.js";

/**
 * Process AUTO_BONUS_RULES for Section V (Điểm thưởng - bonus points)
 * This is an async function as it fetches data from backend
 *
 * @param {Object} params - Processing parameters
 * @param {Object} params.table - Current table state
 * @param {Array} params.rules - AUTO_BONUS_RULES array
 * @param {Set} params.ruleKeySet - AUTO_BONUS_RULE_KEY_SET
 * @param {number} params.scoreColIdx - Score column index
 * @param {number} params.actualColIdx - Actual column index
 * @param {number} params.noteColIdx - Note column index
 * @param {Object} params.childrenScoreAddrs - Children score addresses by parent row index
 * @param {Object} params.cellInputs - Current cell inputs
 * @param {Object} params.computedByAddr - Computed values by address
 * @param {number} params.virtualRowNo - Current virtual row number for generating new addresses
 * @param {number} params.selectedQuarter - Selected quarter (1-4)
 * @param {number} params.selectedYear - Selected year
 * @param {Object} params.api - API instance for fetching data
 * @param {Function} params.resolveCellNumericValue - Function to resolve cell numeric value
 * @param {string} params.currentUsername - Current user's username
 * @returns {Promise<Object|null>} State updates or null if no changes
 */
export async function processBonusRules({
    table,
    rules,
    ruleKeySet,
    scoreColIdx,
    actualColIdx,
    noteColIdx,
    childrenScoreAddrs,
    cellInputs,
    computedByAddr,
    virtualRowNo,
    selectedQuarter,
    selectedYear,
    api,
    resolveCellNumericValue,
    currentUsername,
}) {
    // Validation
    if (!table?.rows || scoreColIdx == null || actualColIdx == null) {
        return null;
    }

    const rows = table.rows;

    // Fetch annual plan data from database
    let annualPlanData = {};

    if (currentUsername && selectedYear) {
        try {
            const { data } = await api.get('/annual-plans', {
                params: { username: currentUsername, year: selectedYear }
            });
            if (data?.data) {
                annualPlanData = data.data;
            }
        } catch (err) {
            // Continue without annual plan data
        }
    }

    // Map growth labels to metric keys for annual plan lookup
    const labelToMetricKey = {
        "Tăng trưởng nguồn vốn": "capital_growth",
        "Tăng trưởng dư nợ": "loan_growth",
        "Thu dịch vụ": "service_revenue",
        "Thu hồi nợ đã XLRR": "debt_recovery",
        "Tài chính": "finance",
    };

    // Fetch already awarded bonuses for this user in this year
    const awardedBonusMap = new Map();
    if (currentUsername && selectedYear) {
        try {
            const { data } = await api.get('/bonus-awards', {
                params: { username: currentUsername, year: selectedYear }
            });
            if (data?.data && Array.isArray(data.data)) {
                data.data.forEach(award => {
                    awardedBonusMap.set(award.key, award.quarter);
                });
            }
        } catch (err) {
            // Continue without checking - better to award duplicate than miss valid bonus
        }
    }

    // Find parent row (Section V - "Điểm thưởng (tối đa 05 điểm)")
    const parentRowIdx = findRowIndexByCriteria(
        rows,
        "Điểm thưởng (tối đa 05 điểm)",
        1,
        true
    );
    if (parentRowIdx === -1) return null;

    // PRIORITY SYSTEM: Sort rules by fixedPoints (ascending) to prioritize lower-point bonuses
    // This ensures 3-point bonuses are awarded before 5-point bonuses
    // Option B: Allow cumulative points up to max (e.g., 2x3đ = 6đ is allowed)
    const sortedRules = [...rules].sort((a, b) => a.fixedPoints - b.fixedPoints);

    // PHASE 1: Evaluate all rules and determine which can be awarded
    const MAX_SECTION_POINTS = 5; // Maximum total points for Section V
    const eligibleBonuses = []; // Array of {rule, annualPlanValue, currentQuarterActual, wasAlreadyAwarded, previouslyAwardedQuarter}

    for (const rule of sortedRules) {
        const { growthLabel, key, fixedPoints } = rule;

        // Check if already awarded IN A DIFFERENT QUARTER
        // If awarded in the SAME quarter, allow re-awarding (user can re-export same quarter)
        const previouslyAwardedQuarter = awardedBonusMap.get(key);
        const wasAlreadyAwarded = previouslyAwardedQuarter !== undefined && previouslyAwardedQuarter !== selectedQuarter;

        // Support multiple growth labels (array)
        const labels = Array.isArray(growthLabel) ? growthLabel : [growthLabel];

        let annualPlanValue = null;
        let currentQuarterActual = 0;

        // Process each label to find matching row and compare current quarter actual with annual plan
        for (const label of labels) {
            const growthRowIdx = rows.findIndex(
                (row) =>
                    normalizeText(row?.cells?.[1]?.value) ===
                    normalizeText(label)
            );

            if (growthRowIdx === -1) continue;

            // Get annual plan from database using label-to-metric mapping
            const normalizedLabel = normalizeText(label);
            const metricKey = Object.entries(labelToMetricKey).find(
                ([key]) => normalizeText(key) === normalizedLabel
            )?.[1];

            // Use annual plan from database
            let labelAnnualPlan = null;
            if (metricKey && annualPlanData[metricKey] !== undefined) {
                const rawValue = annualPlanData[metricKey];
                const parsed = parseFloat(rawValue);
                labelAnnualPlan = Number.isFinite(parsed) ? parsed : null;
            }

            // Get current quarter's actual from the form
            const actualCell = rows[growthRowIdx]?.cells?.[actualColIdx];
            const labelCurrentActual = resolveCellNumericValue(actualCell);

            // Check if THIS label's current quarter actual meets annual plan
            if (labelAnnualPlan !== null &&
                Number.isFinite(labelAnnualPlan) &&
                labelAnnualPlan !== 0 &&
                labelCurrentActual !== null &&
                Number.isFinite(labelCurrentActual) &&
                labelCurrentActual >= labelAnnualPlan) {
                // This label meets annual plan
                annualPlanValue = labelAnnualPlan;
                currentQuarterActual = labelCurrentActual;
                break;
            }
        }

        // Validate data and check if criteria met
        const valid =
            annualPlanValue !== null &&
            currentQuarterActual !== null &&
            Number.isFinite(annualPlanValue) &&
            annualPlanValue !== 0 &&
            Number.isFinite(currentQuarterActual);

        const criteriaMet = valid && currentQuarterActual >= annualPlanValue;

        if (criteriaMet) {
            eligibleBonuses.push({
                rule,
                annualPlanValue,
                currentQuarterActual,
                wasAlreadyAwarded,
                previouslyAwardedQuarter,
            });
        }
    }

    // PHASE 2: Apply 9-point threshold logic with priority system
    // Logic: 
    // - If total eligible points ≤ 9: Award and RECORD ALL bonuses (even if total exceeds 5)
    //   Examples: [3,3] → award both, record both | [3,5] → award both, record both
    // - If total eligible points > 9: Award bonuses until cumulative ≥ 5, record only those awarded
    //   Examples: [3,3,5] → award 3+3, record both | [5,5] → award first 5, record it
    const bonusesToAward = []; // Array of {rule, bonusPoints, noteText, shouldAward}

    // Calculate total points of eligible bonuses (excluding already awarded)
    const notYetAwardedBonuses = eligibleBonuses.filter(e => !e.wasAlreadyAwarded);
    const totalEligiblePoints = notYetAwardedBonuses.reduce((sum, e) => sum + e.rule.fixedPoints, 0);

    let cumulativePoints = 0;
    let hasReachedMax = false; // Track if we've reached/exceeded 5 points (for total > 9 case)

    for (const eligible of eligibleBonuses) {
        const { rule, wasAlreadyAwarded, previouslyAwardedQuarter } = eligible;
        const { fixedPoints, key } = rule;

        let bonusPoints = 0;
        let noteText = "";
        let shouldAward = false;

        if (wasAlreadyAwarded) {
            // Already awarded in previous quarter - show row but no points
            bonusPoints = 0;
            noteText = `Đã được cộng điểm tại Quý ${previouslyAwardedQuarter}`;
            shouldAward = false;
        } else {
            // Apply 9-point threshold logic
            if (totalEligiblePoints <= 9) {
                // Total ≤ 9: Award ALL bonuses (record all even if cumulative > 5)
                bonusPoints = fixedPoints;
                noteText = "Hoàn thành KH năm";
                shouldAward = true;
                cumulativePoints += fixedPoints;
            } else {
                // Total > 9: Award bonuses until we reach/exceed 5 points for the first time
                if (!hasReachedMax) {
                    bonusPoints = fixedPoints;
                    noteText = "Hoàn thành KH năm";
                    shouldAward = true;
                    cumulativePoints += fixedPoints;

                    // Check if we've now reached/exceeded the max
                    if (cumulativePoints >= MAX_SECTION_POINTS) {
                        hasReachedMax = true;
                    }
                } else {
                    // Already reached max - don't award more
                    bonusPoints = String(fixedPoints);
                    noteText = `Hoàn thành KH năm`;
                    shouldAward = false;
                }
            }
        }

        bonusesToAward.push({
            rule,
            bonusPoints,
            noteText,
            shouldAward,
        });
    }

    // PHASE 3: Determine newly awardable bonuses (but don't save yet - will save on export)
    const newlyAwardableKeys = bonusesToAward
        .filter(b => b.shouldAward)
        .map(b => b.rule.key);

    // Store awardable keys in return value for export handler to use
    const bonusAwardsToRecord = newlyAwardableKeys.length > 0 ? {
        username: currentUsername,
        year: selectedYear,
        quarter: selectedQuarter,
        bonusKeys: newlyAwardableKeys,
    } : null;

    // PHASE 4: Build auto-row tracking and remove ineligible rows
    const autoRowsByKey = new Map();
    const autoAddrsSet = new Set();
    rows.forEach((row, idx) => {
        const key = row?.autoGeneratedKey;
        if (key && ruleKeySet.has(key)) {
            autoRowsByKey.set(key, { row, idx });
            const addr = row?.cells?.[scoreColIdx]?.addr;
            if (addr) autoAddrsSet.add(addr);
        }
    });

    // Filter manual addresses (exclude auto-generated)
    const currentManualAddrs = childrenScoreAddrs[parentRowIdx] || [];
    const manualAddrs = currentManualAddrs.filter(
        (addr) => addr && !autoAddrsSet.has(addr)
    );

    // If manual addresses changed, update and return
    if (manualAddrs.length !== currentManualAddrs.length) {
        return {
            childrenScoreAddrs: {
                ...childrenScoreAddrs,
                [parentRowIdx]: manualAddrs,
            },
        };
    }

    // Helper: Get addresses of auto-generated rows (excluding given key)
    const otherAutoAddrsFor = (excludeKey) =>
        Array.from(autoRowsByKey.entries())
            .filter(([key]) => key !== excludeKey)
            .map(([, info]) => info.row?.cells?.[scoreColIdx]?.addr)
            .filter(Boolean);

    // Get parent row criteria
    const parentRow = rows[parentRowIdx];
    const parentCriteria = String(parentRow?.cells?.[1]?.value || "").trim();

    // Helper: Build parent formula with merged addresses
    const parentFormulaFor = (autoAddrs) => {
        const allAddrs = mergeAddresses(manualAddrs, autoAddrs);
        return buildParentFormula(parentCriteria, allAddrs);
    };

    // Helper: Find insertion index for new rows
    const findInsertIndex = (rowsList, parentIdx) => {
        let insertIdx = parentIdx + 1;
        while (insertIdx < rowsList.length) {
            const row = rowsList[insertIdx];
            const stt = String(row?.cells?.[0]?.value || "").trim();
            if (stt) break;
            insertIdx++;
        }
        return insertIdx;
    };

    // PHASE 5: Update or create UI rows for all eligible bonuses
    let nextRows = [...rows];
    let nextVirtualRowNo = virtualRowNo;
    let hasChanges = false;

    // First, remove rows that are no longer eligible (not in bonusesToAward)
    const eligibleKeys = new Set(bonusesToAward.map(b => b.rule.key));
    const rowsToRemove = [];

    nextRows.forEach((row, idx) => {
        const key = row?.autoGeneratedKey;
        if (key && ruleKeySet.has(key) && !eligibleKeys.has(key)) {
            rowsToRemove.push(idx);
        }
    });

    if (rowsToRemove.length > 0) {
        nextRows = nextRows.filter((_, idx) => !rowsToRemove.includes(idx));
        hasChanges = true;
    }

    // Rebuild autoRowsByKey after removals
    autoRowsByKey.clear();
    autoAddrsSet.clear();
    nextRows.forEach((row, idx) => {
        const key = row?.autoGeneratedKey;
        if (key && ruleKeySet.has(key)) {
            autoRowsByKey.set(key, { row, idx });
            const addr = row?.cells?.[scoreColIdx]?.addr;
            if (addr) autoAddrsSet.add(addr);
        }
    });

    // Now process each eligible bonus to update/create rows
    for (const { rule, bonusPoints, noteText, shouldAward } of bonusesToAward) {
        const { bonusLabel, key } = rule;
        const autoInfo = autoRowsByKey.get(key);
        const autoRowIdx = autoInfo?.idx ?? -1;
        const autoAddr = autoInfo?.row?.cells?.[scoreColIdx]?.addr || null;

        // Determine if row should have an address (contributes to formula)
        const shouldHaveAddr = shouldAward; // Only awarded bonuses contribute

        if (!autoInfo) {
            // CREATE NEW ROW
            const parentIdxNext = findRowIndexByCriteria(
                nextRows,
                "Điểm thưởng (tối đa 05 điểm)",
                1,
                true
            );
            if (parentIdxNext === -1) continue;

            const columnCount = nextRows[parentIdxNext]?.cells?.length || table?.columns?.length || 0;
            if (!columnCount) continue;

            const insertIdx = findInsertIndex(nextRows, parentIdxNext);

            // Generate new address if needed
            let newAddr = null;
            if (shouldHaveAddr) {
                const scoreColLetter = numToCol(scoreColIdx + 1);
                newAddr = `${scoreColLetter}${nextVirtualRowNo}`;
                nextVirtualRowNo++;
            }

            // Create new row cells
            const newCells = Array.from({ length: columnCount }, (_, cIdx) => ({
                addr: null,
                value: "",
                rowSpan: 1,
                colSpan: 1,
                hidden: false,
                input: false,
            }));

            // Set bonus label
            if (newCells[1]) newCells[1] = { ...newCells[1], value: bonusLabel };

            // Set note text
            if (noteColIdx != null && newCells[noteColIdx]) {
                newCells[noteColIdx] = { ...newCells[noteColIdx], value: noteText };
            }

            // Set score cell
            if (shouldHaveAddr && newAddr) {
                newCells[scoreColIdx] = {
                    ...newCells[scoreColIdx],
                    addr: newAddr,
                    value: bonusPoints,
                    input: false,
                };
            } else {
                newCells[scoreColIdx] = {
                    ...newCells[scoreColIdx],
                    value: bonusPoints,
                    input: false,
                };
            }

            // Insert new row
            nextRows.splice(insertIdx, 0, {
                autoGenerated: true,
                autoGeneratedKey: key,
                cells: newCells,
            });

            hasChanges = true;

            // Rebuild autoRowsByKey after insertion
            autoRowsByKey.clear();
            autoAddrsSet.clear();
            nextRows.forEach((row, idx) => {
                const rowKey = row?.autoGeneratedKey;
                if (rowKey && ruleKeySet.has(rowKey)) {
                    autoRowsByKey.set(rowKey, { row, idx });
                    const addr = row?.cells?.[scoreColIdx]?.addr;
                    if (addr) autoAddrsSet.add(addr);
                }
            });
        } else {
            // UPDATE EXISTING ROW
            const currentHasAddr = autoAddr !== null;
            const currentScore = autoInfo.row?.cells?.[scoreColIdx]?.value;
            const currentNote = noteColIdx != null ? autoInfo.row?.cells?.[noteColIdx]?.value || "" : "";

            const needUpdate =
                String(currentScore ?? "") !== String(bonusPoints) ||
                currentNote !== noteText ||
                currentHasAddr !== shouldHaveAddr;

            if (needUpdate) {
                nextRows = nextRows.map((row, idx) => {
                    if (idx === autoRowIdx && row?.cells) {
                        const cells = row.cells.map((cell, cIdx) => {
                            if (cIdx === scoreColIdx) {
                                if (shouldHaveAddr) {
                                    return { ...cell, value: bonusPoints, addr: autoAddr };
                                } else {
                                    return { ...cell, value: bonusPoints, addr: null };
                                }
                            }
                            if (noteColIdx != null && cIdx === noteColIdx) {
                                return { ...cell, value: noteText };
                            }
                            return cell;
                        });
                        return { ...row, cells };
                    }
                    return row;
                });
                hasChanges = true;

                // Rebuild autoRowsByKey
                autoRowsByKey.clear();
                autoAddrsSet.clear();
                nextRows.forEach((row, idx) => {
                    const rowKey = row?.autoGeneratedKey;
                    if (rowKey && ruleKeySet.has(rowKey)) {
                        autoRowsByKey.set(rowKey, { row, idx });
                        const addr = row?.cells?.[scoreColIdx]?.addr;
                        if (addr) autoAddrsSet.add(addr);
                    }
                });
            }
        }
    }

    // PHASE 6: Update parent formula with all awarded bonus addresses
    const allAutoAddrs = Array.from(autoRowsByKey.values())
        .map(info => info.row?.cells?.[scoreColIdx]?.addr)
        .filter(Boolean);
    const desiredFormula = parentFormulaFor(allAutoAddrs);
    const currentFormula = rows[parentRowIdx]?.cells?.[scoreColIdx]?.formula || "";

    if (currentFormula !== desiredFormula) {
        const parentIdxNext = findRowIndexByCriteria(
            nextRows,
            "Điểm thưởng (tối đa 05 điểm)",
            1,
            true
        );
        if (parentIdxNext !== -1) {
            const parentRowNext = nextRows[parentIdxNext];
            if (parentRowNext?.cells) {
                const parentCells = parentRowNext.cells.map((cell, idx) =>
                    idx === scoreColIdx ? { ...cell, formula: desiredFormula } : cell
                );
                nextRows[parentIdxNext] = { ...parentRowNext, cells: parentCells };
                hasChanges = true;
            }
        }
    }

    // Return updates if any changes were made
    if (hasChanges) {
        return {
            table: { ...table, rows: nextRows },
            virtualRowNo: nextVirtualRowNo,
            bonusAwardsToRecord, // Include bonus awards data for export handler
        };
    }

    // Even if no UI changes, return bonus awards if needed
    if (bonusAwardsToRecord) {
        return {
            bonusAwardsToRecord,
        };
    }

    return null;
}
