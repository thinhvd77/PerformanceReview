/**
 * Quarter Plan Handler
 * Loads persisted "Kế hoạch quý" values into the form table.
 */

import { normalizeText } from "../utils/formUtils.js";

const METRIC_LABEL_TO_TYPE = {
    "tang truong nguon von": "capital_growth",
    "tang truong du no": "loan_growth",
    "no nhom 2": "group_2_loan_ratio",
    "no xau": "bad_loan_ratio",
    "thu dich vu": "service_revenue",
    "thu hoi no đa xlrr": "debt_recovery",
    "tiep thi tin dung": "credit_marketing",
};

/**
 * Load quarter plan data for the active user/quarter/year into the table.
 *
 * @param {Object} params
 * @param {Object} params.table - Current table state
 * @param {number|null} params.planColIdx - Index of the "Kế hoạch" column
 * @param {number} params.selectedQuarter - Selected quarter (1-4)
 * @param {number} params.selectedYear - Selected year
 * @param {string} params.username - Username whose metrics are loaded
 * @param {Object} params.api - API instance
 * @returns {Promise<{cellInputsToDelete: string[], cellInputsToUpdate: Object}|null>}
 */
export async function loadQuarterPlanData({
    table,
    planColIdx,
    selectedQuarter,
    selectedYear,
    username,
    api,
}) {
    if (
        !table?.rows ||
        planColIdx == null ||
        planColIdx < 0 ||
        !selectedQuarter ||
        !selectedYear ||
        !username
    ) {
        return null;
    }

    // Collect rows that correspond to known metric types
    const rowsByMetric = [];
    table.rows.forEach((row) => {
        const criteriaCell = row?.cells?.[1];
        const planCell = row?.cells?.[planColIdx];
        if (!criteriaCell || !planCell?.addr) return;

        const normalizedLabel = normalizeText(criteriaCell.value);
        const metricType = METRIC_LABEL_TO_TYPE[normalizedLabel];
        if (!metricType) return;

        rowsByMetric.push({
            addr: planCell.addr,
            metricType,
        });
    });

    if (!rowsByMetric.length) {
        return null;
    }

    try {
        const { data } = await api.get("/quarter-plans", {
            params: {
                username,
                quarter: selectedQuarter,
                year: selectedYear,
            },
        });

        const plans = data?.data || {};
        const updates = {};
        const deleteAddrs = [];

        rowsByMetric.forEach(({ addr, metricType }) => {
            deleteAddrs.push(addr);
            const value = plans?.[metricType];
            if (value === null || value === undefined) return;
            if (value === "") return;
            updates[addr] = String(value);
        });

        return {
            cellInputsToDelete: deleteAddrs,
            cellInputsToUpdate: updates,
        };
    } catch (err) {
        // Swallow 404 (no data) but surface other errors
        if (err?.response?.status !== 404) {
            console.warn("Failed to load quarter plan data:", err);
        }
        return {
            cellInputsToDelete: rowsByMetric.map((row) => row.addr),
            cellInputsToUpdate: {},
        };
    }
}
