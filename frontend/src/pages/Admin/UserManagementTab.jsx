import React, {useEffect, useState} from 'react';
import {Card, Form, Input, Button, Select, Space, List, Typography, message, Modal, Popconfirm} from 'antd';
import {authService} from '../../services/authService';
import { userService } from '../../services/userService';

const {Title, Text} = Typography;

export default function UserManagementTab() {
    const [form] = Form.useForm();
    const [creating, setCreating] = useState(false);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const res = await userService.list();
            setUsers(res.data || []);
        } catch (e) {
            message.error(e?.response?.data?.message || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const onFinish = async (values) => {
        setCreating(true);
        try {
            // Prefer backend admin create; fallback to register if unauthorized
            try {
                const res = await userService.create(values);
                message.success('User created');
                setUsers(prev => [...prev, res.user]);
            } catch (err) {
                const res = await authService.register(values);
                message.success('User created');
                setUsers(prev => [...prev, res.user]);
            }
            form.resetFields(['username', 'password']);
            setOpen(false);
        } catch (e) {
            message.error(e?.response?.data?.message || 'Failed to create user');
        } finally {
            setCreating(false);
        }
    };

    const onEditFinish = async (values) => {
        if (!currentUser) return;
        setEditing(true);
        try {
            const res = await userService.update(currentUser.id, values);
            message.success('User updated');
            setUsers(prev => prev.map(u => u.id === currentUser.id ? res.user : u));
            setEditOpen(false);
            setCurrentUser(null);
        } catch (e) {
            message.error(e?.response?.data?.message || 'Failed to update user');
        } finally {
            setEditing(false);
        }
    };

    const onDelete = async (u) => {
        try {
            await userService.remove(u.id);
            message.success('User deleted');
            setUsers(prev => prev.filter(x => x.id !== u.id));
        } catch (e) {
            message.error(e?.response?.data?.message || 'Failed to delete user');
        }
    };

    useEffect(() => {
        loadUsers();
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

            <Card title={<Title level={5} style={{margin: 0}}>Users</Title>}>
                {users.length === 0 ? (
                    <Text type="secondary">No users found.</Text>
                ) : (
                    <List
                        loading={loading}
                        bordered
                        dataSource={users}
                        renderItem={(u) => (
                            <List.Item
                                actions={[
                                    <Button key="edit" size="small" onClick={() => { setCurrentUser(u); setEditOpen(true); }}>Edit</Button>,
                                    <Popconfirm key="del" title={`Delete user ${u.username}?`} okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => onDelete(u)}>
                                        <Button size="small" danger>Delete</Button>
                                    </Popconfirm>
                                ]}
                            >
                                <Space direction="vertical" size={0}>
                                    <Text strong>{u.fullname || u.username}</Text>
                                    <Text type="secondary">{u.username} • Role: {u.role} • ID: {u.id}</Text>
                                </Space>
                            </List.Item>
                        )}
                    />
                )}
            </Card>

            <Modal
                title={<Title level={5} style={{margin: 0}}>Edit User</Title>}
                open={editOpen}
                onCancel={() => { if (!editing) { setEditOpen(false); setCurrentUser(null); } }}
                footer={null}
                destroyOnClose
            >
                <Form layout="vertical" onFinish={onEditFinish} initialValues={currentUser || {}}>
                    <Form.Item label="Họ và Tên" name="fullname" rules={[{required: true, message: 'Vui lòng điền họ và tên'}]}>
                        <Input placeholder="Họ và Tên"/>
                    </Form.Item>
                    <Form.Item label="Tài khoản" name="username" rules={[{required: true, message: 'Vui lòng điền tài khoản'}]}>
                        <Input placeholder="Tài khoản"/>
                    </Form.Item>
                    <Form.Item label="Mật khẩu mới (tuỳ chọn)" name="password">
                        <Input.Password placeholder="Để trống nếu không đổi"/>
                    </Form.Item>
                    <Form.Item label="Vai trò" name="role" rules={[{required: true}]}> 
                        <Select options={[{value: 'admin', label: 'Admin'},{value: 'user', label: 'User'}]} style={{maxWidth: 240}}/>
                    </Form.Item>
                    <Form.Item>
                        <Space>
                            <Button onClick={() => { setEditOpen(false); setCurrentUser(null); }} disabled={editing}>Cancel</Button>
                            <Button type="primary" htmlType="submit" loading={editing}>Save</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </Space>
    );
}
