import { EntitySchema } from 'typeorm';

export const FormTemplate = new EntitySchema({
  name: 'FormTemplate',
  tableName: 'form_templates',
  columns: {
    id: { type: 'int', primary: true, generated: true },
    name: { type: 'varchar', length: 255 },
    schema: { type: 'json' },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
  },
});
