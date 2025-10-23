import { AppDataSource } from '../config/database.js';
import { AnnualMetric } from '../entities/AnnualMetric.js';

const METRIC_TYPES = [
    'capital_growth',
    'loan_growth',
    'service_revenue',
    'debt_recovery',
    'finance'
];

/**
 * Get annual metrics for a user
 * GET /api/annual-metrics?username=xxx&year=2025
 * Returns data organized by metric type
 */
export const getAnnualMetrics = async (req, res) => {
    try {
        const { username, year } = req.query;

        if (!username || !year) {
            return res.status(400).json({
                message: 'Missing required parameters: username, year'
            });
        }

        const repo = AppDataSource.getRepository(AnnualMetric.options.name);

        const metrics = await repo.find({
            where: {
                username,
                year: parseInt(year, 10)
            }
        });

        // Transform array to object keyed by metric_type
        const data = {};

        METRIC_TYPES.forEach(metricType => {
            const metric = metrics.find(m => m.metric_type === metricType);

            if (metric) {
                data[metricType] = {
                    annualPlan: parseFloat(metric.annualPlan) || 0,
                    q1Actual: parseFloat(metric.q1Actual) || 0,
                    q2Actual: parseFloat(metric.q2Actual) || 0,
                    q3Actual: parseFloat(metric.q3Actual) || 0,
                    q4Actual: parseFloat(metric.q4Actual) || 0,
                };
            } else {
                // Default empty data
                data[metricType] = {
                    annualPlan: 0,
                    q1Actual: 0,
                    q2Actual: 0,
                    q3Actual: 0,
                    q4Actual: 0,
                };
            }
        });

        res.json({ data });
    } catch (err) {
        console.error('Error fetching annual metrics:', err);
        res.status(500).json({
            message: 'Failed to fetch annual metrics',
            error: err.message
        });
    }
};

/**
 * Save annual metrics for a user
 * POST /api/annual-metrics
 * Body: { 
 *   username, 
 *   year, 
 *   metrics: {
 *     capital_growth: { annualPlan, q1Actual, q2Actual, q3Actual, q4Actual },
 *     loan_growth: { ... },
 *     ...
 *   }
 * }
 */
export const saveAnnualMetrics = async (req, res) => {
    try {
        const { username, year, metrics } = req.body;

        if (!username || !year || !metrics) {
            return res.status(400).json({
                message: 'Missing required fields: username, year, metrics'
            });
        }

        const repo = AppDataSource.getRepository(AnnualMetric.options.name);
        const savedMetrics = [];

        // Process each metric type
        for (const metricType of METRIC_TYPES) {
            const metricData = metrics[metricType];

            if (!metricData) continue;

            // Check if record exists
            let metric = await repo.findOne({
                where: {
                    username,
                    year: parseInt(year, 10),
                    metric_type: metricType
                }
            });

            if (metric) {
                // Update existing record
                metric.annualPlan = metricData.annualPlan || 0;
                metric.q1Actual = metricData.q1Actual || 0;
                metric.q2Actual = metricData.q2Actual || 0;
                metric.q3Actual = metricData.q3Actual || 0;
                metric.q4Actual = metricData.q4Actual || 0;
            } else {
                // Create new record
                metric = repo.create({
                    username,
                    year: parseInt(year, 10),
                    metric_type: metricType,
                    annualPlan: metricData.annualPlan || 0,
                    q1Actual: metricData.q1Actual || 0,
                    q2Actual: metricData.q2Actual || 0,
                    q3Actual: metricData.q3Actual || 0,
                    q4Actual: metricData.q4Actual || 0,
                });
            }

            const saved = await repo.save(metric);
            savedMetrics.push(saved);
        }

        res.status(200).json({
            message: 'Annual metrics saved successfully',
            count: savedMetrics.length,
            data: savedMetrics,
        });
    } catch (err) {
        console.error('Error saving annual metrics:', err);
        res.status(500).json({
            message: 'Failed to save annual metrics',
            error: err.message
        });
    }
};
