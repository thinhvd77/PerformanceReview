/**
 * Export Handler
 * 
 * Handles the complete export workflow for form data:
 * 1. Generates Excel buffer with form data and user metadata
 * 2. Uploads to backend for record keeping
 * 3. Saves quarterly metrics
 * 4. Triggers local file download
 * 5. Resets form state to initial values
 */

import { message } from "antd";
import { saveAs } from "file-saver";
import exportFormExcel from "../../../utils/exportFormExcel.js";
import { orgData, findNameById } from "../../../data/orgData.js";
import {
    cloneTable,
} from "../utils/tableUtils.js";
import {
    applyBaseScoreDefaults,
} from "../utils/formCalculations.js";
import { buildInitialInputs } from "../../../utils/formulaEngine.js";
import { saveQuarterlyMetrics } from "./quarterlyMetricsHandler.js";
import { computeDefaultCriteria } from "../utils/formLoader.js";
import { AUTO_BONUS_RULE_KEY_SET } from "../constants/autoRules.js";

/**
 * Extracts user metadata for export
 * 
 * @param {Object} user - Current user object from auth context
 * @returns {Object} Metadata object with employee_name, role, branchId, departmentId, positionId
 */
export function extractUserMetadata(user) {
    const employee_name = user?.fullname || user?.username || "";

    let role = "";
    let branchId = "",
        departmentId = "",
        positionId = "";

    try {
        branchId = localStorage.getItem("ufp.branchId") || "";
        departmentId = localStorage.getItem("ufp.departmentId") || "";
        positionId = localStorage.getItem("ufp.positionId") || "";

        if (branchId && departmentId && positionId) {
            // Build full position key (e.g., "hs-kt") from branch and department
            const positionKey = `${branchId}-${departmentId}`;
            const positions = orgData.positions?.[positionKey] || [];
            role = findNameById(positions, positionId) || "";

            // Extract role prefix before hyphen if exists
            if (role.includes("-")) {
                role = role.split("-")[0].trim();
            }
        }
    } catch (err) {
        console.warn("Failed to extract user metadata:", err);
    }

    return {
        employee_name,
        role,
        branchId,
        departmentId,
        positionId,
    };
}

/**
 * Generates standardized file name for export
 * 
 * @param {number} selectedQuarter - Quarter number (1-4)
 * @param {number} selectedYear - Year (e.g., 2025)
 * @param {string} username - Username from user object
 * @returns {string} Standardized file name with date
 */
export function generateExportFileName(selectedQuarter, selectedYear, username) {
    const dateStr = new Date().toISOString().slice(0, 10);
    return `Phieu_tu_danh_gia_Q${selectedQuarter}_${selectedYear}_${username}_${dateStr}.xlsx`;
}

/**
 * Generates Excel buffer with form data
 * 
 * @param {Object} params - Export parameters
 * @param {Object} params.table - Form table structure
 * @param {Object} params.cellInputs - User inputs by cell address
 * @param {Object} params.computedByAddr - Computed formula results
 * @param {string} params.fileName - Output file name
 * @param {Object} params.metadata - User metadata (employee_name, role, branch, department)
 * @param {number} params.selectedQuarter - Selected quarter
 * @param {number} params.selectedYear - Selected year
 * @returns {Promise<ArrayBuffer>} Excel file buffer
 */
export async function generateExcelBuffer({
    table,
    cellInputs,
    computedByAddr,
    fileName,
    metadata,
    selectedQuarter,
    selectedYear,
}) {
    const buffer = await exportFormExcel({
        table,
        cellInputs,
        computedByAddr,
        fileName,
        title: "BẢNG TỰ ĐÁNH GIÁ MỨC ĐỘ HOÀN THÀNH CÔNG VIỆC",
        employee_name: metadata.employee_name,
        role: metadata.role,
        branch: metadata.branchId,
        department: metadata.departmentId,
        quarter: selectedQuarter,
        year: selectedYear,
        protectSheet: true,
        protectPassword: "Admin@6421",
        readOnly: true,
        allowResizeForPrint: true,
        returnBuffer: true,
    });

    return buffer;
}

/**
 * Uploads export to backend for record keeping
 * 
 * @param {Object} params - Upload parameters
 * @param {ArrayBuffer} params.buffer - Excel file buffer
 * @param {string} params.fileName - File name
 * @param {string} params.formId - Form template ID
 * @param {Object} params.table - Form table structure
 * @param {number} params.selectedQuarter - Selected quarter
 * @param {number} params.selectedYear - Selected year
 * @param {Object} params.api - API instance
 * @returns {Promise<number|null>} Export record ID or null if failed
 */
export async function uploadExportToBackend({
    buffer,
    fileName,
    formId,
    table,
    selectedQuarter,
    selectedYear,
    api,
}) {
    try {
        const blob = new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        const fd = new FormData();
        fd.append("file", blob, fileName);
        fd.append("fileName", fileName);
        fd.append("formId", formId || "");
        fd.append("table", JSON.stringify(table));
        fd.append("quarter", String(selectedQuarter));
        fd.append("year", String(selectedYear));

        const resp = await api.post("/exports", fd, {
            headers: { "Content-Type": "multipart/form-data" },
        });

        const exportId = resp?.data?.id;
        if (exportId) {
            message.success(`Đã lưu bản xuất (ID: ${exportId})`);
        } else {
            message.success("Đã lưu bản xuất");
        }

        return exportId || null;
    } catch (err) {
        console.warn("Upload export failed:", err?.response?.data || err.message);
        return null;
    }
}

/**
 * Records awarded bonuses to backend database
 * Scans the form table for auto-generated bonus rows and records them
 * 
 * @param {Object} params - Parameters
 * @param {Object} params.table - Form table structure
 * @param {string} params.username - Username
 * @param {number} params.selectedQuarter - Selected quarter
 * @param {number} params.selectedYear - Selected year
 * @param {Object} params.api - API instance
 * @returns {Promise<void>}
 */
export async function recordAwardedBonuses({
    table,
    username,
    selectedQuarter,
    selectedYear,
    api,
}) {
    try {
        // Scan table for auto-generated bonus rows
        const bonusKeys = [];

        if (table?.rows) {
            table.rows.forEach((row) => {
                const key = row?.autoGeneratedKey;
                if (key && AUTO_BONUS_RULE_KEY_SET.has(key)) {
                    bonusKeys.push(key);
                }
            });
        }

        // If no bonuses awarded, skip
        if (bonusKeys.length === 0) {
            console.log('No bonus rows found in form - skipping bonus awards recording');
            return;
        }

        console.log(`Recording ${bonusKeys.length} bonus awards:`, bonusKeys);

        // Record all bonuses in batch
        await api.post('/bonus-awards/batch', {
            username,
            year: selectedYear,
            quarter: selectedQuarter,
            bonusKeys,
        });

        console.log('Bonus awards recorded successfully');
    } catch (err) {
        console.warn('Failed to record bonus awards:', err?.response?.data || err.message);
        // Non-fatal - don't block export workflow
    }
}

/**
 * Saves Excel buffer as local file
 * 
 * @param {ArrayBuffer} buffer - Excel file buffer
 * @param {string} fileName - Output file name
 */
export function saveExcelLocally(buffer, fileName) {
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, fileName);
}

/**
 * Resets form state to initial values
 * 
 * @param {Object} params - Reset parameters
 * @param {Object} params.baseTable - Original form table template
 * @param {number} params.scoreColIdx - Score column index
 * @returns {Object} Reset state values {table, cellInputs, criteriaSelectValueByRow, childrenScoreAddrs, virtualRowNo}
 */
export function resetFormState({ baseTable, scoreColIdx }) {
    const restoredTable = cloneTable(baseTable);
    const resetTable = applyBaseScoreDefaults(restoredTable, scoreColIdx);
    const initialInputs = resetTable ? buildInitialInputs(resetTable) : {};
    const defaultCriteria = computeDefaultCriteria(baseTable);

    return {
        table: resetTable ?? null,
        cellInputs: initialInputs,
        criteriaSelectValueByRow: defaultCriteria,
        childrenScoreAddrs: {},
        virtualRowNo: 1000,
    };
}

/**
 * Main export handler - orchestrates the complete export workflow
 * 
 * @param {Object} params - Export parameters
 * @param {Object} params.user - Current user object
 * @param {Object} params.table - Form table structure
 * @param {Object} params.cellInputs - User inputs by cell address
 * @param {Object} params.computedByAddr - Computed formula results
 * @param {number} params.selectedQuarter - Selected quarter
 * @param {number} params.selectedYear - Selected year
 * @param {string} params.formId - Form template ID
 * @param {Object} params.template - Form template object
 * @param {Object} params.baseTable - Original form table template
 * @param {number} params.scoreColIdx - Score column index
 * @param {Object} params.api - API instance
 * @returns {Promise<Object|null>} Reset state values or null if export failed
 */
export async function handleExportWorkflow({
    user,
    table,
    cellInputs,
    computedByAddr,
    selectedQuarter,
    selectedYear,
    formId,
    template,
    baseTable,
    scoreColIdx,
    api,
}) {
    try {
        // Step 1: Extract user metadata
        const metadata = extractUserMetadata(user);

        // Step 2: Generate file name
        const fileName = generateExportFileName(
            selectedQuarter,
            selectedYear,
            user.username
        );

        // Step 3: Generate Excel buffer
        const buffer = await generateExcelBuffer({
            table,
            cellInputs,
            computedByAddr,
            fileName,
            metadata,
            selectedQuarter,
            selectedYear,
        });

        // Step 4: Upload to backend (non-fatal if fails)
        await uploadExportToBackend({
            buffer,
            fileName,
            formId: formId || template?.id,
            table,
            selectedQuarter,
            selectedYear,
            api,
        });

        // Step 5: Save quarterly metrics (non-fatal if fails)
        await saveQuarterlyMetrics({
            table,
            cellInputs,
            computedByAddr,
            selectedQuarter,
            selectedYear,
            api,
        });

        // Step 5.5: Record awarded bonuses (non-fatal if fails)
        await recordAwardedBonuses({
            table,
            username: user.username,
            selectedQuarter,
            selectedYear,
            api,
        });

        // Step 6: Save locally for user
        saveExcelLocally(buffer, fileName);

        // Step 7: Reset form state
        const resetState = resetFormState({ baseTable, scoreColIdx });

        return resetState;
    } catch (err) {
        console.error("Export workflow failed:", err);
        message.error(err?.message || "Xuất Excel thất bại");
        return null;
    }
}
