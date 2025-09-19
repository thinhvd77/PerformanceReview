import React, {useEffect, useMemo, useState} from 'react';
import {Card, Typography, Space, Input, Button, Table, Tag, message, Select} from 'antd';
import {DownloadOutlined, SearchOutlined, ReloadOutlined, EyeOutlined} from '@ant-design/icons';
import api from '../services/api.js';
import {saveAs} from 'file-saver';
import {useNavigate} from 'react-router-dom';

const {Title, Text} = Typography;

export default function ExportsTab() {
    const navigate = useNavigate();
    const [q, setQ] = useState('');
    const [branchFilter, setBranchFilter] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [downloadingId, setDownloadingId] = useState(null);

    // Extract unique branch and department options from data
    const branchOptions = useMemo(() => {
        const uniqueBranches = [...new Set(rows.filter(r => r?.meta?.branchId).map(r => r.meta.branchId))];
        return uniqueBranches.sort();
    }, [rows]);

    const departmentOptions = useMemo(() => {
        const uniqueDepartments = [...new Set(rows.filter(r => r?.meta?.departmentId).map(r => r.meta.departmentId))];
        return uniqueDepartments.sort();
    }, [rows]);

    const fetchList = async (params = {}) => {
        setLoading(true);
        try {
            const {data} = await api.get('/exports', {
                params: {page, pageSize, q, branchId: branchFilter, departmentId: departmentFilter, ...params},
            });
            setRows(data?.data || []);
            setTotal(data?.total || 0);
            if (typeof data?.page === 'number') setPage(data.page);
            if (typeof data?.pageSize === 'number') setPageSize(data.pageSize);
        } catch (e) {
            const msg = e?.response?.data?.message || e.message || 'Tải danh sách thất bại';
            message.error(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchList().then();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, pageSize, branchFilter, departmentFilter]);

    const onSearch = () => {
        setPage(1);
        fetchList({page: 1}).then();
    };

    const onClearFilters = () => {
        setQ('');
        setBranchFilter('');
        setDepartmentFilter('');
        setPage(1);
        fetchList({page: 1, q: '', branchId: '', departmentId: ''}).then();
    };

    const handleDownload = async (record) => {
        if (!record?.id) return;
        setDownloadingId(record.id);
        try {
            const res = await api.get(`/exports/${record.id}/download`, {responseType: 'blob'});
            const blob = new Blob([res.data], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
            const name = record.fileName || `export-${record.id}.xlsx`;
            saveAs(blob, name);
        } catch (e) {
            const msg = e?.response?.data?.message || e.message || 'Tải file thất bại';
            message.error(msg);
        } finally {
            setDownloadingId(null);
        }
    };

    const columns = useMemo(() => [
        {title: 'Mã nhân viên', render: (_, r) => r?.employee_code || '-', width: 180},
        {
            title: 'Họ và tên',
            width: 250,
            key: 'employee',
            render: (_, r) => r?.employee_name || '-',
        },
        {
            title: 'Chi nhánh',
            key: 'branch',
            render: (_, r) => (
                <span>
          {r?.departmentId && <Tag color="geekblue">{r.departmentId.includes('hs') ? 'Hội sở' : '-'}</Tag>}
        </span>
            ),
        },
        {
            title: 'Phòng ban',
            key: 'dept',
            render: (_, r) => (
                <span>
          {r?.departmentId && <Tag color="green">{r.departmentId.includes('kt') ? 'Kế toán & ngân quỹ' : '-'}</Tag>}
        </span>
            ),
        },
        {title: 'Tạo lúc', dataIndex: 'createdAt', width: 200},
        {
            title: 'Hành động',
            key: 'actions',
            width: 200,
            render: (_, r) => (
                <Space>
                    <Button
                        size="small"
                        icon={<EyeOutlined/>}
                        onClick={() => navigate(`/saved-exports/${r.id}`)}
                    >
                        Xem
                    </Button>
                    <Button
                        size="small"
                        type="primary"
                        icon={<DownloadOutlined/>}
                        loading={downloadingId === r.id}
                        onClick={() => handleDownload(r)}
                    >
                        Tải
                    </Button>
                </Space>
            ),
        },
    ], [downloadingId, navigate]);

    return (
        <div style={{maxWidth: 1300, margin: '0 auto'}}>
            <Space direction="vertical" size="large" style={{width: '100%'}}>
                <Title level={4} style={{margin: 0}}>Danh sách file form đã lưu</Title>
                <Card>
                    <div style={{display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap'}}>
                        <Input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Tìm theo tên file..."
                            onPressEnter={onSearch}
                            style={{maxWidth: 360}}
                        />
                        <Select
                            value={branchFilter}
                            onChange={setBranchFilter}
                            placeholder="Lọc theo chi nhánh..."
                            style={{minWidth: 200}}
                            optionFilterProp="children"
                        >
                            <Select.Option value="">Tất cả chi nhánh</Select.Option>
                            {branchOptions.map(branch => (
                                <Select.Option key={branch} value={branch}>
                                    CN: {branch}
                                </Select.Option>
                            ))}
                        </Select>
                        <Select
                            value={departmentFilter}
                            onChange={setDepartmentFilter}
                            placeholder="Lọc theo phòng ban..."
                            style={{minWidth: 200}}
                            optionFilterProp="children"
                        >
                            <Select.Option value="">Tất cả phòng ban</Select.Option>
                            {departmentOptions.map(department => (
                                <Select.Option key={department} value={department}>
                                    PB: {department}
                                </Select.Option>
                            ))}
                        </Select>
                        <Button type="primary" icon={<SearchOutlined/>} onClick={onSearch}
                                loading={loading}>Tìm</Button>
                        <Button icon={<ReloadOutlined/>} onClick={onClearFilters} disabled={loading}>Xóa bộ lọc</Button>
                        <Button icon={<ReloadOutlined/>} onClick={() => fetchList()} disabled={loading}>Làm mới</Button>
                    </div>

                    <Table
                        rowKey="id"
                        loading={loading}
                        columns={columns}
                        dataSource={rows}
                        pagination={{
                            current: page,
                            pageSize,
                            total,
                            showSizeChanger: true,
                            pageSizeOptions: [10, 20, 50, 100],
                            onChange: (p, ps) => {
                                setPage(p);
                                setPageSize(ps);
                            },
                            showTotal: (t) => `${t} bản ghi`,
                        }}
                    />
                </Card>
            </Space>
        </div>
    );
}
