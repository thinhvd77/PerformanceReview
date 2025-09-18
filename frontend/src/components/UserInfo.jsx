import React, {useEffect, useState} from 'react';
import {Typography, Dropdown, Button, Modal} from 'antd';
import {DownOutlined, LogoutOutlined, KeyOutlined} from '@ant-design/icons';
import {authService} from '../services/authService';
import ChangePasswordModal from './ChangePasswordModal';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/authContext';

const {Text} = Typography;

export default function UserInfo({size = 'small'}) {
    const [user, setUser] = useState(() => authService.getCurrentUser());
    const [pwdOpen, setPwdOpen] = useState(false);
    const navigate = useNavigate();
    const { logout } = useAuth();

    useEffect(() => {
        const onStorage = () => setUser(authService.getCurrentUser());
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    if (!user) return null;

    const name = user.fullname || user.username || '';

    const doLogout = () => {
        logout();
    };

    const items = [
        {
            key: 'change-password',
            label: (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <KeyOutlined /> Đổi mật khẩu
                </div>
            ),
            onClick: () => setPwdOpen(true),
        },
        {
            type: 'divider'
        },
        {
            key: 'logout',
            danger: true,
            label: (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <LogoutOutlined /> Đăng xuất
                </div>
            ),
            onClick: () => {
                Modal.confirm({
                    title: 'Đăng xuất',
                    content: 'Bạn có chắc muốn đăng xuất?',
                    okText: 'Đồng ý',
                    cancelText: 'Hủy',
                    onOk: doLogout,
                });
            }
        }
    ];

    return (
        <>
            <Dropdown
                menu={{ items }}
                placement="bottomRight"
                trigger={['click']}
            >
                <Button type="text" style={{ color: 'white' }} size={size}>
                    <Text strong style={{ color: 'white' }}>{name}</Text>
                    <DownOutlined style={{ marginLeft: 6 }} />
                </Button>
            </Dropdown>
            <ChangePasswordModal open={pwdOpen} onClose={() => setPwdOpen(false)} />
        </>
    );
}
