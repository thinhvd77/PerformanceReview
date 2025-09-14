// FormViewer.jsx
import React, {useEffect, useMemo, useState} from 'react';
import {useParams} from 'react-router-dom';
import api from '../../services/api';
import {
    Form,
    Input,
    InputNumber,
    Button,
    Spin,
    Alert,
    DatePicker,
    Switch,
    Select,
    Typography,
    Empty,
    Divider
} from 'antd';
import SchemaTable from './components/SchemaTable';
import {buildInitialInputs, buildCellMap, computeComputedByAddr} from './utils/formulaEngine';
import exportFormExcel from './utils/exportFormExcel';

const {Title} = Typography;

// Tuỳ bạn thay bằng dữ liệu backend sau này:
const SECTION_OPTIONS = {
    II: [
        {label: 'Chỉ tiêu định tính', value: 'II-1'},
        {label: 'Chức năng tham mưu điều hành', value: 'II-2'},
        {label: 'Chấp hành quy trình, chế độ nghiệp vụ, chế độ thông tin báo cáo', value: 'II-3'},
        {label: 'Sai sót do chủ quan trong quá trình thực hiện công việc', value: 'II-4'},
        {label: 'Các công việc khác theo chức năng, nhiệm vụ được cấp trên phân công', value: 'II-5'},
    ],
    III: [
        {label: 'Khen thưởng quý', value: 'III-1'},
        {label: 'Khen thưởng đột xuất', value: 'III-2'},
    ],
    IV: [
        {label: 'Vi phạm quy định', value: 'IV-1'},
        {label: 'Đi muộn/ về sớm', value: 'IV-2'},
    ],
    V: [
        {label: 'Đạt giải thi đua', value: 'V-1'},
        {label: 'Đóng góp cộng đồng', value: 'V-2'},
    ],
};

export default function FormViewer() {
    const {id} = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [template, setTemplate] = useState(null);
    const [criteriaSelectValueByRow, setCriteriaSelectValueByRow] = useState({});

    const formTitle = useMemo(() => template?.schema?.title || template?.name || 'Form', [template]);
    const fields = useMemo(
        () => (template?.schema?.fields || []).sort((a, b) => (a.order || 0) - (b.order || 0)),
        [template]
    );

    // Bảng "sống" để chèn/xoá hàng runtime không làm vỡ addr của bảng gốc
    const baseTable = useMemo(() => template?.schema?.table, [template]);
    const [table, setTable] = useState(baseTable);
    useEffect(() => setTable(baseTable), [baseTable]);

    // Khởi tạo giá trị mặc định cho các dòng II/III/IV/V = option đầu tiên
    useEffect(() => {
        if (!baseTable?.rows) return;
        const next = {};
        baseTable.rows.forEach((row, rIdx) => {
            const roman = String(row?.cells?.[0]?.value || '').trim();
            if (/^(II|III|IV|V)$/.test(roman)) {
                const opts = (SECTION_OPTIONS[roman] || []);
                if (opts[0]) next[rIdx] = opts[0].value; // value của option đầu
            }
        });
        setCriteriaSelectValueByRow(next);
    }, [baseTable]);

    // State cho cell input (theo địa chỉ Excel)
    const [cellInputs, setCellInputs] = useState({});

    // Build cell map & tính công thức dựa trên bảng "sống"
    const cellMap = useMemo(() => buildCellMap(table), [table]);

    // ⚠️ Giữ dữ liệu cũ, chỉ thêm default cho addr mới khi bảng thay đổi
    useEffect(() => {
        setCellInputs(prev => ({ ...buildInitialInputs(table), ...prev }));
    }, [table]);

    const computedByAddr = useMemo(
        () => computeComputedByAddr({table, cellInputs, cellMap}),
        [table, cellInputs, cellMap]
    );

    const handleCellChange = (addr, v) => {
        setCellInputs((prev) => ({...prev, [addr]: v}));
    };

    // ==== Thiết lập cột "Điểm theo mức độ hoàn thành" ====
    const SCORE_LABEL = 'điểm theo mức độ hoàn thành';
    const scoreColIdx = useMemo(() => {
        const cols = template?.schema?.table?.columns || [];
        const i = cols.findIndex(c => String(c.label || '').toLowerCase().includes(SCORE_LABEL));
        return i >= 0 ? i : 6; // fallback: col_7 (index 6)
    }, [template]);

    // Convert số thứ tự cột -> chữ cột Excel (A, B, ... G)
    const numToCol = (num) => {
        let s = '', n = num;
        while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
        return s;
    };

    // Đếm "dòng ảo" để tạo địa chỉ ô input cho các dòng con (tránh trùng Excel gốc)
    const [virtualRowNo, setVirtualRowNo] = useState(1000);
    // Lưu các địa chỉ ô-điểm (G*) của các dòng con theo từng dòng La Mã
    const [childrenScoreAddrs, setChildrenScoreAddrs] = useState({}); // { [sectionRowIndex]: string[] }

    // Khi người dùng chọn tiêu chí tại dòng II/III/IV/V
    const handleSectionChoose = (rowIndex, roman, label) => {
        const scoreColLetter = numToCol(scoreColIdx + 1); // ví dụ 7 -> 'G'
        const childScoreAddr = `${scoreColLetter}${virtualRowNo}`;
        const existingAddrs = childrenScoreAddrs[rowIndex] || [];
        const nextAddrs = [...existingAddrs, childScoreAddr];

        setTable((prev) => {
            if (!prev) return prev;
            const cols = prev.columns?.length || 0;

            // 1) Tạo dòng con mới
            const newRow = {
                cells: Array.from({length: cols}, (_, cIdx) => ({
                    addr: null,
                    value: cIdx === 1 ? label : '', // cột "Tiêu chí" = label đã chọn (cột B)
                    rowSpan: 1,
                    colSpan: 1,
                    hidden: false,
                    input: false,
                })),
            };
            // ô "Điểm theo mức độ hoàn thành" của dòng con là input có addr ảo
            newRow.cells[scoreColIdx] = {
                ...newRow.cells[scoreColIdx],
                addr: childScoreAddr,
                input: true,
                value: ''
            };

            const nextRows = [...(prev.rows || [])];

            // 2) Cập nhật công thức SUM(...) cho ô điểm của dòng La Mã
            const parentRow = nextRows[rowIndex];
            const parentCells = [...(parentRow?.cells || [])];
            parentCells[scoreColIdx] = {
                ...parentCells[scoreColIdx],
                formula: `=SUM(${nextAddrs.join(',')})`,
            };
            nextRows[rowIndex] = { ...parentRow, cells: parentCells };

            // 3) Chèn dòng con ngay dưới dòng La Mã
            nextRows.splice(rowIndex + 1, 0, newRow);

            return { ...prev, rows: nextRows };
        });

        // 4) Lưu lại danh sách addr con & tăng bộ đếm addr ảo
        setChildrenScoreAddrs(prev => ({ ...prev, [rowIndex]: nextAddrs }));
        setVirtualRowNo(n => n + 1);

        // 5) Reset riêng ô Select của dòng này về option đầu tiên theo yêu cầu trước đó
        const first = (SECTION_OPTIONS[roman] || [])[0];
        if (first) setCriteriaSelectValueByRow((m) => ({...m, [rowIndex]: first.value}));
    };

    const handleExport = async () => {
        try {
            await exportFormExcel({
                table,
                cellInputs,
                computedByAddr,
                fileName: `Phieu_tu_danh_gia_${new Date().toISOString().slice(0, 10)}.xlsx`,
                title: 'BẢNG TỰ ĐÁNH GIÁ MỨC ĐỘ HOÀN THÀNH CÔNG VIỆC'
            });
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setLoading(true);
            setError('');
            try {
                let tpl = null;
                if (id) {
                    const {data} = await api.get(`/forms/${id}`);
                    tpl = data;
                } else {
                    const {data: list} = await api.get('/forms');
                    if (Array.isArray(list) && list.length > 0) {
                        tpl = list[0];
                    }
                }
                if (!mounted) return;
                setTemplate(tpl || null);
            } catch (e) {
                if (!mounted) return;
                setError(e?.response?.data?.message || e.message || 'Failed to load form');
            } finally {
                if (mounted) setLoading(false);
            }
        };
        load();
        return () => {
            mounted = false;
        };
    }, [id]);

    if (loading) return <div style={{display: 'flex', justifyContent: 'center', padding: 40}}><Spin size="large"/></div>;
    if (error) return (
        <div style={{maxWidth: 720, margin: '24px auto'}}>
            <Alert type="error" message="Failed to load form" description={error}/>
        </div>
    );
    if (!template) return (
        <div style={{maxWidth: 720, margin: '24px auto'}}>
            <Empty description="No form templates found. Upload an Excel file to generate a form."/>
        </div>
    );

    return (
        <div style={{maxWidth: 960, margin: '24px auto'}}>
            <Title level={3} style={{marginBottom: 8}}>{formTitle}</Title>

            <div style={{marginBottom: 12, display: 'flex', gap: 8}}>
                <Button type="primary" onClick={handleExport}>Xuất Excel</Button>
            </div>

            {table && table.columns?.length > 0 && table.rows?.length > 0 && (
                <SchemaTable
                    table={table}
                    cellInputs={cellInputs}
                    computedByAddr={computedByAddr}
                    onCellChange={handleCellChange}
                    sectionOptions={SECTION_OPTIONS}
                    onSectionChoose={handleSectionChoose}
                    selectValueByRow={criteriaSelectValueByRow}
                />
            )}
        </div>
    );
}
