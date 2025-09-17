import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

const uploadDir = path.join(process.cwd(), 'uploads');

// Ensure the upload directory exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const inferType = (values) => {
    // Try to infer from non-empty sample values
    const samples = values.filter(v => v !== null && v !== undefined && v !== '').slice(0, 10);
    if (samples.length === 0) return 'string';

    const isBoolean = samples.every(v =>
        typeof v === 'boolean' ||
        (typeof v === 'string' && ['true', 'false', 'yes', 'no', '0', '1'].includes(v.toLowerCase()))
    );
    if (isBoolean) return 'boolean';

    const isNumber = samples.every(v => typeof v === 'number' || (!isNaN(Number(v)) && v !== ''));
    if (isNumber) return 'number';

    const isDate = samples.every(v => v instanceof Date || (!isNaN(Date.parse(v))));
    if (isDate) return 'date';

    // Detect select-like if few unique values relative to samples
    const unique = Array.from(new Set(samples.map(s => String(s).trim())));
    if (unique.length > 0 && unique.length <= Math.max(5, Math.ceil(samples.length / 2))) {
        return {type: 'select', options: unique};
    }

    return 'string';
};

export const processExcelFile = async (file) => {
    const filePath = path.join(uploadDir, file.filename);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];

    // Helper: lấy numFmt từ cell (ưu tiên master nếu merge)
    const getNumFmt = (cell) => {
        if (!cell) return null;
        const src = (cell.isMerged && cell.master) ? cell.master : cell;
        return src.numFmt || src?.style?.numFmt || null;
    };

    // Helper: nhận diện format phần trăm
    const isPercentFmt = (fmt) => {
        if (!fmt) return false;
        if (typeof fmt === 'string') return fmt.includes('%'); // "0%", "0.00%", "#,##0%"
        if (typeof fmt === 'number') return fmt === 9 || fmt === 10; // builtin Percent (phòng hờ)
        return false;
    };

    // Helper: normalize exceljs cell value to plain text
    const getText = (cell) => {
        if (!cell) return '';
        let v = cell.value;
        if (v === null || v === undefined) {
            if (cell.isMerged && cell.master) v = cell.master.value;
        }
        if (!v && typeof v !== 'number') return '';
        if (typeof v === 'object') {
            // ExcelJS can return objects for richText, hyperlinks, formula results, dates
            if (v.richText && Array.isArray(v.richText)) {
                return v.richText.map(rt => rt.text).join('');
            }
            if (v.text) return String(v.text);
            if (v.result !== undefined) return String(v.result);
            if (v.hyperlink) return String(v.hyperlink);
            if (v instanceof Date) return v.toISOString();
        }
        return String(v);
    };

    // Build raw matrix including merged text propagation
    const rows = [];
    const lastRow = worksheet.actualRowCount || worksheet.rowCount;
    const lastCol = worksheet.actualColumnCount || worksheet.columnCount;

    for (let r = 1; r <= lastRow; r++) {
        const arr = [];
        for (let c = 1; c <= lastCol; c++) {
            const cell = worksheet.getRow(r).getCell(c);
            let txt = getText(cell);
            // if empty but merged, try master
            if (!txt && cell && cell.isMerged && cell.master) {
                txt = getText(cell.master);
            }
            arr.push(txt);
        }
        // avoid trailing empty columns
        while (arr.length && (!arr[arr.length - 1] || arr[arr.length - 1] === '')) arr.pop();
        rows.push(arr);
    }

    // Remove leading empty rows
    while (rows.length && rows[0].every(v => v === '')) rows.shift();

    if (rows.length === 0) {
        return {
            title: path.parse(file.originalname || file.filename).name,
            schema: {title: path.parse(file.originalname || file.filename).name, fields: []},
            jsonData: []
        };
    }

    const headers = rows[0].map(h => String(h).trim());
    const dataRows = rows.slice(1);

    // Build columns data for type inference
    const columns = headers.map((_, idx) => dataRows.map(r => r[idx]));

    const fields = headers.map((label, idx) => {
        const inferred = inferType(columns[idx]);
        let type = inferred;
        let options = [];
        if (typeof inferred === 'object') {
            type = inferred.type;
            options = inferred.options || [];
        }
        return {
            key: label.toLowerCase().replace(/\s+/g, '_'),
            label,
            type, // string | number | date | boolean | select
            required: false,
            options,
            order: idx + 1,
        };
    });

    // Additionally, try to extract a table-like schema for rendering complex forms
    // Detect the common Vietnamese KPI layout by recognizing first header cell "STT" and some known labels
    const normalizedHeaders = headers.map(h => h.normalize('NFC').toLowerCase());
    const looksLikeKpi = normalizedHeaders[0]?.startsWith('stt') || normalizedHeaders.includes('tiêu chí') || normalizedHeaders.includes('diem chuan') || normalizedHeaders.includes('điểm chuẩn');

    const table = {columns: [], rows: []};
    // Also capture all merge ranges globally so the frontend or other consumers can preserve layout if needed
    let mergeRanges = [];
    // Build merge map globally once
    const mergeMap = new Map(); // masterAddress -> {rowSpan, colSpan}
    const covered = new Set(); // non-master merged addresses
    try {
        const merges = worksheet._merges || worksheet?.model?.merges || [];
        const entries = merges instanceof Map ? Array.from(merges.keys()) : Array.isArray(merges) ? merges : Object.keys(merges);
        mergeRanges = entries.filter((e) => typeof e === 'string');
        const colToNum = (letters) => letters.split('').reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0);
        const addr = (r, c) => `${String.fromCharCode(64 + c)}${r}`;
        // keep numeric info for later clipping to visible columns
        const mergeInfos = [];
        entries.forEach((range) => {
            if (typeof range !== 'string') return;
            const m = range.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
            if (!m) return;
            const [, c1, r1, c2, r2] = m;
            const rStart = parseInt(r1, 10), rEnd = parseInt(r2, 10);
            const cStart = colToNum(c1), cEnd = colToNum(c2);
            const master = addr(rStart, cStart);
            mergeInfos.push({rStart, rEnd, cStart, cEnd, master});
            mergeMap.set(master, {rowSpan: rEnd - rStart + 1, colSpan: cEnd - cStart + 1});
            for (let r = rStart; r <= rEnd; r++) {
                for (let c = cStart; c <= cEnd; c++) {
                    const a = addr(r, c);
                    if (a !== master) covered.add(a);
                }
            }
        });
        // store for later use on looksLikeKpi block
        worksheet.__mergeInfos = mergeInfos;
    } catch (_) {
        // ignore
    }
    if (looksLikeKpi) {
        // Use up to the first 8 columns like in the screenshot
        const colLabels = headers.slice(0, Math.min(headers.length, 8));
        table.columns = colLabels.map((label, i) => ({key: `col_${i + 1}`, label}));
        // Adjust merge anchors for the visible column window [1..N]
        const N = table.columns.length;
        const addr = (r, c) => `${String.fromCharCode(64 + c)}${r}`;
        const mergeInfos = worksheet.__mergeInfos || [];
        for (const info of mergeInfos) {
            const {rStart, rEnd, cStart, cEnd} = info;
            const rowSpan = rEnd - rStart + 1;
            const colSpan = cEnd - cStart + 1;
            // Overlaps the visible window?
            if (cStart <= N && cEnd >= 1) {
                const cStartVis = Math.max(1, cStart);
                const cEndVis = Math.min(N, cEnd);
                const anchor = addr(rStart, cStartVis);
                // span clipped to visible subset
                const clippedSpan = {rowSpan, colSpan: (cEndVis - cStartVis + 1)};
                mergeMap.set(anchor, clippedSpan);
                // Ensure anchor is not treated as covered
                if (covered.has(anchor)) covered.delete(anchor);
            }
        }
        // Apply header merge spans to columns (row 1)
        for (let c = 1; c <= table.columns.length; c++) {
            const a = `${String.fromCharCode(64 + c)}1`;
            const span = mergeMap.get(a);
            const isHidden = covered.has(a);
            table.columns[c - 1] = {
                ...table.columns[c - 1],
                rowSpan: span?.rowSpan || 1,
                colSpan: span?.colSpan || 1,
                hidden: !!isHidden,
            };
        }
        // Fill table rows
        for (let r = 2; r <= 1 + dataRows.length; r++) { // worksheet row indices (starting at 2 considering header at 1)
            const rowObj = {cells: []};
            for (let c = 1; c <= table.columns.length; c++) {
                const cell = worksheet.getRow(r).getCell(c);
                const value = getText(cell);
                const a = `${String.fromCharCode(64 + c)}${r}`;
                const span = mergeMap.get(a);
                const isHidden = covered.has(a);
                const hasFill = !!(cell?.fill?.fgColor || (cell?.isMerged && cell?.master?.fill?.fgColor));
                // detect formula on cell or its master if merged
                let formula = null;
                const src = (cell?.isMerged && cell?.master) ? cell.master : cell;
                const raw = src?.value;
                if (raw && typeof raw === 'object' && raw.formula) {
                    formula = raw.formula.startsWith('=') ? raw.formula : `=${raw.formula}`;
                }
                const numFmt = getNumFmt(cell);
                rowObj.cells.push({
                    addr: a,
                    value,
                    rowSpan: span?.rowSpan || 1,
                    colSpan: span?.colSpan || 1,
                    hidden: !!isHidden,
                    input: !!hasFill,
                    formula: formula || undefined,
                    numFmt: numFmt || undefined,
                    percent: isPercentFmt(numFmt),
                });
            }
            table.rows.push(rowObj);
        }
    }

    const schema = {
        title: path.parse(file.originalname || file.filename).name,
        fields,
        table,
        mergeRanges,
    };

    // Also produce JSON objects for potential preview/use
    const jsonData = dataRows.map(r => {
        const obj = {};
        headers.forEach((h, i) => {
            obj[h] = r[i] ?? null;
        });
        return obj;
    });

    return {title: schema.title, schema, jsonData};
}