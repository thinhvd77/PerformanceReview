// SchemaTable.jsx
import React, { useState } from 'react';
import { Input, Divider, Select } from 'antd';
import { EditOutlined } from '@ant-design/icons';

// Presentational component to render schema.table with support for
// rowSpan/colSpan, input cells, and computed formula values.
// Props:
// - table: schema.table
// - cellInputs: { [addr]: string }
// - computedByAddr: { [addr]: number|string }
// - onCellChange: (addr, value) => void
// - sectionOptions?: { II?: {label:string,value:string}[], III?:..., IV?:..., V?:... }
// - onSectionChoose?: (rowIndex:number, roman:'II'|'III'|'IV'|'V', label:string) => void
// - selectValueByRow?: { [rowIndex:number]: string }
// - scoreColIdx?: number
// - childAddrToParentRow?: { [childScoreAddr:string]: number }
// - onRemoveChild?: (rowIndex:number, childScoreAddr:string) => void

export default function SchemaTable({
                                        table,
                                        cellInputs,
                                        computedByAddr,
                                        onCellChange,
                                        sectionOptions = {},
                                        onSectionChoose,
                                        selectValueByRow = {},
                                        scoreColIdx,
                                        childAddrToParentRow = {},
                                        onRemoveChild,
                                        readOnly = false,
                                    }) {
    if (!table || !table.columns || table.columns.length === 0 || !table.rows || table.rows.length === 0) {
        return null;
    }
    const borderStyle = '1px solid #d9d9d9';

    // ====== Local edit buffer (không ép định dạng khi đang gõ) ======
    const [editBuf, setEditBuf] = useState({}); // { [addr]: string }
    const setBuf = (addr, s) => setEditBuf(prev => ({ ...prev, [addr]: s }));
    const clearBuf = (addr) => setEditBuf(prev => {
        const { [addr]: _, ...rest } = prev;
        return rest;
    });

    const isRoman = (s) => /^(II|III|IV|V)$/.test(String(s || '').trim());

    // Normalize Vietnamese text (remove diacritics, lowercase)
    const norm = (s) => String(s || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    // Heuristic: numeric columns (scores/weights/plans/actual/ratios)
    const isNumericColumn = (label) => {
        const l = norm(label);
        return (
            l.includes('diem') ||
            l.includes('trong so') ||
            l.includes('ke hoach') ||
            l.includes('thuc hien') ||
            l.includes('he so') ||
            l.includes('ty le') ||
            l.includes('ti le')
        );
    };

    // ===== Helpers: số/percent =====
    const toNumberAnyLocale = (v) => {
        if (typeof v === 'number' && isFinite(v)) return v;
        if (v === null || v === undefined) return null;
        let s = String(v).trim();
        if (!s) return null;
        s = s.replace(/%/g, '');
        if (s.includes(',') && !s.includes('.')) {
            s = s.replace(/\./g, '').replace(',', '.'); // VN
        } else {
            s = s.replace(/,/g, ''); // EN
        }
        const n = Number(s);
        return isFinite(n) ? n : null;
    };

    const formatNumberVN = (num) => {
        if (num === null || num === undefined || Number.isNaN(num)) return '';
        const sign = num < 0 ? '-' : '';
        const abs = Math.abs(num);
        const rounded = Math.round(abs * 1e6) / 1e6;
        const parts = String(rounded).split('.');
        const intStr = parts[0];
        const decRaw = parts[1] || '';
        const intWithSep = intStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        const dec = decRaw.replace(/0+$/, '');
        return sign + intWithSep + (dec ? ',' + dec : '');
    };

    const formatPercentVN = (ratioNum) => {
        if (ratioNum === null || ratioNum === undefined || Number.isNaN(ratioNum)) return '';
        const asPercent = Number(ratioNum) * 100;
        const rounded = Math.round(asPercent * 100) / 100;
        const s = formatNumberVN(rounded);
        return s === '' ? '' : `${s}%`;
    };

    // ====== Percent input: "nhập sao hiện vậy" ======
    // Chuẩn hoá hiển thị: luôn 1 dấu % ở cuối (nếu non-empty), giữ nguyên dấu phẩy/chấm người dùng gõ
    const normalizePercentDisplay = (raw) => {
        if (raw == null) return '';
        let s = String(raw);
        // bỏ khoảng trắng, bỏ mọi %, giữ số + . + ,
        s = s.replace(/\s+/g, '').replace(/%/g, '').replace(/[^\d.,]/g, '');
        // nếu rỗng -> rỗng
        if (!s) return '';
        return s + '%';
    };

    // Parse ra ratio từ chuỗi hiển thị kiểu "5%" hoặc "0,5%"
    const percentDisplayToRatio = (display) => {
        if (!display) return '';
        let s = String(display).replace(/\s+/g, '').replace(/%/g, '');
        if (!s) return '';
        // xác định dấu thập phân: nếu có ',' mà không có '.' -> ',' là decimal; ngược lại '.' là decimal
        if (s.includes(',') && !s.includes('.')) {
            s = s.replace(/\./g, '').replace(',', '.'); // VN
        } else {
            s = s.replace(/,/g, ''); // EN
        }
        // giữ tối đa 1 dấu '.'
        const parts = s.split('.');
        const numStr = parts.length > 1 ? (parts[0] + '.' + parts.slice(1).join('')) : parts[0];
        if (!numStr || numStr === '.') return '';
        const n = Number(numStr);
        if (!isFinite(n)) return '';
        return String(n / 100); // % -> ratio
    };

    // NUMBER input (soft & commit)
    const parseUserNumberSoft = (raw) => {
        if (raw == null) return '';
        const original = String(raw);
        let s = original.trim();
        if (!s) return '';
        if (s.includes(',') && !s.includes('.')) {
            s = s.replace(/\./g, '').replace(',', '.');
        } else {
            s = s.replace(/,/g, '');
        }
        if (/^\d+[.,]$/.test(original)) return original; // đang gõ
        const keep = s.replace(/[^0-9.]/g, '');
        if (!keep || keep === '.') return '';
        const n = Number(keep);
        if (!isFinite(n)) return '';
        if (n < 0) return '0';
        return String(n);
    };

    const commitNumber = (raw) => {
        if (raw == null) return '';
        let s = String(raw).trim();
        if (!s) return '';
        if (/^\d+[.,]$/.test(s)) s = s.replace(/[.,]+$/, '');
        const soft = parseUserNumberSoft(s);
        return soft;
    };

    // Nhận diện ô dạng %: ưu tiên cell.percent, cell.numFmt, sau đó value có '%'
    const isPercentCell = (cell, rawVal) => {
        if (cell?.percent === true) return true;
        const fmt = cell?.numFmt;
        if (typeof fmt === 'string' && fmt.includes('%')) return true;
        if (typeof fmt === 'number' && (fmt === 9 || fmt === 10)) return true; // một số builtin
        const s = String(rawVal ?? '');
        return s.includes('%');
    };

    return (
        <>
            <div style={{ overflowX: 'auto', marginBottom: 24 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                    <tr>
                        {table.columns.map((col, idx) => {
                            if (!col || col.hidden) return null;
                            const props = {};
                            if (col.rowSpan && col.rowSpan > 1) props.rowSpan = col.rowSpan;
                            if (col.colSpan && col.colSpan > 1) props.colSpan = col.colSpan;
                            return (
                                <th
                                    key={`h-${idx}`}
                                    {...props}
                                    style={{
                                        border: borderStyle,
                                        padding: '8px',
                                        background: '#fafafa',
                                        fontWeight: 600,
                                        textAlign: (idx === 1 ? 'left' : 'center')
                                    }}
                                >
                                    {col.label}
                                </th>
                            );
                        })}
                    </tr>
                    </thead>
                    <tbody>
                    {table.rows.map((row, rIdx) => {
                        const roman = row?.cells?.[0]?.value; // cột STT (A)
                        const isRomanRow = isRoman(roman);
                        // Dòng con: có ô điểm (cột score) là input và addr thuộc map childAddrToParentRow
                        const scoreCell = (row?.cells || [])[scoreColIdx];
                        const childScoreAddr = (scoreCell && scoreCell.input && scoreCell.addr) ? scoreCell.addr : null;
                        const isChildRow = !!(childScoreAddr && (childAddrToParentRow[childScoreAddr] !== undefined));
                        return (
                            <tr key={`r-${rIdx}`}>
                                {(row.cells || []).map((cell, cIdx) => {
                                    if (!cell || cell.hidden) return null;
                                    const props = {};
                                    if (cell.rowSpan && cell.rowSpan > 1) props.rowSpan = cell.rowSpan;
                                    if (cell.colSpan && cell.colSpan > 1) props.colSpan = cell.colSpan;

                                    const addr = cell.addr;
                                    const computedVal = addr ? computedByAddr[addr] : undefined;
                                    const rawVal = (cell.formula && addr) ? computedVal : (cell.value ?? '');

                                    // nhận diện phần trăm
                                    const percentCell = isPercentCell(cell, rawVal);

                                    // chuẩn bị display string cho ô KHÔNG nhập
                                    const displayVal = (() => {
                                        if (rawVal === null || rawVal === undefined || rawVal === '') return '';
                                        if (percentCell) {
                                            if (typeof rawVal === 'number') return formatPercentVN(rawVal);
                                            const n = toNumberAnyLocale(rawVal);
                                            if (n !== null && !Number.isNaN(n)) return formatPercentVN(n);
                                            return String(rawVal).trim();
                                        }
                                        const n = toNumberAnyLocale(rawVal);
                                        if (n !== null && !Number.isNaN(n)) return formatNumberVN(n);
                                        return String(rawVal).trim();
                                    })();

                                    const isCriteriaColumn = cIdx === 1; // cột "Tiêu chí" là cột thứ 2 (B)
                                    const options = (sectionOptions[String(roman)?.trim()] || []);

                                    // Nếu là dòng II/III/IV/V và đang ở cột "Tiêu chí" => Select (trừ khi readOnly)
                                    if (!readOnly && isRomanRow && isCriteriaColumn) {
                                        const fallbackValue = options?.[0]?.value;
                                        const romanKey = String(roman).trim();
                                        const currentValue = selectValueByRow[romanKey] ?? fallbackValue;
                                        return (
                                            <td key={`c-${rIdx}-${cIdx}`} {...props}
                                                style={{ border: borderStyle, padding: '6px 8px', verticalAlign: 'top', textAlign: 'left' }}>
                                                <Select
                                                    size="small"
                                                    placeholder="Chọn tiêu chí…"
                                                    style={{ width: '100%', cursor: 'pointer' }}
                                                    options={options}
                                                    onSelect={(value, option) => {
                                                        const label = option?.label ?? value;
                                                        onSectionChoose && onSectionChoose(rIdx, romanKey, String(label));
                                                    }}
                                                    value={currentValue}
                                                    filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                                />
                                            </td>
                                        );
                                    }

                                    const numericCol = isNumericColumn(table?.columns?.[cIdx]?.label);
                                    const buf = addr ? editBuf[addr] : undefined;

                                    return (
                                        <td key={`c-${rIdx}-${cIdx}`} {...props}
                                            style={{ border: borderStyle, padding: '6px 8px', verticalAlign: 'top', textAlign: (cIdx === 1 ? 'left' : 'center') }}>
                                            {cell.input && !readOnly ? (
                                                // Ô nhập
                                                percentCell ? (
                                                    <Input
                                                        size="small"
                                                        inputMode="decimal"
                                                        value={
                                                            buf !== undefined
                                                                ? buf
                                                                : (addr
                                                                    ? ((cellInputs[addr] ?? '') === ''
                                                                        ? ''
                                                                        // Hiển thị DƯỚI DẠNG % từ ratio đã lưu (vd 0.05 -> "5%")
                                                                        : formatPercentVN(Number(cellInputs[addr])))
                                                                    : '')
                                                        }
                                                        onFocus={() => {
                                                            if (!addr) return;
                                                            if (editBuf[addr] !== undefined) return;
                                                            const base = (cellInputs[addr] ?? '');
                                                            if (base === '') setBuf(addr, '');
                                                            else setBuf(addr, formatPercentVN(Number(base))); // đưa "5%" vào buffer
                                                        }}
                                                        onKeyDown={(e) => {
                                                            // cho phép phẩy/chấm; chặn số âm
                                                            if (e.key === '-' || e.key === 'Minus') e.preventDefault();
                                                        }}
                                                        onChange={(e) => {
                                                            if (!addr) return;
                                                            // Chuẩn hoá hiển thị: thêm % ở cuối, giữ nguyên dấu người dùng gõ
                                                            const shown = normalizePercentDisplay(e.target.value);
                                                            setBuf(addr, shown);
                                                            // Parse ra ratio để tính toán (nếu có số hợp lệ)
                                                            const ratioStr = percentDisplayToRatio(shown);
                                                            if (onCellChange) onCellChange(addr, ratioStr);
                                                        }}
                                                        onBlur={() => {
                                                            if (!addr) return;
                                                            const shown = normalizePercentDisplay(editBuf[addr] ?? '');
                                                            const ratioStr = percentDisplayToRatio(shown);
                                                            if (onCellChange) onCellChange(addr, ratioStr);
                                                            // giữ lại buffer để "nhập sao → hiện vậy"
                                                            setBuf(addr, shown);
                                                        }}
                                                        onPressEnter={(e) => {
                                                            if (!addr) return;
                                                            const shown = normalizePercentDisplay(editBuf[addr] ?? '');
                                                            const ratioStr = percentDisplayToRatio(shown);
                                                            if (onCellChange) onCellChange(addr, ratioStr);
                                                            setBuf(addr, shown);
                                                            if (e && e.currentTarget) e.currentTarget.blur();
                                                        }}
                                                        prefix={<EditOutlined style={{ color: '#bfbfbf' }} />}
                                                        placeholder="0%"
                                                    />
                                                ) : numericCol ? (
                                                    <Input
                                                        size="small"
                                                        inputMode="decimal"
                                                        value={
                                                            buf !== undefined
                                                                ? buf
                                                                : (addr
                                                                    ? ((cellInputs[addr] ?? '') === ''
                                                                        ? ''
                                                                        : formatNumberVN(Number(cellInputs[addr])))
                                                                    : '')
                                                        }
                                                        onFocus={() => {
                                                            if (!addr) return;
                                                            if (editBuf[addr] !== undefined) return;
                                                            const base = (cellInputs[addr] ?? '');
                                                            if (base === '') setBuf(addr, '');
                                                            else setBuf(addr, formatNumberVN(Number(base)));
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === '-' || e.key === 'Minus') e.preventDefault();
                                                        }}
                                                        onChange={(e) => {
                                                            if (!addr) return;
                                                            const raw = e.target.value;
                                                            setBuf(addr, raw);
                                                            const normalized = parseUserNumberSoft(raw);
                                                            if (onCellChange) onCellChange(addr, normalized);
                                                        }}
                                                        onBlur={() => {
                                                            if (!addr) return;
                                                            const raw = editBuf[addr] ?? '';
                                                            const normalized = commitNumber(raw);
                                                            if (onCellChange) onCellChange(addr, normalized);
                                                            clearBuf(addr);
                                                        }}
                                                        onPressEnter={(e) => {
                                                            if (!addr) return;
                                                            const raw = editBuf[addr] ?? '';
                                                            const normalized = commitNumber(raw);
                                                            if (onCellChange) onCellChange(addr, normalized);
                                                            clearBuf(addr);
                                                            if (e && e.currentTarget) e.currentTarget.blur();
                                                        }}
                                                        prefix={<EditOutlined style={{ color: '#bfbfbf' }} />}
                                                        placeholder="Nhập..."
                                                    />
                                                ) : (
                                                    <Input
                                                        size="small"
                                                        value={addr ? (editBuf[addr] ?? cellInputs[addr] ?? '') : ''}
                                                        onChange={(e) => addr && setBuf(addr, e.target.value)}
                                                        onBlur={(e) => {
                                                            if (!addr) return;
                                                            const val = editBuf[addr] ?? e.target.value ?? '';
                                                            if (onCellChange) onCellChange(addr, val);
                                                            clearBuf(addr);
                                                        }}
                                                        onPressEnter={(e) => {
                                                            if (!addr) return;
                                                            const val = editBuf[addr] ?? e.currentTarget.value ?? '';
                                                            if (onCellChange) onCellChange(addr, val);
                                                            clearBuf(addr);
                                                            if (e && e.currentTarget) e.currentTarget.blur();
                                                        }}
                                                        prefix={<EditOutlined style={{ color: '#bfbfbf' }} />}
                                                        placeholder="Nhập..."
                                                    />
                                                )
                                            ) : (
                                                isChildRow && isCriteriaColumn ? (
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: 8
                                                    }}>
                                                        <span>{displayVal}</span>
                                                        {!readOnly && !row?.autoGenerated && (
                                                            <a
                                                                style={{
                                                                    color: '#cf1322',
                                                                    cursor: 'pointer',
                                                                    whiteSpace: 'nowrap'
                                                                }}
                                                                onClick={() => onRemoveChild && childScoreAddr && onRemoveChild(rIdx, childScoreAddr)}
                                                            >
                                                                Xóa
                                                            </a>
                                                        )}
                                                    </div>
                                                ) : (
                                                    displayVal
                                                )
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>
            <Divider />
        </>
    );
}
