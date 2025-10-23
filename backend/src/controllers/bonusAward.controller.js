import { AppDataSource } from '../config/database.js';
import { BonusAward } from '../entities/BonusAward.js';

/**
 * Get awarded bonuses for a user in a specific year
 * GET /api/bonus-awards?username=xxx&year=2025
 * Returns array of awarded bonus keys with quarter info
 */
export const getAwardedBonuses = async (req, res) => {
    try {
        const { username, year } = req.query;

        if (!username || !year) {
            return res.status(400).json({
                message: 'Missing required parameters: username, year'
            });
        }

        const repo = AppDataSource.getRepository(BonusAward.options.name);

        const awards = await repo.find({
            where: {
                username,
                year: parseInt(year, 10)
            },
            order: {
                quarterAwarded: 'ASC'
            }
        });

        // Transform to simple array of bonus keys
        const awardedKeys = awards.map(award => ({
            key: award.bonusKey,
            quarter: award.quarterAwarded,
            createdAt: award.createdAt
        }));

        res.json({
            data: awardedKeys,
            count: awardedKeys.length
        });
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
 * Body: { username, year, bonusKey, quarter }
 */
export const recordBonusAward = async (req, res) => {
    try {
        const { username, year, bonusKey, quarter } = req.body;

        if (!username || !year || !bonusKey || !quarter) {
            return res.status(400).json({
                message: 'Missing required fields: username, year, bonusKey, quarter'
            });
        }

        const repo = AppDataSource.getRepository(BonusAward.options.name);

        // Check if already awarded
        const existing = await repo.findOne({
            where: {
                username,
                year: parseInt(year, 10),
                bonusKey
            }
        });

        if (existing) {
            return res.status(200).json({
                message: 'Bonus already awarded',
                data: {
                    key: existing.bonusKey,
                    quarter: existing.quarterAwarded,
                    alreadyAwarded: true
                }
            });
        }

        // Create new award record
        const award = repo.create({
            username,
            year: parseInt(year, 10),
            bonusKey,
            quarterAwarded: parseInt(quarter, 10)
        });

        const saved = await repo.save(award);

        res.status(201).json({
            message: 'Bonus award recorded successfully',
            data: {
                key: saved.bonusKey,
                quarter: saved.quarterAwarded,
                createdAt: saved.createdAt
            }
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
 * Body: { username, year, quarter, bonusKeys: ['capital-bonus', 'loan-bonus'] }
 */
export const recordBonusAwardsBatch = async (req, res) => {
    try {
        const { username, year, quarter, bonusKeys } = req.body;

        if (!username || !year || !quarter || !Array.isArray(bonusKeys)) {
            return res.status(400).json({
                message: 'Missing required fields: username, year, quarter, bonusKeys (array)'
            });
        }

        const repo = AppDataSource.getRepository(BonusAward.options.name);
        const results = [];

        for (const bonusKey of bonusKeys) {
            // Check if already awarded
            const existing = await repo.findOne({
                where: {
                    username,
                    year: parseInt(year, 10),
                    bonusKey
                }
            });

            if (existing) {
                results.push({
                    key: bonusKey,
                    status: 'already_awarded',
                    quarter: existing.quarterAwarded
                });
                continue;
            }

            // Create new award record
            try {
                const award = repo.create({
                    username,
                    year: parseInt(year, 10),
                    bonusKey,
                    quarterAwarded: parseInt(quarter, 10)
                });

                await repo.save(award);

                results.push({
                    key: bonusKey,
                    status: 'recorded',
                    quarter: parseInt(quarter, 10)
                });
            } catch (err) {
                results.push({
                    key: bonusKey,
                    status: 'error',
                    error: err.message
                });
            }
        }

        res.status(201).json({
            message: 'Batch bonus awards processed',
            data: results,
            count: results.length
        });
    } catch (err) {
        console.error('Error recording batch bonus awards:', err);
        res.status(500).json({
            message: 'Failed to record batch bonus awards',
            error: err.message
        });
    }
};
