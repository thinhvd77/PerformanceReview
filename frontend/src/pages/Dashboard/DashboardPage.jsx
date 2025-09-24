import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Layout,
    Typography,
    Space,
    Card,
    Table,
    Spin,
    Alert,
    Empty,
    Button,
    Modal,
    message,
    Select,
} from "antd";
import { ReloadOutlined, DownloadOutlined } from "@ant-design/icons";
import api from "../../services/api.js";
import UserInfo from "../../components/UserInfo.jsx";
import SchemaTable from "../../components/SchemaTable.jsx";
import { parseExcelForViewer } from "../../utils/parseExcelForViewer.js";
import logo from "../../assets/logo_png.png";
import { saveAs } from "file-saver";
import { useAuth } from "../../contexts/authContext.jsx";
const { Header, Content } = Layout;
const { Title, Text } = Typography;
const formatDateTime = (value) => {
    if (!value) return "-";
    try {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleString("vi-VN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch (e) {
        return String(value);
    }
};

const branchOptions = [
    { value: "hs", label: "Hội sở" },
    { value: "cn6", label: "Chi nhánh 6" },
    { value: "nh", label: "Chi nhánh Nam Hoa" },
];

const departmentOptionsByBranch = {
    hs: [
        { value: "kt", label: "Kế toán & ngân quỹ" },
        { value: "pgd", label: "Phòng giao dịch Bình Tây" },
        { value: "cn", label: "Phòng Khách hàng cá nhân" },
        { value: "dn", label: "Phòng Khách hàng doanh nghiệp" },
        { value: "th", label: "Phòng Tổng hợp" },
        { value: "ktgs", label: "Phòng Kiểm tra giám sát nội bộ" },
        { value: "qlrr", label: "Phòng Kế hoạch & quản lý rủi ro" },
        { value: "gd", label: "Ban giám đốc" },
        { value: "kh", label: "Phòng Khách hàng" },
    ],
    cn6: [
        { value: "cn6-kt", label: "Kế toán & ngân quỹ" },
        { value: "cn6-kh", label: "Phòng Khách hàng" },
        { value: "cn6-gd", label: "Ban giám đốc" },
    ],
    nh: [
        { value: "nh-kt", label: "Kế toán & ngân quỹ" },
        { value: "nh-kh", label: "Phòng Khách hàng" },
        { value: "nh-gd", label: "Ban giám đốc" },
    ],
};

const branchLabelMap = branchOptions.reduce((acc, item) => {
    acc[item.value] = item.label;
    return acc;
}, {});

const getBranchLabel = (branchId) => branchLabelMap[branchId] || branchId || "";

const getDepartmentLabel = (branchId, departmentId) => {
    if (!departmentId) return "";
    const list = departmentOptionsByBranch[branchId] || [];
    return list.find((item) => item.value === departmentId)?.label || departmentId;
};
export default function DashboardPage() {
    const { user } = useAuth();
    const normalizedRole = (user?.role || "").toString().toLowerCase();
    const normalizedDepartment = (user?.department || "").toString().toLowerCase();
    const isQLRRManager = normalizedRole === "manager" && normalizedDepartment === "qlrr";
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [branch, setBranch] = useState("");
    const [department, setDepartment] = useState("");
    const [submissions, setSubmissions] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [parsedTable, setParsedTable] = useState(null);
    const [parsing, setParsing] = useState(false);
    const [parseError, setParseError] = useState("");
    const [exporting, setExporting] = useState(false);
    const [targetBranch, setTargetBranch] = useState("");
    const [targetDepartment, setTargetDepartment] = useState("");
    const applyResponse = useCallback((data) => {
        const rows = Array.isArray(data?.submissions) ? data.submissions : [];
        setBranch(data?.branch || "");
        setDepartment(data?.department || "");
        setSubmissions(rows);
        setSelectedId((prev) => {
            if (prev && rows.some((r) => r.id === prev)) return prev;
            return null;
        });
    }, []);
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError("");
            try {
                const { data } = await api.get(
                    "/exports/department-submissions"
                );
                if (cancelled) return;
                applyResponse(data);
            } catch (e) {
                if (cancelled) return;
                const msg =
                    e?.response?.data?.message ||
                    e.message ||
                    "Không thể tải dữ liệu";
                setError(msg);
                setBranch("");
                setDepartment("");
                setSubmissions([]);
                setSelectedId(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, [applyResponse]);

    useEffect(() => {
        if (!isQLRRManager) return;
        const preferredBranch = branch || user?.branch || "hs";
        setTargetBranch((prev) => prev || preferredBranch);
    }, [isQLRRManager, branch, user?.branch]);

    useEffect(() => {
        if (!isQLRRManager) return;
        const branchForOptions = targetBranch || branch || user?.branch || "hs";
        const options = departmentOptionsByBranch[branchForOptions] || [];
        setTargetDepartment((prev) =>
            prev && options.some((item) => item.value === prev) ? prev : ""
        );
    }, [isQLRRManager, targetBranch, branch, user?.branch]);
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        setError("");
        try {
            const { data } = await api.get("/exports/department-submissions");
            applyResponse(data);
        } catch (e) {
            const msg =
                e?.response?.data?.message ||
                e.message ||
                "Không thể tải dữ liệu";
            setError(msg);
            setBranch("");
            setDepartment("");
            setSubmissions([]);
            setSelectedId(null);
        } finally {
            setRefreshing(false);
        }
    }, [applyResponse]);

    const selectableDepartments = useMemo(() => {
        const branchId = targetBranch || branch || user?.branch || "hs";
        let list = departmentOptionsByBranch[branchId] || [];
        if (
            isQLRRManager &&
            normalizedDepartment &&
            (branchId === (branch || user?.branch || "hs"))
        ) {
            list = list.filter((item) => item.value !== normalizedDepartment);
        }
        return list;
    }, [targetBranch, branch, user?.branch, isQLRRManager, normalizedDepartment]);
    const handleExportSummary = useCallback(async () => {
        if (isQLRRManager && !targetDepartment) {
            message.warning("Vui lòng chọn phòng ban muốn xuất");
            return;
        }
        setExporting(true);
        try {
            const effectiveBranch = isQLRRManager
                ? targetBranch || branch || user?.branch || ""
                : branch;
            const effectiveDepartment = isQLRRManager
                ? targetDepartment
                : department;
            const res = await api.get("/exports/department-summary", {
                responseType: "blob",
                params: {
                    ...(effectiveBranch ? { branch: effectiveBranch } : {}),
                    ...(effectiveDepartment ? { department: effectiveDepartment } : {}),
                },
            });
            const blob = new Blob([res.data], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const sanitize = (value) =>
                String(value || "")
                    .trim()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .replace(/[^a-zA-Z0-9-_]+/g, "_") || "tong_hop";
            const stamp = new Date().toISOString().slice(0, 10);
            const branchLabel = getBranchLabel(effectiveBranch) || branch;
            const departmentLabel = getDepartmentLabel(
                effectiveBranch,
                effectiveDepartment
            ) || effectiveDepartment || department;
            const fileName = `Tong_ket_xep_loai_${sanitize(branchLabel)}_${sanitize(
                departmentLabel
            )}_${stamp}.xlsx`;
            saveAs(blob, fileName);
            message.success("Đã tải file tổng kết");
        } catch (e) {
            const msg =
                e?.response?.data?.message ||
                e.message ||
                "Xuất file tổng kết thất bại";
            message.error(msg);
        } finally {
            setExporting(false);
        }
    }, [
        branch,
        department,
        isQLRRManager,
        targetBranch,
        targetDepartment,
        user?.branch,
    ]);
    const handleViewForm = useCallback((record) => {
        if (!record?.id) return;
        setSelectedId(record.id);
        setIsModalVisible(true);
    }, []);
    const handleModalClose = useCallback(() => {
        setIsModalVisible(false);
        setParsedTable(null);
        setParseError("");
        setParsing(false);
    }, []);
    const columns = useMemo(
        () => [
            {
                title: "Tên nhân viên",
                dataIndex: "employeeName",
                key: "employeeName",
                render: (value, record) => (
                    <div>
                        <Text strong>{value || "-"}</Text>
                        {record?.employeeCode && (
                            <div style={{ fontSize: 12, color: "#666" }}>
                                Mã: {record.employeeCode}
                            </div>
                        )}
                    </div>
                ),
            },
            {
                title: "Thời gian nộp",
                dataIndex: "submittedAt",
                key: "submittedAt",
                width: 220,
                render: (value) => formatDateTime(value),
            },
            {
                title: "Tên file",
                dataIndex: "fileName",
                key: "fileName",
                ellipsis: true,
                render: (value) => value || "-",
            },
            {
                title: "Hành động",
                key: "actions",
                width: 140,
                render: (_, record) => (
                    <Button
                        type="link"
                        onClick={(event) => {
                            event.stopPropagation();
                            handleViewForm(record);
                        }}
                    >
                        Xem form
                    </Button>
                ),
            },
        ],
        [handleViewForm]
    );
    const selectedSubmission = useMemo(
        () => submissions.find((item) => item.id === selectedId) || null,
        [selectedId, submissions]
    );

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            setParsedTable(null);
            setParseError("");
            if (!isModalVisible || !selectedSubmission?.id) {
                setParsing(false);
                return;
            }
            setParsing(true);
            try {
                const res = await api.get(
                    `/exports/${selectedSubmission.id}/download`,
                    { responseType: "arraybuffer" }
                );
                if (cancelled) return;
                try {
                    const { table } = await parseExcelForViewer(res?.data);
                    if (cancelled) return;
                    setParsedTable(table || null);
                    setParseError("");
                } catch (err) {
                    console.warn("Parse excel failed", err);
                    if (cancelled) return;
                    setParsedTable(null);
                    setParseError(
                        "Không thể đọc dữ liệu từ file, hiển thị dữ liệu đã lưu"
                    );
                }
            } catch (err) {
                console.warn("Download excel failed", err);
                if (cancelled) return;
                setParsedTable(null);
                setParseError(
                    "Không tải được file, hiển thị dữ liệu đã lưu"
                );
            } finally {
                if (!cancelled) setParsing(false);
            }
        };
        run();
        return () => {
            cancelled = true;
        };
    }, [isModalVisible, selectedSubmission?.id]);

    const tableToRender = useMemo(() => {
        if (parsedTable && parsedTable.columns?.length && parsedTable.rows?.length)
            return parsedTable;
        const fallback = selectedSubmission?.table;
        if (fallback && fallback.columns?.length && fallback.rows?.length)
            return fallback;
        return null;
    }, [parsedTable, selectedSubmission]);

    const tableContent = (() => {
        if (loading) {
            return (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        padding: 40,
                    }}
                >
                    <Spin size="large" />
                </div>
            );
        }
        if (error) {
            return (
                <Alert
                    type="error"
                    message="Không thể tải dữ liệu"
                    description={error}
                    showIcon
                />
            );
        }
        if (!submissions.length) {
            return <Empty description="Chưa có nhân viên nào nộp form" />;
        }
        return (
            <Table
                rowKey="id"
                columns={columns}
                dataSource={submissions}
                pagination={false}
                onRow={(record) => ({
                    onClick: () => setSelectedId(record.id),
                    style: { cursor: "pointer", boxSizing: "border-box", lineHeight: 1, padding: 0},
                })}
                rowClassName={(record) =>
                    record.id === selectedId ? "ant-table-row-selected" : ""
                }
            />
        );
    })();
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
                            alt="logo"
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
                        Dashboard Quản lý
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
            <Content style={{ padding: "16px 24px 32px" }}>
                <div style={{ maxWidth: 1280, margin: "0 auto" }}>
                    <Space
                        direction="vertical"
                        size="large"
                        style={{ width: "100%" }}
                    >
                        {/* <Card>
                            <Space
                                direction="vertical"
                                size={4}
                                style={{ width: "100%" }}
                            >
                                <Space size={24} wrap>
                                    <div>
                                        <Text type="secondary">Chi nhánh:</Text>{" "}
                                        <Text strong>{branch || "-"}</Text>
                                    </div>
                                    <div>
                                        <Text type="secondary">Phòng ban:</Text>{" "}
                                        <Text strong>{department || "-"}</Text>
                                    </div>
                                    <div>
                                        <Text type="secondary">
                                            Số lượt nộp:
                                        </Text>{" "}
                                        <Text strong>{submissions.length}</Text>
                                    </div>
                                </Space>
                            </Space>
                        </Card> */}
                        <Card
                            title="Danh sách nhân viên đã nộp form"
                            extra={
                                <Space wrap>
                                    <Button
                                        icon={<ReloadOutlined />}
                                        onClick={handleRefresh}
                                        loading={refreshing}
                                    >
                                        Tải lại danh sách
                                    </Button>
                                    <Button
                                        type="primary"
                                        icon={<DownloadOutlined />}
                                        onClick={handleExportSummary}
                                        loading={exporting}
                                        disabled={
                                            loading ||
                                            (!isQLRRManager && !submissions.length) ||
                                            (isQLRRManager && !targetDepartment)
                                        }
                                    >
                                        Xuất tổng kết xếp loại
                                    </Button>
                                </Space>
                            }
                        >
                            {isQLRRManager && (
                                <Space
                                    wrap
                                    style={{ marginBottom: 16, width: "100%" }}
                                >
                                    <Select
                                        style={{ minWidth: 220 }}
                                        placeholder="Chọn chi nhánh"
                                        value={targetBranch || undefined}
                                        onChange={(value) => {
                                            setTargetBranch(value);
                                            setTargetDepartment("");
                                        }}
                                    >
                                        {branchOptions.map((option) => (
                                            <Select.Option
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </Select.Option>
                                        ))}
                                    </Select>
                                    <Select
                                        allowClear
                                        style={{ minWidth: 260 }}
                                        placeholder="Chọn phòng ban cần xuất"
                                        value={targetDepartment || undefined}
                                        onChange={(value) => setTargetDepartment(value || "")}
                                    >
                                        {selectableDepartments.map((option) => (
                                            <Select.Option
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </Select.Option>
                                        ))}
                                    </Select>
                                </Space>
                            )}
                            {tableContent}
                        </Card>
                    </Space>
                </div>
            </Content>
            <Modal
                title={`Review form của ${
                    selectedSubmission?.employeeName || "nhân viên"
                }`}
                open={isModalVisible}
                onCancel={handleModalClose}
                footer={null}
                width={1000}
                destroyOnClose
                centered
            >
                {parsing && (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 12,
                        }}
                    >
                        <Spin size="small" />
                        <span>Đang tải dữ liệu từ file...</span>
                    </div>
                )}
                {parseError && (
                    <Alert
                        type="warning"
                        message={parseError}
                        showIcon
                        style={{ marginBottom: 12 }}
                    />
                )}
                {tableToRender ? (
                    <SchemaTable
                        table={tableToRender}
                        cellInputs={{}}
                        computedByAddr={{}}
                        readOnly
                    />
                ) : (
                    !parsing && (
                        <Alert
                            type="info"
                            message="Bản ghi không có dữ liệu bảng để hiển thị"
                        />
                    )
                )}
                {selectedSubmission && (
                    <Space
                        size={24}
                        style={{
                            marginTop: 12,
                            flexWrap: "wrap",
                            display: "flex",
                        }}
                    >
                        <div>
                            <Text type="secondary">Thời gian nộp:</Text>{" "}
                            <Text strong>
                                {formatDateTime(selectedSubmission.submittedAt)}
                            </Text>
                        </div>
                        {selectedSubmission.fileName && (
                            <div>
                                <Text type="secondary">Tên file:</Text>{" "}
                                <Text strong>
                                    {selectedSubmission.fileName}
                                </Text>
                            </div>
                        )}
                    </Space>
                )}
            </Modal>
        </Layout>
    );
}
