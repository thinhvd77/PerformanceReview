import {
    getAwardedBonusesService,
    recordBonusAwardService,
    recordBonusAwardsBatchService
} from '../services/bonusAward.service.js';

/**
 * Get awarded bonuses for a user in a specific year
 * GET /api/bonus-awards?username=xxx&year=2025
 */
export const getAwardedBonuses = async (req, res) => {
    try {
        const { username, year } = req.query;

        if (!username || !year) {
            return res.status(400).json({
                message: 'Missing required parameters: username, year'
            });
        }

        const result = await getAwardedBonusesService(username, year);
        res.json(result);
    } catch (err) {
        console.error('Error fetching awarded bonuses:', err);
        res.status(500).json({
            message: 'Failed to fetch awarded bonuses',
            error: err.message
        });
    }
};

/**
 * Record a bonus award for a user
 * POST /api/bonus-awards
 */
export const recordBonusAward = async (req, res) => {
    try {
        const { username, year, bonusKey, quarter } = req.body;

        if (!username || !year || !bonusKey || !quarter) {
            return res.status(400).json({
                message: 'Missing required fields: username, year, bonusKey, quarter'
            });
        }

        const result = await recordBonusAwardService({ username, year, bonusKey, quarter });

        const status = result.alreadyAwarded ? 200 : 201;
        res.status(status).json({
            message: result.message,
            data: result.data
        });
    } catch (err) {
        console.error('Error recording bonus award:', err);

        // Handle duplicate key error
        if (err.code === 'ER_DUP_ENTRY' || err.code === '23505') {
            return res.status(200).json({
                message: 'Bonus already awarded',
                alreadyAwarded: true
            });
        }

        res.status(500).json({
            message: 'Failed to record bonus award',
            error: err.message
        });
    }
};

/**
 * Record multiple bonus awards in one request
 * POST /api/bonus-awards/batch
 */
export const recordBonusAwardsBatch = async (req, res) => {
    try {
        const { username, year, quarter, bonusKeys } = req.body;

        if (!username || !year || !quarter || !Array.isArray(bonusKeys)) {
            return res.status(400).json({
                message: 'Missing required fields: username, year, quarter, bonusKeys (array)'
            });
        }

        const result = await recordBonusAwardsBatchService({ username, year, quarter, bonusKeys });

        res.status(201).json({
            message: 'Batch bonus awards processed',
            data: result.data,
            count: result.count
        });
    } catch (err) {
        console.error('Error recording batch bonus awards:', err);
        res.status(500).json({
            message: 'Failed to record batch bonus awards',
            error: err.message
        });
    }
};
