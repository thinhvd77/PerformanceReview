import React, { useEffect, useMemo, useState } from "react";
import {
    Card,
    Typography,
    Space,
    Input,
    Button,
    Table,
    Tag,
    message,
    Select,
    Popconfirm,
} from "antd";
import {
    DownloadOutlined,
    SearchOutlined,
    ReloadOutlined,
    EyeOutlined,
    DeleteOutlined,
} from "@ant-design/icons";
import api from "../services/api.js";
import { saveAs } from "file-saver";
import { useAuth } from "../contexts/authContext.jsx";
import SavedExportModal from "./SavedExportModal.jsx";

const { Title, Text } = Typography;

const branchs = {
    hs: "Hội sở",
    cn6: "Chi nhánh 6",
    nh: "Chi nhánh Nam Hoa",
};

const departments = {
    kt: "Kế toán & ngân quỹ",
    pgd: "Phòng giao dịch Bình Tây",
    cn: "Phòng Khách hàng cá nhân",
    dn: "Phòng Khách hàng doanh nghiệp",
    th: "Phòng Tổng hợp",
    ktgs: "Phòng Kiểm tra giám sát nội bộ",
    qlrr: "Phòng Kế hoạch & quản lý rủi ro",
    kh: "Phòng Khách hàng",
    gd: "Ban giám đốc",
};

const quarterLabels = {
    1: "Quý I",
    2: "Quý II",
    3: "Quý III",
    4: "Quý IV",
};

const quarterValues = [1, 2, 3, 4];

export default function ExportsTab() {
    const [q, setQ] = useState("");
    const [branchFilter, setBranchFilter] = useState(null);
    const [departmentFilter, setDepartmentFilter] = useState(null);
    const [quarterFilter, setQuarterFilter] = useState(null);
    const [yearFilter, setYearFilter] = useState(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [downloadingId, setDownloadingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedExportId, setSelectedExportId] = useState(null);
    const { isAdmin } = useAuth();

    // Extract unique branch and department options from data
    const branchOptions = useMemo(() => {
        const optionMap = new Map();
        Object.entries(branchs).forEach(([value, label]) => {
            optionMap.set(value, label);
        });
        rows.forEach((r) => {
            if (r?.branch && !optionMap.has(r.branch)) {
                optionMap.set(r.branch, branchs[r.branch] || r.branch);
            }
        });
        return Array.from(optionMap.entries())
            .map(([value, label]) => ({ value, label }))
            .sort((a, b) => a.label.localeCompare(b.label, "vi"));
    }, [rows]);

    const departmentOptions = useMemo(() => {
        const optionMap = new Map();
        Object.entries(departments).forEach(([value, label]) => {
            optionMap.set(value, label);
        });
        rows.forEach((r) => {
            if (r?.department && !optionMap.has(r.department)) {
                optionMap.set(
                    r.department,
                    departments[r.department] || r.department
                );
            }
        });
        return Array.from(optionMap.entries())
            .map(([value, label]) => ({ value, label }))
            .sort((a, b) => a.label.localeCompare(b.label, "vi"));
    }, [rows]);

    const yearOptions = useMemo(() => {
        const uniqueYears = new Set();
        if (yearFilter) uniqueYears.add(yearFilter);
        rows.forEach((r) => {
            if (r?.year) uniqueYears.add(r.year);
        });
        return Array.from(uniqueYears).sort((a, b) => b - a);
    }, [rows, yearFilter]);

    const fetchList = async (overrides = {}) => {
        setLoading(true);
        try {
            const hasOverride = (key) =>
                Object.prototype.hasOwnProperty.call(overrides, key);
            const resolvedPage = hasOverride("page") ? overrides.page : page;
            const resolvedPageSize = hasOverride("pageSize")
                ? overrides.pageSize
                : pageSize;
            const resolvedQ = hasOverride("q") ? overrides.q : q;
            const resolvedBranch = hasOverride("branchId")
                ? overrides.branchId
                : branchFilter;
            const resolvedDepartment = hasOverride("departmentId")
                ? overrides.departmentId
                : departmentFilter;
            const resolvedQuarter = hasOverride("quarter")
                ? overrides.quarter
                : quarterFilter;
            const resolvedYear = hasOverride("year")
                ? overrides.year
                : yearFilter;

            const params = {
                page: resolvedPage,
                pageSize: resolvedPageSize,
            };

            const trimmedQ = (resolvedQ || "").toString().trim();
            if (trimmedQ) params.q = trimmedQ;
            if (resolvedBranch) params.branchId = resolvedBranch;
            if (resolvedDepartment) params.departmentId = resolvedDepartment;
            if (resolvedQuarter) params.quarter = resolvedQuarter;
            if (resolvedYear) params.year = resolvedYear;

            const { data } = await api.get("/exports", { params });

            setRows(data?.data || []);
            setTotal(data?.total || 0);
            if (typeof data?.page === "number") setPage(data.page);
            if (typeof data?.pageSize === "number") setPageSize(data.pageSize);
        } catch (e) {
            const msg =
                e?.response?.data?.message ||
                e.message ||
                "Tải danh sách thất bại";
            message.error(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchList().then();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        page,
        pageSize,
        branchFilter,
        departmentFilter,
        quarterFilter,
        yearFilter,
    ]);

    const onSearch = () => {
        setPage(1);
        fetchList({ page: 1 }).then();
    };

    const onClearFilters = () => {
        setQ("");
        setBranchFilter(null);
        setDepartmentFilter(null);
        setQuarterFilter(null);
        setYearFilter(null);
        setPage(1);
    };

    const handleDownload = async (record) => {
        if (!record?.id) return;
        setDownloadingId(record.id);
        try {
            const res = await api.get(`/exports/${record.id}/download`, {
                responseType: "blob",
            });
            const blob = new Blob([res.data], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const name = record.fileName || `export-${record.id}.xlsx`;
            saveAs(blob, name);
        } catch (e) {
            const msg =
                e?.response?.data?.message || e.message || "Tải file thất bại";
            message.error(msg);
        } finally {
            setDownloadingId(null);
        }
    };

    const handleView = (record) => {
        setSelectedExportId(record.id);
        setViewModalOpen(true);
    };

    const handleCloseModal = () => {
        setViewModalOpen(false);
        setSelectedExportId(null);
    };

    const handleDelete = async (record) => {
        if (!record?.id) return;
        setDeletingId(record.id);
        try {
            await api.delete(`/exports/${record.id}`);
            message.success("Đã xóa form đã nộp");
            await fetchList();
        } catch (e) {
            const msg =
                e?.response?.data?.message || e.message || "Xóa form thất bại";
            message.error(msg);
        } finally {
            setDeletingId(null);
        }
    };

    const formatVietnameseDateTime = (dateString) => {
        if (!dateString) return "-";
        try {
            const date = new Date(dateString);
            return date.toLocaleString("vi-VN", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
            });
        } catch (e) {
            return dateString;
        }
    };

    const columns = [
        {
            title: "Mã nhân viên",
            render: (_, r) => r?.employee_code || "-",
            width: 180,
        },
        {
            title: "Họ và tên",
            width: 250,
            key: "employee",
            render: (_, r) => r?.employee_name || "-",
        },
        {
            title: "Chi nhánh",
            key: "branch",
            render: (_, r) => (
                <span>
                    {r?.branch && (
                        <Tag color="geekblue">{branchs[r.branch] || "-"}</Tag>
                    )}
                </span>
            ),
        },
        {
            title: "Phòng ban",
            key: "dept",
            render: (_, r) => (
                <span>
                    {r?.department && (
                        <Tag color="green">
                            {departments[r.department] || "-"}
                        </Tag>
                    )}
                </span>
            ),
        },
        {
            title: "Quý",
            dataIndex: "quarter",
            width: 120,
            render: (value) =>
                value ? (
                    <Tag color="purple">
                        {quarterLabels[value] || `Quý ${value}`}
                    </Tag>
                ) : (
                    "-"
                ),
        },
        {
            title: "Năm",
            dataIndex: "year",
            width: 120,
            render: (value) => value || "-",
        },
        {
            title: "Tạo lúc",
            dataIndex: "createdAt",
            width: 200,
            render: (text) => formatVietnameseDateTime(text),
        },
        {
            title: "Hành động",
            key: "actions",
            width: 200,
            render: (_, r) => (
                <Space>
                    <Button
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => handleView(r)}
                    >
                        Xem
                    </Button>
                    <Button
                        size="small"
                        type="primary"
                        icon={<DownloadOutlined />}
                        loading={downloadingId === r.id}
                        onClick={() => handleDownload(r)}
                    >
                        Tải
                    </Button>
                    {isAdmin && (
                        <Popconfirm
                            title="Bạn có chắc muốn xóa form này?"
                            okText="Xóa"
                            cancelText="Hủy"
                            onConfirm={() => handleDelete(r)}
                        >
                            <Button
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                disabled={deletingId === r.id || loading}
                            >
                                Xóa
                            </Button>
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div style={{ maxWidth: 1300, margin: "0 auto" }}>
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <Title level={4} style={{ margin: 0 }}>
                    Danh sách file form đã lưu
                </Title>
                <Card>
                    <div
                        style={{
                            display: "flex",
                            gap: 8,
                            marginBottom: 12,
                            flexWrap: "wrap",
                        }}
                    >
                        <Input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Tìm theo tên nhân viên..."
                            onPressEnter={onSearch}
                            style={{ maxWidth: 360 }}
                        />
                        <Select
                            value={branchFilter ?? undefined}
                            onChange={(value) => {
                                setBranchFilter(value ?? null);
                                setPage(1);
                            }}
                            placeholder="Lọc theo chi nhánh..."
                            style={{ minWidth: 200 }}
                            optionFilterProp="children"
                            allowClear
                            showSearch
                        >
                            {branchOptions.map((branch) => (
                                <Select.Option
                                    key={branch.value}
                                    value={branch.value}
                                >
                                    {branch.label}
                                </Select.Option>
                            ))}
                        </Select>
                        <Select
                            value={departmentFilter ?? undefined}
                            onChange={(value) => {
                                setDepartmentFilter(value ?? null);
                                setPage(1);
                            }}
                            placeholder="Lọc theo phòng ban..."
                            style={{ minWidth: 200 }}
                            optionFilterProp="children"
                            allowClear
                            showSearch
                        >
                            {departmentOptions.map((department) => (
                                <Select.Option
                                    key={department.value}
                                    value={department.value}
                                >
                                    {department.label}
                                </Select.Option>
                            ))}
                        </Select>
                        <Select
                            value={quarterFilter ?? undefined}
                            onChange={(value) => {
                                setQuarterFilter(value ?? null);
                                setPage(1);
                            }}
                            placeholder="Lọc theo quý..."
                            style={{ minWidth: 160 }}
                            allowClear
                        >
                            {quarterValues.map((quarter) => (
                                <Select.Option key={quarter} value={quarter}>
                                    {quarterLabels[quarter] || `Quý ${quarter}`}
                                </Select.Option>
                            ))}
                        </Select>
                        <Select
                            value={yearFilter ?? undefined}
                            onChange={(value) => {
                                setYearFilter(value ?? null);
                                setPage(1);
                            }}
                            placeholder="Lọc theo năm..."
                            style={{ minWidth: 140 }}
                            allowClear
                            showSearch
                        >
                            {yearOptions.map((year) => (
                                <Select.Option key={year} value={year}>
                                    {year}
                                </Select.Option>
                            ))}
                        </Select>
                        <Button
                            type="primary"
                            icon={<SearchOutlined />}
                            onClick={onSearch}
                            loading={loading}
                        >
                            Tìm
                        </Button>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={onClearFilters}
                            disabled={loading}
                        >
                            Xóa bộ lọc
                        </Button>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => fetchList()}
                            disabled={loading}
                        >
                            Làm mới
                        </Button>
                    </div>

                    <Table
                        rowKey="id"
                        loading={loading}
                        columns={columns}
                        dataSource={rows}
                        pagination={{
                            current: page,
                            pageSize,
                            total,
                            showSizeChanger: true,
                            pageSizeOptions: [10, 20, 50, 100],
                            onChange: (p, ps) => {
                                setPage(p);
                                setPageSize(ps);
                            },
                            showTotal: (t) => `${t} bản ghi`,
                        }}
                    />
                </Card>
            </Space>

            <SavedExportModal
                open={viewModalOpen}
                exportId={selectedExportId}
                onClose={handleCloseModal}
            />
        </div>
    );
}
