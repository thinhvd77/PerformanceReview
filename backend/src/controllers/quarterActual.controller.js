import { AppDataSource } from "../config/database.js";
import { QuarterActual } from "../entities/QuarterActual.js";

const ALLOWED_FIELDS = [
    "capital_growth_actual",
    "loan_growth_actual",
    "bad_loan_ratio_actual",
    "group_2_loan_ratio_actual",
];

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

        // Calculate previous quarter
        let prevQuarter = quarter - 1;
        let prevYear = year;

        if (prevQuarter < 1) {
            prevQuarter = 4;
            prevYear = year - 1;
        }

        const repo = AppDataSource.getRepository(QuarterActual.options.name);
        const record = await repo.findOne({
            where: {
                employee_code,
                quarter: prevQuarter,
                year: prevYear,
            },
        });

        if (!record) {
            return res.json({
                previous_quarter: prevQuarter,
                previous_year: prevYear,
                actuals: null,
            });
        }

        return res.json({
            previous_quarter: prevQuarter,
            previous_year: prevYear,
            actuals: {
                capital_growth_actual: record.capital_growth_actual,
                loan_growth_actual: record.loan_growth_actual,
                bad_loan_ratio_actual: record.bad_loan_ratio_actual,
                group_2_loan_ratio_actual: record.group_2_loan_ratio_actual,
            },
        });
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
 * If username is provided (admin use case), fetch data for that user
 * Otherwise, fetch data for authenticated user
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

        // Use provided username (for admin) or current user's username
        const employee_code = username || currentUser;

        const repo = AppDataSource.getRepository(QuarterActual.options.name);
        const records = await repo.find({
            where: {
                employee_code,
                year,
            },
            order: {
                quarter: "ASC",
            },
        });

        // Transform to metrics format for frontend
        const metrics = {};

        ALLOWED_FIELDS.forEach((field) => {
            // Keep the field name with "_actual" suffix to match frontend expectations
            metrics[field] = {
                q1Actual: null,
                q2Actual: null,
                q3Actual: null,
                q4Actual: null,
            };
        });

        records.forEach((record) => {
            const quarterKey = `q${record.quarter}Actual`;
            ALLOWED_FIELDS.forEach((field) => {
                if (record[field] !== null && record[field] !== undefined) {
                    metrics[field][quarterKey] = parseFloat(record[field]);
                }
            });
        });

        return res.json({
            data: metrics,
        });
    } catch (err) {
        console.error("getQuarterActuals error:", err);
        return res.status(500).json({
            message: "Failed to get quarter actuals",
            error: err.message,
        });
    }
};

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

        // Use provided username (for admin) or current user's username
        const employee_code = username || currentUser;

        const repo = AppDataSource.getRepository(QuarterActual.options.name);

        let record = await repo.findOne({
            where: {
                employee_code,
                quarter: parsedQuarter,
                year: parsedYear,
            },
        });

        if (!record) {
            record = repo.create({
                employee_code,
                quarter: parsedQuarter,
                year: parsedYear,
            });
        }

        ALLOWED_FIELDS.forEach((field) => {
            if (Object.prototype.hasOwnProperty.call(actuals, field)) {
                const value = actuals[field];
                if (value === null || value === undefined || value === "") {
                    record[field] = null;
                } else {
                    const numeric = Number(value);
                    record[field] = Number.isFinite(numeric) ? numeric : null;
                }
            }
        });

        const saved = await repo.save(record);

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
