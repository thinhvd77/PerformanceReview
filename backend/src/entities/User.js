import {EntitySchema} from 'typeorm';

export const User = new EntitySchema({
    name: 'User',
    tableName: 'users',
    columns: {
        id: {
            type: 'int',
            primary: true,
            generated: true,
        },
        username: {
            type: 'varchar',
            length: 100,
            unique: true,
        },
        fullname: {
            type: 'varchar',
            length: 255,
            nullable: true,
        },
        branch: {
            type: 'varchar',
            length: 255,
            nullable: true,
        },
        department: {
            type: 'varchar',
            length: 255,
            nullable: true,
        },
        role: {
            type: 'varchar',
            length: 255,
        },
        password: {
            type: 'varchar',
            length: 255,
        },
        createdAt: {
            type: 'timestamp',
            createDate: true,
        },
        updatedAt: {
            type: 'timestamp',
            updateDate: true,
        },
    },
});