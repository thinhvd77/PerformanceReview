/**
 * Common utility functions for the backend
 */

/**
 * Normalize string for comparison (remove diacritics, lowercase, trim)
 * @param {string} s - Input string
 * @returns {string} Normalized string
 */
export const normalizeString = (s) => String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/**
 * Parse number from various locale formats
 * @param {*} input - Input value (string, number, etc.)
 * @returns {number|null} Parsed number or null
 */
export const parseNumber = (input) => {
    if (input === null || input === undefined) return null;
    if (typeof input === 'number') {
        return Number.isFinite(input) ? input : null;
    }
    let s = String(input).trim();
    if (!s) return null;
    const hasPercent = /%$/.test(s);
    s = s.replace(/%/g, '');
    // Handle European number format (comma as decimal separator)
    if (s.includes(',') && !s.includes('.')) {
        s = s.replace(/\./g, '').replace(',', '.');
    } else {
        s = s.replace(/,/g, '');
    }
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    return hasPercent ? n / 100 : n;
};

/**
 * Sanitize string for use in filenames
 * @param {string} value - Input value
 * @returns {string} Safe filename string
 */
export const sanitizeForFilename = (value) => String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'output';

/**
 * Convert value to Date object
 * @param {*} value - Input value
 * @returns {Date|null} Date object or null
 */
export const toDate = (value) => {
    if (value instanceof Date) return value;
    if (value === null || value === undefined) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Format date to Vietnamese locale string
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDateTimeVN = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
};

/**
 * Get current quarter and year
 * @returns {{ quarter: number, year: number }}
 */
export const getCurrentQuarterYear = () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const quarter = Math.ceil(month / 3);
    return { quarter, year: now.getFullYear() };
};

/**
 * Classify performance ratio to grade
 * @param {number} ratio - Performance ratio
 * @returns {string} Classification grade
 */
export const classifyByRatio = (ratio) => {
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

/**
 * Ensure directory exists, create if not (synchronous)
 * Note: This is a sync function, import fs at the top of files that need it
 * @param {string} dir - Directory path
 * @param {object} fs - fs module reference
 */
export const ensureDirSync = (dir, fs) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

/**
 * Parse integer with default value
 * @param {*} value - Value to parse
 * @param {number} defaultValue - Default value if parsing fails
 * @returns {number}
 */
export const parseIntSafe = (value, defaultValue = 0) => {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : defaultValue;
};

/**
 * Clamp a number between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number}
 */
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Create paginated query parameters
 * @param {object} query - Express request query object
 * @param {number} defaultPageSize - Default page size
 * @param {number} maxPageSize - Maximum page size
 * @returns {{ page: number, pageSize: number, skip: number }}
 */
export const getPaginationParams = (query, defaultPageSize = 50, maxPageSize = 100) => {
    const page = Math.max(1, parseIntSafe(query.page, 1));
    const pageSize = clamp(parseIntSafe(query.pageSize, defaultPageSize), 1, maxPageSize);
    return { page, pageSize, skip: (page - 1) * pageSize };
};

/**
 * Create standard API response
 * @param {object} res - Express response object
 * @param {number} status - HTTP status code
 * @param {object} data - Response data
 */
export const sendResponse = (res, status, data) => {
    return res.status(status).json(data);
};

/**
 * Create error response
 * @param {object} res - Express response object
 * @param {number} status - HTTP status code
 * @param {string} message - Error message
 * @param {string} [error] - Optional error details
 */
export const sendError = (res, status, message, error = null) => {
    const payload = { message };
    if (error) payload.error = error;
    return res.status(status).json(payload);
};
