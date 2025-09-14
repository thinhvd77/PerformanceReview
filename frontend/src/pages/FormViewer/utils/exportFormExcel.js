
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const toCol = (n) => {
    let s = '';
    while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
    return s;
};

const setAllBorders = (ws, r, c, rs = 1, cs = 1) => {
    for (let i = 0; i < rs; i++) {
        for (let j = 0; j < cs; j++) {
            ws.getCell(r + i, c + j).border = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin' }, right: { style: 'thin' }
            };
        }
    }
};

const resolveCellValue = (cell, cellInputs, computedByAddr) => {
    if (cell?.formula && cell.addr) return computedByAddr[cell.addr] ?? '';
    if (cell?.input && cell.addr)   return cellInputs[cell.addr] ?? '';
    return cell?.value ?? '';
};

export default async function exportFormExcel({
                                                  table, cellInputs, computedByAddr,
                                                  fileName = 'Phieu_tu_danh_gia.xlsx',
                                                  title = 'BẢNG TỰ ĐÁNH GIÁ MỨC ĐỘ HOÀN THÀNH CÔNG VIỆC'
                                              }) {
    if (!table?.columns?.length || !table?.rows?.length) throw new Error('Thiếu dữ liệu bảng');

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Phiếu');

    // Trang in & font mặc định
    // auto fix row height

    ws.pageSetup = {
        paperSize: 9, // A4
        orientation: 'portrait',
        horizontalCentered: true,
        margins: { left: 0.25, right: 0.25, top: 0.25, bottom: 0.25, header: 0.05, footer: 0.05 }
    };

    // Set width cột tương đối
    const colCount = table.columns.length;
    ws.columns = Array.from({ length: colCount }, (_, i) => ({
        header: null,
        key: `c${i + 1}`,
        width: 16
    }));

    // ===== HEADER: Quốc hiệu – Tiêu ngữ =====
    // const fullRange = `A1:${toCol(colCount)}1`;
    ws.mergeCells('A2', 'B2');
    ws.getCell('A2').value = 'NGÂN HÀNG NÔNG NGHIỆP';
    ws.getCell('A2').font = { name: 'Times New Roman', size: 11, bold: false, italic: false };
    ws.getCell('A2').alignment = { horizontal: 'center' };

    ws.mergeCells('A3', 'B3');
    ws.getCell('A3').value = 'VÀ PHÁT TRIỂN NÔNG THÔN VIỆT NAM';
    ws.getCell('A3').font = { name: 'Times New Roman', size: 11, bold: false, italic: false };
    ws.getCell('A3').alignment = { horizontal: 'center' };

    ws.mergeCells('A4', 'B4');
    ws.getCell('A4').value = 'CHI NHÁNH BẮC TPHCM';
    ws.getCell('A4').font = { name: 'Times New Roman', size: 11, bold: true, italic: false, underline:true };
    ws.getCell('A4').alignment = { horizontal: 'center' };

    ws.mergeCells('C2', 'G2');
    ws.getCell('C2').value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
    ws.getCell('C2').alignment = { horizontal: 'center' };
    ws.getCell('C2').font = { name: 'Times New Roman', bold: true, size: 11 };

    ws.mergeCells('C3', 'G3');
    ws.getCell('C3').value = 'Độc lập - Tự do - Hạnh phúc';
    ws.getCell('C3').alignment = { horizontal: 'center' };
    ws.getCell('C3').font = { name: 'Times New Roman', italic: false, size: 11, bold:true, underline:true };

    // Dòng trống
    ws.addRow([]);

    // ===== TIÊU ĐỀ PHIẾU =====
    ws.mergeCells('A6', 'G6');
    ws.getCell('A6').value = title;
    ws.getCell('A6').font = { name: 'Times New Roman', size: 11, bold: true };
    ws.getCell('A6').alignment = { horizontal: 'center' };

    // Một dòng trống rồi tới bảng
    ws.addRow([]);

    // ===== BẢNG FORM (ở giữa trang, có khung) =====
    let startRow = 11;

    // Hàng tiêu đề cột
    // ws.getRow(startRow).height = 22;
    for (let c = 1; c <= colCount; c++) {
        const cell = ws.getCell(startRow, c);
        cell.value = table.columns[c - 1]?.label ?? '';
        cell.font = { name: 'Times New Roman', size: 12, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
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
            xcell.font = { name: 'Times New Roman', size: 12 };
            xcell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

            // canh giữa riêng cho cột STT nếu có
            if (excelCol === 1) xcell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

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
    dateCell.value = `…, ngày ${d} tháng ${m} năm ${y}`;
    dateCell.font = { name: 'Times New Roman', size: 12, italic: true };
    dateCell.alignment = { horizontal: 'right' };

    // 3 khối chữ ký ngang hàng
    const signTitles = ['NGƯỜI LẬP', 'TRƯỞNG BỘ PHẬN', 'GIÁM ĐỐC'];
    const signNote = '(Ký, ghi rõ họ tên)';
    const seg = Math.floor(colCount / 3) || 1;

    const rTitle = dateRow + 1;
    const rNote  = rTitle + 1;
    const rSpace = rNote + 4; // chừa chỗ ký

    for (let i = 0; i < 3; i++) {
        const c1 = i === 0 ? 1 : i * seg + 1;
        const c2 = i === 2 ? colCount : (i + 1) * seg;
        ws.mergeCells(`${toCol(c1)}${rTitle}:${toCol(c2)}${rTitle}`);
        ws.mergeCells(`${toCol(c1)}${rNote}:${toCol(c2)}${rNote}`);
        ws.mergeCells(`${toCol(c1)}${rSpace}:${toCol(c2)}${rSpace}`);

        const titleCell = ws.getCell(rTitle, c1);
        titleCell.value = signTitles[i];
        titleCell.font = { name: 'Times New Roman', size: 12, bold: true };
        titleCell.alignment = { horizontal: 'center' };

        const noteCell = ws.getCell(rNote, c1);
        noteCell.value = signNote;
        noteCell.font = { name: 'Times New Roman', size: 11, italic: true };
        noteCell.alignment = { horizontal: 'center' };
    }

    // Lưu file
    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);
}
