import React, { useEffect, useMemo, useState } from "react";
import {
    Card,
    Table,
    Typography,
    Space,
    Button,
    message,
    Tooltip,
    Popconfirm,
} from "antd";
import {
    ReloadOutlined,
    EyeOutlined,
    LinkOutlined,
    DeleteOutlined,
} from "@ant-design/icons";
import api from "../services/api.js";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;

export default function FormManagementTab() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [items, setItems] = useState([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const navigate = useNavigate();

    const fetchData = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await api.get("/forms");
            setItems(res.data || []);
            setSelectedRowKeys([]); // Clear selection when data is refreshed
        } catch (e) {
            const msg =
                e?.response?.data?.message ||
                e.message ||
                "Failed to load forms";
            setError(msg);
            message.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/forms/${id}`);
            message.success("Đã xóa form");
            // Optimistic update or refetch
            setItems((prev) => prev.filter((it) => it.id !== id));
            setSelectedRowKeys((prev) => prev.filter((key) => key !== id));
        } catch (e) {
            const msg =
                e?.response?.data?.message ||
                e.message ||
                "Failed to delete form";
            message.error(msg);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedRowKeys.length === 0) {
            message.warning("Vui lòng chọn ít nhất một form để xóa");
            return;
        }

        try {
            setLoading(true);
            // Delete all selected forms
            await Promise.all(
                selectedRowKeys.map((id) => api.delete(`/forms/${id}`))
            );

            message.success(`Đã xóa ${selectedRowKeys.length} form`);

            // Update items and clear selection
            setItems((prev) =>
                prev.filter((item) => !selectedRowKeys.includes(item.id))
            );
            setSelectedRowKeys([]);
        } catch (e) {
            const msg =
                e?.response?.data?.message ||
                e.message ||
                "Failed to delete forms";
            message.error(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData().then();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Row selection configuration
    const rowSelection = {
        selectedRowKeys,
        onChange: (newSelectedRowKeys) => {
            setSelectedRowKeys(newSelectedRowKeys);
        },
        onSelectAll: (selected, selectedRows, changeRows) => {
            if (selected) {
                setSelectedRowKeys(items.map((item) => item.id));
            } else {
                setSelectedRowKeys([]);
            }
        },
    };

    const columns = useMemo(
        () => [
            {
                title: "STT",
                key: "stt",
                width: 80,
                render: (_, __, index) => index + 1,
            },
            {
                title: "Tên form",
                dataIndex: "name",
                key: "name",
            },
            {
                title: "Thao tác",
                key: "actions",
                width: 200,
                render: (_, record) => {
                    const link = `/forms/${record.id}`;
                    return (
                        <Space direction={"horizontal"} align={"center"}>
                            <Tooltip title="Xem form">
                                <Button
                                    icon={<EyeOutlined />}
                                    onClick={() => navigate(link)}
                                    size="small"
                                >
                                    Xem
                                </Button>
                            </Tooltip>
                            <Popconfirm
                                title="Xóa form"
                                description={`Bạn có chắc chắn muốn xóa "${record.name}"?`}
                                okText="Có"
                                cancelText="Không"
                                onConfirm={() => handleDelete(record.id)}
                            >
                                <Button
                                    danger
                                    icon={<DeleteOutlined />}
                                    size="small"
                                >
                                    Xóa
                                </Button>
                            </Popconfirm>
                        </Space>
                    );
                },
            },
        ],
        [navigate]
    );

    return (
        <Space direction="vertical" style={{ width: "100%" }} size="large">
            <Space
                align="center"
                style={{ justifyContent: "space-between", width: "100%" }}
            >
                <Title level={5} style={{ margin: 0 }}>
                    Mẫu form đánh giá
                </Title>
                <Space>
                    {selectedRowKeys.length > 0 && (
                        <Popconfirm
                            title="Xóa nhiều form"
                            description={`Bạn có chắc chắn muốn xóa ${selectedRowKeys.length} form đã chọn?`}
                            okText="Có"
                            cancelText="Không"
                            onConfirm={handleBulkDelete}
                        >
                            <Button
                                danger
                                icon={<DeleteOutlined />}
                                loading={loading}
                            >
                                Xóa {selectedRowKeys.length} form
                            </Button>
                        </Popconfirm>
                    )}
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={fetchData}
                        loading={loading}
                    >
                        Làm mới
                    </Button>
                </Space>
            </Space>

            <Card>
                {error && (
                    <Text
                        type="danger"
                        style={{ display: "block", marginBottom: 12 }}
                    >
                        {error}
                    </Text>
                )}
                <Table
                    rowKey="id"
                    loading={loading}
                    dataSource={items}
                    columns={columns}
                    rowSelection={rowSelection}
                    pagination={{
                        pageSize: 10,
                        showTotal: (total) => `Tổng ${total} form`,
                    }}
                />
            </Card>
        </Space>
    );
}
