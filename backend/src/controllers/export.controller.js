import fs from 'fs';
import path from 'path';
import { logActivity } from '../services/activityLog.service.js';
import { orgData } from '../utils/orgData.js';
import {
    getCurrentQuarterYear,
    sanitizeForFilename,
    formatDateTimeVN,
    toDate,
} from '../utils/helpers.js';
import {
    createExportDirectory,
    generateExportFileName,
    mapBranchName,
    mapDepartmentName,
    getManagerContext,
    getLatestRecordsForDepartment,
    listExportsService,
    getExportByIdService,
    getEmployeeByUsername,
    deleteRelatedExportData,
    saveExportRecord,
    findExistingExportRecord,
    deleteExportRecord,
    getRecordSummary,
    createDepartmentSummaryWorkbook,
    createBranchSummaryWorkbook,
} from '../services/export.service.js';

export const listExports = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page || '1', 10));
        const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || '10', 10)));
        const q = (req.query.q || '').toString().trim().toLowerCase();
        const branchId = req.query.branchId ? req.query.branchId.toString().trim() : '';
        const departmentId = req.query.departmentId ? req.query.departmentId.toString().trim() : '';
        const parsedQuarter = parseInt(req.query.quarter, 10);
        const parsedYear = parseInt(req.query.year, 10);

        const result = await listExportsService({
            page,
            pageSize,
            q,
            branchId,
            departmentId,
            quarter: Number.isInteger(parsedQuarter) && parsedQuarter >= 1 && parsedQuarter <= 4 ? parsedQuarter : null,
            year: Number.isInteger(parsedYear) ? parsedYear : null,
        });

        res.json(result);
    } catch (err) {
        console.error('listExports error:', err);
        res.status(500).json({ message: 'Failed to list exports' });
    }
};

export const createExport = async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ message: 'No file uploaded' });

        const employee_code = req.user?.username;
        const { formId, fileName, table, quarter: bodyQuarter, year: bodyYear } = req.body || {};

        // Determine quarter/year
        let quarter, year;
        if (bodyQuarter && bodyYear) {
            quarter = parseInt(bodyQuarter, 10);
            year = parseInt(bodyYear, 10);
        } else {
            const current = getCurrentQuarterYear();
            quarter = current.quarter;
            year = current.year;
        }

        // Validate
        if (!quarter || !year || quarter < 1 || quarter > 4 || year < 2020 || year > 2030) {
            return res.status(400).json({ message: 'Invalid quarter or year', received: { quarter, year } });
        }

        // Get employee
        const employee = await getEmployeeByUsername(employee_code);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const employeeName = employee.fullname || employee_code;
        const employeeBranch = employee.branch;
        const employeeDepartment = employee.department;

        if (!employeeBranch || !employeeDepartment) {
            return res.status(400).json({ message: 'Employee must have branch and department assigned', employee_code });
        }

        // Create directory and filename
        const quarterDir = createExportDirectory(year, quarter, employeeBranch, employeeDepartment);
        const originalFileName = fileName && typeof fileName === 'string' ? fileName : (file.originalname || file.filename);
        const organizedFileName = generateExportFileName(originalFileName, employee_code, employeeName, quarter, year);

        // Move file
        const originalPath = path.join(process.cwd(), 'uploads', file.filename);
        const finalPath = path.join(quarterDir, organizedFileName);
        if (originalPath !== finalPath) {
            fs.renameSync(originalPath, finalPath);
        }

        // Check existing and delete if needed
        const existingRecord = await findExistingExportRecord(employee_code, quarter, year);
        if (existingRecord) {
            await deleteRelatedExportData(existingRecord);
            await deleteExportRecord(existingRecord);
            console.log(`Removed existing export record for user: ${employee_code} (Q${quarter} ${year})`);
        }

        // Save new record
        const saved = await saveExportRecord({
            employee_code,
            formId: formId ? parseInt(formId, 10) : null,
            fileName: organizedFileName,
            filePath: path.relative(process.cwd(), finalPath).replace(/\\/g, '/'),
            table: table ? (typeof table === 'string' ? JSON.parse(table) : table) : null,
            quarter,
            year,
        });

        // Log activity
        await logActivity(
            employee.id,
            employee_code,
            'EXPORT_FORM',
            {
                formId: formId ? parseInt(formId, 10) : null,
                quarter,
                year,
                fileName: organizedFileName,
                replaced: !!existingRecord,
                fullname: employeeName,
                branch: employeeBranch,
                department: employeeDepartment,
            },
            req
        );

        const message = existingRecord
            ? `Form đã được cập nhật thành công (thay thế form Quý ${quarter} năm ${year})`
            : `Form Quý ${quarter} năm ${year} đã được lưu thành công`;

        res.status(201).json({
            id: saved.id,
            message,
            downloadUrl: `/api/exports/${saved.id}/download`,
            replaced: !!existingRecord
        });
    } catch (err) {
        console.error('createExport error:', err);
        res.status(500).json({ message: 'Failed to save export' });
    }
};

export const listDepartmentSubmissions = async (req, res) => {
    try {
        const { branch, department } = await getManagerContext(req.user?.username, req.query, { allowDepartmentOverride: true });

        const quarterParam = req.query.quarter ? parseInt(req.query.quarter, 10) : null;
        const yearParam = req.query.year ? parseInt(req.query.year, 10) : null;

        const quarter = (quarterParam && quarterParam >= 1 && quarterParam <= 4) ? quarterParam : null;
        const year = (yearParam && yearParam >= 2020) ? yearParam : null;

        const records = await getLatestRecordsForDepartment(branch, department, quarter, year);

        const submissions = records.map((record) => ({
            id: record.id,
            employeeCode: record.employee_code,
            employeeName: record.employee?.fullname || null,
            submittedAt: formatDateTimeVN(toDate(record.createdAt)),
            fileName: record.fileName,
            table: record.table,
            quarter: record.quarter,
            year: record.year,
        }));

        return res.json({ branch, department, quarter, year, submissions });
    } catch (err) {
        const status = err.status || 500;
        if (!err.status) console.error('listDepartmentSubmissions error:', err);
        return res.status(status).json({
            message: err.status ? err.message : 'Failed to fetch department submissions',
            ...(err.status ? {} : { error: err.message })
        });
    }
};

export const exportDepartmentSummary = async (req, res) => {
    try {
        const { branch, department } = await getManagerContext(req.user?.username, req.query, { allowDepartmentOverride: true });

        const quarterParam = req.query.quarter ? parseInt(req.query.quarter, 10) : null;
        const yearParam = req.query.year ? parseInt(req.query.year, 10) : null;

        const quarter = (quarterParam && quarterParam >= 1 && quarterParam <= 4) ? quarterParam : null;
        const year = (yearParam && yearParam >= 2020) ? yearParam : null;

        const records = await getLatestRecordsForDepartment(branch, department, quarter, year);

        if (!records.length) {
            return res.status(400).json({ message: 'Không có dữ liệu để xuất' });
        }

        const branchName = mapBranchName(branch);
        const departmentName = mapDepartmentName(branch, department);

        const { workbook } = await createDepartmentSummaryWorkbook(records, branchName, departmentName, quarter, year);

        const buffer = await workbook.xlsx.writeBuffer();
        const output = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
        const safeBranch = sanitizeForFilename(branchName);
        const safeDepartment = sanitizeForFilename(departmentName);

        const fileQuarter = quarter || records[0]?.quarter || null;
        const fileYear = year || records[0]?.year || null;
        const quarterYearPart = (fileQuarter && fileYear) ? `Q${fileQuarter}_${fileYear}_` : '';
        const now = new Date();
        const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Tong_ket_xep_loai_${quarterYearPart}${safeBranch}_${safeDepartment}_${stamp}.xlsx"`);

        return res.send(output);
    } catch (err) {
        const status = err.status || 500;
        if (!err.status) console.error('Failed to export department summary:', err);
        return res.status(status).json({
            message: err.status ? err.message : 'Failed to export department summary',
            ...(err.status ? {} : { error: err.message })
        });
    }
};

export const exportBranchSummary = async (req, res) => {
    try {
        const username = req.user?.username;
        if (username !== '201100069') {
            return res.status(403).json({ message: 'Chỉ user 201100069 mới có quyền xuất tổng kết toàn chi nhánh' });
        }

        const targetBranch = (req.query?.targetBranch ?? req.query?.branch ?? '').toString().trim();
        if (!targetBranch || !orgData.departments?.[targetBranch]) {
            return res.status(400).json({ message: 'Vui lòng chọn chi nhánh hợp lệ' });
        }

        const quarterParam = req.query.quarter ? parseInt(req.query.quarter, 10) : null;
        const yearParam = req.query.year ? parseInt(req.query.year, 10) : null;

        const quarter = (quarterParam && quarterParam >= 1 && quarterParam <= 4) ? quarterParam : null;
        const year = (yearParam && yearParam >= 2020) ? yearParam : null;

        const departmentsInBranch = orgData.departments[targetBranch] || [];
        if (!departmentsInBranch.length) {
            return res.status(400).json({ message: 'Chi nhánh không có phòng ban nào' });
        }

        // Collect all department data
        const allDepartmentData = [];
        for (const dept of departmentsInBranch) {
            const records = await getLatestRecordsForDepartment(targetBranch, dept.id, quarter, year);
            if (records.length > 0) {
                const summaries = await Promise.all(records.map(async (record) => ({
                    record,
                    summary: await getRecordSummary(record),
                })));
                allDepartmentData.push({
                    departmentId: dept.id,
                    departmentName: dept.name,
                    summaries,
                });
            }
        }

        if (!allDepartmentData.length) {
            return res.status(400).json({ message: 'Không có dữ liệu để xuất cho chi nhánh này' });
        }

        const branchName = mapBranchName(targetBranch);
        const { workbook, displayQuarterRoman, displayYear } = await createBranchSummaryWorkbook(allDepartmentData, branchName);

        const buffer = await workbook.xlsx.writeBuffer();
        const output = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
        const safeBranch = sanitizeForFilename(branchName);

        const firstRecord = allDepartmentData[0]?.summaries[0]?.record;
        const fileQuarter = quarter || firstRecord?.quarter || null;
        const fileYear = year || firstRecord?.year || null;
        const quarterYearPart = (fileQuarter && fileYear) ? `Q${fileQuarter}_${fileYear}_` : '';
        const now = new Date();
        const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Tong_ket_xep_loai_${quarterYearPart}Chi_nhanh_${safeBranch}_${stamp}.xlsx"`);

        return res.send(output);
    } catch (err) {
        const status = err.status || 500;
        if (!err.status) console.error('Failed to export branch summary:', err);
        return res.status(status).json({
            message: err.status ? err.message : 'Failed to export branch summary',
            ...(err.status ? {} : { error: err.message })
        });
    }
};

export const getExport = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const entity = await getExportByIdService(id);
        if (!entity) return res.status(404).json({ message: 'Not found' });
        res.json(entity);
    } catch (err) {
        console.error('getExport error:', err);
        res.status(500).json({ message: 'Failed to get export' });
    }
};

export const downloadExport = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const entity = await getExportByIdService(id);
        if (!entity) return res.status(404).json({ message: 'Not found' });
        const absPath = path.join(process.cwd(), entity.filePath);
        if (!fs.existsSync(absPath)) return res.status(404).json({ message: 'File missing' });
        res.download(absPath, entity.fileName || path.basename(absPath));
    } catch (err) {
        console.error('downloadExport error:', err);
        res.status(500).json({ message: 'Failed to download export' });
    }
};

export const deleteExport = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (!Number.isFinite(id)) {
            return res.status(400).json({ message: 'Invalid export id' });
        }

        const record = await getExportByIdService(id);
        if (!record) {
            return res.status(404).json({ message: 'Export record not found' });
        }

        // Cascade delete related data
        await deleteRelatedExportData(record);
        await deleteExportRecord(record);

        return res.json({ message: 'Export record and related data deleted successfully' });
    } catch (err) {
        console.error('deleteExport error:', err);
        return res.status(500).json({ message: 'Failed to delete export' });
    }
};
