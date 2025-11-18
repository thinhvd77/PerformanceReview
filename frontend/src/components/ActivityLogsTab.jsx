import React, { useState, useEffect } from "react";
import {
    Table,
    Card,
    DatePicker,
    Select,
    Input,
    Space,
    Tag,
    Button,
    message,
    Typography,
    Tooltip,
} from "antd";
import { SearchOutlined, ReloadOutlined, EyeOutlined } from "@ant-design/icons";
import api from "../services/api";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Text } = Typography;

export default function ActivityLogsTab() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [filters, setFilters] = useState({
        action: null,
        startDate: null,
        endDate: null,
        username: "",
        limit: 50,
        offset: 0,
    });

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = {
                limit: filters.limit,
                offset: filters.offset,
            };

            if (filters.action) {
                params.action = filters.action;
            }
            if (filters.startDate) {
                params.startDate = filters.startDate;
            }
            if (filters.endDate) {
                params.endDate = filters.endDate;
            }

            const { data } = await api.get("/activity-logs", { params });

            // Filter by username on client side (since backend doesn't support username search yet)
            let filteredLogs = data.logs;
            if (filters.username) {
                const searchTerm = filters.username.toLowerCase();
                filteredLogs = filteredLogs.filter((log) =>
                    log.username?.toLowerCase().includes(searchTerm)
                );
            }

            setLogs(filteredLogs);
            setTotal(data.total);
        } catch (error) {
            console.error("Failed to fetch activity logs:", error);
            message.error("Không thể tải logs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [
        filters.limit,
        filters.offset,
        filters.action,
        filters.startDate,
        filters.endDate,
    ]);

    const handleDateRangeChange = (dates) => {
        if (dates && dates.length === 2) {
            setFilters((prev) => ({
                ...prev,
                startDate: dates[0].toISOString(),
                endDate: dates[1].toISOString(),
                offset: 0,
            }));
        } else {
            setFilters((prev) => ({
                ...prev,
                startDate: null,
                endDate: null,
                offset: 0,
            }));
        }
    };

    const handleActionChange = (value) => {
        setFilters((prev) => ({
            ...prev,
            action: value || null,
            offset: 0,
        }));
    };

    const handleUsernameSearch = () => {
        setFilters((prev) => ({ ...prev, offset: 0 }));
        fetchLogs();
    };

    const handleReset = () => {
        setFilters({
            action: null,
            startDate: null,
            endDate: null,
            username: "",
            limit: 50,
            offset: 0,
        });
    };

    const getActionTag = (action) => {
        const actionConfig = {
            LOGIN: { color: "blue", text: "Đăng nhập" },
            EXPORT_FORM: { color: "green", text: "Xuất form" },
        };
        const config = actionConfig[action] || {
            color: "default",
            text: action,
        };
        return <Tag color={config.color}>{config.text}</Tag>;
    };

    const formatDateTime = (dateString) => {
        return dayjs(dateString).format("DD/MM/YYYY HH:mm:ss");
    };

    const expandedRowRender = (record) => {
        return (
            <Card size="small" title="Chi tiết">
                <Space direction="vertical" style={{ width: "100%" }}>
                    <div>
                        <strong>IP Address:</strong> {record.ipAddress || "N/A"}
                    </div>
                    <div>
                        <strong>User Agent:</strong> {record.userAgent || "N/A"}
                    </div>
                    {record.details && (
                        <div>
                            <strong>Thông tin thêm:</strong>
                            <pre
                                style={{
                                    background: "#f5f5f5",
                                    padding: 8,
                                    borderRadius: 4,
                                    marginTop: 8,
                                    maxHeight: 200,
                                    overflow: "auto",
                                }}
                            >
                                {JSON.stringify(record.details, null, 2)}
                            </pre>
                        </div>
                    )}
                </Space>
            </Card>
        );
    };

    const columns = [
        {
            title: "Thời gian",
            dataIndex: "createdAt",
            key: "createdAt",
            width: 180,
            render: (text) => formatDateTime(text),
            sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
        },
        {
            title: "Người dùng",
            dataIndex: "username",
            key: "username",
            width: 150,
            render: (username, record) => (
                <div>
                    <div>
                        <strong>{username}</strong>
                    </div>
                    {record.details?.fullname && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {record.details.fullname}
                        </Text>
                    )}
                </div>
            ),
        },
        {
            title: "Hành động",
            dataIndex: "action",
            key: "action",
            width: 120,
            render: (action) => getActionTag(action),
            filters: [
                { text: "Đăng nhập", value: "LOGIN" },
                { text: "Xuất form", value: "EXPORT_FORM" },
            ],
            onFilter: (value, record) => record.action === value,
        },
        {
            title: "Chi nhánh",
            key: "branch",
            width: 120,
            render: (_, record) => record.details?.branch || "-",
        },
        {
            title: "Phòng ban",
            key: "department",
            width: 150,
            render: (_, record) => record.details?.department || "-",
        },
        {
            title: "IP",
            dataIndex: "ipAddress",
            key: "ipAddress",
            width: 130,
            render: (ip) => ip.replace("::ffff:", "") || "-",
        },
    ];

    return (
        <div style={{ padding: "24px 0" }}>
            <Card
                title="Lịch sử hoạt động"
                extra={
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={fetchLogs}
                        loading={loading}
                    >
                        Làm mới
                    </Button>
                }
            >
                <Space
                    direction="vertical"
                    size="middle"
                    style={{ width: "100%", marginBottom: 16 }}
                >
                    <Space wrap>
                        <RangePicker
                            placeholder={["Từ ngày", "Đến ngày"]}
                            onChange={handleDateRangeChange}
                            format="DD/MM/YYYY"
                            value={
                                filters.startDate && filters.endDate
                                    ? [
                                          dayjs(filters.startDate),
                                          dayjs(filters.endDate),
                                      ]
                                    : null
                            }
                        />
                        <Select
                            style={{ width: 200 }}
                            placeholder="Loại hành động"
                            allowClear
                            value={filters.action}
                            onChange={handleActionChange}
                        >
                            <Option value="LOGIN">Đăng nhập</Option>
                            <Option value="EXPORT_FORM">Xuất form</Option>
                        </Select>
                        <Input.Search
                            placeholder="Tìm theo username"
                            style={{ width: 250 }}
                            value={filters.username}
                            onChange={(e) =>
                                setFilters((prev) => ({
                                    ...prev,
                                    username: e.target.value,
                                }))
                            }
                            onSearch={handleUsernameSearch}
                            enterButton={<SearchOutlined />}
                        />
                        <Button onClick={handleReset}>Đặt lại</Button>
                    </Space>
                </Space>

                <Table
                    columns={columns}
                    dataSource={logs}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        current: Math.floor(filters.offset / filters.limit) + 1,
                        pageSize: filters.limit,
                        total: total,
                        showSizeChanger: true,
                        showTotal: (total) => `Tổng ${total} logs`,
                        onChange: (page, pageSize) => {
                            setFilters((prev) => ({
                                ...prev,
                                offset: (page - 1) * pageSize,
                                limit: pageSize,
                            }));
                        },
                    }}
                    expandable={{
                        expandedRowRender,
                        expandIcon: ({ expanded, onExpand, record }) => (
                            <Tooltip
                                title={expanded ? "Thu gọn" : "Xem chi tiết"}
                            >
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<EyeOutlined />}
                                    onClick={(e) => onExpand(record, e)}
                                />
                            </Tooltip>
                        ),
                    }}
                    scroll={{ x: 1000 }}
                    size="small"
                />
            </Card>
        </div>
    );
}
