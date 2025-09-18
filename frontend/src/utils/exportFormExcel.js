import ExcelJS from 'exceljs';
import {saveAs} from 'file-saver';

const toCol = (n) => {
    let s = '';
    while (n > 0) {
        const m = (n - 1) % 26;
        s = String.fromCharCode(65 + m) + s;
        n = Math.floor((n - 1) / 26);
    }
    return s;
};

const setAllBorders = (ws, r, c, rs = 1, cs = 1) => {
    for (let i = 0; i < rs; i++) {
        for (let j = 0; j < cs; j++) {
            ws.getCell(r + i, c + j).border = {
                top: {style: 'thin'}, left: {style: 'thin'},
                bottom: {style: 'thin'}, right: {style: 'thin'}
            };
        }
    }
};

// merge an toàn (tránh đè vùng đã merge)
const safeMergeCells = (ws, range) => {
    try {
        const [startRange, endRange] = range.split(':');
        const startMatch = startRange.match(/([A-Z]+)(\d+)/);
        const endMatch = endRange.match(/([A-Z]+)(\d+)/);
        if (!startMatch || !endMatch) return false;

        const colToNum = (letters) => letters.split('').reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0);
        const startCol = colToNum(startMatch[1]);
        const startRow = parseInt(startMatch[2], 10);
        const endCol = colToNum(endMatch[1]);
        const endRow = parseInt(endMatch[2], 10);

        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                const cell = ws.getCell(r, c);
                if (cell && cell.isMerged) return false;
            }
        }
        ws.mergeCells(range);
        return true;
    } catch {
        return false;
    }
};

const resolveCellValue = (cell, cellInputs, computedByAddr) => {
    if (cell?.formula && cell.addr) return computedByAddr[cell.addr] ?? '';
    if (cell?.input && cell.addr) return cellInputs[cell.addr] ?? '';
    return cell?.value ?? '';
};

// chuẩn hoá text (bỏ dấu, lowercase) để dò label linh hoạt
const norm = (s) => String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim();

// xếp loại theo hệ số F
const classifyByRatio = (f) => {
    const x = Number(f) || 0;
    if (x < 0.5) return 'Không xếp loại';
    if (x < 0.7) return 'E';
    if (x < 0.8) return 'D';
    if (x < 0.9) return 'C';
    if (x < 0.95) return 'B';
    if (x < 1) return 'A';
    if (x < 1.1) return 'A+';
    return 'A++';
};

// tìm cột theo từ khoá, ưu tiên “điểm theo mức độ hoàn thành” rồi tới “điểm”
const findScoreColIdx = (columns) => {
    const labels = (columns || []).map(c => norm(c?.label));
    const colCount = labels.length;

    // 1) chính xác nhất
    let idx = labels.findIndex(l => l.includes('diem theo muc do hoan thanh'));
    if (idx !== -1) return idx;

    // 2) chứa cả “mức độ hoàn thành” và “điểm”
    idx = labels.findIndex(l => l.includes('muc do hoan thanh') && l.includes('diem'));
    if (idx !== -1) return idx;

    // 3) cột có chữ “điểm” (lấy cột PHẢI NHẤT vì thường ở gần cuối)
    const diemCols = labels
        .map((l, i) => ({i, l}))
        .filter(x => x.l.includes('diem'));
    if (diemCols.length) return diemCols[diemCols.length - 1].i;

    // 4) fallback: nếu có >=7 cột thì dùng G (index 6), else dùng cột cuối
    if (colCount >= 7) return 6;
    return Math.max(0, colCount - 1);
};

// tìm cột “Tiêu chí” (để đọc nhãn hàng)
const findCriteriaColIdx = (columns) => {
    const labels = (columns || []).map(c => norm(c?.label));
    const idx = labels.findIndex(l => l.includes('tieu chi'));
    return idx !== -1 ? idx : 1; // fallback B
};

export default async function exportFormExcel({
                                                  table, cellInputs, computedByAddr,
                                                  fileName = 'Phieu_tu_danh_gia.xlsx',
                                                  title = 'BẢNG TỰ ĐÁNH GIÁ MỨC ĐỘ HOÀN THÀNH CÔNG VIỆC',
                                                  employee_name = '',
                                                  role = '',
                                                  protectSheet = false,
                                                  protectPassword = '',
                                                  allowSelectUnlocked = true,
                                                  readOnly = false,
                                                  allowResizeForPrint = false,
                                                  injectRankRow = true,
                                                  rankRowRoman = 'VII',
                                                  rankRowLabel = 'Xếp loại lao động',
                                                  returnBuffer = false,
                                              }) {
    if (!table?.columns?.length || !table?.rows?.length) throw new Error('Thiếu dữ liệu bảng');

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Phiếu');

    // Trang in
    ws.pageSetup = {
        paperSize: 9, // A4
        orientation: 'portrait',
        horizontalCentered: true,
        margins: {left: 0.25, right: 0.25, top: 0.25, bottom: 0.25, header: 0.05, footer: 0.05},
        fitToHeight: 0,
        fitToWidth: 1,
    };

    // Set width cột chỉ định
    const colCount = table.columns.length;
    const colWidths = [];
    for (let c = 0; c < colCount; c++) {
        let w = 20; // mặc định
        const colLabel = String(table.columns[c]?.label || '').toLowerCase();
        if (colLabel.includes('stt')) w = 5;
        else if (colLabel.includes('tiêu chí')) w = 27;
        else if (colLabel.includes('trọng số') || colLabel.includes('điểm chuẩn') || colLabel.includes('kế hoạch')) w = 9;
        else if (colLabel.includes('thực hiện')) w = 11;
        else if (colLabel.includes('ghi chú')) w = 13;
        else if (colLabel.includes('điểm theo mức độ hoàn thành')) w = 19;
        colWidths.push({width: w});
    }
    ws.columns = colWidths;

    // ===== HEADER =====
    safeMergeCells(ws, 'A2:C2');
    ws.getCell('A2').value = 'NGÂN HÀNG NÔNG NGHIỆP';
    ws.getCell('A2').font = {name: 'Times New Roman', size: 11};
    ws.getCell('A2').alignment = {horizontal: 'center'};

    safeMergeCells(ws, 'A3:C3');
    ws.getCell('A3').value = 'VÀ PHÁT TRIỂN NÔNG THÔN VIỆT NAM';
    ws.getCell('A3').font = {name: 'Times New Roman', size: 11};
    ws.getCell('A3').alignment = {horizontal: 'center'};

    safeMergeCells(ws, 'A4:C4');
    ws.getCell('A4').value = 'CHI NHÁNH BẮC TPHCM';
    ws.getCell('A4').font = {name: 'Times New Roman', size: 11, bold: true, underline: true};
    ws.getCell('A4').alignment = {horizontal: 'center'};

    safeMergeCells(ws, 'F2:H2');
    ws.getCell('F2').value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
    ws.getCell('F2').alignment = {horizontal: 'center'};
    ws.getCell('F2').font = {name: 'Times New Roman', bold: true, size: 11};

    safeMergeCells(ws, 'F3:H3');
    ws.getCell('F3').value = 'Độc lập - Tự do - Hạnh phúc';
    ws.getCell('F3').alignment = {horizontal: 'center'};
    ws.getCell('F3').font = {name: 'Times New Roman', size: 11, bold: true, underline: true};

    ws.addRow([]);

    // ===== TIÊU ĐỀ =====
    safeMergeCells(ws, `A6:${toCol(colCount)}6`);
    ws.getCell('A6').value = title;
    ws.getCell('A6').font = {name: 'Times New Roman', size: 11, bold: true};
    ws.getCell('A6').alignment = {horizontal: 'center'};

    let quarter = 'I';
    const month = new Date().getMonth() + 1;
    if (month >= 4 && month <= 6) quarter = 'II';
    else if (month >= 7 && month <= 9) quarter = 'III';
    else if (month >= 10 && month <= 12) quarter = 'IV';

    safeMergeCells(ws, `A7:${toCol(colCount)}7`);
    ws.getCell('A7').value = `Quý ${quarter} Năm ${new Date().getFullYear()}`;
    ws.getCell('A7').font = {name: 'Times New Roman', size: 11, bold: true};
    ws.getCell('A7').alignment = {horizontal: 'center'};

    safeMergeCells(ws, `A8:${toCol(colCount)}8`);
    ws.getCell('A8').value = `Họ và tên: ${employee_name || '.............................................'}`;
    ws.getCell('A8').font = {name: 'Times New Roman', size: 11};
    ws.getCell('A8').alignment = {horizontal: 'left'};

    safeMergeCells(ws, `A9:${toCol(colCount)}9`);
    ws.getCell('A9').value = `Chức vụ: ${role || '...................................................'}`;
    ws.getCell('A9').font = {name: 'Times New Roman', size: 11};
    ws.getCell('A9').alignment = {horizontal: 'left'};

    ws.addRow([]);

    // ===== BẢNG =====
    let startRow = 11;

    // Header cột
    for (let c = 1; c <= colCount; c++) {
        const cell = ws.getCell(startRow, c);
        cell.value = table.columns[c - 1]?.label ?? '';
        cell.font = {name: 'Times New Roman', size: 11, bold: true};
        cell.alignment = {horizontal: 'center', vertical: 'middle', wrapText: true};
        cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FFF2F2F2'}};
    }
    setAllBorders(ws, startRow, 1, 1, colCount);

    // === Chuẩn bị vị trí cột/nhãn để tính xếp loại ===
    const scoreColIdx0 = findScoreColIdx(table.columns); // 0-based index “điểm…”
    const scoreCol1 = scoreColIdx0 + 1;                  // 1-based cho exceljs
    const criteriaColIdx0 = findCriteriaColIdx(table.columns);

    // Tìm hàng “Hệ số hoàn thành công việc”
    let rowIdxHeSo = -1;
    (table.rows || []).forEach((r, i) => {
        const label = norm(r?.cells?.[criteriaColIdx0]?.value);
        if (rowIdxHeSo === -1 &&
            (/he so hoan thanh cong viec/.test(label) || /he so hoan thanh/.test(label))) {
            rowIdxHeSo = i;
        }
    });

    // Tính chuỗi xếp loại từ hệ số
    let rankText = '';
    if (rowIdxHeSo >= 0) {
        const ratioCell = table.rows[rowIdxHeSo]?.cells?.[scoreColIdx0];
        const ratio = resolveCellValue(ratioCell, cellInputs, computedByAddr);
        rankText = classifyByRatio(ratio);
    }

    // Dữ liệu
    let excelRow = startRow + 1;
    for (const row of table.rows) {
        let excelCol = 1;

        let colIdx0 = 0;
        for (const cell of (row.cells || [])) {
            if (!cell) { colIdx0++; continue; }

            const colSpan = Math.max(1, cell.colSpan || 1);
            const rowSpan = Math.max(1, cell.rowSpan || 1);

            // nếu là ô bị phủ bởi merge: chỉ nhảy qua cột
            if (cell.hidden) {
                excelCol += colSpan;
                colIdx0++;
                continue;
            }

            const tl = `${toCol(excelCol)}${excelRow}`;
            const br = `${toCol(excelCol + colSpan - 1)}${excelRow + rowSpan - 1}`;
            if (colSpan > 1 || rowSpan > 1) safeMergeCells(ws, `${tl}:${br}`);

            const xcell = ws.getCell(excelRow, excelCol);
            let v = resolveCellValue(cell, cellInputs, computedByAddr);

            // Heuristic to decide if this cell should be displayed as percentage
            const headerText = String(table?.columns?.[colIdx0]?.label || '').toLowerCase();
            const headerIndicatesPercent = /%|tỷ lệ|ty le|percent/.test(headerText);
            const strHasPercent = typeof v === 'string' && /%\s*$/.test(v.trim());
            const wantPercent = !!(cell?.percent || (cell?.numFmt && String(cell.numFmt).includes('%')) || strHasPercent || headerIndicatesPercent);

            if (wantPercent) {
                if (typeof v === 'string') {
                    const m = v.trim().match(/^(-?\d+(?:\.\d+)?)\s*%$/);
                    if (m) {
                        v = parseFloat(m[1]) / 100;
                    } else {
                        const n = Number(v);
                        if (!isNaN(n)) {
                            // If user typed 80 meaning 80%
                            v = n > 1 && n <= 100 ? n / 100 : n;
                        }
                    }
                } else if (typeof v === 'number') {
                    // If number looks like 80 (meaning 80%), convert to 0.8
                    if (v > 1 && v <= 100) v = v / 100;
                }
            }

            xcell.value = v;
            // Apply number format if provided (e.g., percentage)
            if (cell?.numFmt) {
                xcell.numFmt = cell.numFmt;
            } else if (wantPercent) {
                xcell.numFmt = '0%';
            }
            xcell.font = {name: 'Times New Roman', size: 11};

            colIdx0++;
            xcell.alignment = {
                horizontal: (colSpan > 1 || rowSpan > 1) ? 'center' : 'left',
                vertical: 'middle',
                wrapText: true
            };

            // căn giữa cho số
            if (typeof xcell.value === 'number' || String(xcell.value).match(/^\d+(\.\d+)?$/)) {
                xcell.alignment.horizontal = 'center';
            }

            // bảo vệ cell
            if (readOnly) {
                xcell.protection = {locked: true, hidden: !!cell?.formula};
            } else {
                xcell.protection = cell?.input
                    ? {locked: false, hidden: false}
                    : {locked: true, hidden: !!cell?.formula};
            }

            // canh giữa riêng cho cột STT
            if (excelCol === 1) xcell.alignment = {horizontal: 'center', vertical: 'middle', wrapText: true};

            // viền quanh vùng merge
            setAllBorders(ws, excelRow, excelCol, rowSpan, colSpan);

            excelCol += colSpan;
        }
        excelRow += 1;
    }

    const tableEndRow = excelRow - 1;

    // === HÀNG XẾP LOẠI (tự chèn & merge) ===
    if (injectRankRow) {
        const r = excelRow;

        // cột STT (A) = 'VII'
        const romanCell = ws.getCell(r, 1);
        romanCell.value = rankRowRoman;
        romanCell.font = {name: 'Times New Roman', bold: true, size: 11};
        romanCell.alignment = {horizontal: 'center', vertical: 'middle'};
        romanCell.protection = {locked: true, hidden: false};

        const c = ws.getCell(r, 2);
        c.value = rankRowLabel;
        c.font = {name: 'Times New Roman', bold: true, size: 11};
        c.alignment = {horizontal: 'left', vertical: 'middle', wrapText: true};
        c.protection = {locked: true, hidden: false};

        // merge từ cột điểm đến hết hàng cho chuỗi xếp loại
        const rightStart = 3;      // ✅ dùng cột điểm đã dò
        const rightEnd = colCount;
        safeMergeCells(ws, `${toCol(rightStart)}${r}:${toCol(rightEnd)}${r}`);
        const rc = ws.getCell(r, rightStart);
        rc.value = rankText || '';
        rc.font = {name: 'Times New Roman', bold: true, size: 11};
        rc.alignment = {horizontal: 'center', vertical: 'middle', wrapText: true};
        rc.protection = {locked: true, hidden: false};

        // viền cả hàng xếp loại
        setAllBorders(ws, r, 1, 1, colCount);

        excelRow = r + 1;
    }

    // ===== FOOTER =====
    const blank1 = ws.addRow([]).number;
    const dateRow = blank1 + 1;
    const today = new Date();
    const d = today.getDate().toString().padStart(2, '0');
    const m = (today.getMonth() + 1).toString().padStart(2, '0');
    const y = today.getFullYear();

    const dateLeftCol = Math.max(1, colCount - 2);
    safeMergeCells(ws, `${toCol(dateLeftCol)}${dateRow}:${toCol(colCount)}${dateRow}`);
    const dateCell = ws.getCell(dateRow, dateLeftCol);
    dateCell.value = `Tp. Hồ Chí Minh, ngày ${d} tháng ${m} năm ${y}`;
    dateCell.font = {name: 'Times New Roman', size: 11, italic: true};
    dateCell.alignment = {horizontal: 'right'};

    const khCell = ws.getCell(`B${dateRow + 1}`);
    khCell.value = 'Phòng KH&QLRR';
    khCell.font = {name: 'Times New Roman', size: 11, bold: true};
    khCell.alignment = {horizontal: 'center'};

    const noteKH = ws.getCell(`B${dateRow + 2}`);
    noteKH.value = '(Rà soát số liệu)';
    noteKH.font = {name: 'Times New Roman', size: 11, italic: true};
    noteKH.alignment = {horizontal: 'center'};

    safeMergeCells(ws, `${toCol(dateLeftCol)}${dateRow + 1}:${toCol(colCount)}${dateRow + 1}`);
    const empCell = ws.getCell(`${toCol(colCount - 1)}${dateRow + 1}`);
    empCell.value = 'NGƯỜI TỰ CHẤM ĐIỂM';
    empCell.font = {name: 'Times New Roman', size: 11, bold: true};
    empCell.alignment = {horizontal: 'center'};

    // Protect sheet (tùy chọn)
    if (protectSheet) {
        const baseOpts = {
            formatCells: false,
            insertRows: false,
            insertColumns: false,
            insertHyperlinks: false,
            deleteRows: false,
            deleteColumns: false,
            sort: false,
            autoFilter: false,
            pivotTables: false,
        };
        const resizeOpts = readOnly && allowResizeForPrint
            ? {
                selectLockedCells: true,
                selectUnlockedCells: false,
                formatColumns: true,
                formatRows: true,
            }
            : {
                selectLockedCells: false,
                selectUnlockedCells: false,
                formatColumns: false,
                formatRows: false,
            };
        await ws.protect(protectPassword || undefined, {...baseOpts, ...resizeOpts});
    }

    // Lưu file
    const buffer = await wb.xlsx.writeBuffer();
    if (returnBuffer) {
        return buffer;
    }
    saveAs(new Blob([buffer], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), fileName);
}
