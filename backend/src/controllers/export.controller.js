import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { AppDataSource } from '../config/database.js';
import { ExportRecord } from '../entities/ExportRecord.js';
import { BonusAward } from '../entities/BonusAward.js';
import { User } from '../entities/User.js';
import { orgData, findNameById } from '../utils/orgData.js';

const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const EXPORT_DIR = path.join(process.cwd(), 'uploads', 'exports');
ensureDir(EXPORT_DIR);

// Helper function to get current quarter and year
const getCurrentQuarterYear = () => {
    const now = new Date();
    const month = now.getMonth() + 1; // Convert 0-11 to 1-12
    const quarter = Math.ceil(month / 3); // Calculate quarter: 1-4

    return {
        quarter,
        year: now.getFullYear()
    };
};

// Helper function to create organized directory structure
const createExportDirectory = (year, quarter) => {
    const yearDir = path.join(EXPORT_DIR, year.toString());
    const quarterDir = path.join(yearDir, `Q${quarter}`);

    ensureDir(yearDir);
    ensureDir(quarterDir);

    return quarterDir;
};

// Helper function to generate clean filename with employee info
const generateExportFileName = (originalFileName, employeeCode, employeeName, quarter, year) => {
    // Extract file extension
    const ext = path.extname(originalFileName) || '.xlsx';

    // Create clean employee identifier
    const cleanEmployeeName = employeeName
        ? employeeName.replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/_+/g, '_')
        : employeeCode;

    // Generate timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '_');

    // Include quarter and year in filename for better organization
    const quarterYear = quarter && year ? `Q${quarter}_${year}_` : '';

    return `${quarterYear}${employeeCode}_${cleanEmployeeName}_${timestamp}${ext}`;
};

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
    let idx = labels.findIndex((l) => l.includes('điem theo muc đo hoan thanh'));
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
    const manager = await userRepo.findOne({ where: { username } });
    if (!manager) {
        const err = new Error('User not found');
        err.status = 404;
        throw err;
    }

    // Allow special user "201100069" to access department submissions
    const isSpecialUser = username === '201100069';

    const role = (manager.role || '').toLowerCase();
    if (role !== 'manager' && !isSpecialUser) {
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

    // Allow override for specific manager departments (QLRR and TH managers)
    if (allowDepartmentOverride && (normalizedDepartment === 'qlrr' || normalizedDepartment === 'th')) {
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
        .where('employee.branch = :branch', { branch })
        .andWhere('employee.department = :department', { department })
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
    console.log(filePath);

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
        if (label.includes('he so hoan thanh cong viec cua ca nhan sau khi') || label.includes('he so hoan thanh cong viec')) {

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
        if (clean.toLocaleLowerCase().includes('phó giám đốc')) return 'PGĐ';
        if (clean.toLocaleLowerCase().includes('giám đốc')) return 'GĐ';
        if (clean.toLocaleLowerCase().includes('nhân viên') || clean.toLocaleLowerCase().includes('cán bộ')) return 'NV';
        return clean;
    };

    position = extractPositionFromCellText(getCellText(ws.getCell('A10')));

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
        const branchId = req.query.branchId ? req.query.branchId.toString().trim() : '';
        const departmentId = req.query.departmentId ? req.query.departmentId.toString().trim() : '';
        const parsedQuarter = parseInt(req.query.quarter, 10);
        const parsedYear = parseInt(req.query.year, 10);
        const hasQuarterFilter = Number.isInteger(parsedQuarter) && parsedQuarter >= 1 && parsedQuarter <= 4;
        const hasYearFilter = Number.isInteger(parsedYear);

        const repo = AppDataSource.getRepository(ExportRecord.options.name);
        const qb = repo.createQueryBuilder('e')
            .leftJoinAndSelect('e.employee', 'employee')
            .where('1=1');

        if (q) {
            // match by fileName or meta->employee_name (if driver supports jsonb path, use LIKE on stringified JSON as fallback)
            qb.andWhere('LOWER(e.fileName) LIKE :q', { q: `%${q}%` });
        }

        if (branchId) {
            qb.andWhere('employee.branch = :branchId', { branchId });
        }

        if (departmentId) {
            qb.andWhere('employee.department = :departmentId', { departmentId });
        }

        if (hasQuarterFilter) {
            qb.andWhere('e.quarter = :quarter', { quarter: parsedQuarter });
        }

        if (hasYearFilter) {
            qb.andWhere('e.year = :year', { year: parsedYear });
        }

        qb.orderBy('e.year', 'DESC')
            .addOrderBy('e.quarter', 'DESC')
            .addOrderBy('e.id', 'DESC')
            .skip((page - 1) * pageSize)
            .take(pageSize);

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
                quarter: item.quarter,
                year: item.year,
                createdAt: item.createdAt,
                employee_name: meta.employee_name || employee?.fullname || null,
                fullname: employee?.fullname ?? null,
                branch: employee?.branch ?? null,
                department: employee?.department ?? null,
            };
        });

        res.json({ data, total, page, pageSize });
    } catch (err) {
        res.status(500).json({ message: 'Failed to list exports' });
    }
};

export const createExport = async (req, res) => {
    try {
        // multer provides file (single) and body for fields
        const file = req.file; // required
        if (!file) return res.status(400).json({ message: 'No file uploaded' });

        const employee_code = req.user?.username;
        const { formId, fileName, table, quarter: bodyQuarter, year: bodyYear } = req.body || {};

        // Use quarter/year from request body (UI selection) if available, otherwise calculate from current date
        let quarter, year;
        if (bodyQuarter && bodyYear) {
            quarter = parseInt(bodyQuarter, 10);
            year = parseInt(bodyYear, 10);
            console.log(`Using quarter/year from UI: Q${quarter} ${year}`);
        } else {
            const current = getCurrentQuarterYear();
            quarter = current.quarter;
            year = current.year;
            console.log(`No quarter/year in request, using current: Q${quarter} ${year}`);
        }

        // Validate quarter and year
        if (!quarter || !year || quarter < 1 || quarter > 4 || year < 2020 || year > 2030) {
            return res.status(400).json({
                message: 'Invalid quarter or year',
                received: { quarter, year }
            });
        }

        // Fetch employee information for filename generation
        const userRepo = AppDataSource.getRepository(User.options.name);
        const employee = await userRepo.findOne({ where: { username: employee_code } });
        const employeeName = employee?.fullname || employee_code;

        // Create organized directory structure
        const quarterDir = createExportDirectory(year, quarter);

        // Generate clean filename with employee info, including quarter and year
        const originalFileName = fileName && typeof fileName === 'string' ? fileName : (file.originalname || file.filename);
        const organizedFileName = generateExportFileName(originalFileName, employee_code, employeeName, quarter, year);

        // Move file from uploads root to organized directory structure
        const originalPath = path.join(process.cwd(), 'uploads', file.filename);
        const finalPath = path.join(quarterDir, organizedFileName);

        if (originalPath !== finalPath) {
            fs.renameSync(originalPath, finalPath);
        }

        const repo = AppDataSource.getRepository(ExportRecord.options.name);

        // Check if user already has form submission for current quarter-year
        // Implement quarter-year based storage: delete existing submission for same quarter-year before creating new one
        const existingRecord = await repo.findOne({
            where: {
                employee_code: employee_code,
                quarter: quarter,
                year: year
            },
            order: { createdAt: 'DESC' }
        });

        if (existingRecord) {
            // Delete the old file if it exists
            if (existingRecord.filePath) {
                const oldFilePath = path.join(process.cwd(), existingRecord.filePath);
                try {
                    await fs.promises.unlink(oldFilePath);
                    console.log(`Deleted old file: ${oldFilePath}`);
                } catch (fileErr) {
                    if (fileErr.code !== 'ENOENT') {
                        console.warn(`Failed to remove old export file ${oldFilePath}:`, fileErr);
                    }
                }
            }

            // Remove the old record from database
            await repo.remove(existingRecord);
            console.log(`Removed existing export record for user: ${employee_code} (Q${quarter} ${year})`);
        }

        // Create new export record with quarter and year
        const entity = repo.create({
            employee_code: employee_code,
            formId: formId ? parseInt(formId, 10) : null,
            fileName: organizedFileName,
            filePath: path.relative(process.cwd(), finalPath).replace(/\\/g, '/'),
            table: table ? (typeof table === 'string' ? JSON.parse(table) : table) : null,
            quarter: quarter,
            year: year,
        });
        const saved = await repo.save(entity);

        const message = existingRecord
            ? `Form đã được cập nhật thành công (thay thế form Quý ${quarter} năm ${year})`
            : `Form Quý ${quarter} năm ${year} đã được lưu thành công`;

        res.status(201).json({
            id: saved.id,
            message: message,
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
        // Cho phép trưởng phòng tổng hợp override branch/department qua query params
        const { manager, branch: userBranch, department: userDepartment } = await getManagerContext(req);
        let effectiveBranch = userBranch;
        let effectiveDepartment = userDepartment;

        // Chỉ cho phép trưởng phòng tổng hợp override
        const normalizedDepartment = (userDepartment || '').toLowerCase();
        const isTHManager = normalizedDepartment === 'th';
        console.log(isTHManager);


        if (isTHManager) {
            const queryBranch = (req.query?.branch || '').toString().trim();
            console.log(queryBranch);

            const queryDepartment = (req.query?.department || '').toString().trim();
            console.log(queryDepartment);

            if (queryBranch) {
                effectiveBranch = queryBranch;
            }

            if (queryDepartment) {
                effectiveDepartment = queryDepartment;
            }
        }
        console.log(effectiveDepartment);

        const records = await getLatestRecordsForDepartment(effectiveBranch, effectiveDepartment);

        const submissions = records.map((record) => ({
            id: record.id,
            employeeCode: record.employee_code,
            employeeName: record.employee?.fullname || null,
            submittedAt: formatDateTimeVN(toDate(record.createdAt)),
            fileName: record.fileName,
            table: record.table,
        }));

        return res.json({
            branch: effectiveBranch,
            department: effectiveDepartment,
            submissions,
        });
    } catch (err) {
        const status = err.status || 500;
        if (!err.status) {
            console.error('listDepartmentSubmissions error:', err);
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
            return res.status(400).json({ message: 'Không có dữ liệu để xuất' });
        }

        const branchName = mapBranchName(branch);
        const departmentName = mapDepartmentName(branch, department);

        const shortDeptNameMap = {
            'Phòng Kế toán & ngân quỹ': 'P.KT&NQ',
            'Phòng giao dịch Bình Tây': 'PGD Bình Tây',
            'Phòng Khách hàng cá nhân': 'P.KHCN',
            'Phòng Khách hàng doanh nghiệp': 'P.KHDN',
            'Phòng Khách hàng': 'P.KH',
            'Phòng Tổng hợp': 'P.TH',
            'Phòng Kiểm tra giám sát nội bộ': 'P.KTGSNB',
            'Phòng Kế hoạch & quản lý rủi ro': 'P.KH&QLRR',
            'Ban giám đốc': 'BGĐ',
        };

        const shortDeptNameMapHead = {
            'Phòng Kế toán & ngân quỹ': 'Phòng KT&NQ',
            'Phòng giao dịch Bình Tây': 'PGD BÌNH TÂY',
            'Phòng Khách hàng cá nhân': 'Phòng KHCN',
            'Phòng Khách hàng doanh nghiệp': 'Phòng KHDN',
            'Phòng Khách hàng': 'Phòng KHÁCH HÀNG',
            'Phòng Tổng hợp': 'Phòng TỔNG HỢP',
            'Phòng Kiểm tra giám sát nội bộ': 'Phòng KTGSNB',
            'Phòng Kế hoạch & quản lý rủi ro': 'Phòng KH&QLRR',
        };

        const summaries = await Promise.all(records.map(async (record) => ({
            record,
            summary: await getRecordSummary(record),
        })));

        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Tong ket xep loai');

        ws.pageSetup = {
            paperSize: 9, // A4
            orientation: 'portrait',
            horizontalCentered: true,
            margins: { left: 0.25, right: 0.25, top: 0.25, bottom: 0.25, header: 0.05, footer: 0.05 },
            fitToHeight: 0,
        };

        ws.mergeCells('A1:B1');
        ws.getCell('A1').value = 'NGÂN HÀNG NÔNG NGHIỆP';
        ws.getCell('A1').font = { name: 'Times New Roman', size: 12 };
        ws.getCell('A1').alignment = { horizontal: 'center' };

        ws.mergeCells('A2:B2');
        ws.getCell('A2').value = 'VÀ PHÁT TRIỂN NÔNG THÔN VIỆT NAM';
        ws.getCell('A2').font = { name: 'Times New Roman', size: 12 };
        ws.getCell('A2').alignment = { horizontal: 'center' };

        ws.mergeCells('A3:B3');
        ws.getCell('A3').value = branchName === 'Hội sở' ? 'CHI NHÁNH BẮC TPHCM' : branchName.toUpperCase();
        ws.getCell('A3').font = { name: 'Times New Roman', size: 12, bold: true };
        ws.getCell('A3').alignment = { horizontal: 'center' };

        ws.mergeCells('A4:B4');
        ws.getCell('A4').value = shortDeptNameMapHead[departmentName]?.toUpperCase() || departmentName?.toUpperCase() || '';
        ws.getCell('A4').font = { name: 'Times New Roman', size: 12, bold: true };
        ws.getCell('A4').alignment = { horizontal: 'center' };

        ws.mergeCells('D1:F1');
        ws.getCell('D1').value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
        ws.getCell('D1').font = { name: 'Times New Roman', size: 12, bold: true };
        ws.getCell('D1').alignment = { horizontal: 'center' };

        ws.mergeCells('D2:F2');
        ws.getCell('D2').value = 'Độc lập - Tự do - Hạnh phúc';
        ws.getCell('D2').font = { name: 'Times New Roman', size: 12, bold: true, underline: true };
        ws.getCell('D2').alignment = { horizontal: 'center' };

        // ws.mergeCells('E4:F4');
        ws.getCell('F4').value = 'Phụ lục 05/KTL-TH';
        ws.getCell('F4').font = { name: 'Times New Roman', size: 12, italic: true };
        ws.getCell('F4').alignment = { horizontal: 'right' };

        ws.addRow([]);

        ws.getRow(6).height = 40;

        ws.mergeCells('B6:E6');
        ws.getCell('B6').value = 'TỔNG HỢP HỆ SỐ HOÀN THÀNH CÔNG VIỆC VÀ XẾP LOẠI \n CỦA NGƯỜI LAO ĐỘNG';
        ws.getCell('B6').font = { name: 'Times New Roman', size: 15, bold: true };
        ws.getCell('B6').alignment = { horizontal: 'center', wrapText: true };
        // ws.getCell('A6').height = 40;

        // Get quarter and year from records data
        const recordQuarter = records[0]?.quarter;
        const recordYear = records[0]?.year;

        // If we have quarter/year from records, use them; otherwise calculate from current date
        let displayQuarterRoman = 'I';
        let displayYear = new Date().getFullYear();

        if (recordQuarter && recordYear) {
            const quarterMap = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
            displayQuarterRoman = quarterMap[recordQuarter] || 'I';
            displayYear = recordYear;
        } else {
            // Fallback: calculate from current date using same logic as getCurrentQuarterYear()
            const month = new Date().getMonth() + 1; // Convert 0-11 to 1-12
            const quarter = Math.ceil(month / 3); // 1-4
            const quarterMap = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
            displayQuarterRoman = quarterMap[quarter] || 'I';
        }

        ws.mergeCells('B7:E7');
        ws.getCell('B7').value = `QUÝ ${displayQuarterRoman} NĂM ${displayYear}`;
        ws.getCell('B7').font = { name: 'Times New Roman', size: 12, bold: true };
        ws.getCell('B7').alignment = { horizontal: 'center' };

        ws.addRow([]);

        ws.mergeCells('A9:F9');
        ws.getCell('A9').value = `Căn cứ chỉ tiêu Quý ${displayQuarterRoman} năm ${displayYear} được giao;`;
        ws.getCell('A9').font = { name: 'Times New Roman', size: 12 };
        ws.getCell('A9').alignment = { horizontal: 'left' };

        ws.mergeCells('A10:F10');
        ws.getCell('A10').value = `Căn cứ kết quả thực hiện của ${shortDeptNameMapHead[departmentName]};`;
        ws.getCell('A10').font = { name: 'Times New Roman', size: 12 };
        ws.getCell('A10').alignment = { horizontal: 'left' };

        ws.mergeCells('A11:F11');
        ws.getCell('A11').value = `Căn cứ Biên họp phòng ngày ${new Date().toLocaleDateString('vi-VN')} của ${shortDeptNameMapHead[departmentName]};`;
        ws.getCell('A11').font = { name: 'Times New Roman', size: 12 };
        ws.getCell('A11').alignment = { horizontal: 'left' };

        ws.mergeCells('A12:F12');
        ws.getCell('A12').value = `${shortDeptNameMapHead[departmentName]} tổng hợp mức độ hoàn thành công việc của CBNV như sau:`;
        ws.getCell('A12').font = { name: 'Times New Roman', size: 12 };
        ws.getCell('A12').alignment = { horizontal: 'left' };
        ws.addRow([]);


        ws.columns = [
            { key: 'stt', width: 6, font: { bold: true } },
            { key: 'employeeName', width: 37, font: { bold: true } },
            { key: 'department', width: 14, font: { bold: true } },
            { key: 'position', width: 10, font: { bold: true } },
            { key: 'ratio', width: 27, font: { bold: true } },
            { key: 'classification', width: 10, font: { bold: true } },
        ];

        const headerRow = ws.addRow({
            stt: 'STT',
            employeeName: 'Họ và tên',
            department: 'Đơn vị/phòng',
            position: 'Chức vụ',
            ratio: 'Hệ số hoàn thành \n hiệu quả công việc',
            classification: 'Xếp loại',
        });
        headerRow.font = { name: 'Times New Roman', size: 12, bold: true };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        // headerRow.height = 30;
        headerRow.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        summaries.forEach(({ record, summary }, index) => {

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
                department: shortDeptNameMap[departmentName] || departmentName,
                ratio: ratioValue ?? ratioText,
                classification: summary?.classification || '',
            });

            row.font = { name: 'Times New Roman', size: 12 };
            // row.height = 20;
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                cell.alignment = { vertical: 'middle', wrapText: true };
            });

            if (ratioValue !== null) {
                row.getCell('ratio').value = ratioValue;
                row.getCell('ratio').numFmt = '0.00';
                row.getCell('ratio').alignment = { horizontal: 'center', vertical: 'middle' };
            }
            row.getCell('position').alignment = { horizontal: 'center', vertical: 'middle' };
            row.getCell('classification').alignment = { horizontal: 'center', vertical: 'middle' };
            row.getCell('stt').alignment = { horizontal: 'center', vertical: 'middle' };
        });

        ws.addRow([]);

        ws.mergeCells(`A${ws.lastRow.number + 1}:B${ws.lastRow.number + 1}`);
        ws.getCell(`A${ws.lastRow.number}`).value = 'LẬP BIỂU';
        ws.getCell(`A${ws.lastRow.number}`).font = { name: 'Times New Roman', size: 12, bold: true };
        ws.getCell(`A${ws.lastRow.number}`).alignment = { horizontal: 'center' };

        ws.mergeCells(`D${ws.lastRow.number}:F${ws.lastRow.number}`);
        ws.getCell(`D${ws.lastRow.number}`).value = 'TRƯỞNG PHÒNG/ĐƠN VỊ';
        ws.getCell(`D${ws.lastRow.number}`).font = { name: 'Times New Roman', size: 12, bold: true };
        ws.getCell(`D${ws.lastRow.number}`).alignment = { horizontal: 'center' };

        const buffer = await workbook.xlsx.writeBuffer();
        const output = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
        const safeBranch = sanitizeForFilename(branchName);
        const safeDepartment = sanitizeForFilename(departmentName);

        // Get quarter and year from the first record (all records should be from same quarter/year)
        const firstRecord = records[0];
        const quarter = firstRecord?.quarter || null;
        const year = firstRecord?.year || null;

        // Build filename with quarter/year if available
        const quarterYearPart = (quarter && year) ? `Q${quarter}_${year}_` : '';
        const now = new Date();
        const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="Tong_ket_xep_loai_${quarterYearPart}${safeBranch}_${safeDepartment}_${stamp}.xlsx"`
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
        const entity = await repo.findOne({ where: { id } });
        if (!entity) return res.status(404).json({ message: 'Not found' });
        res.json(entity);
    } catch (err) {
        res.status(500).json({ message: 'Failed to get export' });
    }
};

export const downloadExport = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const repo = AppDataSource.getRepository(ExportRecord.options.name);
        const entity = await repo.findOne({ where: { id } });
        if (!entity) return res.status(404).json({ message: 'Not found' });
        const absPath = path.join(process.cwd(), entity.filePath);
        if (!fs.existsSync(absPath)) return res.status(404).json({ message: 'File missing' });
        res.download(absPath, entity.fileName || path.basename(absPath));
    } catch (err) {
        res.status(500).json({ message: 'Failed to download export' });
    }
};

export const deleteExport = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (!Number.isFinite(id)) {
            return res.status(400).json({ message: 'Invalid export id' });
        }

        const repo = AppDataSource.getRepository(ExportRecord.options.name);
        const record = await repo.findOne({ where: { id } });
        if (!record) {
            return res.status(404).json({ message: 'Export record not found' });
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

        if (record.employee_code && record.year && record.quarter) {
            const bonusRepo = AppDataSource.getRepository(BonusAward.options.name);
            try {
                await bonusRepo.delete({
                    username: record.employee_code,
                    year: record.year,
                    quarterAwarded: record.quarter,
                });
            } catch (bonusErr) {
                console.warn('Failed to delete related bonus awards:', bonusErr?.message || bonusErr);
            }
        }

        await repo.remove(record);

        return res.json({ message: 'Export record deleted' });
    } catch (err) {
        console.error('deleteExport error:', err);
        return res.status(500).json({ message: 'Failed to delete export' });
    }
};
