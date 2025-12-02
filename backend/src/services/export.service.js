import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { AppDataSource } from '../config/database.js';
import { ExportRecord } from '../entities/ExportRecord.js';
import { BonusAward } from '../entities/BonusAward.js';
import { User } from '../entities/User.js';
import { orgData, findNameById } from '../utils/orgData.js';
import {
    normalizeString,
    parseNumber as parseNumberAnyLocale,
    sanitizeForFilename,
    toDate,
    formatDateTimeVN,
    getCurrentQuarterYear,
    classifyByRatio,
} from '../utils/helpers.js';
import {
    getCellText,
    findScoreColumnIndex,
    SHORT_DEPT_NAME_MAP,
    SHORT_DEPT_NAME_MAP_HEAD,
    QUARTER_ROMAN_MAP,
} from '../utils/excelHelpers.js';

const EXPORT_DIR = path.join(process.cwd(), 'uploads', 'exports');
if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });

const norm = normalizeString;

// ==================== Helper Functions ====================

/**
 * Create organized directory structure
 */
export const createExportDirectory = (year, quarter, branch, department) => {
    const yearDir = path.join(EXPORT_DIR, year.toString());
    const quarterDir = path.join(yearDir, `Q${quarter}`);
    const branchDir = path.join(quarterDir, branch);
    const departmentDir = path.join(branchDir, department);

    if (!fs.existsSync(departmentDir)) fs.mkdirSync(departmentDir, { recursive: true });

    return departmentDir;
};

/**
 * Generate clean filename with employee info
 */
export const generateExportFileName = (originalFileName, employeeCode, employeeName, quarter, year) => {
    const ext = path.extname(originalFileName) || '.xlsx';

    const cleanEmployeeName = employeeName
        ? employeeName.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, "d").replace(/Đ/g, "D").replace(/^_+|_+$/g, '').replace(/[^a-zA-Z0-9-_]+/g, '_')
        : employeeCode;

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '_');
    const quarterYear = quarter && year ? `Q${quarter}_${year}_` : '';

    return `${quarterYear}${employeeCode}_${cleanEmployeeName}_${timestamp}${ext}`;
};

export const mapBranchName = (branchId) => findNameById(orgData.branches, branchId) || branchId || '';

export const mapDepartmentName = (branchId, departmentId) => {
    const branchDepartments = orgData.departments?.[branchId] || [];
    const fromBranch = findNameById(branchDepartments, departmentId);
    if (fromBranch) return fromBranch;
    for (const list of Object.values(orgData.departments || {})) {
        const name = findNameById(list, departmentId);
        if (name) return name;
    }
    return departmentId || '';
};

// ==================== Manager Context ====================

/**
 * Get manager context with optional department override
 */
export const getManagerContext = async (username, query, options = {}) => {
    const { allowDepartmentOverride = false } = options || {};
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

    if (allowDepartmentOverride && (normalizedDepartment === 'qlrr' || normalizedDepartment === 'th')) {
        const rawBranch = (query?.targetBranch ?? query?.branch ?? '').toString().trim();
        const rawDepartment = (query?.targetDepartment ?? query?.department ?? '').toString().trim();

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

// ==================== Export Records ====================

/**
 * Get latest records for a department
 */
export const getLatestRecordsForDepartment = async (branch, department, quarter = null, year = null) => {
    const exportRepo = AppDataSource.getRepository(ExportRecord.options.name);
    const qb = exportRepo
        .createQueryBuilder('record')
        .leftJoinAndSelect('record.employee', 'employee')
        .where('employee.branch = :branch', { branch })
        .andWhere('employee.department = :department', { department });

    if (quarter !== null && Number.isInteger(quarter) && quarter >= 1 && quarter <= 4) {
        qb.andWhere('record.quarter = :quarter', { quarter });
    }

    if (year !== null && Number.isInteger(year)) {
        qb.andWhere('record.year = :year', { year });
    }

    const records = await qb.orderBy('record.createdAt', 'DESC').getMany();

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

/**
 * List exports with filters
 */
export const listExportsService = async (filters) => {
    const { page, pageSize, q, branchId, departmentId, quarter, year } = filters;

    const repo = AppDataSource.getRepository(ExportRecord.options.name);
    const qb = repo.createQueryBuilder('e')
        .leftJoinAndSelect('e.employee', 'employee')
        .where('1=1');

    if (q) {
        qb.andWhere(
            '(LOWER(employee.fullname) LIKE :q OR LOWER(employee.username) LIKE :q)',
            { q: `%${q}%` }
        );
    }

    if (branchId) {
        qb.andWhere('employee.branch = :branchId', { branchId });
    }

    if (departmentId) {
        qb.andWhere('employee.department = :departmentId', { departmentId });
    }

    if (quarter !== null && Number.isInteger(quarter) && quarter >= 1 && quarter <= 4) {
        qb.andWhere('e.quarter = :quarter', { quarter });
    }

    if (year !== null && Number.isInteger(year)) {
        qb.andWhere('e.year = :year', { year });
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

    return { data, total, page, pageSize };
};

/**
 * Get export by ID
 */
export const getExportByIdService = async (id) => {
    const repo = AppDataSource.getRepository(ExportRecord.options.name);
    return repo.findOne({ where: { id } });
};

/**
 * Get employee by username
 */
export const getEmployeeByUsername = async (username) => {
    const userRepo = AppDataSource.getRepository(User.options.name);
    return userRepo.findOne({ where: { username } });
};

/**
 * Delete related data for an export (cascade)
 */
export const deleteRelatedExportData = async (record) => {
    if (!record.employee_code || !record.year || !record.quarter) return;

    // Delete BonusAward records
    const bonusRepo = AppDataSource.getRepository(BonusAward.options.name);
    try {
        await bonusRepo.delete({
            username: record.employee_code,
            year: record.year,
            quarterAwarded: record.quarter,
        });
        console.log(`Deleted BonusAwards for ${record.employee_code} Q${record.quarter} ${record.year}`);
    } catch (bonusErr) {
        console.warn('Failed to delete bonus awards:', bonusErr?.message || bonusErr);
    }

    // Delete QuarterActual records
    const quarterActualRepo = AppDataSource.getRepository('QuarterActual');
    try {
        await quarterActualRepo.delete({
            employee_code: record.employee_code,
            year: record.year,
            quarter: record.quarter,
        });
        console.log(`Deleted QuarterActual for ${record.employee_code} Q${record.quarter} ${record.year}`);
    } catch (quarterErr) {
        console.warn('Failed to delete quarter actuals:', quarterErr?.message || quarterErr);
    }

    // Delete file
    if (record.filePath) {
        const absPath = path.join(process.cwd(), record.filePath);
        try {
            await fs.promises.unlink(absPath);
            console.log(`Deleted file: ${absPath}`);
        } catch (fileErr) {
            if (fileErr.code !== 'ENOENT') {
                console.warn(`Failed to remove file ${absPath}:`, fileErr);
            }
        }
    }
};

/**
 * Save export record
 */
export const saveExportRecord = async (data) => {
    const repo = AppDataSource.getRepository(ExportRecord.options.name);
    const entity = repo.create(data);
    return repo.save(entity);
};

/**
 * Find existing export record for quarter/year
 */
export const findExistingExportRecord = async (employeeCode, quarter, year) => {
    const repo = AppDataSource.getRepository(ExportRecord.options.name);
    return repo.findOne({
        where: {
            employee_code: employeeCode,
            quarter,
            year
        },
        order: { createdAt: 'DESC' }
    });
};

/**
 * Delete export record
 */
export const deleteExportRecord = async (record) => {
    const repo = AppDataSource.getRepository(ExportRecord.options.name);
    await repo.remove(record);
};

// ==================== Summary Extraction ====================

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

/**
 * Get record summary (ratio, classification, position)
 */
export const getRecordSummary = async (record) => {
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

// ==================== Excel Export Generation ====================

/**
 * Create department summary Excel workbook
 */
export const createDepartmentSummaryWorkbook = async (records, branchName, departmentName, quarter, year) => {
    const summaries = await Promise.all(records.map(async (record) => ({
        record,
        summary: await getRecordSummary(record),
    })));

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Tong ket xep loai');

    ws.pageSetup = {
        paperSize: 9,
        orientation: 'portrait',
        horizontalCentered: true,
        margins: { left: 0.25, right: 0.25, top: 0.25, bottom: 0.25, header: 0.05, footer: 0.05 },
        fitToHeight: 0,
    };

    // Header section
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
    ws.getCell('A4').value = SHORT_DEPT_NAME_MAP_HEAD[departmentName]?.toUpperCase() || departmentName?.toUpperCase() || '';
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

    ws.getCell('F4').value = 'Phụ lục 05/KTL-TH';
    ws.getCell('F4').font = { name: 'Times New Roman', size: 12, italic: true };
    ws.getCell('F4').alignment = { horizontal: 'right' };

    ws.addRow([]);
    ws.getRow(6).height = 40;

    ws.mergeCells('B6:E6');
    ws.getCell('B6').value = 'TỔNG HỢP HỆ SỐ HOÀN THÀNH CÔNG VIỆC VÀ XẾP LOẠI \n CỦA NGƯỜI LAO ĐỘNG';
    ws.getCell('B6').font = { name: 'Times New Roman', size: 15, bold: true };
    ws.getCell('B6').alignment = { horizontal: 'center', wrapText: true };

    const recordQuarter = records[0]?.quarter;
    const recordYear = records[0]?.year;

    let displayQuarterRoman = 'I';
    let displayYear = new Date().getFullYear();

    if (recordQuarter && recordYear) {
        displayQuarterRoman = QUARTER_ROMAN_MAP[recordQuarter] || 'I';
        displayYear = recordYear;
    } else {
        const month = new Date().getMonth() + 1;
        const qtr = Math.ceil(month / 3);
        displayQuarterRoman = QUARTER_ROMAN_MAP[qtr] || 'I';
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
    ws.getCell('A10').value = `Căn cứ kết quả thực hiện của ${SHORT_DEPT_NAME_MAP_HEAD[departmentName]};`;
    ws.getCell('A10').font = { name: 'Times New Roman', size: 12 };
    ws.getCell('A10').alignment = { horizontal: 'left' };

    ws.mergeCells('A11:F11');
    ws.getCell('A11').value = `Căn cứ Biên họp phòng ngày ${new Date().toLocaleDateString('vi-VN')} của ${SHORT_DEPT_NAME_MAP_HEAD[departmentName]};`;
    ws.getCell('A11').font = { name: 'Times New Roman', size: 12 };
    ws.getCell('A11').alignment = { horizontal: 'left' };

    ws.mergeCells('A12:F12');
    ws.getCell('A12').value = `${SHORT_DEPT_NAME_MAP_HEAD[departmentName]} tổng hợp mức độ hoàn thành công việc của CBNV như sau:`;
    ws.getCell('A12').font = { name: 'Times New Roman', size: 12 };
    ws.getCell('A12').alignment = { horizontal: 'left' };
    ws.addRow([]);

    ws.columns = [
        { key: 'stt', width: 6 },
        { key: 'employeeName', width: 37 },
        { key: 'department', width: 14 },
        { key: 'position', width: 10 },
        { key: 'ratio', width: 27 },
        { key: 'classification', width: 10 },
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
    headerRow.eachCell((cell) => {
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });

    summaries.forEach(({ record, summary }, index) => {
        const ratioValue = (summary?.ratio !== null && summary?.ratio !== undefined && Number.isFinite(summary?.ratio))
            ? Number(summary.ratio)
            : null;
        const ratioText = summary?.ratioText ? String(summary.ratioText) : '';
        const row = ws.addRow({
            stt: index + 1,
            employeeName: record.employee?.fullname || record.employee_code || '',
            position: summary?.position || '',
            branch: branchName,
            department: SHORT_DEPT_NAME_MAP[departmentName] || departmentName,
            ratio: ratioValue ?? ratioText,
            classification: summary?.classification || '',
        });

        row.font = { name: 'Times New Roman', size: 12 };
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

    return { workbook, displayQuarterRoman, displayYear };
};

/**
 * Create branch summary Excel workbook
 */
export const createBranchSummaryWorkbook = async (allDepartmentData, branchName) => {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Tong ket chi nhanh');

    ws.pageSetup = {
        paperSize: 9,
        orientation: 'portrait',
        horizontalCentered: true,
        margins: { left: 0.25, right: 0.25, top: 0.25, bottom: 0.25, header: 0.05, footer: 0.05 },
        fitToHeight: 0,
    };

    // Header section
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

    ws.mergeCells('D1:F1');
    ws.getCell('D1').value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
    ws.getCell('D1').font = { name: 'Times New Roman', size: 12, bold: true };
    ws.getCell('D1').alignment = { horizontal: 'center' };

    ws.mergeCells('D2:F2');
    ws.getCell('D2').value = 'Độc lập - Tự do - Hạnh phúc';
    ws.getCell('D2').font = { name: 'Times New Roman', size: 12, bold: true, underline: true };
    ws.getCell('D2').alignment = { horizontal: 'center' };

    ws.getCell('F4').value = 'Phụ lục 05/KTL-TH';
    ws.getCell('F4').font = { name: 'Times New Roman', size: 12, italic: true };
    ws.getCell('F4').alignment = { horizontal: 'right' };

    ws.addRow([]);
    ws.getRow(6).height = 40;

    ws.mergeCells('B6:E6');
    ws.getCell('B6').value = 'TỔNG HỢP HỆ SỐ HOÀN THÀNH CÔNG VIỆC VÀ XẾP LOẠI \n CỦA NGƯỜI LAO ĐỘNG - TOÀN CHI NHÁNH';
    ws.getCell('B6').font = { name: 'Times New Roman', size: 15, bold: true };
    ws.getCell('B6').alignment = { horizontal: 'center', wrapText: true };

    const firstRecord = allDepartmentData[0]?.summaries[0]?.record;
    const recordQuarter = firstRecord?.quarter;
    const recordYear = firstRecord?.year;

    let displayQuarterRoman = 'I';
    let displayYear = new Date().getFullYear();

    if (recordQuarter && recordYear) {
        displayQuarterRoman = QUARTER_ROMAN_MAP[recordQuarter] || 'I';
        displayYear = recordYear;
    } else {
        const month = new Date().getMonth() + 1;
        const currentQuarter = Math.ceil(month / 3);
        displayQuarterRoman = QUARTER_ROMAN_MAP[currentQuarter] || 'I';
    }

    ws.mergeCells('B7:E7');
    ws.getCell('B7').value = `QUÝ ${displayQuarterRoman} NĂM ${displayYear}`;
    ws.getCell('B7').font = { name: 'Times New Roman', size: 12, bold: true };
    ws.getCell('B7').alignment = { horizontal: 'center' };

    ws.addRow([]);
    ws.addRow([]);

    ws.columns = [
        { key: 'stt', width: 6 },
        { key: 'employeeName', width: 37 },
        { key: 'department', width: 14 },
        { key: 'position', width: 10 },
        { key: 'ratio', width: 27 },
        { key: 'classification', width: 10 },
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
    headerRow.eachCell((cell) => {
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });

    let globalIndex = 1;
    for (const deptData of allDepartmentData) {
        const shortDeptName = SHORT_DEPT_NAME_MAP[deptData.departmentName] || deptData.departmentName;

        for (const { record, summary } of deptData.summaries) {
            const ratioValue = (summary?.ratio !== null && summary?.ratio !== undefined && Number.isFinite(summary?.ratio))
                ? Number(summary.ratio)
                : null;
            const ratioText = summary?.ratioText ? String(summary.ratioText) : '';

            const row = ws.addRow({
                stt: globalIndex++,
                employeeName: record.employee?.fullname || record.employee_code || '',
                department: shortDeptName,
                position: summary?.position || '',
                ratio: ratioValue ?? ratioText,
                classification: summary?.classification || '',
            });

            row.font = { name: 'Times New Roman', size: 12 };
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
        }
    }

    ws.addRow([]);

    ws.mergeCells(`A${ws.lastRow.number + 1}:B${ws.lastRow.number + 1}`);
    ws.getCell(`A${ws.lastRow.number}`).value = 'LẬP BIỂU';
    ws.getCell(`A${ws.lastRow.number}`).font = { name: 'Times New Roman', size: 12, bold: true };
    ws.getCell(`A${ws.lastRow.number}`).alignment = { horizontal: 'center' };

    ws.mergeCells(`D${ws.lastRow.number}:F${ws.lastRow.number}`);
    ws.getCell(`D${ws.lastRow.number}`).value = 'GIÁM ĐỐC CHI NHÁNH';
    ws.getCell(`D${ws.lastRow.number}`).font = { name: 'Times New Roman', size: 12, bold: true };
    ws.getCell(`D${ws.lastRow.number}`).alignment = { horizontal: 'center' };

    return { workbook, displayQuarterRoman, displayYear };
};

// Legacy exports for record.controller.js
export const getExportRecord = () => {
    const repo = AppDataSource.getRepository('ExportRecord');
    return repo.findOneBy({});
};

export const getRecordByEmpId = (empId) => {
    const repo = AppDataSource.getRepository('ExportRecord');
    return repo.find({
        where: { employee_code: empId },
        order: { createdAt: 'DESC' }
    }).then(records => records[0] || null);
};

