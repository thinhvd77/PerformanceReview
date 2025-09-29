import React, {useEffect, useMemo, useState} from 'react';
import {Card, Typography, Space, Input, Button, Table, Tag, message, Select, Popconfirm} from 'antd';
import {DownloadOutlined, SearchOutlined, ReloadOutlined, EyeOutlined, DeleteOutlined} from '@ant-design/icons';
import api from '../services/api.js';
import {saveAs} from 'file-saver';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../contexts/authContext.jsx';

const {Title, Text} = Typography;

const branchs = {
    hs: 'Hội sở',
    cn6: 'Chi nhánh 6',
    nh: 'Chi nhánh Nam Hoa'
}

const departments = {
    kt: 'Kế toán & ngân quỹ',
    pgd: 'Phòng giao dịch Bình Tây',
    cn: 'Phòng Khách hàng cá nhân',
    dn: 'Phòng Khách hàng doanh nghiệp',
    th: 'Phòng Tổng hợp',
    ktrs: 'Phòng Kiểm tra giám sát nội bộ',
    qlrr: 'Phòng Kế hoạch & quản lý rủi ro',
    kh: 'Phòng Khách hàng',
    gd: 'Ban giám đốc',
};

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
    const [deletingId, setDeletingId] = useState(null);
    const {isAdmin} = useAuth();

    // Extract unique branch and department options from data
    const branchOptions = useMemo(() => {
        const uniqueBranches = [...new Set(rows.filter(r => r?.branch).map(r => branchs[r.branch] || r.branch))];
        return uniqueBranches.sort();
    }, [rows]);

    const departmentOptions = useMemo(() => {
        const uniqueDepartments = [...new Set(rows.filter(r => r?.department).map(r => departments[r.department] || r.department))];
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

    const handleDelete = async (record) => {
        if (!record?.id) return;
        setDeletingId(record.id);
        try {
            await api.delete(`/exports/${record.id}`);
            message.success('Đã xóa form đã nộp');
            await fetchList();
        } catch (e) {
            const msg = e?.response?.data?.message || e.message || 'Xóa form thất bại';
            message.error(msg);
        } finally {
            setDeletingId(null);
        }
    };

    const columns = [
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
          {r?.branch && <Tag color="geekblue">{r?.branch.includes('hs') ? 'Hội sở' : '-'}</Tag>}
        </span>
            ),
        },
        {
            title: 'Phòng ban',
            key: 'dept',
            render: (_, r) => (
                <span>
          {r?.department && <Tag color="green">{r.department.includes('kt') ? 'Kế toán & ngân quỹ' : '-'}</Tag>}
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
                    {isAdmin && (
                        <Popconfirm
                            title="Bạn có chắc muốn xóa form này?"
                            okText="Xóa"
                            cancelText="Hủy"
                            onConfirm={() => handleDelete(r)}
                        >
                            <Button
                                size="small"
                                danger
                                icon={<DeleteOutlined/>}
                                disabled={deletingId === r.id || loading}
                            >
                                Xóa
                            </Button>
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

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
                            allowClear
                        >
                            <Select.Option value="">Tất cả chi nhánh</Select.Option>
                            {branchOptions.map(branch => (
                                <Select.Option key={branch} value={branch}>
                                    {branch}
                                </Select.Option>
                            ))}
                        </Select>
                        <Select
                            value={departmentFilter}
                            onChange={setDepartmentFilter}
                            placeholder="Lọc theo phòng ban..."
                            style={{minWidth: 200}}
                            optionFilterProp="children"
                            allowClear
                        >
                            <Select.Option value="">Tất cả phòng ban</Select.Option>
                            {departmentOptions.map(department => (
                                <Select.Option key={department} value={department}>
                                    {department}
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
