import {AppDataSource} from '../config/database.js';

export const getExportRecord = () => {
    const repo = AppDataSource.getRepository('ExportRecord');
    // return first record
    return repo.findOneBy({});
}

export const getRecordByDeptId = (deptId) => {
    const repo = AppDataSource.getRepository('ExportRecord');
    return repo.find({
        where: {
            departmentId: deptId
        },
        order: {
            createdAt: 'DESC'
        }
    }).then(records => records[0] || null);
}

