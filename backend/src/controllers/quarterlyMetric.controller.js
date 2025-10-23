import { AppDataSource } from '../config/database.js';
import { QuarterlyMetric } from '../entities/QuarterlyMetric.js';

const METRIC_TYPE_MAP = {
    'capital_growth': 'Tăng trưởng nguồn vốn',
    'loan_growth': 'Tăng trưởng dư nợ',
    'service_revenue': 'Thu dịch vụ',
    'debt_recovery': 'Thu hồi nợ đã XLRR',
    'finance': 'Tài chính',
};

const METRIC_LABEL_MAP = Object.fromEntries(
    Object.entries(METRIC_TYPE_MAP).map(([key, value]) => [value.toLowerCase(), key])
);

/**
 * Save quarterly metrics from form data
 * POST /api/quarterly-metrics
 * Body: { quarter, year, metrics: [{ metric_type, plan_value, actual_value, prev_actual_value }] }
 */
export const saveQuarterlyMetrics = async (req, res) => {
    try {
        const employee_code = req.user?.username;
        if (!employee_code) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { quarter, year, metrics } = req.body;

        if (!quarter || !year || !Array.isArray(metrics)) {
            return res.status(400).json({
                message: 'Missing required fields: quarter, year, metrics'
            });
        }

        const repo = AppDataSource.getRepository(QuarterlyMetric.options.name);

        // Delete existing metrics for this employee/quarter/year to avoid duplicates
        await repo.delete({
            employee_code,
            quarter,
            year,
        });

        // Create new metric records
        const entities = metrics
            .filter(m => m.metric_type && (m.actual_value != null || m.plan_value != null))
            .map(m => repo.create({
                employee_code,
                quarter,
                year,
                metric_type: m.metric_type,
                plan_value: m.plan_value,
                actual_value: m.actual_value,
                prev_actual_value: m.prev_actual_value,
            }));

        if (entities.length === 0) {
            return res.status(400).json({
                message: 'No valid metrics to save'
            });
        }

        const saved = await repo.save(entities);

        res.status(201).json({
            message: 'Quarterly metrics saved successfully',
            count: saved.length,
            data: saved,
        });
    } catch (err) {
        console.error('Error saving quarterly metrics:', err);
        res.status(500).json({
            message: 'Failed to save quarterly metrics',
            error: err.message
        });
    }
};

/**
 * Get quarterly metrics for a user
 * GET /api/quarterly-metrics?quarter=1&year=2025&employee_code=xxx
 * Returns metrics in format: { quarter, year, metrics: { capital_growth: number, ... } }
 */
export const getQuarterlyMetrics = async (req, res) => {
    try {
        const employee_code = req.query.employee_code || req.user?.username;
        const { quarter, year } = req.query;

        if (!employee_code) {
            return res.status(400).json({ message: 'employee_code is required' });
        }

        if (!quarter || !year) {
            return res.status(400).json({
                message: 'Missing required parameters: quarter, year'
            });
        }

        const repo = AppDataSource.getRepository(QuarterlyMetric.options.name);
        const where = {
            employee_code,
            quarter: parseInt(quarter, 10),
            year: parseInt(year, 10)
        };

        const metrics = await repo.find({
            where,
            order: { metric_type: 'ASC' }
        });

        // Transform to frontend-friendly format: { metric_type: actual_value }
        const metricsMap = {};
        metrics.forEach(m => {
            metricsMap[m.metric_type] = parseFloat(m.actual_value) || 0;
        });

        res.json({
            quarter: parseInt(quarter, 10),
            year: parseInt(year, 10),
            metrics: metricsMap,
            raw: metrics, // Keep raw data for debugging
        });
    } catch (err) {
        console.error('Error fetching quarterly metrics:', err);
        res.status(500).json({
            message: 'Failed to fetch quarterly metrics',
            error: err.message
        });
    }
};

/**
 * Get previous quarter metrics (for auto-filling form)
 * GET /api/quarterly-metrics/previous?quarter=2&year=2025
 * Returns metrics from Q1 2025 (or Q4 2024 if quarter=1)
 */
export const getPreviousQuarterMetrics = async (req, res) => {
    try {
        const employee_code = req.user?.username;
        if (!employee_code) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        let { quarter, year } = req.query;
        quarter = parseInt(quarter, 10);
        year = parseInt(year, 10);

        if (!quarter || !year) {
            return res.status(400).json({
                message: 'Missing required parameters: quarter, year'
            });
        }

        // Calculate previous quarter
        let prevQuarter = quarter - 1;
        let prevYear = year;

        if (prevQuarter < 1) {
            prevQuarter = 4;
            prevYear = year - 1;
        }

        const repo = AppDataSource.getRepository(QuarterlyMetric.options.name);
        const metrics = await repo.find({
            where: {
                employee_code,
                quarter: prevQuarter,
                year: prevYear,
            },
        });

        // Transform to a convenient format: { metric_type: actual_value }
        const metricsMap = {};
        metrics.forEach(m => {
            metricsMap[m.metric_type] = m.actual_value;
        });

        res.json({
            previous_quarter: prevQuarter,
            previous_year: prevYear,
            metrics: metricsMap,
            raw: metrics,
        });
    } catch (err) {
        console.error('Error fetching previous quarter metrics:', err);
        res.status(500).json({
            message: 'Failed to fetch previous quarter metrics',
            error: err.message
        });
    }
};
