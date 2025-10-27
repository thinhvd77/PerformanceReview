import { EntitySchema } from 'typeorm';

export const QuarterlyMetric = new EntitySchema({
    name: 'QuarterlyMetric',
    tableName: 'quarterly_metrics',
    columns: {
        id: { type: 'int', primary: true, generated: true },
        employee_code: { type: 'varchar', length: 100, nullable: false },
        quarter: { type: 'int', nullable: false }, // 1, 2, 3, 4
        year: { type: 'int', nullable: false },

        // Metric type: 'capital_growth', 'loan_growth', 'service_revenue', 'debt_recovery'
        metric_type: { type: 'varchar', length: 50, nullable: false },

        // Values from the form
        plan_value: { type: 'decimal', precision: 15, scale: 2, nullable: true }, // Kế hoạch quý này
        actual_value: { type: 'decimal', precision: 15, scale: 2, nullable: true }, // Thực hiện quý này
        prev_actual_value: { type: 'decimal', precision: 15, scale: 2, nullable: true }, // Thực hiện quý trước (if entered)

        // Metadata
        createdAt: { type: 'timestamp', createDate: true },
        updatedAt: { type: 'timestamp', updateDate: true },
    },
    relations: {
        employee: {
            type: 'many-to-one',
            target: 'User',
            joinColumn: { name: 'employee_code', referencedColumnName: 'username' },
            onDelete: 'CASCADE',
            nullable: false,
        },
    },
    indices: [
        {
            name: 'idx_employee_quarter_year',
            columns: ['employee_code', 'quarter', 'year'],
        },
        {
            name: 'idx_quarter_year_metric',
            columns: ['quarter', 'year', 'metric_type'],
        },
    ],
});


