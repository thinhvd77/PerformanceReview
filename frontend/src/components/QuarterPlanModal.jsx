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

const QUARTER_PLAN_TYPES = [
    { key: "capital_growth", label: "Tăng trưởng nguồn vốn" },
    { key: "loan_growth", label: "Tăng trưởng dư nợ" },
    { key: "group_2_loan_ratio", label: "Nợ nhóm 2" },
    { key: "bad_loan_ratio", label: "Nợ xấu" },
    { key: "service_revenue", label: "Thu dịch vụ" },
    { key: "debt_recovery", label: "Thu hồi nợ đã XLRR" },
    { key: "credit_marketing", label: "Tiếp thị tín dụng" },
];

export default function QuarterPlanModal({ open, user, onClose }) {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedQuarter, setSelectedQuarter] = useState(1);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [dataSource, setDataSource] = useState([]);

    useEffect(() => {
        if (open && user) {
            loadPlan();
        }
    }, [open, user, selectedYear, selectedQuarter]);

    const loadPlan = async () => {
        if (!user) return;

        setLoading(true);
        try {
            const planRes = await api.get("/quarter-plans", {
                params: {
                    username: user.username,
                    quarter: selectedQuarter,
                    year: selectedYear,
                },
            });

            const planData = planRes.data?.data || {};

            // Transform data into table rows
            const rows = QUARTER_PLAN_TYPES.map((metric) => ({
                key: metric.key,
                metric: metric.label,
                quarterPlan: planData[metric.key] || 0,
            }));

            setDataSource(rows);
        } catch (e) {
            console.error("Error loading quarter plan:", e);
            message.error(
                e?.response?.data?.message || "Failed to load quarter plan"
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
                plans[row.key] = row.quarterPlan;
            });

            const payload = {
                username: user.username,
                quarter: selectedQuarter,
                year: selectedYear,
                plans,
            };

            await api.post("/quarter-plans", payload);
            message.success("Kế hoạch quý đã lưu thành công");
            onClose();
        } catch (e) {
            console.error("Error saving quarter plan:", e);
            message.error(
                e?.response?.data?.message || "Failed to save quarter plan"
            );
        } finally {
            setSaving(false);
        }
    };

    const handleCellChange = (key, value) => {
        setDataSource((prev) =>
            prev.map((row) =>
                row.key === key ? { ...row, quarterPlan: value } : row
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
            title: "Kế hoạch quý",
            dataIndex: "quarterPlan",
            key: "quarterPlan",
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
                    Kế hoạch quý - {user?.fullname || user?.username}
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
            destroyOnClose
        >
            <Space style={{ marginBottom: 16 }}>
                <div>
                    <label style={{ marginRight: 8, fontWeight: 500 }}>
                        Quý:
                    </label>
                    <Select
                        value={selectedQuarter}
                        onChange={setSelectedQuarter}
                        style={{ width: 100 }}
                        options={[
                            { value: 1, label: "Quý 1" },
                            { value: 2, label: "Quý 2" },
                            { value: 3, label: "Quý 3" },
                            { value: 4, label: "Quý 4" },
                        ]}
                    />
                </div>
                <div>
                    <label style={{ marginRight: 8, fontWeight: 500 }}>
                        Năm:
                    </label>
                    <Select
                        value={selectedYear}
                        onChange={setSelectedYear}
                        style={{ width: 100 }}
                        options={[
                            { value: 2024, label: "2024" },
                            { value: 2025, label: "2025" },
                            { value: 2026, label: "2026" },
                        ]}
                    />
                </div>
            </Space>

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
