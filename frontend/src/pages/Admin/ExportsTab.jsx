import React, { useEffect, useMemo, useState } from 'react';
import { Card, Typography, Space, Input, Button, Table, Tag, message } from 'antd';
import { DownloadOutlined, SearchOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { saveAs } from 'file-saver';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function ExportsTab() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchList = async (params = {}) => {
    setLoading(true);
    try {
      const { data } = await api.get('/exports', {
        params: { page, pageSize, q, ...params },
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
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const onSearch = () => {
    setPage(1);
    fetchList({ page: 1 });
  };

  const handleDownload = async (record) => {
    if (!record?.id) return;
    setDownloadingId(record.id);
    try {
      const res = await api.get(`/exports/${record.id}/download`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: 'Tên file', dataIndex: 'fileName', ellipsis: true },
    {
      title: 'Người xuất',
      key: 'employee',
      render: (_, r) => r?.meta?.employee_name || '-',
    },
    {
      title: 'Chức vụ',
      key: 'role',
      render: (_, r) => r?.meta?.role || '-',
      width: 140,
    },
    {
      title: 'Đơn vị',
      key: 'org',
      render: (_, r) => (
        <span>
          {r?.meta?.branchId && <Tag color="geekblue">CN: {r.meta.branchId}</Tag>}
          {r?.meta?.departmentId && <Tag color="purple">PB: {r.meta.departmentId}</Tag>}
          {r?.meta?.positionId && <Tag color="green">CV: {r.meta.positionId}</Tag>}
        </span>
      ),
    },
    { title: 'Tạo lúc', dataIndex: 'createdAt', width: 200 },
    {
      title: 'Hành động',
      key: 'actions',
      width: 200,
      render: (_, r) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/saved-exports/${r.id}`)}
          >
            Xem
          </Button>
          <Button
            size="small"
            type="primary"
            icon={<DownloadOutlined />}
            loading={downloadingId === r.id}
            onClick={() => handleDownload(r)}
          >
            Tải
          </Button>
        </Space>
      ),
    },
  ], [downloadingId]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Title level={4} style={{ margin: 0 }}>Danh sách file form đã lưu</Title>
        <Card>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo tên file..."
              onPressEnter={onSearch}
              style={{ maxWidth: 360 }}
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={onSearch} loading={loading}>Tìm</Button>
            <Button icon={<ReloadOutlined />} onClick={() => fetchList()} disabled={loading}>Làm mới</Button>
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
