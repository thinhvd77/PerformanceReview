// SchemaTable.jsx
import React from 'react';
import {Input, Divider, Select} from 'antd';

// Presentational component to render schema.table with support for
// rowSpan/colSpan, input cells, and computed formula values.
// Props:
// - table: schema.table
// - cellInputs: { [addr]: string }
// - computedByAddr: { [addr]: number }
// - onCellChange: (addr, value) => void
// - sectionOptions?: { II?: {label:string,value:string}[], III?:..., IV?:..., V?:... }
// - onSectionChoose?: (rowIndex:number, roman:'II'|'III'|'IV'|'V', label:string) => void

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
                                    }) {
    if (!table || !table.columns || table.columns.length === 0 || !table.rows || table.rows.length === 0) {
        return null;
    }
    const borderStyle = '1px solid #d9d9d9';

    const isRoman = (s) => /^(II|III|IV|V)$/.test(String(s || '').trim());

    return (
        <>
            <div style={{overflowX: 'auto', marginBottom: 24}}>
                <table style={{width: '100%', borderCollapse: 'collapse'}}>
                    <thead>
                    <tr>
                        {table.columns.map((col, idx) => (
                            <th
                                key={`h-${idx}`}
                                style={{
                                    border: borderStyle,
                                    padding: '8px',
                                    background: '#fafafa',
                                    fontWeight: 600,
                                    textAlign: 'center'
                                }}
                            >
                                {col.label}
                            </th>
                        ))}
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
                                    const displayVal = (cell.formula && addr)
                                        ? (isNaN(computedVal) || computedVal === undefined ? '' : String(computedVal))
                                        : String(cell.value ?? '').trim();

                                    const isCriteriaColumn = cIdx === 1; // cột "Tiêu chí" là cột thứ 2 (B)
                                    const options = (sectionOptions[String(roman)?.trim()] || []);

                                    // Nếu là dòng II/III/IV/V và đang ở cột "Tiêu chí" => Select
                                    if (isRomanRow && isCriteriaColumn) {
                                        const fallbackValue = options?.[0]?.value;
                                        const currentValue = selectValueByRow[rIdx] ?? fallbackValue;
                                        return (
                                            <td key={`c-${rIdx}-${cIdx}`} {...props}
                                                style={{border: borderStyle, padding: '6px 8px', verticalAlign: 'top'}}>
                                                <Select
                                                    size="small"

                                                    placeholder="Chọn tiêu chí…"
                                                    style={{width: '100%', cursor: 'pointer'}}
                                                    options={options}
                                                    onSelect={(value, option) => {
                                                        const label = option?.label ?? value;
                                                        onSectionChoose && onSectionChoose(rIdx, String(roman).trim(), String(label));
                                                    }}
                                                    value={currentValue}
                                                    // allowClear
                                                    // showSearch
                                                    filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                                />
                                            </td>
                                        );
                                    }

                                    return (
                                        <td key={`c-${rIdx}-${cIdx}`} {...props}
                                            style={{border: borderStyle, padding: '6px 8px', verticalAlign: 'top'}}>
                                            {cell.input ? (
                                                <Input
                                                    size="small"
                                                    value={addr ? (cellInputs[addr] ?? '') : ''}
                                                    onChange={(e) => addr && onCellChange && onCellChange(addr, e.target.value)}
                                                />
                                            ) : (
                                                isChildRow && isCriteriaColumn ? (
                                                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8}}>
                                                        <span>{displayVal}</span>
                                                        <a
                                                            style={{color: '#cf1322', cursor: 'pointer', whiteSpace: 'nowrap'}}
                                                            onClick={() => onRemoveChild && childScoreAddr && onRemoveChild(rIdx, childScoreAddr)}
                                                        >
                                                            Xóa
                                                        </a>
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
            <Divider/>
        </>
    );
}
