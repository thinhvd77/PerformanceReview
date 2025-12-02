import {
    getPreviousQuarterActualsService,
    getQuarterActualsService,
    saveQuarterActualsService,
} from "../services/quarterActual.service.js";

/**
 * Get quarter actuals for previous quarter
 * GET /api/quarter-actuals/previous?quarter=X&year=Y
 */
export const getPreviousQuarterActuals = async (req, res) => {
    try {
        const employee_code = req.user?.username;
        if (!employee_code) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        let { quarter, year } = req.query;
        quarter = parseInt(quarter, 10);
        year = parseInt(year, 10);

        if (!quarter || !year) {
            return res.status(400).json({
                message: "Missing required parameters: quarter, year",
            });
        }

        const result = await getPreviousQuarterActualsService(employee_code, quarter, year);
        return res.json(result);
    } catch (err) {
        console.error("getPreviousQuarterActuals error:", err);
        return res.status(500).json({
            message: "Failed to get previous quarter actuals",
            error: err.message,
        });
    }
};

/**
 * Get all quarter actuals for a specific year
 * GET /api/quarter-actuals?year=2025&username=user123
 */
export const getQuarterActuals = async (req, res) => {
    try {
        const currentUser = req.user?.username;
        if (!currentUser) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        let { year, username } = req.query;
        year = parseInt(year, 10);

        if (!year) {
            return res.status(400).json({
                message: "Missing required parameter: year",
            });
        }

        const employee_code = username || currentUser;
        const result = await getQuarterActualsService(employee_code, year);
        return res.json(result);
    } catch (err) {
        console.error("getQuarterActuals error:", err);
        return res.status(500).json({
            message: "Failed to get quarter actuals",
            error: err.message,
        });
    }
};

/**
 * Save quarter actuals
 * POST /api/quarter-actuals
 */
export const saveQuarterActuals = async (req, res) => {
    try {
        const currentUser = req.user?.username;
        if (!currentUser) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { quarter, year, actuals, username } = req.body || {};

        const parsedQuarter = parseInt(quarter, 10);
        const parsedYear = parseInt(year, 10);

        if (
            !parsedQuarter ||
            !parsedYear ||
            parsedQuarter < 1 ||
            parsedQuarter > 4 ||
            parsedYear < 2000 ||
            parsedYear > 2100
        ) {
            return res.status(400).json({
                message: "Invalid or missing quarter/year",
                received: { quarter, year },
            });
        }

        if (!actuals || typeof actuals !== "object") {
            return res.status(400).json({
                message: "Missing actuals payload",
            });
        }

        const employee_code = username || currentUser;
        const saved = await saveQuarterActualsService(employee_code, parsedQuarter, parsedYear, actuals);

        return res.status(200).json({
            message: "Quarter actuals saved successfully",
            data: saved,
        });
    } catch (err) {
        console.error("saveQuarterActuals error:", err);
        return res.status(500).json({
            message: "Failed to save quarter actuals",
            error: err.message,
        });
    }
};
