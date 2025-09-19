import {getExportRecord, getRecordByDeptId} from "../services/export.service.js";

export const getExportRecordController = async (req, res) => {
    try {
        const record = await getExportRecord();
        res.status(200).json(record);
    } catch (error) {
        console.error('Error fetching export record:', error);
        res.status(500).json({message: 'Error fetching export record', error: error.message});
    }
}

export const getRecordByDeptIdController = async (req, res) => {
    const {deptId} = req.query;
    if (!deptId) {
        return res.status(400).json({message: 'deptId query parameter is required'});
    }
    try {
        const record = await getRecordByDeptId(deptId);
        if (!record) {
            return res.status(404).json({message: 'No record found for the given department ID'});
        }
        res.status(200).json(record);
    } catch (error) {
        console.error('Error fetching record by department ID:', error);
        res.status(500).json({message: 'Error fetching record by department ID', error: error.message});
    }
}