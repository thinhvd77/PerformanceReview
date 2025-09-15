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

const resolveCellValue = (cell, cellInputs, computedByAddr) => {
    if (cell?.formula && cell.addr) return computedByAddr[cell.addr] ?? '';
    if (cell?.input && cell.addr) return cellInputs[cell.addr] ?? '';
    return cell?.value ?? '';
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
                                              }) {
    if (!table?.columns?.length || !table?.rows?.length) throw new Error('Thiếu dữ liệu bảng');

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Phiếu');

    // Trang in & font mặc định
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

    // ===== HEADER: Quốc hiệu – Tiêu ngữ =====
    ws.mergeCells('A2', 'C2');
    ws.getCell('A2').value = 'NGÂN HÀNG NÔNG NGHIỆP';
    ws.getCell('A2').font = {name: 'Times New Roman', size: 11, bold: false, italic: false};
    ws.getCell('A2').alignment = {horizontal: 'center'};

    ws.mergeCells('A3', 'C3');
    ws.getCell('A3').value = 'VÀ PHÁT TRIỂN NÔNG THÔN VIỆT NAM';
    ws.getCell('A3').font = {name: 'Times New Roman', size: 11, bold: false, italic: false};
    ws.getCell('A3').alignment = {horizontal: 'center'};

    ws.mergeCells('A4', 'C4');
    ws.getCell('A4').value = 'CHI NHÁNH BẮC TPHCM';
    ws.getCell('A4').font = {name: 'Times New Roman', size: 11, bold: true, italic: false, underline: true};
    ws.getCell('A4').alignment = {horizontal: 'center'};

    ws.mergeCells('F2', 'H2');
    ws.getCell('F2').value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
    ws.getCell('F2').alignment = {horizontal: 'center'};
    ws.getCell('F2').font = {name: 'Times New Roman', bold: true, size: 11};

    ws.mergeCells('F3', 'H3');
    ws.getCell('F3').value = 'Độc lập - Tự do - Hạnh phúc';
    ws.getCell('F3').alignment = {horizontal: 'center'};
    ws.getCell('F3').font = {name: 'Times New Roman', italic: false, size: 11, bold: true, underline: true};

    // Dòng trống
    ws.addRow([]);

    // ===== TIÊU ĐỀ PHIẾU =====
    ws.mergeCells('A6', 'H6');
    ws.getCell('A6').value = title;
    ws.getCell('A6').font = {name: 'Times New Roman', size: 11, bold: true};
    ws.getCell('A6').alignment = {horizontal: 'center'};

    // Quý
    let quarter = 'I';
    const month = new Date().getMonth() + 1;
    if (month >= 4 && month <= 6) quarter = 'II';
    else if (month >= 7 && month <= 9) quarter = 'III';
    else if (month >= 10 && month <= 12) quarter = 'IV';

    ws.mergeCells('A7', 'H7');
    ws.getCell('A7').value = `Quý ${quarter} Năm ${new Date().getFullYear()}`;
    ws.getCell('A7').font = {name: 'Times New Roman', size: 11, bold: true};
    ws.getCell('A7').alignment = {horizontal: 'center'};

    // Tên nhân viên
    ws.mergeCells('A8', 'H8');
    ws.getCell('A8').value = `Họ và tên: ${employee_name || '.............................................'}`;
    ws.getCell('A8').font = {name: 'Times New Roman', size: 11, bold: false};
    ws.getCell('A8').alignment = {horizontal: 'left'};

    // Chức vụ
    ws.mergeCells('A9', 'H9');
    ws.getCell('A9').value = `Chức vụ: ${role || '...................................................'}`;
    ws.getCell('A9').font = {name: 'Times New Roman', size: 11, bold: false};
    ws.getCell('A9').alignment = {horizontal: 'left'};

    // Một dòng trống rồi tới bảng
    ws.addRow([]);

    // ===== BẢNG FORM (ở giữa trang, có khung) =====
    let startRow = 11;

    // Hàng tiêu đề cột
    // ws.getRow(startRow).height = 22;
    for (let c = 1; c <= colCount; c++) {
        const cell = ws.getCell(startRow, c);
        cell.value = table.columns[c - 1]?.label ?? '';
        cell.font = {name: 'Times New Roman', size: 11, bold: true};
        cell.alignment = {horizontal: 'center', vertical: 'middle', wrapText: true};
        cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FFF2F2F2'}};
    }
    setAllBorders(ws, startRow, 1, 1, colCount);

    // Dòng dữ liệu
    let excelRow = startRow + 1;
    for (const row of table.rows) {
        let excelCol = 1;
        // ws.getRow(excelRow).height = 20;

        for (const cell of (row.cells || [])) {
            if (!cell || cell.hidden) continue;

            const colSpan = Math.max(1, cell.colSpan || 1);
            const rowSpan = Math.max(1, cell.rowSpan || 1);
            const tl = `${toCol(excelCol)}${excelRow}`;
            const br = `${toCol(excelCol + colSpan - 1)}${excelRow + rowSpan - 1}`;
            if (colSpan > 1 || rowSpan > 1) ws.mergeCells(`${tl}:${br}`);

            const xcell = ws.getCell(excelRow, excelCol);
            xcell.value = resolveCellValue(cell, cellInputs, computedByAddr);
            xcell.font = {name: 'Times New Roman', size: 11};
            xcell.alignment = {horizontal: 'left', vertical: 'middle', wrapText: true};

            // căn giữa cho cell chứa số
            if (typeof xcell.value === 'number' || String(xcell.value).match(/^\d+(\.\d+)?$/)) {
                xcell.alignment.horizontal = 'center';
            }

            // Mới: nếu readOnly => khóa tất cả; ngược lại giữ hành vi cũ
            if (readOnly) {
                xcell.protection = {locked: true, hidden: !!cell?.formula}; // ẩn công thức nếu có
            } else {
                xcell.protection = cell?.input
                    ? {locked: false, hidden: false}
                    : {locked: true, hidden: !!cell?.formula};
            }

            // canh giữa riêng cho cột STT nếu có
            if (excelCol === 1) xcell.alignment = {horizontal: 'center', vertical: 'middle', wrapText: true};

            // viền quanh vùng merge
            setAllBorders(ws, excelRow, excelCol, rowSpan, colSpan);

            excelCol += colSpan;
        }
        excelRow += 1;
    }

    const tableEndRow = excelRow - 1;

    // ===== FOOTER: Ngày tháng & Chữ ký =====
    const blank1 = ws.addRow([]).number;
    const dateRow = blank1 + 1;
    const today = new Date();
    const d = today.getDate().toString().padStart(2, '0');
    const m = (today.getMonth() + 1).toString().padStart(2, '0');
    const y = today.getFullYear();

    // "…, ngày … tháng … năm …" căn phải 3 cột cuối
    const dateLeftCol = Math.max(1, colCount - 2);
    ws.mergeCells(`${toCol(dateLeftCol)}${dateRow}:${toCol(colCount)}${dateRow}`);
    const dateCell = ws.getCell(dateRow, dateLeftCol);
    dateCell.value = `Tp. Hồ Chí Minh, ngày ${d} tháng ${m} năm ${y}`;
    dateCell.font = {name: 'Times New Roman', size: 11, italic: true};
    dateCell.alignment = {horizontal: 'right'};

    // Chữ ký phòng KH&QLRR
    const khCell = ws.getCell(`B${dateRow + 1}`);
    khCell.value = 'Phòng KH&QLRR';
    khCell.font = {name: 'Times New Roman', size: 11, bold: true};
    khCell.alignment = {horizontal: 'center'};

    // Sign note KH&QLRR
    const noteKH = ws.getCell(`B${dateRow + 2}`);
    noteKH.value = '(Rà soát số liệu)';
    noteKH.font = {name: 'Times New Roman', size: 11, italic: true};
    noteKH.alignment = {horizontal: 'center'};

    // Chữ ký nhân viên
    const empCell = ws.getCell(`${toCol(colCount - 1)}${dateRow + 1}`);
    ws.mergeCells(`${toCol(dateLeftCol)}${dateRow + 1}:${toCol(colCount)}${dateRow + 1}`);
    empCell.value = 'NGƯỜI TỰ CHẤM ĐIỂM';
    empCell.font = {name: 'Times New Roman', size: 11, bold: true};
    empCell.alignment = {horizontal: 'center'};

    if (protectSheet) {
        const baseOpts = {
            // chặn mọi thao tác sửa nội dung/định dạng ô
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
                // cho phép chọn để kéo giãn cột/hàng
                selectLockedCells: true,
                selectUnlockedCells: false,
                formatColumns: true,  // ✅ cho đổi độ rộng cột
                formatRows: true,     // ✅ cho đổi chiều cao hàng
            }
            : {
                // chế độ chỉ đọc "cứng": không chọn được ô nào
                selectLockedCells: false,
                selectUnlockedCells: false,
                formatColumns: false,
                formatRows: false,
            };
        await ws.protect(protectPassword || undefined, {...baseOpts, ...resizeOpts});
    }

    // Lưu file
    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), fileName);
}
