import { AppDataSource } from "../config/database.js";
import { QuarterActual } from "../entities/QuarterActual.js";

const quarterActualRepository = AppDataSource.getRepository(QuarterActual.options.name);

const ALLOWED_FIELDS = [
    "capital_growth_actual",
    "loan_growth_actual",
    "bad_loan_ratio_actual",
    "group_2_loan_ratio_actual",
];

/**
 * Calculate previous quarter and year
 * @param {number} quarter - Current quarter
 * @param {number} year - Current year
 * @returns {{prevQuarter: number, prevYear: number}}
 */
const calculatePreviousQuarter = (quarter, year) => {
    let prevQuarter = quarter - 1;
    let prevYear = year;

    if (prevQuarter < 1) {
        prevQuarter = 4;
        prevYear = year - 1;
    }

    return { prevQuarter, prevYear };
};

/**
 * Get quarter actuals for previous quarter
 * @param {string} employeeCode - Employee code
 * @param {number} quarter - Current quarter
 * @param {number} year - Current year
 * @returns {Promise<Object>}
 */
export const getPreviousQuarterActualsService = async (employeeCode, quarter, year) => {
    const { prevQuarter, prevYear } = calculatePreviousQuarter(quarter, year);

    const record = await quarterActualRepository.findOne({
        where: {
            employee_code: employeeCode,
            quarter: prevQuarter,
            year: prevYear,
        },
    });

    if (!record) {
        return {
            previous_quarter: prevQuarter,
            previous_year: prevYear,
            actuals: null,
        };
    }

    return {
        previous_quarter: prevQuarter,
        previous_year: prevYear,
        actuals: {
            capital_growth_actual: record.capital_growth_actual,
            loan_growth_actual: record.loan_growth_actual,
            bad_loan_ratio_actual: record.bad_loan_ratio_actual,
            group_2_loan_ratio_actual: record.group_2_loan_ratio_actual,
        },
    };
};

/**
 * Get all quarter actuals for a specific year
 * @param {string} employeeCode - Employee code
 * @param {number} year - Year
 * @returns {Promise<Object>}
 */
export const getQuarterActualsService = async (employeeCode, year) => {
    const records = await quarterActualRepository.find({
        where: {
            employee_code: employeeCode,
            year,
        },
        order: {
            quarter: "ASC",
        },
    });

    // Transform to metrics format for frontend
    const metrics = {};

    ALLOWED_FIELDS.forEach((field) => {
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

    return { data: metrics };
};

/**
 * Save quarter actuals
 * @param {string} employeeCode - Employee code
 * @param {number} quarter - Quarter
 * @param {number} year - Year
 * @param {Object} actuals - Actual values
 * @returns {Promise<Object>}
 */
export const saveQuarterActualsService = async (employeeCode, quarter, year, actuals) => {
    let record = await quarterActualRepository.findOne({
        where: {
            employee_code: employeeCode,
            quarter,
            year,
        },
    });

    if (!record) {
        record = quarterActualRepository.create({
            employee_code: employeeCode,
            quarter,
            year,
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

    return quarterActualRepository.save(record);
};

/**
 * Delete quarter actuals for an employee
 * @param {string} employeeCode - Employee code
 * @param {number} year - Year
 * @param {number} quarter - Quarter
 * @returns {Promise<void>}
 */
export const deleteQuarterActualsService = async (employeeCode, year, quarter) => {
    await quarterActualRepository.delete({
        employee_code: employeeCode,
        year,
        quarter,
    });
};
