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
    { key: "capital_growth_actual", label: "Tăng trưởng nguồn vốn" },
    { key: "loan_growth_actual", label: "Tăng trưởng dư nợ" },
    { key: "bad_loan_ratio_actual", label: "Tỷ lệ nợ xấu" },
    { key: "group_2_loan_ratio_actual", label: "Tỷ lệ nợ nhóm 2" },
    // { key: "service_revenue", label: "Thu dịch vụ" },
    // { key: "debt_recovery", label: "Thu hồi nợ đã XLRR" },
    // { key: "finance", label: "Thu tài chính" },
];

export default function QuarterActualModal({ open, user, onClose }) {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [dataSource, setDataSource] = useState([]);

    useEffect(() => {
        if (open && user) {
            loadMetrics();
        }
    }, [open, user, selectedYear]);

    const loadMetrics = async () => {
        if (!user) return;

        setLoading(true);
        try {
            const metricsRes = await api.get("/quarter-actuals", {
                params: {
                    year: selectedYear,
                    username: user.username,
                },
            });

            const metricsData = metricsRes.data?.data || {};

            console.log(metricsData);

            // Transform data into table rows
            const rows = METRIC_TYPES.map((metric) => ({
                key: metric.key,
                metric: metric.label,
                q1Actual: metricsData[metric.key]?.q1Actual || 0,
                q2Actual: metricsData[metric.key]?.q2Actual || 0,
                q3Actual: metricsData[metric.key]?.q3Actual || 0,
                q4Actual: metricsData[metric.key]?.q4Actual || 0,
            }));

            setDataSource(rows);
        } catch (e) {
            console.error("Error loading quarterly metrics:", e);
            message.error(
                e?.response?.data?.message || "Failed to load quarterly metrics"
            );
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!user) return;

        setSaving(true);
        try {
            // Save each quarter's data separately
            const quarters = [1, 2, 3, 4];

            for (const quarter of quarters) {
                const quarterKey = `q${quarter}Actual`;
                const actuals = {};

                dataSource.forEach((row) => {
                    const value = row[quarterKey];
                    // Use the key directly as it already has "_actual" suffix
                    actuals[row.key] = value;
                });

                const payload = {
                    quarter,
                    year: selectedYear,
                    actuals,
                    username: user.username,
                };

                await api.post("/quarter-actuals", payload);
            }

            message.success("Thực hiện quý đã lưu thành công");
            onClose();
        } catch (e) {
            console.error("Error saving quarterly metrics:", e);
            message.error(
                e?.response?.data?.message || "Failed to save quarterly metrics"
            );
        } finally {
            setSaving(false);
        }
    };

    const handleCellChange = (key, field, value) => {
        setDataSource((prev) =>
            prev.map((row) =>
                row.key === key ? { ...row, [field]: value } : row
            )
        );
    };

    const columns = [
        {
            title: "Chỉ tiêu",
            dataIndex: "metric",
            key: "metric",
            width: 200,
            fixed: "left",
        },
        {
            title: "Thực hiện quý 1",
            dataIndex: "q1Actual",
            key: "q1Actual",
            width: 150,
            render: (value, record) => (
                <InputNumber
                    value={value}
                    onChange={(val) =>
                        handleCellChange(record.key, "q1Actual", val || 0)
                    }
                    min={0}
                    style={{ width: "100%" }}
                    formatter={(value) =>
                        `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }
                    parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
                />
            ),
        },
        {
            title: "Thực hiện quý 2",
            dataIndex: "q2Actual",
            key: "q2Actual",
            width: 150,
            render: (value, record) => (
                <InputNumber
                    value={value}
                    onChange={(val) =>
                        handleCellChange(record.key, "q2Actual", val || 0)
                    }
                    min={0}
                    style={{ width: "100%" }}
                    formatter={(value) =>
                        `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }
                    parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
                />
            ),
        },
        {
            title: "Thực hiện quý 3",
            dataIndex: "q3Actual",
            key: "q3Actual",
            width: 150,
            render: (value, record) => (
                <InputNumber
                    value={value}
                    onChange={(val) =>
                        handleCellChange(record.key, "q3Actual", val || 0)
                    }
                    min={0}
                    style={{ width: "100%" }}
                    formatter={(value) =>
                        `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }
                    parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
                />
            ),
        },
        {
            title: "Thực hiện quý 4",
            dataIndex: "q4Actual",
            key: "q4Actual",
            width: 150,
            render: (value, record) => (
                <InputNumber
                    value={value}
                    onChange={(val) =>
                        handleCellChange(record.key, "q4Actual", val || 0)
                    }
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
                    Thực hiện quý - {user?.fullname || user?.username}
                </Title>
            }
            open={open}
            onCancel={onClose}
            width={900}
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
                scroll={{ x: "max-content" }}
            />
        </Modal>
    );
}
