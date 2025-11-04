import React, { useState, useEffect } from "react";
import {
    Modal,
    Typography,
    Select,
    Table,
    InputNumber,
    Button,
    Space,
    message,
} from "antd";
import api from "../services/api.js";

const { Title } = Typography;

const METRIC_TYPES = [
    { key: "capital_growth", label: "Tăng trưởng nguồn vốn" },
    { key: "loan_growth", label: "Tăng trưởng dư nợ" },
    { key: "service_revenue", label: "Thu dịch vụ" },
    { key: "debt_recovery", label: "Thu hồi nợ đã XLRR" },
    { key: "finance", label: "Thu tài chính" },
];

export default function AnnualPlanModal({ open, user, onClose }) {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [dataSource, setDataSource] = useState([]);

    useEffect(() => {
        if (open && user) {
            loadPlan();
        }
    }, [open, user, selectedYear]);

    const loadPlan = async () => {
        if (!user) return;

        setLoading(true);
        try {
            const planRes = await api.get("/annual-plans", {
                params: { username: user.username, year: selectedYear },
            });

            const planData = planRes.data?.data || {};

            // Transform data into table rows
            const rows = METRIC_TYPES.map((metric) => ({
                key: metric.key,
                metric: metric.label,
                annualPlan: planData[metric.key] || 0,
            }));

            setDataSource(rows);
        } catch (e) {
            console.error("Error loading annual plan:", e);
            message.error(
                e?.response?.data?.message || "Failed to load annual plan"
            );
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!user) return;

        setSaving(true);
        try {
            const plans = {};
            dataSource.forEach((row) => {
                plans[row.key] = row.annualPlan;
            });

            const payload = {
                username: user.username,
                year: selectedYear,
                plans,
            };

            await api.post("/annual-plans", payload);
            message.success("Kế hoạch năm đã lưu thành công");
            onClose();
        } catch (e) {
            console.error("Error saving annual plan:", e);
            message.error(
                e?.response?.data?.message || "Failed to save annual plan"
            );
        } finally {
            setSaving(false);
        }
    };

    const handleCellChange = (key, value) => {
        setDataSource((prev) =>
            prev.map((row) =>
                row.key === key ? { ...row, annualPlan: value } : row
            )
        );
    };

    const columns = [
        {
            title: "Chỉ tiêu",
            dataIndex: "metric",
            key: "metric",
            width: 300,
        },
        {
            title: "Kế hoạch năm",
            dataIndex: "annualPlan",
            key: "annualPlan",
            width: 200,
            render: (value, record) => (
                <InputNumber
                    value={value}
                    onChange={(val) => handleCellChange(record.key, val || 0)}
                    min={0}
                    style={{ width: "100%" }}
                    formatter={(value) =>
                        `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }
                    parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
                />
            ),
        },
    ];

    return (
        <Modal
            title={
                <Title level={5} style={{ margin: 0 }}>
                    Kế hoạch năm - {user?.fullname || user?.username}
                </Title>
            }
            open={open}
            onCancel={onClose}
            width={600}
            footer={
                <Space>
                    <Button onClick={onClose} disabled={saving}>
                        Hủy
                    </Button>
                    <Button
                        type="primary"
                        onClick={handleSave}
                        loading={saving}
                    >
                        Lưu
                    </Button>
                </Space>
            }
            destroyOnHidden={true}
        >
            <div style={{ marginBottom: 16 }}>
                <label style={{ marginRight: 8, fontWeight: 500 }}>Năm:</label>
                <Select
                    value={selectedYear}
                    onChange={setSelectedYear}
                    style={{ width: 120 }}
                    options={[
                        { value: 2024, label: "2024" },
                        { value: 2025, label: "2025" },
                        { value: 2026, label: "2026" },
                    ]}
                />
            </div>

            <Table
                columns={columns}
                dataSource={dataSource}
                loading={loading}
                pagination={false}
                bordered
                size="small"
            />
        </Modal>
    );
}
