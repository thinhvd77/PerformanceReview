import React, { useState } from 'react';
import { Tabs, Layout, Typography, Space } from 'antd';
import ImportTab from './ImportTab';
import UserManagementTab from './UserManagementTab';
import FormManagementTab from './FormManagementTab';
import LogoutButton from '../../components/LogoutButton';
import UserInfo from '../../components/UserInfo';

const { Content, Header } = Layout;
const { Title } = Typography;

export default function AdminPage() {
  const [activeKey, setActiveKey] = useState('import');

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '16px 24px', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Title level={3} style={{ margin: 0 }}>Admin</Title>
          <Space size="large">
            <UserInfo />
            <LogoutButton confirm size="small" />
          </Space>
        </div>
      </Header>
      <Content style={{ padding: 24 }}>
        <Tabs
          activeKey={activeKey}
          onChange={setActiveKey}
          items={[
            { key: 'import', label: 'Import', children: <ImportTab /> },
            { key: 'forms', label: 'Form Management', children: <FormManagementTab /> },
            { key: 'users', label: 'User Management', children: <UserManagementTab /> },
          ]}
        />
      </Content>
    </Layout>
  );
}
