// parseExcelForViewer.js
import ExcelJS from 'exceljs';

// 1 -> A
const toCol = (n) => {
    let s = '';
    while (n > 0) {
        const m = (n - 1) % 26;
        s = String.fromCharCode(65 + m) + s;
        n = Math.floor((n - 1) / 26);
    }
    return s;
};
const colToNum = (letters) =>
    letters.split('').reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0);
const addr = (r, c) => `${toCol(c)}${r}`;

// Extract numFmt robustly
const getNumFmt = (cell) => {
    if (!cell) return null;
    const src = (cell.isMerged && cell.master) ? cell.master : cell;
    return src.numFmt || src?.style?.numFmt || null;
};
const isPercentFmt = (fmt) => {
    if (!fmt) return false;
    if (typeof fmt === 'string') return fmt.includes('%');
    if (typeof fmt === 'number') return fmt === 9 || fmt === 10;
    return false;
};

const getText = (cell) => {
    if (!cell) return '';
    let v = cell.value;
    if (v === null || v === undefined) {
        if (cell.isMerged && cell.master) v = cell.master.value;
    }
    if (!v && typeof v !== 'number') return '';
    if (typeof v === 'object') {
        if (v.richText && Array.isArray(v.richText)) return v.richText.map(rt => rt.text).join('');
        if (v.text) return String(v.text);
        if (v.result !== undefined) return String(v.result);
        if (v.hyperlink) return String(v.hyperlink);
        if (v instanceof Date) return v.toISOString();
    }
    return String(v);
};

// ==== Xây map merge an toàn ====
// Trả về { mergeMap: Map<masterAddr, {rowSpan, colSpan}>, covered: Set<addr> }
const buildMergeInfo = (ws) => {
    const mergeMap = new Map();
    const covered = new Set();

    // 1) Cố gắng đọc trực tiếp từ model
    try {
        const raw = ws._merges || ws?.model?.merges || [];
        const entries = raw instanceof Map ? Array.from(raw.keys())
            : Array.isArray(raw) ? raw
                : Object.keys(raw || {});
        entries.forEach((range) => {
            if (typeof range !== 'string') return;
            const m = range.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
            if (!m) return;
            const [, c1, r1, c2, r2] = m;
            const rStart = parseInt(r1, 10), rEnd = parseInt(r2, 10);
            const cStart = colToNum(c1), cEnd = colToNum(c2);
            const master = addr(rStart, cStart);
            mergeMap.set(master, { rowSpan: rEnd - rStart + 1, colSpan: cEnd - cStart + 1 });
            for (let r = rStart; r <= rEnd; r++) {
                for (let c = cStart; c <= cEnd; c++) {
                    const a = addr(r, c);
                    if (a !== master) covered.add(a);
                }
            }
        });
    } catch (_) { /* ignore */ }

    // 2) Fallback: quét worksheet để tự tìm vùng merge
    if (mergeMap.size === 0) {
        const lastRow = ws.actualRowCount || ws.rowCount || 0;
        const lastCol = ws.actualColumnCount || ws.columnCount || 0;
        for (let r = 1; r <= lastRow; r++) {
            for (let c = 1; c <= lastCol; c++) {
                const cell = ws.getRow(r).getCell(c);
                if (!cell || !cell.isMerged) continue;
                const master = cell.master || cell;
                // chỉ xử lý tại ô master (góc trên trái của vùng)
                if (cell.address !== master.address) continue;

                // Tính colSpan
                let colSpan = 1;
                for (let cc = c + 1; cc <= lastCol; cc++) {
                    const ccCell = ws.getRow(r).getCell(cc);
                    if (ccCell && ccCell.isMerged && ccCell.master?.address === master.address) colSpan++;
                    else break;
                }
                // Tính rowSpan
                let rowSpan = 1;
                for (let rr = r + 1; rr <= lastRow; rr++) {
                    const rrCell = ws.getRow(rr).getCell(c);
                    if (rrCell && rrCell.isMerged && rrCell.master?.address === master.address) rowSpan++;
                    else break;
                }

                mergeMap.set(master.address, { rowSpan, colSpan });
                for (let rr = 0; rr < rowSpan; rr++) {
                    for (let cc = 0; cc < colSpan; cc++) {
                        const a = addr(r + rr, c + cc);
                        if (a !== master.address) covered.add(a);
                    }
                }
            }
        }
    }

    return { mergeMap, covered };
};

// Parse buffer (ArrayBuffer | Uint8Array | Blob) into a light-weight table schema for SchemaTable
export async function parseExcelForViewer(arrayBuffer) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(arrayBuffer);
    const ws = wb.worksheets[0];
    if (!ws) return { table: { columns: [], rows: [] } };

    const lastRow = ws.actualRowCount || ws.rowCount || 0;
    const lastCol = ws.actualColumnCount || ws.columnCount || 0;

    // Header bắt đầu tại hàng 11 theo exporter
    const headerRowIndex = 11;
    if (headerRowIndex > lastRow) return { table: { columns: [], rows: [] } };

    // Merge info (robust)
    const { mergeMap, covered } = buildMergeInfo(ws);

    // ==== Số cột hiển thị: dùng colCount thực tế để không cắt ngang vùng merge ====
    const visibleCols = Math.max(lastCol, 1);

    // Columns (header row)
    const table = { columns: [], rows: [] };
    for (let c = 1; c <= visibleCols; c++) {
        const a = `${toCol(c)}${headerRowIndex}`;
        const span = mergeMap.get(a);
        const isHidden = covered.has(a);
        table.columns.push({
            key: `col_${c}`,
            label: getText(ws.getRow(headerRowIndex).getCell(c)),
            rowSpan: span?.rowSpan || 1,
            colSpan: span?.colSpan || 1,
            hidden: !!isHidden,
        });
    }

    // ==== Không dừng ở dòng trống: lấy đến dòng cuối có dữ liệu HOẶC có merge phủ ====
    const dataStart = headerRowIndex + 1;

    // 1) dòng cuối có text
    let maxNonEmpty = dataStart - 1;
    for (let r = dataStart; r <= lastRow; r++) {
        for (let c = 1; c <= visibleCols; c++) {
            if (getText(ws.getRow(r).getCell(c)) !== '') { maxNonEmpty = r; break; }
        }
    }
    // 2) dòng cuối được vùng merge phủ tới
    let maxMergeRow = dataStart - 1;
    for (const [master, span] of mergeMap.entries()) {
        const mr = parseInt(master.match(/\d+$/)?.[0] || '0', 10);
        const end = mr + (span?.rowSpan || 1) - 1;
        if (end > maxMergeRow) maxMergeRow = end;
    }
    const dataEnd = Math.max(maxNonEmpty, maxMergeRow, dataStart - 1);

    // Build data rows
    for (let r = dataStart; r <= dataEnd; r++) {
        const rowObj = { cells: [] };
        for (let c = 1; c <= visibleCols; c++) {
            const cell = ws.getRow(r).getCell(c);
            const a = `${toCol(c)}${r}`;
            const span = mergeMap.get(a);
            const isHidden = covered.has(a);

            // detect formula
            let formula = undefined;
            const src = (cell?.isMerged && cell?.master) ? cell.master : cell;
            const raw = src?.value;
            if (raw && typeof raw === 'object' && raw.formula) {
                formula = raw.formula.startsWith('=') ? raw.formula : `=${raw.formula}`;
            }

            const numFmt = getNumFmt(cell);
            const percent = isPercentFmt(numFmt);
            const hasFill = !!(cell?.fill?.fgColor || (cell?.isMerged && cell?.master?.fill?.fgColor));

            rowObj.cells.push({
                addr: a,
                value: getText(cell),
                rowSpan: span?.rowSpan || 1,
                colSpan: span?.colSpan || 1,
                hidden: !!isHidden,
                input: !!hasFill,
                formula,
                numFmt: numFmt || undefined,
                percent,
            });
        }
        table.rows.push(rowObj);
    }

    return { table };
}
