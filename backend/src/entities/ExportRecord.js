import {EntitySchema} from 'typeorm';

export const ExportRecord = new EntitySchema({
    name: 'ExportRecord',
    tableName: 'export_records',
    columns: {
        id: {type: 'int', primary: true, generated: true},
        employee_code: {type: 'varchar', length: 100, nullable: true},
        employee_name: {type: 'varchar', length: 255, nullable: true},
        formId: {type: 'int', nullable: true},
        fileName: {type: 'varchar', length: 255},
        filePath: {type: 'varchar', length: 1024},
        // meta: {type: 'json', nullable: true},
        departmentId: {type: 'varchar', nullable: true},
        table: {type: 'json', nullable: true},
        createdAt: {type: 'timestamp', createDate: true},
    },
});
