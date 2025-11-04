import { EntitySchema } from 'typeorm';

export const ActivityLog = new EntitySchema({
    name: 'ActivityLog',
    tableName: 'activity_logs',
    columns: {
        id: {
            type: 'int',
            primary: true,
            generated: true,
        },
        userId: {
            type: 'int',
            nullable: true,
        },
        username: {
            type: 'varchar',
            length: 100,
            nullable: true,
        },
        action: {
            type: 'varchar',
            length: 50,
            comment: 'LOGIN, EXPORT_FORM, etc.',
        },
        details: {
            type: 'text',
            nullable: true,
            comment: 'JSON string with additional details',
        },
        ipAddress: {
            type: 'varchar',
            length: 45,
            nullable: true,
            comment: 'IPv4 or IPv6 address',
        },
        userAgent: {
            type: 'varchar',
            length: 500,
            nullable: true,
        },
        createdAt: {
            type: 'timestamp',
            createDate: true,
        },
    },
    indices: [
        {
            name: 'IDX_ACTIVITY_LOG_USER',
            columns: ['userId'],
        },
        {
            name: 'IDX_ACTIVITY_LOG_ACTION',
            columns: ['action'],
        },
        {
            name: 'IDX_ACTIVITY_LOG_CREATED',
            columns: ['createdAt'],
        },
    ],
});
