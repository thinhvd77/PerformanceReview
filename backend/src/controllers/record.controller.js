import {getExportRecord, getRecordByEmpId} from "../services/export.service.js";

export const getExportRecordController = async (req, res) => {
    try {
        const record = await getExportRecord();
        res.status(200).json(record);
    } catch (error) {
        console.error('Error fetching export record:', error);
        res.status(500).json({message: 'Error fetching export record', error: error.message});
    }
}

export const getRecordByEmpIdController = async (req, res) => {
    const { empId } = req.query;
    if (!empId) {
        return res.status(400).json({ message: 'empId query parameter is required' });
    }
    try {
        const record = await getRecordByEmpId(empId);
        if (!record) {
            return res.status(404).json({message: 'No record found for the given employee ID'});
        }
        res.status(200).json(record);
    } catch (error) {
        console.error('Error fetching record by employee ID:', error);
        res.status(500).json({message: 'Error fetching record by employee ID', error: error.message});
    }
}