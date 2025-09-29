import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import {AppDataSource} from '../config/database.js';
import {ExportRecord} from '../entities/ExportRecord.js';
import {User} from '../entities/User.js';
import {orgData, findNameById} from '../utils/orgData.js';

const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
};

const EXPORT_DIR = path.join(process.cwd(), 'uploads', 'exports');
ensureDir(EXPORT_DIR);

const norm = (s) => String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const parseNumberAnyLocale = (input) => {
    if (input === null || input === undefined) return null;
    if (typeof input === 'number') {
        if (Number.isFinite(input)) return input;
        return null;
    }
    let s = String(input).trim();
    if (!s) return null;
    const hasPercent = /%$/.test(s);
    s = s.replace(/%/g, '');
    if (s.includes(',') && !s.includes('.')) {
        s = s.replace(/\./g, '').replace(',', '.');
    } else {
        s = s.replace(/,/g, '');
    }
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    if (hasPercent) return n / 100;
    return n;
};

const classifyByRatio = (ratio) => {
    const x = Number(ratio) || 0;
    if (x < 0.5) return 'Không xếp loại';
    if (x < 0.7) return 'E';
    if (x < 0.8) return 'D';
    if (x < 0.9) return 'C';
    if (x < 0.95) return 'B';
    if (x < 1) return 'A';
    if (x < 1.1) return 'A+';
    return 'A++';
};

const getCellText = (cell) => {
    if (!cell) return '';
    if (cell.text !== undefined && cell.text !== null && cell.text !== '') {
        return String(cell.text);
    }
    const v = cell.value;
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') {
        if (Array.isArray(v.richText)) {
            return v.richText.map((rt) => rt.text || '').join('');
        }
        if (v.text !== undefined && v.text !== null) return String(v.text);
        if (v.result !== undefined && v.result !== null) return String(v.result);
        if (v.hyperlink) return String(v.hyperlink);
        if (v instanceof Date) return v.toISOString();
        if (typeof v.toString === 'function') return v.toString();
    }
    if (typeof v === 'number') return String(v);
    return String(v || '');
};

const findScoreColumnIndex = (columns = []) => {
    const labels = columns.map((col) => norm(col?.label ?? col ?? ''));
    let idx = labels.findIndex((l) => l.includes('diem theo muc do hoan thanh'));
    if (idx !== -1) return idx;
    idx = labels.findIndex((l) => l.includes('muc do hoan thanh') && l.includes('diem'));
    if (idx !== -1) return idx;
    const diemCols = labels
        .map((l, i) => ({ l, i }))
        .filter((item) => item.l.includes('diem'));
    if (diemCols.length) return diemCols[diemCols.length - 1].i;
    if (labels.length >= 7) return 6;
    return Math.max(0, labels.length - 1);
};

const sanitizeForFilename = (value) => String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'output';

const toDate = (value) => {
    if (value instanceof Date) return value;
    if (value === null || value === undefined) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
};

const formatDateTimeVN = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
};

const mapBranchName = (branchId) => findNameById(orgData.branches, branchId) || branchId || '';

const mapDepartmentName = (branchId, departmentId) => {
    const branchDepartments = orgData.departments?.[branchId] || [];
    const fromBranch = findNameById(branchDepartments, departmentId);
    if (fromBranch) return fromBranch;
    // Fallback: search across all departments
    for (const list of Object.values(orgData.departments || {})) {
        const name = findNameById(list, departmentId);
        if (name) return name;
    }
    return departmentId || '';
};

const getManagerContext = async (req, options = {}) => {
    const { allowDepartmentOverride = false } = options || {};
    const username = req.user?.username;
    if (!username) {
        const err = new Error('Unauthorized');
        err.status = 401;
        throw err;
    }

    const userRepo = AppDataSource.getRepository(User);
    const manager = await userRepo.findOne({where: {username}});
    if (!manager) {
        const err = new Error('User not found');
        err.status = 404;
        throw err;
    }

    const role = (manager.role || '').toLowerCase();
    if (role !== 'manager') {
        const err = new Error('Only managers can access department submissions');
        err.status = 403;
        throw err;
    }

    const branch = manager.branch;
    const department = manager.department;
    if (!branch || !department) {
        const err = new Error('Manager must have branch and department assigned');
        err.status = 400;
        throw err;
    }

    let effectiveBranch = branch;
    let effectiveDepartment = department;

    const normalizedDepartment = (department || '').toLowerCase();

    if (allowDepartmentOverride && normalizedDepartment === 'qlrr') {
        const rawBranch = (req.query?.targetBranch ?? req.query?.branch ?? '').toString().trim();
        const rawDepartment = (req.query?.targetDepartment ?? req.query?.department ?? '').toString().trim();

        if (rawBranch) {
            if (!orgData.departments?.[rawBranch]) {
                const err = new Error('Chi nhánh không hợp lệ');
                err.status = 400;
                throw err;
            }
            effectiveBranch = rawBranch;
        }

        if (rawDepartment) {
            const departmentsOfBranch = orgData.departments?.[effectiveBranch] || [];
            const isValidDepartment = departmentsOfBranch.some((item) => item.id === rawDepartment);
            if (!isValidDepartment) {
                const err = new Error('Phòng ban không hợp lệ');
                err.status = 400;
                throw err;
            }
            effectiveDepartment = rawDepartment;
        } else if (rawBranch && rawBranch !== branch) {
            const err = new Error('Vui lòng chọn phòng ban muốn xuất');
            err.status = 400;
            throw err;
        }
    }

    return { manager, branch: effectiveBranch, department: effectiveDepartment };
};

const getLatestRecordsForDepartment = async (branch, department) => {
    const exportRepo = AppDataSource.getRepository(ExportRecord.options.name);
    const records = await exportRepo
        .createQueryBuilder('record')
        .leftJoinAndSelect('record.employee', 'employee')
        .where('employee.branch = :branch', {branch})
        .andWhere('employee.department = :department', {department})
        .orderBy('record.createdAt', 'DESC')
        .getMany();

    const latestByEmployee = new Map();
    records.forEach((record) => {
        const employeeCode = record.employee_code || record.employee?.username;
        if (!employeeCode) return;
        const existing = latestByEmployee.get(employeeCode);
        if (!existing || new Date(record.createdAt) > new Date(existing.createdAt)) {
            latestByEmployee.set(employeeCode, record);
        }
    });

    return Array.from(latestByEmployee.values())
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const extractSummaryFromTable = (table) => {
    if (!table?.columns?.length || !table?.rows?.length) return null;
    const columns = table.columns.map((col) => col?.label ?? '');
    const scoreColIdx = findScoreColumnIndex(columns);
    let ratio = null;
    let classification = '';
    let ratioText = '';

    (table.rows || []).forEach((row) => {
        const cells = row?.cells || [];
        const label = norm(cells[1]?.value);
        if (!classification && label.includes('xep loai lao dong')) {
            for (let idx = 2; idx < cells.length; idx += 1) {
                if (cells[idx] && cells[idx].value) {
                    classification = String(cells[idx].value).trim();
                    break;
                }
            }
        }

        if (ratio == null && (label.includes('he so hoan thanh cong viec') || label.includes('he so hoan thanh'))) {
            const cell = cells[scoreColIdx];
            const value = cell?.value ?? '';
            ratioText = value ? String(value).trim() : ratioText;
            ratio = parseNumberAnyLocale(value);
        }
    });

    if (ratio != null && ratio > 2 && ratio <= 100) ratio /= 100;
    if (!classification && ratio != null) classification = classifyByRatio(ratio);

    if (ratio == null && !classification) return null;
    return {
        ratio: ratio ?? null,
        ratioText: ratioText || '',
        classification: classification || '',
        position: '',
    };
};

const extractSummaryFromFile = async (filePath) => {
    if (!filePath || !fs.existsSync(filePath)) return null;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const ws = workbook.worksheets[0];
    if (!ws) return null;

    const colCount = ws.actualColumnCount || ws.columnCount || 0;
    const rowCount = ws.actualRowCount || ws.rowCount || 0;
    if (!colCount || !rowCount) return null;

    let headerRowIndex = null;
    for (let r = 1; r <= Math.min(rowCount, 40); r += 1) {
        const text = norm(getCellText(ws.getRow(r).getCell(1)));
        if (text.startsWith('stt')) {
            headerRowIndex = r;
            break;
        }
    }
    if (!headerRowIndex) headerRowIndex = 11;

    const columns = [];
    for (let c = 1; c <= colCount; c += 1) {
        columns.push({ label: getCellText(ws.getRow(headerRowIndex).getCell(c)) });
    }
    const scoreColIdx = findScoreColumnIndex(columns);
    const scoreColExcel = scoreColIdx + 1;

    let ratio = null;
    let ratioText = '';
    let position = '';
    for (let r = headerRowIndex + 1; r <= rowCount; r += 1) {
        const row = ws.getRow(r);
        const label = norm(getCellText(row.getCell(2)));
        if (!label) continue;
        if (label.includes('he so hoan thanh cong viec') || label.includes('he so hoan thanh')) {
            const cell = row.getCell(scoreColExcel);
            ratioText = getCellText(cell).trim();
            const rawValue = cell?.value;
            if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
                ratio = rawValue;
            } else {
                ratio = parseNumberAnyLocale(ratioText);
            }
            break;
        }
    }

    if (ratio != null && ratio > 2 && ratio <= 100) ratio /= 100;

    let classification = '';
    for (let r = headerRowIndex; r <= rowCount; r += 1) {
        const row = ws.getRow(r);
        const label = norm(getCellText(row.getCell(2)));
        if (!label) continue;
        if (label.includes('xep loai lao dong')) {
            for (let c = 3; c <= colCount; c += 1) {
                const text = getCellText(row.getCell(c)).trim();
                if (text) {
                    classification = text;
                    break;
                }
            }
            if (!classification) {
                const raw = row.getCell(3)?.value;
                if (raw !== undefined && raw !== null) classification = String(raw).trim();
            }
            break;
        }
    }

    if (!classification && ratio != null) classification = classifyByRatio(ratio);

    const extractPositionFromCellText = (text) => {
        if (!text) return '';
        const trimmed = String(text).trim();
        if (!trimmed) return '';
        const idx = trimmed.indexOf(':');
        const raw = idx !== -1 ? trimmed.slice(idx + 1) : trimmed;
        const clean = raw.replace(/\.+$/g, '').trim();
        if (clean.toLocaleLowerCase().includes('trưởng phòng')) return 'TP';
        if (clean.toLocaleLowerCase().includes('phó phòng') || clean.toLocaleLowerCase().includes('phó trưởng phòng')) return 'PP';
        if (clean.toLocaleLowerCase().includes('giám đốc')) return 'GĐ';
        if (clean.toLocaleLowerCase().includes('phó giám đốc')) return 'PGĐ';
        if (clean.toLocaleLowerCase().includes('nhân viên') || clean.toLocaleLowerCase().includes('cán bộ')) return 'NV';
        return clean;
    };

    position = extractPositionFromCellText(getCellText(ws.getCell('A9')));

    if (!position) {
        for (let r = 7; r <= Math.min(12, rowCount); r += 1) {
            const row = ws.getRow(r);
            for (let c = 1; c <= Math.min(5, colCount); c += 1) {
                const text = getCellText(row.getCell(c));
                if (!text) continue;
                if (norm(text).includes('chuc vu')) {
                    position = extractPositionFromCellText(text);
                    break;
                }
            }
            if (position) break;
        }
    }

    return {
        ratio: ratio ?? null,
        ratioText,
        classification: classification || '',
        position: position || '',
    };
};

const extractAverageScoreFromFile = async (filePath) => {
    if (!filePath || !fs.existsSync(filePath)) return null;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const ws = workbook.worksheets[0];
    if (!ws) return null;

    const colCount = ws.actualColumnCount || ws.columnCount || 0;
    const rowCount = ws.actualRowCount || ws.rowCount || 0;
    if (!colCount || !rowCount) return null;

    let headerRowIndex = null;
    for (let r = 1; r <= Math.min(rowCount, 40); r += 1) {
        const text = norm(getCellText(ws.getRow(r).getCell(1)));
        if (text.startsWith('stt')) {
            headerRowIndex = r;
            break;
        }
    }
    if (!headerRowIndex) headerRowIndex = 11;

    const columns = [];
    for (let c = 1; c <= colCount; c += 1) {
        columns.push({ label: getCellText(ws.getRow(headerRowIndex).getCell(c)) });
    }
    const scoreColIdx = findScoreColumnIndex(columns);
    const scoreColExcel = scoreColIdx + 1;

    let total = 0;
    let count = 0;
    for (let r = headerRowIndex + 1; r <= rowCount; r += 1) {
        const row = ws.getRow(r);
        const cell = row.getCell(scoreColExcel);
        const rawValue = cell?.value;
        let score = null;
        if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
            score = rawValue;
        } else {
            const text = getCellText(cell).trim();
            score = parseNumberAnyLocale(text);
        }
        if (score != null) {
            if (score > 2 && score <= 100) score /= 100;
            total += score;
            count += 1;
        }
    }

    if (!count) return null;
    return total / count;
};

const getRecordSummary = async (record) => {
    let summary = null;
    try {
        if (record?.filePath) {
            const absPath = path.join(process.cwd(), record.filePath);
            summary = await extractSummaryFromFile(absPath);
        }
    } catch (err) {
        console.warn('Failed to parse export file for summary:', record?.id, err?.message || err);
    }

    if (!summary && record?.table) {
        summary = extractSummaryFromTable(record.table);
    }

    if (!summary) {
        return { ratio: null, ratioText: '', classification: '', position: '' };
    }

    if (summary.position == null) summary.position = '';
    return summary;
};

export const listExports = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page || '1', 10));
        const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || '10', 10)));
        const q = (req.query.q || '').toString().trim().toLowerCase();

        const repo = AppDataSource.getRepository(ExportRecord.options.name);
        const qb = repo.createQueryBuilder('e')
            .leftJoinAndSelect('e.employee', 'employee')
            .orderBy('e.id', 'DESC')
            .skip((page - 1) * pageSize)
            .take(pageSize);

        if (q) {
            // match by fileName or meta->employee_name (if driver supports jsonb path, use LIKE on stringified JSON as fallback)
            qb.where("LOWER(e.fileName) LIKE :q", {q: `%${q}%`});
        }

        const [entities, total] = await qb.getManyAndCount();

        const data = entities.map((item) => {
            const employee = item.employee;
            const meta = item?.table?.meta || {};
            return {
                id: item.id,
                employee_code: item.employee_code,
                formId: item.formId,
                fileName: item.fileName,
                filePath: item.filePath,
                table: item.table,
                createdAt: item.createdAt,
                employee_name: meta.employee_name || employee?.fullname || null,
                fullname: employee?.fullname ?? null,
                branch: employee?.branch ?? null,
                department: employee?.department ?? null,
            };
        });

        res.json({data, total, page, pageSize});
    } catch (err) {
        res.status(500).json({message: 'Failed to list exports'});
    }
};

export const createExport = async (req, res) => {
    try {
        // multer provides file (single) and body for fields
        const file = req.file; // required
        if (!file) return res.status(400).json({message: 'No file uploaded'});

        const employee_code = req.user?.username;
        const {formId, fileName, table} = req.body || {};

        // Move file to exports subdir (it is currently in uploads root by multer config)
        const originalPath = path.join(process.cwd(), 'uploads', file.filename);
        const safeName = fileName && typeof fileName === 'string' ? fileName : (file.originalname || file.filename);
        const finalPath = path.join(EXPORT_DIR, file.filename);
        if (originalPath !== finalPath) {
            fs.renameSync(originalPath, finalPath);
        }

        const repo = AppDataSource.getRepository(ExportRecord.options.name);

        const entity = repo.create({
            employee_code: employee_code,
            formId: formId ? parseInt(formId, 10) : null,
            fileName: safeName,
            filePath: path.relative(process.cwd(), finalPath).replace(/\\/g, '/'),
            table: table ? (typeof table === 'string' ? JSON.parse(table) : table) : null,
        });
        const saved = await repo.save(entity);

        res.status(201).json({
            id: saved.id,
            message: 'Export saved',
            downloadUrl: `/api/exports/${saved.id}/download`,
        });
    } catch (err) {
        console.error('createExport error:', err);
        res.status(500).json({message: 'Failed to save export'});
    }
};

export const listDepartmentSubmissions = async (req, res) => {
    try {
        const { branch, department } = await getManagerContext(req);
        const records = await getLatestRecordsForDepartment(branch, department);

        const submissions = records.map((record) => {
            const submittedDate = toDate(record.createdAt);
            return {
                id: record.id,
                employeeCode: record.employee_code || record.employee?.username || '',
                employeeName: record.employee?.fullname || record.employee_code || '',
                submittedAt: submittedDate ? submittedDate.toISOString() : (record.createdAt || ''),
                formId: record.formId,
                fileName: record.fileName,
                table: record.table,
            };
        });

        return res.json({
            branch,
            department,
            submissions,
        });
    } catch (err) {
        const status = err.status || 500;
        if (!err.status) {
            console.error('Error fetching department submissions:', err);
        }
        const payload = {
            message: err.status ? err.message : 'Failed to fetch department submissions',
        };
        if (!err.status) payload.error = err.message;
        return res.status(status).json(payload);
    }
};

export const exportDepartmentSummary = async (req, res) => {
    try {
        const { branch, department } = await getManagerContext(req, { allowDepartmentOverride: true });
        const records = await getLatestRecordsForDepartment(branch, department);

        if (!records.length) {
            return res.status(400).json({message: 'Không có dữ liệu để xuất'});
        }

        const branchName = mapBranchName(branch);
        const departmentName = mapDepartmentName(branch, department);

        const summaries = await Promise.all(records.map(async (record) => ({
            record,
            summary: await getRecordSummary(record),
        })));

        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Tong ket xep loai');
        ws.columns = [
            {header: 'STT', key: 'stt', width: 6},
            {header: 'Họ và tên', key: 'employeeName', width: 28},
            {header: 'Chức vụ', key: 'position', width: 24},
            {header: 'Chi nhánh', key: 'branch', width: 18},
            {header: 'Phòng ban', key: 'department', width: 22},
            {header: 'Hệ số hoàn thành', key: 'ratio', width: 20},
            {header: 'Xếp loại', key: 'classification', width: 16},
        ];
        ws.getRow(1).font = {bold: true};

        summaries.forEach(({record, summary}, index) => {
            const submittedDate = toDate(record.createdAt);
            const ratioValue = (summary?.ratio !== null && summary?.ratio !== undefined && Number.isFinite(summary?.ratio))
                ? Number(summary.ratio)
                : null;
            const ratioText = summary?.ratioText ? String(summary.ratioText) : '';
            const row = ws.addRow({
                stt: index + 1,
                employeeName: record.employee?.fullname || record.employee_code || '',
                position: summary?.position || '',
                branch: branchName,
                department: departmentName,
                ratio: ratioValue ?? ratioText,
                classification: summary?.classification || '',
            });

            if (ratioValue !== null) {
                row.getCell('ratio').value = ratioValue;
                row.getCell('ratio').numFmt = '0.00%';
                row.getCell('ratio').alignment = {horizontal: 'center'};
            }
            row.getCell('stt').alignment = {horizontal: 'center'};
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const output = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
        const safeBranch = sanitizeForFilename(branchName);
        const safeDepartment = sanitizeForFilename(departmentName);
        const now = new Date();
        const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="Tong_ket_xep_loai_${safeBranch}_${safeDepartment}_${stamp}.xlsx"`
        );

        return res.send(output);
    } catch (err) {
        const status = err.status || 500;
        if (!err.status) {
            console.error('Failed to export department summary:', err);
        }
        const payload = {
            message: err.status ? err.message : 'Failed to export department summary',
        };
        if (!err.status) payload.error = err.message;
        return res.status(status).json(payload);
    }
};

export const getExport = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const repo = AppDataSource.getRepository(ExportRecord.options.name);
        const entity = await repo.findOne({where: {id}});
        if (!entity) return res.status(404).json({message: 'Not found'});
        res.json(entity);
    } catch (err) {
        res.status(500).json({message: 'Failed to get export'});
    }
};

export const downloadExport = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const repo = AppDataSource.getRepository(ExportRecord.options.name);
        const entity = await repo.findOne({where: {id}});
        if (!entity) return res.status(404).json({message: 'Not found'});
        const absPath = path.join(process.cwd(), entity.filePath);
        if (!fs.existsSync(absPath)) return res.status(404).json({message: 'File missing'});
        res.download(absPath, entity.fileName || path.basename(absPath));
    } catch (err) {
        res.status(500).json({message: 'Failed to download export'});
    }
};

export const deleteExport = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (!Number.isFinite(id)) {
            return res.status(400).json({message: 'Invalid export id'});
        }

        const repo = AppDataSource.getRepository(ExportRecord.options.name);
        const record = await repo.findOne({where: {id}});
        if (!record) {
            return res.status(404).json({message: 'Export record not found'});
        }

        if (record.filePath) {
            const absPath = path.join(process.cwd(), record.filePath);
            try {
                await fs.promises.unlink(absPath);
            } catch (fileErr) {
                if (fileErr.code !== 'ENOENT') {
                    console.warn(`Failed to remove export file ${absPath}:`, fileErr);
                }
            }
        }

        await repo.remove(record);

        return res.json({message: 'Export record deleted'});
    } catch (err) {
        console.error('deleteExport error:', err);
        return res.status(500).json({message: 'Failed to delete export'});
    }
};
