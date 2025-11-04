import { getActivityLogs } from '../services/activityLog.service.js';

/**
 * Get activity logs with optional filters
 * Admin only endpoint
 */
export const listActivityLogs = async (req, res) => {
    try {
        const userId = req.query.userId ? parseInt(req.query.userId, 10) : null;
        const action = req.query.action ? req.query.action.toString().trim() : null;
        const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
        const limit = req.query.limit ? Math.min(1000, parseInt(req.query.limit, 10)) : 100;
        const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;

        const result = await getActivityLogs({
            userId,
            action,
            startDate,
            endDate,
            limit,
            offset
        });

        res.json({
            logs: result.logs,
            total: result.total,
            limit,
            offset
        });
    } catch (error) {
        console.error('Failed to fetch activity logs:', error);
        res.status(500).json({ message: 'Failed to fetch activity logs', error: error.message });
    }
};
