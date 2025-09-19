import {EntitySchema} from 'typeorm';

export const FormTemplate = new EntitySchema({
    name: 'FormTemplate',
    tableName: 'form_templates',
    columns: {
        id: {type: 'int', primary: true, generated: true},
        name: {type: 'varchar', length: 255},
        schema: {type: 'json'},
        // Legacy single assigned group: { branchId, departmentId, positionId }
        assignedGroup: {type: 'json', nullable: true},
        // New: allow assigning to many groups (array of { branchId, departmentId, positionId })
        assignedGroups: {type: 'json', nullable: true},
        createdAt: {type: 'timestamp', createDate: true},
        updatedAt: {type: 'timestamp', updateDate: true},
    },
});
