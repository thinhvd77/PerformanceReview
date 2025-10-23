import { EntitySchema } from 'typeorm';

/**
 * BonusAward Entity
 * Tracks which bonus criteria have been awarded to users in each year
 * Ensures each bonus is only awarded once per year per user
 */
export const BonusAward = new EntitySchema({
    name: 'BonusAward',
    tableName: 'bonus_awards',
    columns: {
        id: {
            type: 'int',
            primary: true,
            generated: true,
        },
        username: {
            type: 'varchar',
            length: 255,
            nullable: false,
        },
        year: {
            type: 'int',
            nullable: false,
        },
        bonusKey: {
            name: 'bonus_key',
            type: 'varchar',
            length: 100,
            nullable: false,
            comment: 'The key of the bonus rule (e.g., capital-bonus, loan-bonus, service-bonus)',
        },
        quarterAwarded: {
            name: 'quarter_awarded',
            type: 'int',
            nullable: false,
            comment: 'The quarter when the bonus was first awarded (1-4)',
        },
        createdAt: {
            name: 'created_at',
            type: 'timestamp',
            createDate: true,
        },
    },
    indices: [
        {
            name: 'idx_username_year',
            columns: ['username', 'year'],
        },
        {
            name: 'idx_username_year_bonus',
            columns: ['username', 'year', 'bonusKey'],
            unique: true,
        },
    ],
});
