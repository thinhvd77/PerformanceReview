import { EntitySchema } from 'typeorm';

export const AnnualMetric = new EntitySchema({
    name: 'AnnualMetric',
    tableName: 'annual_metrics',
    columns: {
        id: { type: 'int', primary: true, generated: true },
        username: { type: 'varchar', length: 100, nullable: false },
        year: { type: 'int', nullable: false },
        metric_type: { type: 'varchar', length: 50, nullable: false }, // 'capital_growth', 'loan_growth', 'service_revenue', 'debt_recovery', 'finance'

        // Annual plan
        annualPlan: { type: 'decimal', precision: 15, scale: 2, nullable: true, default: 0 },

        // Q1 metrics
        q1Actual: { type: 'decimal', precision: 15, scale: 2, nullable: true, default: 0 },

        // Q2 metrics
        q2Actual: { type: 'decimal', precision: 15, scale: 2, nullable: true, default: 0 },

        // Q3 metrics
        q3Actual: { type: 'decimal', precision: 15, scale: 2, nullable: true, default: 0 },

        // Q4 metrics
        q4Actual: { type: 'decimal', precision: 15, scale: 2, nullable: true, default: 0 },

        // Metadata
        createdAt: { type: 'timestamp', createDate: true },
        updatedAt: { type: 'timestamp', updateDate: true },
    },
    relations: {
        user: {
            type: 'many-to-one',
            target: 'User',
            joinColumn: { name: 'username', referencedColumnName: 'username' },
            onDelete: 'CASCADE',
            nullable: false,
        },
    },
    indices: [
        {
            name: 'idx_username_year_metric',
            columns: ['username', 'year', 'metric_type'],
            unique: true,
        },
    ],
});
