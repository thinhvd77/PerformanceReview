import React, {useEffect, useState} from 'react';
import {Typography} from 'antd';
import {authService} from '../services/authService';

const {Text} = Typography;

export default function UserInfo({size = 'small'}) {
    const [user, setUser] = useState(() => authService.getCurrentUser());

    useEffect(() => {
        // In case we later want to refresh from profile
        // Keep minimal: rely on localStorage for now
        const onStorage = () => setUser(authService.getCurrentUser());
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    if (!user) return null;

    const role = (user.role || '').toString();
    const name = user.fullname || user.username || '';

    return (
        <Text type="secondary" style={{whiteSpace: 'nowrap', color: 'white'}} size={size}>
            <Text strong style={{color: 'white'}}>{name}</Text>
        </Text>
    );
}
