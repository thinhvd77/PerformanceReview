import { AppDataSource } from '../config/database.js';
import { ActivityLog } from '../entities/ActivityLog.js';

const activityLogRepository = AppDataSource.getRepository(ActivityLog);

/**
 * Log user activity
 * @param {number} userId - User ID
 * @param {string} username - Username
 * @param {string} action - Action type (LOGIN, EXPORT_FORM, etc.)
 * @param {object} details - Additional details object (will be stringified)
 * @param {object} req - Express request object
 */
export async function logActivity(userId, username, action, details = {}, req = null) {
    try {
        const ipAddress = req
            ? req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress
            : null;
        const userAgent = req ? req.headers['user-agent'] : null;

        const log = activityLogRepository.create({
            userId,
            username,
            action,
            details: JSON.stringify(details),
            ipAddress,
            userAgent,
        });

        await activityLogRepository.save(log);
    } catch (error) {
        console.error('Failed to log activity:', error);
        // Don't throw - logging failure shouldn't break the main operation
    }
}

/**
 * Get activity logs with filters
 * @param {object} filters - Filter options
 * @param {number} filters.userId - Filter by user ID
 * @param {string} filters.action - Filter by action type
 * @param {Date} filters.startDate - Filter from this date
 * @param {Date} filters.endDate - Filter until this date
 * @param {number} filters.limit - Max records to return
 * @param {number} filters.offset - Skip this many records
 */
export async function getActivityLogs(filters = {}) {
    const { userId, action, startDate, endDate, limit = 100, offset = 0 } = filters;

    const queryBuilder = activityLogRepository.createQueryBuilder('log');

    if (userId) {
        queryBuilder.andWhere('log.userId = :userId', { userId });
    }

    if (action) {
        queryBuilder.andWhere('log.action = :action', { action });
    }

    if (startDate) {
        queryBuilder.andWhere('log.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
        queryBuilder.andWhere('log.createdAt <= :endDate', { endDate });
    }

    queryBuilder
        .orderBy('log.createdAt', 'DESC')
        .skip(offset)
        .take(limit);

    const [logs, total] = await queryBuilder.getManyAndCount();

    // Parse JSON details back to objects
    const parsedLogs = logs.map((log) => ({
        ...log,
        details: log.details ? JSON.parse(log.details) : null,
    }));

    return { logs: parsedLogs, total };
}
