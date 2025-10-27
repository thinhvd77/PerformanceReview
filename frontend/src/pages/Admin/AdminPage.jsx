import React, { useState } from "react";
import { Tabs, Layout, Typography, Space, Image } from "antd";
import ImportTab from "../../components/ImportTab.jsx";
import UserManagementTab from "../../components/UserManagementTab.jsx";
import FormManagementTab from "../../components/FormManagementTab.jsx";
import ExportsTab from "../../components/ExportsTab.jsx";
import AnnualPlanImportTab from "../../components/AnnualPlanImportTab.jsx";
import QuarterPlanImportTab from "../../components/QuarterPlanImportTab.jsx";
import UserInfo from "../../components/UserInfo";
import logo from "../../assets/logo_png.png";

const { Content, Header } = Layout;
const { Title } = Typography;

export default function AdminPage() {
    const [activeKey, setActiveKey] = useState("import");

    return (
        <Layout style={{ minHeight: "100vh" }}>
            <Header
                style={{
                    background: "rgb(174, 28, 63)",
                    padding: "5px 24px",
                    borderBottom: "1px solid #f0f0f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    maxHeight: 64,
                    boxSizing: "border-box",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "100%",
                        height: "100%",
                    }}
                >
                    <div style={{ width: "15%", height: "100%" }}>
                        <img
                            src={logo}
                            style={{ height: "100%", width: "auto" }}
                            alt={"logo"}
                        />
                    </div>
                    <Title
                        level={3}
                        style={{
                            margin: 0,
                            marginLeft: "auto",
                            marginRight: "auto",
                            color: "white",
                            width: "75%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "clamp(14px, 2.2vw, 22px)",
                            lineHeight: 1.1,
                        }}
                    >
                        Admin Panel
                    </Title>
                    <Space
                        size="large"
                        style={{
                            width: "15%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                        }}
                    >
                        <UserInfo />
                    </Space>
                </div>
            </Header>
            <Content style={{ padding: "0 24px" }}>
                <Tabs
                    styles={{ margin: 0 }}
                    activeKey={activeKey}
                    onChange={setActiveKey}
                    items={[
                        {
                            key: "import",
                            label: "Import",
                            children: <ImportTab />,
                        },
                        {
                            key: "forms",
                            label: "Quản lý form",
                            children: <FormManagementTab />,
                        },
                        {
                            key: "users",
                            label: "Quản lý người dùng",
                            children: <UserManagementTab />,
                        },
                        {
                            key: "exports",
                            label: "Form đã nộp",
                            children: <ExportsTab />,
                        },
                        {
                            key: "annual-plan",
                            label: "Kế hoạch năm",
                            children: <AnnualPlanImportTab />,
                        },
                        {
                            key: "quarter-plan",
                            label: "Kế hoạch quý",
                            children: <QuarterPlanImportTab />,
                        },
                    ]}
                />
            </Content>
        </Layout>
    );
}
