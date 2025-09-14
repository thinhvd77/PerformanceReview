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

const renderField = (field) => {
    const commonProps = {name: field.key, label: field.label, rules: []};
    if (field.required) {
        commonProps.rules.push({required: true, message: `${field.label} is required`});
    }
    switch (field.type) {
        case 'number':
            return <Form.Item key={field.key} {...commonProps}><InputNumber style={{width: '100%'}}/></Form.Item>;
        case 'date':
            return <Form.Item key={field.key} {...commonProps}><DatePicker style={{width: '100%'}}/></Form.Item>;
        case 'boolean':
            return <Form.Item key={field.key} valuePropName="checked" {...commonProps}><Switch/></Form.Item>;
        case 'select':
            return <Form.Item key={field.key} {...commonProps}><Select
                options={(field.options || []).map(o => ({label: String(o), value: o}))} allowClear/></Form.Item>;
        case 'string':
        default:
            return <Form.Item key={field.key} {...commonProps}><Input/></Form.Item>;
    }
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

    // NEW: giữ bảng sống để chèn/xoá hàng runtime không làm vỡ addr của bảng gốc
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
                if (opts[0]) next[rIdx] = opts[0].value; // lưu "value" của option đầu
            }
        });
        setCriteriaSelectValueByRow(next);
    }, [baseTable]);

    // State cho cell input (theo địa chỉ Excel)
    const [cellInputs, setCellInputs] = useState({});

    // Build cell map & tính công thức dựa trên bảng "sống"
    const cellMap = useMemo(() => buildCellMap(table), [table]);
    useEffect(() => {
        setCellInputs(buildInitialInputs(table));
    }, [table]);

    const computedByAddr = useMemo(
        () => computeComputedByAddr({table, cellInputs, cellMap}),
        [table, cellInputs, cellMap]
    );

    const handleCellChange = (addr, v) => {
        setCellInputs((prev) => ({...prev, [addr]: v}));
    };

    // Khi người dùng chọn tiêu chí tại dòng II/III/IV/V
    const handleSectionChoose = (rowIndex, roman, label) => {
        setTable((prev) => {
            if (!prev) return prev;
            const cols = prev.columns?.length || 0;
            // tạo row mới: không đặt addr để không ảnh hưởng công thức cũ
            const newRow = {
                cells: Array.from({length: cols}, (_, cIdx) => ({
                    addr: null,
                    value: cIdx === 1 ? label : '', // cột "Tiêu chí" = label đã chọn
                    rowSpan: 1,
                    colSpan: 1,
                    hidden: false,
                    input: false,
                })),
            };
            const nextRows = [...(prev.rows || [])];
            nextRows.splice(rowIndex + 1, 0, newRow);
            return {...prev, rows: nextRows};
        });
        const first = (SECTION_OPTIONS[roman] || [])[0];
        if (first) {
            setCriteriaSelectValueByRow((m) => ({...m, [rowIndex]: first.value}));
        }
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

    if (loading) return <div style={{display: 'flex', justifyContent: 'center', padding: 40}}><Spin size="large"/>
    </div>;
    if (error) return <div style={{maxWidth: 720, margin: '24px auto'}}><Alert type="error"
                                                                               message="Failed to load form"
                                                                               description={error}/></div>;
    if (!template) return <div style={{maxWidth: 720, margin: '24px auto'}}><Empty
        description="No form templates found. Upload an Excel file to generate a form."/></div>;

    return (
        <div style={{maxWidth: 960, margin: '24px auto'}}>
            <Title level={3} style={{marginBottom: 8}}>{formTitle}</Title>

            <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
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
