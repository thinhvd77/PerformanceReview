import { 
    processExcelFile, 
    parseAssignedGroups, 
    saveFormTemplateService 
} from '../services/upload.service.js';

export const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const result = await processExcelFile(req.file);
        const groups = parseAssignedGroups(req.body);
        const saved = await saveFormTemplateService(result, groups);

        res.status(200).json({
            message: 'File uploaded and processed successfully',
            formTemplate: saved,
            previewData: result.jsonData.slice(0, 5),
        });
    } catch (error) {
        console.error('Error processing file:', error);
        res.status(500).json({ message: 'Error processing file', error: error.message });
    }
}