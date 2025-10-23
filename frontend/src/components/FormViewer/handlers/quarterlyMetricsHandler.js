/**
 * Quarterly Metrics Handler
 * Functions for loading previous quarter data and saving current quarter metrics
 */

import { normalizeText } from "../utils/formUtils.js";
import { extractQuarterlyMetrics } from "../../../utils/extractQuarterlyMetrics.js";

/**
 * Load previous quarter metrics and populate table cells
 * 
 * @param {Object} params - Processing parameters
 * @param {Object} params.table - Current table state
 * @param {number} params.selectedQuarter - Selected quarter (1-4)
 * @param {number} params.selectedYear - Selected year
 * @param {Object} params.api - API instance
 * @returns {Promise<Object|null>} Object with {cellInputsToDelete, cellInputsToUpdate, successMessage} or null
 */
export async function loadPreviousQuarterData({
    table,
    selectedQuarter,
    selectedYear,
    api,
}) {
    if (!table?.rows || !table?.columns) return null;

    try {
        // Find "Thực hiện quý trước" column index
        const prevActualColIdx = table.columns.findIndex((c) =>
            normalizeText(c?.label).includes("thuc hien quy truoc")
        );

        if (prevActualColIdx < 0) {
            console.warn('Could not find "Thực hiện quý trước" column');
            return null;
        }

        // FIRST: Collect all "Thực hiện quý trước" cell addresses to clear
        const cellAddressesToClear = [];
        table.rows.forEach((row) => {
            const prevCell = row?.cells?.[prevActualColIdx];
            if (prevCell?.addr) {
                cellAddressesToClear.push(prevCell.addr);
            }
        });

        // THEN: Try to load new previous quarter data
        const { data } = await api.get("/quarterly-metrics/previous", {
            params: {
                quarter: selectedQuarter,
                year: selectedYear,
            },
        });

        if (!data?.metrics) {
            // No data available, just return cells to clear
            return {
                cellInputsToDelete: cellAddressesToClear,
                cellInputsToUpdate: {},
                successMessage: null,
            };
        }

        // Map metric types to their values
        const metricsMap = data.metrics;
        const updates = {};

        // Process each row to find matching metrics
        table.rows.forEach((row) => {
            const criteriaCell = row?.cells?.[1];
            if (!criteriaCell) return;

            const criteriaLabel = String(criteriaCell.value || "").trim();
            const normalized = normalizeText(criteriaLabel);

            // Determine metric type
            let metricType = null;
            if (normalized.includes("tang truong nguon von")) {
                metricType = "capital_growth";
            } else if (normalized.includes("tang truong du no")) {
                metricType = "loan_growth";
            } else if (normalized.includes("thu dich vu")) {
                metricType = "service_revenue";
            } else if (normalized.includes("thu hoi no da xlrr")) {
                metricType = "debt_recovery";
            }

            // If this row matches a metric and we have data for it
            if (metricType && metricsMap[metricType] != null) {
                const prevCell = row.cells[prevActualColIdx];
                if (prevCell?.addr) {
                    updates[prevCell.addr] = metricsMap[metricType];
                }
            }
        });

        // Prepare success message
        const successMessage =
            Object.keys(updates).length > 0
                ? `Đã tự động điền ${Object.keys(updates).length
                } chỉ số từ Quý ${data.previous_quarter}/${data.previous_year
                }`
                : null;

        return {
            cellInputsToDelete: cellAddressesToClear,
            cellInputsToUpdate: updates,
            successMessage,
        };
    } catch (err) {
        // Silent fail - previous quarter data is optional
        if (err?.response?.status !== 404) {
            console.warn(
                "Failed to load previous quarter metrics:",
                err?.response?.data || err.message
            );
        }

        // Return null to indicate no changes needed
        return null;
    }
}

/**
 * Save quarterly metrics to backend
 * Extracts metrics from table and saves them via API
 * 
 * @param {Object} params - Processing parameters
 * @param {Object} params.table - Current table state
 * @param {Object} params.cellInputs - Current cell inputs
 * @param {Object} params.computedByAddr - Computed values by address
 * @param {number} params.selectedQuarter - Selected quarter (1-4)
 * @param {number} params.selectedYear - Selected year
 * @param {Object} params.api - API instance
 * @returns {Promise<void>}
 */
export async function saveQuarterlyMetrics({
    table,
    cellInputs,
    computedByAddr,
    selectedQuarter,
    selectedYear,
    api,
}) {
    try {
        const metrics = extractQuarterlyMetrics(table, cellInputs, computedByAddr);

        if (metrics.length > 0) {
            await api.post("/quarterly-metrics", {
                quarter: selectedQuarter,
                year: selectedYear,
                metrics,
            });

            console.log(
                `Saved ${metrics.length} quarterly metrics for Q${selectedQuarter} ${selectedYear}`
            );
        }
    } catch (err) {
        console.warn(
            "Failed to save quarterly metrics:",
            err?.response?.data || err.message
        );
        // Non-fatal: don't throw, just log warning
    }
}
