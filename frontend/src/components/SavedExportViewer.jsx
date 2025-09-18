import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Typography, Space, Card, Button, Spin, Alert, message } from 'antd';
import api from '../services/api.js';
import SchemaTable from './SchemaTable.jsx';
import UserInfo from './UserInfo.jsx';
import logo from '../assets/logo_png.png';
import { parseExcelForViewer } from '../utils/parseExcelForViewer.js';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function SavedExportViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [record, setRecord] = useState(null);
  const [parsedTable, setParsedTable] = useState(null);
  const [parsing, setParsing] = useState(false);

  const meta = record?.meta || {};
  const fallbackTable = meta?.table || null;
  const cellInputs = meta?.cellInputs || {};
  const computedByAddr = meta?.computedByAddr || {};

  const title = meta?.title || record?.fileName || 'Saved Form';
  const employeeName = meta?.employee_name || '-';
  const role = meta?.role || '-';

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get(`/exports/${id}`);
        if (!mounted) return;
        setRecord(data);
      } catch (e) {
        if (!mounted) return;
        const msg = e?.response?.data?.message || e.message || 'Tải dữ liệu thất bại';
        setError(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [id]);

  // Download and parse the actual exported Excel file to render review from the source file
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!record?.id) return;
      setParsing(true);
      try {
        const res = await api.get(`/exports/${record.id}/download`, { responseType: 'arraybuffer' });
        const arr = res?.data;
        if (!mounted) return;
        try {
          const { table } = await parseExcelForViewer(arr);
          if (!mounted) return;
          setParsedTable(table);
        } catch (e) {
          console.warn('Parse Excel failed, fallback to saved meta.table:', e);
          setParsedTable(null);
        }
      } catch (e) {
        console.warn('Download Excel failed, fallback to saved meta.table:', e?.response?.data || e.message);
        setParsedTable(null);
      } finally {
        if (mounted) setParsing(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, [record?.id]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{
        background: 'rgb(174, 28, 63)',
        padding: '5px 24px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxHeight: 64,
        boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          <div style={{ width: '15%', height: '100%' }}>
            <img src={logo} style={{ height: '100%', width: 'auto' }} alt={'logo'} />
          </div>
          <Title level={3} style={{ margin: 0, marginLeft: 'auto', marginRight: 'auto', color: 'white', width: '75%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(14px, 2.2vw, 22px)', lineHeight: 1.1 }}>Xem form đã lưu</Title>
          <Space size="large" style={{ width: '15%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <UserInfo />
          </Space>
        </div>
      </Header>
      <Content style={{ padding: 24 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin size="large" /></div>
        ) : error ? (
          <div style={{ maxWidth: 720, margin: '24px auto' }}>
            <Alert type="error" message="Lỗi" description={error} />
          </div>
        ) : !record ? (
          <div style={{ maxWidth: 720, margin: '24px auto' }}>
            <Alert type="warning" message="Không tìm thấy bản lưu" />
          </div>
        ) : (
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Title level={3} style={{ margin: 0 }}>{title}</Title>
              <Space>
                <Button onClick={() => navigate(-1)}>Quay lại</Button>
                <Button type="primary" onClick={() => navigate(`/admin`)}>Admin</Button>
              </Space>
            </div>

            <Card style={{ marginBottom: 16 }}>
              <Space size={24} wrap>
                <div><Text type="secondary">Nhân viên:</Text> <Text strong>{employeeName}</Text></div>
                <div><Text type="secondary">Chức vụ:</Text> <Text strong>{role}</Text></div>
                <div><Text type="secondary">Export ID:</Text> <Text strong>{record?.id}</Text></div>
                <div><Text type="secondary">Tạo lúc:</Text> <Text strong>{record?.createdAt}</Text></div>
              </Space>
            </Card>

            {(parsedTable || fallbackTable) && (parsedTable || fallbackTable)?.columns?.length > 0 && (parsedTable || fallbackTable)?.rows?.length > 0 ? (
              <>
                {parsing && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Spin size="small" />
                    <span>Đang tải từ file Excel...</span>
                  </div>
                )}
                <SchemaTable
                  table={parsedTable || fallbackTable}
                  cellInputs={cellInputs}
                  computedByAddr={computedByAddr}
                  readOnly
                />
              </>
            ) : (
              <Alert type="info" message="Bản lưu không có dữ liệu bảng để hiển thị" />
            )}
          </div>
        )}
      </Content>
    </Layout>
  );
}
