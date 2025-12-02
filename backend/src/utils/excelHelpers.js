/**
 * Excel-related utility functions
 */

import { normalizeString, parseNumber } from './helpers.js';

/**
 * Get text content from ExcelJS cell
 * @param {object} cell - ExcelJS cell object
 * @returns {string} Cell text content
 */
export const getCellText = (cell) => {
    if (!cell) return '';
    let v = cell.value;
    if (v === null || v === undefined) {
        if (cell.isMerged && cell.master) v = cell.master.value;
    }
    if (!v && typeof v !== 'number') return '';
    if (typeof v === 'object') {
        if (v.richText && Array.isArray(v.richText)) {
            return v.richText.map(rt => rt.text || '').join('');
        }
        if (v.text) return String(v.text);
        if (v.result !== undefined) return String(v.result);
        if (v.hyperlink) return String(v.hyperlink);
        if (v instanceof Date) return v.toISOString();
    }
    return String(v);
};

/**
 * Get number format from cell (handling merged cells)
 * @param {object} cell - ExcelJS cell object
 * @returns {string|null} Number format or null
 */
export const getNumFmt = (cell) => {
    if (!cell) return null;
    const src = (cell.isMerged && cell.master) ? cell.master : cell;
    return src.numFmt || src?.style?.numFmt || null;
};

/**
 * Check if format is percentage
 * @param {string|number} fmt - Format string or code
 * @returns {boolean}
 */
export const isPercentFmt = (fmt) => {
    if (!fmt) return false;
    if (typeof fmt === 'string') return fmt.includes('%');
    if (typeof fmt === 'number') return fmt === 9 || fmt === 10;
    return false;
};

/**
 * Find score column index in table columns
 * @param {Array} columns - Array of column objects with label property
 * @returns {number} Column index
 */
export const findScoreColumnIndex = (columns = []) => {
    const labels = columns.map((col) => normalizeString(col?.label ?? col ?? ''));
    
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

/**
 * Extract summary from table data
 * @param {object} table - Table object with columns and rows
 * @param {function} classifyByRatioFn - Classification function
 * @returns {object|null} Summary object or null
 */
export const extractSummaryFromTable = (table, classifyByRatioFn) => {
    if (!table?.columns?.length || !table?.rows?.length) return null;
    
    const columns = table.columns.map((col) => col?.label ?? '');
    const scoreColIdx = findScoreColumnIndex(columns);
    let ratio = null;
    let classification = '';
    let ratioText = '';

    (table.rows || []).forEach((row) => {
        const cells = row?.cells || [];
        const label = normalizeString(cells[1]?.value);
        
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
            ratio = parseNumber(value);
        }
    });

    if (ratio != null && ratio > 2 && ratio <= 100) ratio /= 100;
    if (!classification && ratio != null && classifyByRatioFn) {
        classification = classifyByRatioFn(ratio);
    }

    if (ratio == null && !classification) return null;
    return {
        ratio: ratio ?? null,
        ratioText: ratioText || '',
        classification: classification || '',
        position: '',
    };
};

/**
 * Short department name mapping
 */
export const SHORT_DEPT_NAME_MAP = {
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

/**
 * Short department name mapping for headers
 */
export const SHORT_DEPT_NAME_MAP_HEAD = {
    'Phòng Kế toán & ngân quỹ': 'Phòng KT&NQ',
    'Phòng giao dịch Bình Tây': 'PGD BÌNH TÂY',
    'Phòng Khách hàng cá nhân': 'Phòng KHCN',
    'Phòng Khách hàng doanh nghiệp': 'Phòng KHDN',
    'Phòng Khách hàng': 'Phòng KHÁCH HÀNG',
    'Phòng Tổng hợp': 'Phòng TỔNG HỢP',
    'Phòng Kiểm tra giám sát nội bộ': 'Phòng KTGSNB',
    'Phòng Kế hoạch & quản lý rủi ro': 'Phòng KH&QLRR',
};

/**
 * Quarter number to Roman numeral mapping
 */
export const QUARTER_ROMAN_MAP = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
