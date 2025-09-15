import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Select, Space, List, Typography, message } from 'antd';
import { authService } from '../../services/authService';

const { Title, Text } = Typography;

export default function UserManagementTab() {
  const [form] = Form.useForm();
  const [creating, setCreating] = useState(false);
  const [users, setUsers] = useState([]);

  const onFinish = async (values) => {
    setCreating(true);
    try {
      const res = await authService.register(values);
      message.success('User created');
      setUsers((prev) => [...prev, res.user]);
      form.resetFields(['username', 'password']);
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    // Placeholder: If backend exposes a list endpoint, fetch here.
  }, []);

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card title={<Title level={5} style={{ margin: 0 }}>Create New User</Title>}>
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ role: 'user' }}>
          <Form.Item label="Username" name="username" rules={[{ required: true, message: 'Please input username' }]}>
            <Input placeholder="Enter username" />
          </Form.Item>
          <Form.Item label="Password" name="password" rules={[{ required: true, message: 'Please input password' }]}>
            <Input.Password placeholder="Enter password" />
          </Form.Item>
          <Form.Item label="Role" name="role" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'admin', label: 'Admin' },
                { value: 'user', label: 'User' },
              ]}
              style={{ maxWidth: 240 }}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={creating}>Create</Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title={<Title level={5} style={{ margin: 0 }}>Users (session)</Title>}>
        {users.length === 0 ? (
          <Text type="secondary">Newly created users in this session will appear here.</Text>
        ) : (
          <List
            bordered
            dataSource={users}
            renderItem={(u) => (
              <List.Item>
                <Space>
                  <Text strong>{u.username}</Text>
                  <Text type="secondary">ID: {u.id}</Text>
                </Space>
              </List.Item>
            )}
          />
        )}
      </Card>
    </Space>
  );
}
