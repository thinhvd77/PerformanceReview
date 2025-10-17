import React, { useEffect, useState } from "react";
import { Typography, Dropdown, Button, Modal } from "antd";
import {
    DownOutlined,
    LogoutOutlined,
    KeyOutlined,
    DashboardOutlined,
    FormOutlined,
} from "@ant-design/icons";
import ChangePasswordModal from "./ChangePasswordModal";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/authContext";

const { Text } = Typography;
export default function UserInfo({ size = "small" }) {
    const { user, logout } = useAuth();
    // const [userInfo, setUser] = useState(null);
    const [pwdOpen, setPwdOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const isManager = typeof user?.role === "string" && user.role.toLowerCase() === "manager" || user?.username === "201100069";
    const onDashboard = location?.pathname?.startsWith("/dashboard");

    // useEffect(() => {
    //     const onStorage = () => setUser(user);
    //     window.addEventListener('storage', onStorage);
    //     return () => window.removeEventListener('storage', onStorage);
    // }, []);

    if (!user) return null;

    const name = user.fullname || user.username || "";

    const doLogout = () => {
        logout();
    };

    const items = [
        ...(isManager
            ? [
                {
                    key: onDashboard ? "form" : "dashboard",
                    label: (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {onDashboard ? <FormOutlined /> : <DashboardOutlined />}
                            {onDashboard ? "Form" : "Dashboard"}
                        </div>
                    ),
                    onClick: () => navigate(onDashboard ? "/" : "/dashboard"),
                },
                {
                    type: "divider",
                },
            ]
            : []),
        {
            key: "change-password",
            label: (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <KeyOutlined /> Đổi mật khẩu
                </div>
            ),
            onClick: () => setPwdOpen(true),
        },
        {
            type: "divider",
        },
        {
            key: "logout",
            danger: true,
            label: (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <LogoutOutlined /> Đăng xuất
                </div>
            ),
            onClick: () => {
                Modal.confirm({
                    title: "Đăng xuất",
                    content: "Bạn có chắc muốn đăng xuất?",
                    okText: "Đồng ý",
                    cancelText: "Hủy",
                    onOk: doLogout,
                });
            },
        },
    ];

    return (
        <>
            <Dropdown
                menu={{ items }}
                placement="bottomRight"
                trigger={["click"]}
            >
                <Button type="text" style={{ color: "white" }} size={size}>
                    <Text strong style={{ color: "white" }}>
                        {name}
                    </Text>
                    <DownOutlined style={{ marginLeft: 6 }} />
                </Button>
            </Dropdown>
            <ChangePasswordModal
                open={pwdOpen}
                onClose={() => setPwdOpen(false)}
            />
        </>
    );
}
