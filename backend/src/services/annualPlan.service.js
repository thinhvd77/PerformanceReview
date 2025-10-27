import { AppDataSource } from "../config/database.js";
import { AnnualPlan } from "../entities/AnnualPlan.js";
import ExcelJS from "exceljs";
import fs from "fs";

/**
 * Import annual plans from Excel file
 * Excel structure:
 * Col A: Năm (Year)
 * Col B: Mã CBNV (Employee Code)
 * Col C: Tăng trưởng nguồn vốn (Capital Growth)
 * Col D: Tăng trưởng dư nợ (Loan Growth)
 * Col E: Thu dịch vụ (Service Revenue)
 * Col F: Thu hồi nợ đã xử lý rủi ro (Debt Recovery)
 * Col G: Tài chính (Finance)
 */
export const importAnnualPlanFromExcel = async (filePath) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
        throw new Error("Excel file has no worksheets");
    }

    const plans = [];
    const errors = [];
    const userRepo = AppDataSource.getRepository("User");
    const planRepo = AppDataSource.getRepository(AnnualPlan);

    // Start from row 2 (skip header row)
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);

        // Skip empty rows
        if (!row.getCell(1).value && !row.getCell(2).value) continue;

        const year = row.getCell(1).value;
        const employeeCode = String(row.getCell(2).value || "").trim();
        const capitalGrowth = row.getCell(3).value;
        const loanGrowth = row.getCell(4).value;
        const serviceRevenue = row.getCell(5).value;
        const debtRecovery = row.getCell(6).value;
        const finance = row.getCell(7).value;

        // Validation
        if (!year || !employeeCode) {
            errors.push({
                row: rowNumber,
                message: "Thiếu năm hoặc mã CBNV",
                data: { year, employeeCode }
            });
            continue;
        }

        // Validate year is a number
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

        // Parse numeric values (handle null/empty)
        const parseNumber = (val) => {
            if (val === null || val === undefined || val === "") return null;
            const num = Number(val);
            return isNaN(num) ? null : num;
        };

        plans.push({
            employee_code: employeeCode,
            year: yearNum,
            capital_growth_plan: parseNumber(capitalGrowth),
            loan_growth_plan: parseNumber(loanGrowth),
            service_revenue_plan: parseNumber(serviceRevenue),
            debt_recovery_plan: parseNumber(debtRecovery),
            finance_plan: parseNumber(finance),
        });
    }

    // Bulk upsert
    const saved = [];
    for (const planData of plans) {
        let plan = await planRepo.findOne({
            where: {
                employee_code: planData.employee_code,
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
 * Get annual plan for a user and year
 * GET /api/annual-plans?username=xxx&year=2025
 */
export const getAnnualPlan = async (req, res) => {
    try {
        const { username, year } = req.query;

        if (!username || !year) {
            return res.status(400).json({
                message: "Missing required parameters: username, year",
            });
        }

        const repo = AppDataSource.getRepository(AnnualPlan);
        const plan = await repo.findOne({
            where: { employee_code: username, year: parseInt(year) },
        });

        if (!plan) {
            return res.status(200).json({
                message: "No annual plan found",
                data: {
                    capital_growth: 0,
                    loan_growth: 0,
                    service_revenue: 0,
                    debt_recovery: 0,
                    finance: 0,
                },
            });
        }

        return res.status(200).json({
            message: "Annual plan retrieved successfully",
            data: {
                capital_growth: plan.capital_growth_plan || 0,
                loan_growth: plan.loan_growth_plan || 0,
                service_revenue: plan.service_revenue_plan || 0,
                debt_recovery: plan.debt_recovery_plan || 0,
                finance: plan.finance_plan || 0,
            },
        });
    } catch (error) {
        console.error("Error retrieving annual plan:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};

/**
 * Save or update annual plan data
 * POST /api/annual-plans
 * Body: { username, year, plans: { capital_growth: value, loan_growth: value, ... } }
 */
export const saveAnnualPlan = async (req, res) => {
    try {
        const { username, year, plans } = req.body;

        if (!username || !year || !plans) {
            return res.status(400).json({
                message: "Missing required fields: username, year, plans",
            });
        }

        const repo = AppDataSource.getRepository(AnnualPlan);

        // Find existing plan or create new one
        let plan = await repo.findOne({
            where: { employee_code: username, year: parseInt(year) },
        });

        if (plan) {
            // Update existing
            plan.capital_growth_plan = plans.capital_growth || 0;
            plan.loan_growth_plan = plans.loan_growth || 0;
            plan.service_revenue_plan = plans.service_revenue || 0;
            plan.debt_recovery_plan = plans.debt_recovery || 0;
            plan.finance_plan = plans.finance || 0;
        } else {
            // Create new
            plan = repo.create({
                employee_code: username,
                year: parseInt(year),
                capital_growth_plan: plans.capital_growth || 0,
                loan_growth_plan: plans.loan_growth || 0,
                service_revenue_plan: plans.service_revenue || 0,
                debt_recovery_plan: plans.debt_recovery || 0,
                finance_plan: plans.finance || 0,
            });
        }

        const savedPlan = await repo.save(plan);

        return res.status(200).json({
            message: "Annual plan saved successfully",
            data: savedPlan,
        });
    } catch (error) {
        console.error("Error saving annual plan:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};