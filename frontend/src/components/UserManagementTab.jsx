import React, { useEffect, useMemo, useState } from "react";
import {
    Card,
    Row,
    Col,
    DatePicker,
    Form,
    Input,
    Button,
    Select,
    Space,
    Table,
    Typography,
    message,
    Modal,
    Popconfirm,
} from "antd";
import { PlusCircleOutlined, SearchOutlined } from "@ant-design/icons";
import { authService } from "../services/authService.js";
import { userService } from "../services/userService.js";

const { Title } = Typography;

const branchOptions = {
    hs: "Hội sở",
    cn6: "Chi nhánh 6",
    nh: "Chi nhánh Nam Hoa",
};

const departmentOptions = {
    kt: "Kế toán & ngân quỹ",
    pgd: "Phòng giao dịch Bình Tây",
    kh: "Khách hàng",
    cn: "Khách hàng cá nhân",
    dn: "Khách hàng doanh nghiệp",
    th: "Tổng hợp",
    ktgs: "Kiểm tra giám sát nội bộ",
    qlrr: "Kế hoạch & quản lý rủi ro",
    gd: "Ban Giám đốc",
};

const findBranchName = (code) => branchOptions[code] || code;
const findDepartmentName = (code) => departmentOptions[code] || code;

export default function UserManagementTab() {
    const [filters, setFilters] = useState({
        search: "",
        role: "",
        branch: "",
        department: "",
        startDate: null,
        endDate: null,
        page: 1,
        pageSize: 10,
    });
    const [filterForm] = Form.useForm();
    const [form] = Form.useForm();
    const [creating, setCreating] = useState(false);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    const handleCreateModalClose = () => {
        if (creating) return;
        form.resetFields();
        setOpen(false);
    };

    const loadUsers = async (params = filters) => {
        setLoading(true);
        try {
            const res = await userService.list({
                branch: params.branch,
                department: params.department,
                search: params.search,
                page: params.page,
                pageSize: params.pageSize,
            });
            setUsers(res.data || []);
            setFilters((prev) => ({
                ...prev,
                total: res.metadata?.total || 0,
                totalPages: res.metadata?.totalPages || 1,
            }));
        } catch (e) {
            message.error(e?.response?.data?.message || "Failed to load users");
        } finally {
            setLoading(false);
        }
    };
    const onFinish = async (values) => {
        setCreating(true);
        try {
            // Prefer backend admin create; fallback to register if unauthorized
            try {
                const res = await authService.register(values);
                message.success("User created");
                setUsers((prev) => [...prev, res.user]);
            } catch (err) {
                message.error(
                    err?.response?.data?.message || "Failed to create user"
                );
            }
            form.resetFields();
            setOpen(false);
        } catch (e) {
            message.error(
                e?.response?.data?.message || "Failed to create user"
            );
        } finally {
            setCreating(false);
        }
    };

    const onEditFinish = async (values) => {
        if (!currentUser) return;
        console.log(currentUser, values);
        setEditing(true);
        try {
            const res = await userService.update(values.username, values);
            message.success("User updated");
            // Update user in list
            setUsers((prev) =>
                prev.map((u) =>
                    u.username === currentUser.username ? res.user : u
                )
            );
            setEditOpen(false);
            setCurrentUser(null);
        } catch (e) {
            message.error(
                e?.response?.data?.message || "Failed to update user"
            );
        } finally {
            setEditing(false);
        }
    };

    const onDelete = async (u) => {
        try {
            await userService.remove(u.username);
            message.success("User deleted");
            setUsers((prev) => prev.filter((x) => x.username !== u.username));
        } catch (e) {
            message.error(
                e?.response?.data?.message || "Failed to delete user"
            );
        }
    };

    const handleTableChange = (pagination) => {
        const { current, pageSize } = pagination;
        setFilters((prev) => ({
            ...prev,
            page: current,
            pageSize,
        }));
        loadUsers({
            ...filters,
            page: current,
            pageSize,
        });
    };

    const tableData = useMemo(
        () =>
            (users || []).map((user) => ({
                ...user,
                key: user.id ?? user.username,
            })),
        [users]
    );

    const columns = [
        {
            title: "Họ và Tên",
            dataIndex: "fullname",
            key: "fullname",
            render: (_, record) => record.fullname || record.username,
        },
        {
            title: "Tài khoản",
            dataIndex: "username",
            key: "username",
        },
        {
            title: "Vai trò",
            dataIndex: "role",
            key: "role",
        },
        {
            title: "Chi nhánh",
            dataIndex: "branch",
            key: "branch",
            render: (value) => (value ? findBranchName(value) : "—"),
        },
        {
            title: "Phòng ban",
            dataIndex: "department",
            key: "department",
            render: (value) => (value ? findDepartmentName(value) : "—"),
        },
        {
            title: "Thao tác",
            key: "actions",
            render: (_, record) => (
                <Space>
                    <Button
                        size="small"
                        onClick={() => {
                            setCurrentUser(record);
                            setEditOpen(true);
                        }}
                    >
                        Edit
                    </Button>
                    <Popconfirm
                        title={`Delete user ${record.username}?`}
                        okText="Delete"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => onDelete(record)}
                    >
                        <Button size="small" danger>
                            Delete
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    useEffect(() => {
        loadUsers();
    }, []);

    return (
        <Space direction="vertical" style={{ width: "100%" }} size="large">
            <Card>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={8}>
                        <label>Tìm kiếm</label>
                        <Input
                            prefix={<SearchOutlined />}
                            placeholder="Search by name or username"
                            size="large"
                            onChange={(e) => {
                                setFilters((prev) => ({
                                    ...prev,
                                    search: e.target.value,
                                }));
                                loadUsers({
                                    ...filters,
                                    search: e.target.value,
                                    page: 1,
                                });
                            }}
                        />
                    </Col>
                    <Col span={8}>
                        <label style={{ display: "block" }}>Chi nhánh</label>
                        <Select
                            style={{ width: "100%" }}
                            size="large"
                            onChange={(value) => {
                                setFilters((prev) => ({
                                    ...prev,
                                    branch: value,
                                }));
                                loadUsers({
                                    ...filters,
                                    branch: value,
                                    page: 1,
                                });
                            }}
                            placeholder="-- Chọn chi nhánh --"
                            options={[
                                { value: "hs", label: "Hội sở" },
                                { value: "cn6", label: "Chi nhánh 6" },
                                { value: "nh", label: "Chi nhánh Nam Hoa" },
                            ]}
                        />
                    </Col>
                    <Col span={8}>
                        <label style={{ display: "block" }}>Phòng ban</label>
                        <Select
                            size="large"
                            style={{ width: "100%" }}
                            placeholder="-- Chọn phòng ban --"
                            onChange={(value) => {
                                setFilters((prev) => ({
                                    ...prev,
                                    department: value,
                                }));
                                loadUsers({
                                    ...filters,
                                    department: value,
                                    page: 1,
                                });
                            }}
                            options={[
                                {
                                    value: "kt",
                                    label: "Kế toán & ngân quỹ",
                                },
                                {
                                    value: "pgd",
                                    label: "Phòng giao dịch Bình Tây",
                                },
                                { value: "kh", label: "Khách hàng" },
                                {
                                    value: "cn",
                                    label: "Khách hàng cá nhân",
                                },
                                {
                                    value: "dn",
                                    label: "Khách hàng doanh nghiệp",
                                },
                                { value: "th", label: "Tổng hợp" },
                                {
                                    value: "ktgs",
                                    label: "Kiểm tra giám sát nội bộ",
                                },
                                {
                                    value: "qlrr",
                                    label: "Kế hoạch & quản lý rủi ro",
                                },
                                { value: "gd", label: "Ban Giám đốc" },
                            ]}
                        />
                    </Col>
                </Row>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={24} style={{ textAlign: "right" }}>
                        <Space>
                            <Button
                                icon={<PlusCircleOutlined />}
                                size="large"
                                color="danger"
                                variant="solid"
                                style={{
                                    fontWeight: "bold",
                                    fontSize: "16px",
                                }}
                                onClick={() => setOpen(true)}
                            >
                                Tạo mới
                            </Button>
                        </Space>
                    </Col>
                </Row>
                <Row>
                    <Col span={24}>
                        <Table
                            tableLayout="auto"
                            columns={columns}
                            dataSource={tableData}
                            loading={loading}
                            pagination={{
                                current: filters.page,
                                pageSize: filters.pageSize,
                                total: filters.total ?? tableData.length,
                                showSizeChanger: true,
                            }}
                            onChange={handleTableChange}
                            rowKey="key"
                            locale={{ emptyText: "No users found." }}
                        />
                    </Col>
                </Row>
            </Card>
            <Modal
                title={
                    <Title level={5} style={{ margin: 0 }}>
                        Tạo mới người dùng
                    </Title>
                }
                open={open}
                onCancel={handleCreateModalClose}
                footer={null}
                destroyOnHidden={true}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    autoComplete="off"
                >
                    <Form.Item
                        label="Tài khoản"
                        name="username"
                        rules={[
                            {
                                required: true,
                                message: "Vui lòng điền tài khoản",
                            },
                        ]}
                    >
                        <Input placeholder="Tài khoản" autoComplete="off" />
                    </Form.Item>
                    <Form.Item
                        label="Mật khẩu"
                        name="password"
                        rules={[
                            {
                                required: true,
                                message: "Vui lòng điền mật khẩu",
                            },
                        ]}
                    >
                        <Input.Password
                            placeholder="Mật khẩu"
                            autoComplete="new-password"
                        />
                    </Form.Item>
                    <Form.Item
                        label="Họ và Tên"
                        name="fullname"
                        rules={[
                            {
                                required: true,
                                message: "Vui lòng điền họ và tên",
                            },
                        ]}
                    >
                        <Input placeholder="Họ và Tên" autoComplete="off" />
                    </Form.Item>
                    <Form.Item
                        label="Chi nhánh"
                        name="branch"
                        rules={[
                            {
                                required: true,
                                message: "Vui lòng điền chi nhánh",
                            },
                        ]}
                    >
                        <Select
                            placeholder="-- Chọn chi nhánh --"
                            options={[
                                { value: "hs", label: "Hội sở" },
                                { value: "cn6", label: "Chi nhánh 6" },
                                { value: "nh", label: "Chi nhánh Nam Hoa" },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item
                        label="Phòng ban"
                        name="department"
                        rules={[
                            {
                                required: true,
                                message: "Vui lòng điền phòng ban",
                            },
                        ]}
                    >
                        <Select
                            placeholder="-- Chọn phòng ban --"
                            options={[
                                { value: "kt", label: "Kế toán & ngân quỹ" },
                                {
                                    value: "pgd",
                                    label: "Phòng giao dịch Bình Tây",
                                },
                                { value: "kh", label: "Khách hàng" },
                                { value: "cn", label: "Khách hàng cá nhân" },
                                {
                                    value: "dn",
                                    label: "Khách hàng doanh nghiệp",
                                },
                                { value: "th", label: "Tổng hợp" },
                                {
                                    value: "ktgs",
                                    label: "Kiểm tra giám sát nội bộ",
                                },
                                {
                                    value: "qlrr",
                                    label: "Kế hoạch & quản lý rủi ro",
                                },
                                { value: "gd", label: "Ban Giám đốc" },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item
                        label="Vai trò"
                        name="role"
                        rules={[{ required: true }]}
                    >
                        <Select
                            placeholder="-- Chọn vai trò --"
                            options={[
                                { value: "admin", label: "Admin" },
                                {
                                    value: "employee",
                                    label: "Nhân viên",
                                },
                                { value: "manager", label: "Quản lý" },
                            ]}
                            style={{ maxWidth: 240 }}
                        />
                    </Form.Item>
                    <Form.Item>
                        <Space>
                            <Button
                                onClick={handleCreateModalClose}
                                disabled={creating}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={creating}
                            >
                                Create
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
            <Modal
                title={
                    <Title level={5} style={{ margin: 0 }}>
                        Edit User
                    </Title>
                }
                open={editOpen}
                onCancel={() => {
                    if (!editing) {
                        setEditOpen(false);
                        setCurrentUser(null);
                    }
                }}
                footer={null}
                destroyOnHidden={true}
            >
                <Form
                    layout="vertical"
                    onFinish={onEditFinish}
                    initialValues={currentUser || {}}
                    autoComplete="off"
                >
                    <Form.Item
                        label="Họ và Tên"
                        name="fullname"
                        rules={[
                            {
                                required: true,
                                message: "Vui lòng điền họ và tên",
                            },
                        ]}
                    >
                        <Input placeholder="Họ và Tên" autoComplete="off" />
                    </Form.Item>
                    <Form.Item
                        label="Chi nhánh"
                        name="branch"
                        rules={[
                            {
                                required: true,
                                message: "Vui lòng điền chi nhánh",
                            },
                        ]}
                    >
                        <Select
                            placeholder="-- Chọn chi nhánh --"
                            options={[
                                { value: "hs", label: "Hội sở" },
                                { value: "cn6", label: "Chi nhánh 6" },
                                { value: "nh", label: "Chi nhánh Nam Hoa" },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item
                        label="Phòng ban"
                        name="department"
                        rules={[
                            {
                                required: true,
                                message: "Vui lòng điền phòng ban",
                            },
                        ]}
                    >
                        <Select
                            placeholder="-- Chọn phòng ban --"
                            options={[
                                { value: "kt", label: "Kế toán & ngân quỹ" },
                                {
                                    value: "pgd",
                                    label: "Phòng giao dịch Bình Tây",
                                },
                                { value: "kh", label: "Khách hàng" },
                                { value: "cn", label: "Khách hàng cá nhân" },
                                {
                                    value: "dn",
                                    label: "Khách hàng doanh nghiệp",
                                },
                                { value: "th", label: "Tổng hợp" },
                                {
                                    value: "ktgs",
                                    label: "Kiểm tra giám sát nội bộ",
                                },
                                {
                                    value: "qlrr",
                                    label: "Kế hoạch & quản lý rủi ro",
                                },
                                { value: "gd", label: "Ban Giám đốc" },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item
                        label="Tài khoản"
                        name="username"
                        rules={[
                            {
                                required: true,
                                message: "Vui lòng điền tài khoản",
                            },
                        ]}
                    >
                        <Input placeholder="Tài khoản" autoComplete="off" />
                    </Form.Item>
                    <Form.Item label="Mật khẩu mới (tuỳ chọn)" name="password">
                        <Input.Password
                            placeholder="Để trống nếu không đổi"
                            autoComplete="new-password"
                        />
                    </Form.Item>

                    <Form.Item
                        label="Vai trò"
                        name="role"
                        rules={[{ required: true }]}
                    >
                        <Select
                            options={[
                                { value: "admin", label: "Admin" },
                                {
                                    value: "employee",
                                    label: "Nhân viên",
                                },
                                { value: "manager", label: "Quản lý" },
                            ]}
                            style={{ maxWidth: 240 }}
                        />
                    </Form.Item>
                    <Form.Item>
                        <Space>
                            <Button
                                onClick={() => {
                                    setEditOpen(false);
                                    setCurrentUser(null);
                                }}
                                disabled={editing}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={editing}
                            >
                                Save
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </Space>
    );
}
