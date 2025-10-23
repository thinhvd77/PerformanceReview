/**
 * Extract quarterly metrics from form table data
 * Returns array of metrics: [{ metric_type, plan_value, actual_value, prev_actual_value }]
 */

const normalizeText = (value) =>
    String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

const parseNumberAnyLocale = (value) => {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    let s = String(value).trim();
    if (!s) return null;
    const hasPercent = s.includes("%");
    s = s.replace(/%/g, "");
    if (s.includes(",") && !s.includes(".")) {
        s = s.replace(/\./g, "").replace(",", ".");
    } else {
        s = s.replace(/,/g, "");
    }
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    return hasPercent ? n / 100 : n;
};

// Mapping from Vietnamese labels to metric_type codes
const METRIC_LABEL_TO_TYPE = {
    'tang truong nguon von': 'capital_growth',
    'tang truong du no': 'loan_growth',
    'thu dich vu': 'service_revenue',
    'thu hoi no da xlrr': 'debt_recovery',
};

export const extractQuarterlyMetrics = (table, cellInputs, computedByAddr) => {
    if (!table?.rows || !table?.columns) {
        return [];
    }

    // Find column indices
    const planColIdx = table.columns.findIndex((c) =>
        normalizeText(c?.label).includes("ke hoach quy nay")
    );
    const actualColIdx = table.columns.findIndex((c) =>
        normalizeText(c?.label).includes("thuc hien quy nay")
    );
    const prevActualColIdx = table.columns.findIndex((c) =>
        normalizeText(c?.label).includes("thuc hien quy truoc")
    );

    if (planColIdx === -1 || actualColIdx === -1) {
        console.warn('Could not find plan or actual columns');
        return [];
    }

    const metrics = [];

    // Helper to resolve cell value
    const resolveCellValue = (cell) => {
        if (!cell) return null;
        let raw = null;
        if (cell.addr) {
            if (cell.formula) {
                raw = computedByAddr?.[cell.addr] ?? cell.value;
            } else if (cell.input) {
                raw = cellInputs?.[cell.addr];
            } else {
                raw = cellInputs?.[cell.addr] ?? cell.value;
            }
        } else {
            raw = cell.value;
        }
        return parseNumberAnyLocale(raw);
    };

    // Process each row
    table.rows.forEach((row) => {
        const criteriaCell = row?.cells?.[1]; // Column B: "Tiêu chí"
        if (!criteriaCell) return;

        const criteriaLabel = String(criteriaCell.value || "").trim();
        const normalizedLabel = normalizeText(criteriaLabel);

        // Check if this row matches one of our target metrics
        const metricType = METRIC_LABEL_TO_TYPE[normalizedLabel];
        if (!metricType) return;

        // Extract values
        const planValue = resolveCellValue(row.cells[planColIdx]);
        const actualValue = resolveCellValue(row.cells[actualColIdx]);
        const prevActualValue = prevActualColIdx >= 0
            ? resolveCellValue(row.cells[prevActualColIdx])
            : null;

        // Only save if we have at least actual or plan value
        if (actualValue != null || planValue != null) {
            metrics.push({
                metric_type: metricType,
                plan_value: planValue,
                actual_value: actualValue,
                prev_actual_value: prevActualValue,
            });
        }
    });

    return metrics;
};

/**
 * Get current quarter and year
 */
export const getCurrentQuarterYear = () => {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const quarter = Math.ceil(month / 3); // 1-4
    const year = now.getFullYear();
    return { quarter, year };
};
