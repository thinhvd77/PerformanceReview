import { saveQuarterPlan, importQuarterPlanFromExcel, getQuarterPlan } from "../services/quarterPlan.service.js";
import fs from "fs";

/**
 * Controller to handle getting quarter plan
 * GET /api/quarter-plans?username=xxx&quarter=1&year=2025
 */
export const handleGetQuarterPlan = async (req, res) => {
    return getQuarterPlan(req, res);
};

/**
 * Controller to handle importing quarter plan from Excel
 * POST /api/quarter-plans/import
 */
export const handleImportQuarterPlan = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "No file uploaded",
            });
        }

        const { saved, errors } = await importQuarterPlanFromExcel(req.file.path);

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        return res.status(200).json({
            message: "Quarter plan import completed",
            saved: saved.length,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (error) {
        console.error("Error importing quarter plan:", error);

        // Clean up file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        return res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
};

/**
 * Controller to handle saving quarter plan data
 * POST /api/quarter-plans
 */
export const handleSaveQuarterPlan = async (req, res) => {
    return saveQuarterPlan(req, res);
};
