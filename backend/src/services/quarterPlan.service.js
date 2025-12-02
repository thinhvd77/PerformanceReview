import { AppDataSource } from "../config/database.js";
import { QuarterPlan } from "../entities/QuarterPlan.js";
import ExcelJS from "exceljs";
import { parseNumber as parseNumericValue } from "../utils/helpers.js";

/**
 * Import quarter plans from Excel file
 * Excel structure:
 * Col A: Mã CBNV (Employee Code)
 * Col B: Quý (Quarter)
 * Col C: Năm (Year)
 * Col D: Tăng trưởng nguồn vốn (Capital Growth)
 * Col E: Tăng trưởng dư nợ (Loan Growth)
 * Col F: Nợ nhóm 2 (Group 2 Loan Ratio)
 * Col G: Nợ xấu (Bad Loan Ratio)
 * Col H: Thu dịch vụ (Service Revenue)
 * Col I: Thu hồi nợ đã XLRR (Debt Recovery)
 * Col J: Tiếp thị tín dụng (Credit Marketing)
 */
export const importQuarterPlanFromExcel = async (filePath) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
        throw new Error("Excel file has no worksheets");
    }

    const plans = [];
    const errors = [];
    const userRepo = AppDataSource.getRepository("User");
    const planRepo = AppDataSource.getRepository(QuarterPlan);

    // Start from row 2 (skip header row)
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);

        // Skip empty rows
        if (!row.getCell(1).value && !row.getCell(2).value && !row.getCell(3).value) continue;

        const employeeCode = String(row.getCell(1).value || "").trim();
        const quarter = row.getCell(2).value;
        const year = row.getCell(3).value;
        const capitalGrowth = row.getCell(4).value;
        const loanGrowth = row.getCell(5).value;
        const group2LoanRatio = row.getCell(6).value;
        const badLoanRatio = row.getCell(7).value;
        const serviceRevenue = row.getCell(8).value;
        const debtRecovery = row.getCell(9).value;
        const creditMarketing = row.getCell(10).value;

        // Validation
        if (!employeeCode || !quarter || !year) {
            errors.push({
                row: rowNumber,
                message: "Thiếu mã CBNV, quý hoặc năm",
                data: { employeeCode, quarter, year }
            });
            continue;
        }

        // Validate quarter (1-4)
        const quarterNum = Number(quarter);
        if (isNaN(quarterNum) || quarterNum < 1 || quarterNum > 4) {
            errors.push({
                row: rowNumber,
                message: "Quý không hợp lệ (phải từ 1-4)",
                data: { quarter }
            });
            continue;
        }

        // Validate year
        const yearNum = Number(year);
        if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
            errors.push({
                row: rowNumber,
                message: "Năm không hợp lệ",
                data: { year }
            });
            continue;
        }

        // Check if employee exists
        const employee = await userRepo.findOne({
            where: { username: employeeCode }
        });

        if (!employee) {
            errors.push({
                row: rowNumber,
                message: `Không tìm thấy nhân viên có mã: ${employeeCode}`,
                data: { employeeCode }
            });
            continue;
        }

        // Parse numeric values using helper (returns null for invalid values)
        const parseNumber = (val) => {
            if (val === null || val === undefined || val === "") return null;
            return parseNumericValue(val);
        };

        plans.push({
            employee_code: employeeCode,
            quarter: quarterNum,
            year: yearNum,
            capital_growth_plan: parseNumber(capitalGrowth),
            loan_growth_plan: parseNumber(loanGrowth),
            group_2_loan_ratio_plan: parseNumber(group2LoanRatio),
            bad_loan_ratio_plan: parseNumber(badLoanRatio),
            service_revenue_plan: parseNumber(serviceRevenue),
            debt_recovery_plan: parseNumber(debtRecovery),
            credit_marketing_plan: parseNumber(creditMarketing),
        });
    }

    // Bulk upsert
    const saved = [];
    for (const planData of plans) {
        let plan = await planRepo.findOne({
            where: {
                employee_code: planData.employee_code,
                quarter: planData.quarter,
                year: planData.year,
            }
        });

        if (plan) {
            // Update existing
            Object.assign(plan, planData);
        } else {
            // Create new
            plan = planRepo.create(planData);
        }

        const savedPlan = await planRepo.save(plan);
        saved.push(savedPlan);
    }

    return { saved, errors };
};

/**
 * Get quarter plan for a user, quarter, and year
 * GET /api/quarter-plans?username=xxx&quarter=1&year=2025
 */
export const getQuarterPlan = async (req, res) => {
    try {
        const { username, quarter, year } = req.query;

        if (!username || !quarter || !year) {
            return res.status(400).json({
                message: "Missing required parameters: username, quarter, year",
            });
        }

        const repo = AppDataSource.getRepository(QuarterPlan);
        const plan = await repo.findOne({
            where: {
                employee_code: username,
                quarter: parseInt(quarter),
                year: parseInt(year)
            },
        });

        if (!plan) {
            return res.status(200).json({
                message: "No quarter plan found",
                data: {
                    capital_growth: 0,
                    loan_growth: 0,
                    group_2_loan_ratio: 0,
                    bad_loan_ratio: 0,
                    service_revenue: 0,
                    debt_recovery: 0,
                    credit_marketing: 0,
                },
            });
        }

        return res.status(200).json({
            message: "Quarter plan retrieved successfully",
            data: {
                capital_growth: plan.capital_growth_plan || 0,
                loan_growth: plan.loan_growth_plan || 0,
                group_2_loan_ratio: plan.group_2_loan_ratio_plan || 0,
                bad_loan_ratio: plan.bad_loan_ratio_plan || 0,
                service_revenue: plan.service_revenue_plan || 0,
                debt_recovery: plan.debt_recovery_plan || 0,
                credit_marketing: plan.credit_marketing_plan || 0,
            },
        });
    } catch (error) {
        console.error("Error retrieving quarter plan:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};

/**
 * Save or update quarter plan data
 * POST /api/quarter-plans
 * Body: { username, quarter, year, plans: { capital_growth: value, loan_growth: value, ... } }
 */
export const saveQuarterPlan = async (req, res) => {
    try {
        const { username, quarter, year, plans } = req.body;

        if (!username || !quarter || !year || !plans) {
            return res.status(400).json({
                message: "Missing required fields: username, quarter, year, plans",
            });
        }

        const repo = AppDataSource.getRepository(QuarterPlan);

        // Find existing plan or create new one
        let plan = await repo.findOne({
            where: {
                employee_code: username,
                quarter: parseInt(quarter),
                year: parseInt(year)
            },
        });

        if (plan) {
            // Update existing
            plan.capital_growth_plan = plans.capital_growth || 0;
            plan.loan_growth_plan = plans.loan_growth || 0;
            plan.group_2_loan_ratio_plan = plans.group_2_loan_ratio || 0;
            plan.bad_loan_ratio_plan = plans.bad_loan_ratio || 0;
            plan.service_revenue_plan = plans.service_revenue || 0;
            plan.debt_recovery_plan = plans.debt_recovery || 0;
            plan.credit_marketing_plan = plans.credit_marketing || 0;
        } else {
            // Create new
            plan = repo.create({
                employee_code: username,
                quarter: parseInt(quarter),
                year: parseInt(year),
                capital_growth_plan: plans.capital_growth || 0,
                loan_growth_plan: plans.loan_growth || 0,
                group_2_loan_ratio_plan: plans.group_2_loan_ratio || 0,
                bad_loan_ratio_plan: plans.bad_loan_ratio || 0,
                service_revenue_plan: plans.service_revenue || 0,
                debt_recovery_plan: plans.debt_recovery || 0,
                credit_marketing_plan: plans.credit_marketing || 0,
            });
        }

        const savedPlan = await repo.save(plan);

        return res.status(200).json({
            message: "Quarter plan saved successfully",
            data: savedPlan,
        });
    } catch (error) {
        console.error("Error saving quarter plan:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};
