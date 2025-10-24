/**
 * Annual Plan Handler
 * Loads persisted "Kế hoạch năm" values into the form table.
 */

import { normalizeText } from "../utils/formUtils.js";

const METRIC_LABEL_TO_TYPE = {
    "tang truong nguon von": "capital_growth",
    "tang truong du no": "loan_growth",
    "thu dich vu": "service_revenue",
    "thu hoi no đa xlrr": "debt_recovery",
    "thu tai chinh": "finance",
};

/**
 * Load annual plan data for the active user/year into the table.
 *
 * @param {Object} params
 * @param {Object} params.table - Current table state
 * @param {number|null} params.annualPlanColIdx - Index of the "Kế hoạch năm" column
 * @param {number} params.selectedYear - Selected year
 * @param {string} params.username - Username whose metrics are loaded
 * @param {Object} params.api - API instance
 * @returns {Promise<{cellInputsToDelete: string[], cellInputsToUpdate: Object}|null>}
 */
export async function loadAnnualPlanData({
    table,
    annualPlanColIdx,
    selectedYear,
    username,
    api,
}) {
    if (
        !table?.rows ||
        annualPlanColIdx == null ||
        annualPlanColIdx < 0 ||
        !selectedYear ||
        !username
    ) {
        return null;
    }

    // Collect rows that correspond to known metric types
    const rowsByMetric = [];
    table.rows.forEach((row) => {
        const criteriaCell = row?.cells?.[1];
        const planCell = row?.cells?.[annualPlanColIdx];
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
        const { data } = await api.get("/annual-metrics", {
            params: {
                username,
                year: selectedYear,
            },
        });

        const metrics = data?.data || {};
        const updates = {};
        const deleteAddrs = [];

        rowsByMetric.forEach(({ addr, metricType }) => {
            deleteAddrs.push(addr);
            const value = metrics?.[metricType]?.annualPlan;
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
            console.warn("Failed to load annual plan metrics:", err);
        }
        return {
            cellInputsToDelete: rowsByMetric.map((row) => row.addr),
            cellInputsToUpdate: {},
        };
    }
}
