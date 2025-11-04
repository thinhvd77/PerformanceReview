import { EntitySchema } from "typeorm";

export const AnnualPlan = new EntitySchema({
    name: "AnnualPlan",
    tableName: "annual_plans",
    columns: {
        id: { type: "int", primary: true, generated: true },
        employee_code: { type: "varchar", length: 100, nullable: false },
        year: { type: "int", nullable: false },
        capital_growth_plan: { type: "decimal", precision: 15, scale: 2, nullable: true, default: 0 },
        loan_growth_plan: { type: "decimal", precision: 15, scale: 2, nullable: true, default: 0 },
        service_revenue_plan: { type: "decimal", precision: 15, scale: 2, nullable: true, default: 0 },
        debt_recovery_plan: { type: "decimal", precision: 15, scale: 2, nullable: true, default: 0 },
        finance_plan: { type: "decimal", precision: 15, scale: 2, nullable: true, default: 0 },
        createdAt: { type: "timestamp", createDate: true },
        updatedAt: { type: "timestamp", updateDate: true },
    },
    relations: {
        employee: {
            type: "many-to-one",
            target: "User",
            joinColumn: { name: "employee_code", referencedColumnName: "username" },
            onDelete: "CASCADE",
            nullable: false,
        },
    },
    indices: [
        {
            name: "idx_employee_year",
            columns: ["employee_code", "year"],
            unique: true,
        },
    ],
});