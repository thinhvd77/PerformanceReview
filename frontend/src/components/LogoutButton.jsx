import React from 'react';
import { Button, Popconfirm } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

export default function LogoutButton({ confirm = false, size = 'middle' }) {
  const navigate = useNavigate();

  const doLogout = () => {
    try {
      authService.logout();
    } finally {
      navigate('/login');
    }
  };

  if (confirm) {
    return (
      <Popconfirm
        title="Log out"
        description="Are you sure you want to log out?"
        okText="Yes"
        cancelText="No"
        onConfirm={doLogout}
      >
        <Button danger icon={<LogoutOutlined />} size={size}>
          Logout
        </Button>
      </Popconfirm>
    );
  }

  return (
    <Button danger icon={<LogoutOutlined />} onClick={doLogout} size={size}>
      Logout
    </Button>
  );
}
