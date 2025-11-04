import { EntitySchema } from "typeorm";

export const QuarterActual = new EntitySchema({
    name: "QuarterActual",
    tableName: "quarter_actuals",
    columns: {
        id: { type: "int", primary: true, generated: true },
        employee_code: { type: "varchar", length: 100 },
        year: { type: "int" },
        quarter: { type: "int" },
        capital_growth_actual: { type: "decimal", precision: 15, scale: 2, nullable: true },
        loan_growth_actual: { type: "decimal", precision: 15, scale: 2, nullable: true },
        bad_loan_ratio_actual: { type: "decimal", precision: 5, scale: 2, nullable: true },
        group_2_loan_ratio_actual: { type: "decimal", precision: 5, scale: 2, nullable: true },
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
});