import { EntitySchema } from 'typeorm';

export const ExportRecord = new EntitySchema({
  name: 'ExportRecord',
  tableName: 'export_records',
  columns: {
    id: { type: 'int', primary: true, generated: true },
    userId: { type: 'int' },
    formId: { type: 'int', nullable: true },
    fileName: { type: 'varchar', length: 255 },
    filePath: { type: 'varchar', length: 1024 },
    meta: { type: 'json', nullable: true },
    createdAt: { type: 'timestamp', createDate: true },
  },
});
