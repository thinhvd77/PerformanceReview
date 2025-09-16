import React, {useEffect, useState} from 'react';
import {Card, Form, Input, Button, Select, Space, List, Typography, message, Modal} from 'antd';
import {authService} from '../../services/authService';

const {Title, Text} = Typography;

export default function UserManagementTab() {
    const [form] = Form.useForm();
    const [creating, setCreating] = useState(false);
    const [users, setUsers] = useState([]);
    const [open, setOpen] = useState(false);

    const onFinish = async (values) => {
        setCreating(true);
        try {
            const res = await authService.register(values);
            message.success('User created');
            setUsers((prev) => [...prev, res.user]);
            form.resetFields(['username', 'password']);
            setOpen(false);
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
        <Space direction="vertical" style={{width: '100%'}} size="large">
            <div style={{display: 'flex', justifyContent: 'flex-end'}}>
                <Button type="primary" onClick={() => setOpen(true)}>New User</Button>
            </div>

            <Modal
                title={<Title level={5} style={{margin: 0}}>Create New User</Title>}
                open={open}
                onCancel={() => {
                    if (!creating) {
                        setOpen(false);
                    }
                }}
                footer={null}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{role: 'user'}}>
                    <Form.Item label="Họ và Tên" name="fullname"
                               rules={[{required: true, message: 'Vui lòng điền họ và tên'}]}>
                        <Input placeholder="Họ và Tên"/>
                    </Form.Item>
                    <Form.Item label="Tài khoản" name="username"
                               rules={[{required: true, message: 'Vui lòng điền tài khoản'}]}>
                        <Input placeholder="Tài khoản"/>
                    </Form.Item>
                    <Form.Item label="Mật khẩu" name="password"
                               rules={[{required: true, message: 'Vui lòng điền mật khẩu'}]}>
                        <Input.Password placeholder="Mật khẩu"/>
                    </Form.Item>
                    <Form.Item label="Vai trò" name="role" rules={[{required: true}]}>
                        <Select
                            options={[
                                {value: 'admin', label: 'Admin'},
                                {value: 'user', label: 'User'},
                            ]}
                            style={{maxWidth: 240}}
                        />
                    </Form.Item>
                    <Form.Item>
                        <Space>
                            <Button onClick={() => setOpen(false)} disabled={creating}>Cancel</Button>
                            <Button type="primary" htmlType="submit" loading={creating}>Create</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            <Card title={<Title level={5} style={{margin: 0}}>Users (session)</Title>}>
                {users.length === 0 ? (
                    <Text type="secondary">Newly created users in this session will appear here.</Text>
                ) : (
                    <List
                        bordered
                        dataSource={users}
                        renderItem={(u) => (
                            <List.Item>
                                <Space direction="vertical" size={0}>
                                    <Text strong>{u.fullname || u.username}</Text>
                                    <Text type="secondary">{u.username} • ID: {u.id}</Text>
                                </Space>
                            </List.Item>
                        )}
                    />
                )}
            </Card>
        </Space>
    );
}
