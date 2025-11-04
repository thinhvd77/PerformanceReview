import { EntitySchema } from "typeorm";

export const QuarterPlan = new EntitySchema({
    name: "QuarterPlan",
    tableName: "quarter_plans",
    columns: {
        id: { type: "int", primary: true, generated: true },
        employee_code: { type: "varchar", length: 100, nullable: false },
        quarter: { type: "int", nullable: false }, // 1, 2, 3, 4
        year: { type: "int", nullable: false },

        // Values for the quarter plan
        capital_growth_plan: { type: "decimal", precision: 15, scale: 2, nullable: true, default: 0 },
        loan_growth_plan: { type: "decimal", precision: 15, scale: 2, nullable: true, default: 0 },
        service_revenue_plan: { type: "decimal", precision: 15, scale: 2, nullable: true, default: 0 },
        debt_recovery_plan: { type: "decimal", precision: 15, scale: 2, nullable: true, default: 0 },
        bad_loan_ratio_plan: { type: "decimal", precision: 5, scale: 2, nullable: true, default: 0 },
        group_2_loan_ratio_plan: { type: "decimal", precision: 5, scale: 2, nullable: true, default: 0 },
        credit_marketing_plan: { type: "decimal", precision: 15, scale: 2, nullable: true },

        // Metadata
        createdAt: { type: "timestamp", createDate: true },
        updatedAt: { type: "timestamp", updateDate: true },
    },
    relations: {
        employee: {
            type: "many-to-one",
            target: "User",
            joinColumn: { name: "employee_code", referencedColumnName:  "username" },
            onDelete: "CASCADE",
            nullable: false,
        },
    },
    indices: [
        {
            name: "idx_employee_quarter_year_plan",
            columns: ["employee_code", "quarter", "year"],
        },
    ],
});