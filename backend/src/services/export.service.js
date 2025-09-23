import {AppDataSource} from '../config/database.js';

export const getExportRecord = () => {
    const repo = AppDataSource.getRepository('ExportRecord');
    // return first record
    return repo.findOneBy({});
}

export const getRecordByEmpId = (empId) => {
    const repo = AppDataSource.getRepository('ExportRecord');
    return repo.find({
        where: {
            employee_code: empId
        },
        order: {
            createdAt: 'DESC'
        }
    }).then(records => records[0] || null);
}

