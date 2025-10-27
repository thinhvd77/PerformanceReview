import { saveAnnualPlan, importAnnualPlanFromExcel, getAnnualPlan } from "../services/annualPlan.service.js";
import fs from "fs";

/**
 * Controller to handle getting annual plan
 * GET /api/annual-plans?username=xxx&year=2025
 */
export const handleGetAnnualPlan = async (req, res) => {
    return getAnnualPlan(req, res);
};

/**
 * Controller to handle importing annual plan from Excel
 * POST /api/annual-plans/import
 */
export const handleImportAnnualPlan = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "No file uploaded",
            });
        }

        const { saved, errors } = await importAnnualPlanFromExcel(req.file.path);

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        return res.status(200).json({
            message: "Annual plan import completed",
            saved: saved.length,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (error) {
        console.error("Error importing annual plan:", error);

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
 * Controller to handle saving annual plan data
 * POST /api/annual-plans
 */
export const handleSaveAnnualPlan = async (req, res) => {
    return saveAnnualPlan(req, res);
};