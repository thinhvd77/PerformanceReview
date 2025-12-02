import { AppDataSource } from '../config/database.js';
import { BonusAward } from '../entities/BonusAward.js';

const bonusAwardRepository = AppDataSource.getRepository(BonusAward.options.name);

/**
 * Get awarded bonuses for a user in a specific year
 * @param {string} username - Username
 * @param {number} year - Year
 * @returns {Promise<{data: Array, count: number}>}
 */
export const getAwardedBonusesService = async (username, year) => {
    const awards = await bonusAwardRepository.find({
        where: {
            username,
            year: parseInt(year, 10)
        },
        order: {
            quarterAwarded: 'ASC'
        }
    });

    const awardedKeys = awards.map(award => ({
        key: award.bonusKey,
        quarter: award.quarterAwarded,
        createdAt: award.createdAt
    }));

    return {
        data: awardedKeys,
        count: awardedKeys.length
    };
};

/**
 * Record a bonus award for a user
 * @param {Object} data - Award data
 * @returns {Promise<{success: boolean, data?: Object, message: string, alreadyAwarded?: boolean}>}
 */
export const recordBonusAwardService = async (data) => {
    const { username, year, bonusKey, quarter } = data;

    // Check if already awarded
    const existing = await bonusAwardRepository.findOne({
        where: {
            username,
            year: parseInt(year, 10),
            bonusKey
        }
    });

    if (existing) {
        return {
            success: true,
            message: 'Bonus already awarded',
            data: {
                key: existing.bonusKey,
                quarter: existing.quarterAwarded,
                alreadyAwarded: true
            },
            alreadyAwarded: true
        };
    }

    const award = bonusAwardRepository.create({
        username,
        year: parseInt(year, 10),
        bonusKey,
        quarterAwarded: parseInt(quarter, 10)
    });

    const saved = await bonusAwardRepository.save(award);

    return {
        success: true,
        message: 'Bonus award recorded successfully',
        data: {
            key: saved.bonusKey,
            quarter: saved.quarterAwarded,
            createdAt: saved.createdAt
        }
    };
};

/**
 * Record multiple bonus awards in one request
 * @param {Object} batchData - Batch award data
 * @returns {Promise<{data: Array, count: number}>}
 */
export const recordBonusAwardsBatchService = async (batchData) => {
    const { username, year, quarter, bonusKeys } = batchData;
    const results = [];

    for (const bonusKey of bonusKeys) {
        // Check if already awarded
        const existing = await bonusAwardRepository.findOne({
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
            const award = bonusAwardRepository.create({
                username,
                year: parseInt(year, 10),
                bonusKey,
                quarterAwarded: parseInt(quarter, 10)
            });

            await bonusAwardRepository.save(award);

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

    return {
        data: results,
        count: results.length
    };
};

/**
 * Delete bonus awards for a user
 * @param {string} username - Username
 * @param {number} year - Year
 * @param {number} quarter - Quarter
 * @returns {Promise<void>}
 */
export const deleteBonusAwardsService = async (username, year, quarter) => {
    await bonusAwardRepository.delete({
        username,
        year,
        quarterAwarded: quarter
    });
};
