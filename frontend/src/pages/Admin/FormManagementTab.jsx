import React, { useEffect, useMemo, useState } from 'react';
import { Card, Table, Typography, Space, Button, message, Tooltip, Popconfirm } from 'antd';
import { ReloadOutlined, EyeOutlined, LinkOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function FormManagementTab() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/forms');
      setItems(res.data || []);
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || 'Failed to load forms';
      setError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/forms/${id}`);
      message.success('Deleted');
      // Optimistic update or refetch
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || 'Failed to delete form';
      message.error(msg);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = useMemo(
    () => [
      {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
        width: 100,
      },
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 320,
        render: (_, record) => {
          const link = `/forms/${record.id}`;
          return (
            <Space>
              <Tooltip title="Open form">
                <Button icon={<EyeOutlined />} onClick={() => navigate(link)}>
                  View
                </Button>
              </Tooltip>
              <Tooltip title="Copy link">
                <Button
                  icon={<LinkOutlined />}
                  onClick={async () => {
                    try {
                      const abs = `${window.location.origin}${link}`;
                      await navigator.clipboard.writeText(abs);
                      message.success('Link copied');
                    } catch {
                      message.error('Failed to copy link');
                    }
                  }}
                >
                  Copy Link
                </Button>
              </Tooltip>
              <Popconfirm
                title="Delete form"
                description={`Are you sure you want to delete "${record.name}"?`}
                okText="Yes"
                cancelText="No"
                onConfirm={() => handleDelete(record.id)}
              >
                <Button danger icon={<DeleteOutlined />}>Delete</Button>
              </Popconfirm>
            </Space>
          );
        },
      },
    ],
    [navigate]
  );

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
        <Title level={5} style={{ margin: 0 }}>Form Templates</Title>
        <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
          Refresh
        </Button>
      </Space>

      <Card>
        {error && (
          <Text type="danger" style={{ display: 'block', marginBottom: 12 }}>{error}</Text>
        )}
        <Table
          rowKey="id"
          loading={loading}
          dataSource={items}
          columns={columns}
          pagination={{ pageSize: 8 }}
        />
      </Card>
    </Space>
  );
}
