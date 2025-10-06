import React, { useMemo, useState } from "react";
import {
    Upload,
    Button,
    Space,
    message,
    Typography,
    Card,
    Descriptions,
    Select,
    Row,
    Col,
    Tag,
    List,
    Modal,
} from "antd";
import {
    InboxOutlined,
    UploadOutlined,
    PlusOutlined,
    DeleteOutlined,
    ExclamationCircleOutlined,
} from "@ant-design/icons";
import api from "../services/api.js";
import { orgData, findNameById } from "../data/orgData.js";

const { Dragger } = Upload;
const { Paragraph } = Typography;

export default function ImportTab() {
    const [fileList, setFileList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [checkingDuplicates, setCheckingDuplicates] = useState(false);
    const [duplicateWarningVisible, setDuplicateWarningVisible] =
        useState(false);
    const [duplicateForms, setDuplicateForms] = useState([]);
    const [pendingImportData, setPendingImportData] = useState(null);

    const [branchId, setBranchId] = useState();
    const departments = useMemo(
        () => (branchId ? orgData.departments[branchId] || [] : []),
        [branchId]
    );
    const [departmentId, setDepartmentId] = useState();
    const positions = useMemo(
        () => (departmentId ? orgData.positions[departmentId] || [] : []),
        [departmentId]
    );
    const [positionId, setPositionId] = useState();

    // Multiple groups state
    const [groups, setGroups] = useState([]);

    const addGroup = () => {
        if (!branchId || !departmentId || !positionId) {
            message
                .warning("Vui lòng chọn Chi nhánh, Phòng ban, Chức vụ trước.")
                .then();
            return;
        }
        const newGroup = { branchId, departmentId, positionId };
        const exists = groups.some(
            (g) =>
                g.branchId === branchId &&
                g.departmentId === departmentId &&
                g.positionId === positionId
        );
        if (exists) {
            message.info("Nhóm đã được thêm").then();
            return;
        }
        setGroups((prev) => [...prev, newGroup]);
    };

    const removeGroup = (idx) => {
        setGroups((prev) => prev.filter((_, i) => i !== idx));
    };

    // Normalize text for comparison (remove accents, spaces, special chars)
    const normalizeText = (text) => {
        if (!text) return "";
        return text
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
            .replace(/[^a-z0-9]/g, "") // Keep only alphanumeric
            .trim();
    };

    // Calculate similarity between two strings
    const calculateSimilarity = (str1, str2) => {
        const norm1 = normalizeText(str1);
        const norm2 = normalizeText(str2);

        if (!norm1 || !norm2) return 0;
        if (norm1 === norm2) return 1;

        // Check if one contains the other
        if (norm1.includes(norm2) || norm2.includes(norm1)) {
            const longer = Math.max(norm1.length, norm2.length);
            const shorter = Math.min(norm1.length, norm2.length);
            return shorter / longer;
        }

        // Levenshtein distance-based similarity
        const matrix = [];
        const len1 = norm1.length;
        const len2 = norm2.length;

        for (let i = 0; i <= len1; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= len2; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = norm1[i - 1] === norm2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }

        const maxLen = Math.max(len1, len2);
        return maxLen > 0 ? (maxLen - matrix[len1][len2]) / maxLen : 0;
    };

    // Check for duplicate forms before importing
    const checkForDuplicates = async (fileName) => {
        try {
            const { data: existingForms } = await api.get("/forms");

            // Check for forms with similar names or assigned to same groups
            const duplicates = existingForms.filter((form) => {
                // Check by form name similarity with improved logic
                let nameMatch = false;
                if (form.name && fileName) {
                    const similarity = calculateSimilarity(form.name, fileName);
                    // Consider it a match if similarity is >= 99% or if one contains significant part of the other
                    nameMatch = similarity >= 0.99;

                    // Additional check for patterns like "Mau_01_CV" vs "Mau_01_CV_XLN"
                    const norm1 = normalizeText(form.name);
                    const norm2 = normalizeText(fileName);
                    if (norm1.length >= 5 && norm2.length >= 5) {
                        // If the shorter string is at least 70% contained in the longer one
                        const shorter =
                            norm1.length < norm2.length ? norm1 : norm2;
                        const longer =
                            norm1.length < norm2.length ? norm2 : norm1;
                        if (
                            longer.includes(shorter) &&
                            shorter.length / longer.length >= 0.7
                        ) {
                            nameMatch = true;
                        }
                    }
                }

                // Check by assigned groups overlap
                const groupMatch = groups.some((newGroup) => {
                    if (Array.isArray(form.assignedGroups)) {
                        return form.assignedGroups.some(
                            (existingGroup) =>
                                existingGroup?.branchId === newGroup.branchId &&
                                existingGroup?.departmentId ===
                                    newGroup.departmentId &&
                                existingGroup?.positionId ===
                                    newGroup.positionId
                        );
                    }
                    if (form.assignedGroup) {
                        return (
                            form.assignedGroup?.branchId ===
                                newGroup.branchId &&
                            form.assignedGroup?.departmentId ===
                                newGroup.departmentId &&
                            form.assignedGroup?.positionId ===
                                newGroup.positionId
                        );
                    }
                    return false;
                });

                return nameMatch || groupMatch;
            });

            return duplicates;
        } catch (error) {
            console.warn("Error checking for duplicates:", error);
            return [];
        }
    };

    const props = {
        multiple: false,
        accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel",
        beforeUpload: (file) => {
            setFileList([file]);
            setResult(null);
            return false; // prevent auto-upload
        },
        onRemove: () => {
            setFileList([]);
        },
        fileList,
    };

    const handleImport = async () => {
        if (!fileList.length) {
            message.warning("Vui lòng chọn file để import.");
            return;
        }
        if (groups.length === 0) {
            message.warning("Vui lòng thêm ít nhất một nhóm trước khi import.");
            return;
        }

        // Check for duplicates first
        setCheckingDuplicates(true);
        try {
            const fileName = fileList[0].name.replace(/\.[^/.]+$/, ""); // Remove extension
            const duplicates = await checkForDuplicates(fileName);

            if (duplicates.length > 0) {
                // Show warning modal
                setDuplicateForms(duplicates);
                setPendingImportData({
                    file: fileList[0],
                    groups: [...groups],
                    fileName,
                });
                setDuplicateWarningVisible(true);
                setCheckingDuplicates(false);
                return;
            }

            // No duplicates, proceed with import
            await performImport();
        } catch (error) {
            console.error("Error during duplicate check:", error);
            // If duplicate check fails, proceed with import anyway
            await performImport();
        } finally {
            setCheckingDuplicates(false);
        }
    };

    const performImport = async () => {
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("file", fileList[0]);
            formData.append("assignedGroups", JSON.stringify(groups));
            // Backward compatibility: also include the first triplet
            const first = groups[0];
            formData.append("branchId", first.branchId);
            formData.append("departmentId", first.departmentId);
            formData.append("positionId", first.positionId);
            const res = await api.post("/files/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            const data = res.data;
            setResult(data);
            message.success(data?.message || `Imported: ${fileList[0].name}`);
            setFileList([]);
            setGroups([]);
        } catch (e) {
            const msg =
                e?.response?.data?.message ||
                e.message ||
                "Import không thành công.";
            message.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmImport = async () => {
        setDuplicateWarningVisible(false);
        setDuplicateForms([]);
        setPendingImportData(null);
        await performImport();
    };

    const handleCancelImport = () => {
        setDuplicateWarningVisible(false);
        setDuplicateForms([]);
        setPendingImportData(null);
        message.info("Import đã bị hủy");
    };

    const assignedGroups = result?.formTemplate?.assignedGroups;
    const assigned = result?.formTemplate?.assignedGroup;

    return (
        <Card>
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <Paragraph type="primary" style={{ margin: 0 }}>
                    Chọn Chi nhánh, Phòng ban, Chức vụ → bấm Thêm nhóm cho từng
                    phân công → tải lên tệp CSV hoặc Excel.
                </Paragraph>

                <Row gutter={[12, 6]} style={{ padding: 0, margin: 0 }}>
                    <Col xs={24} md={6}>
                        <label
                            style={{
                                display: "block",
                                marginBottom: 8,
                                fontSize: "16px",
                                fontWeight: "600",
                            }}
                        >
                            Chi nhánh
                        </label>
                        <Select
                            placeholder="-- Chọn chi nhánh --"
                            value={branchId}
                            onChange={(v) => {
                                setBranchId(v);
                                setDepartmentId(undefined);
                                setPositionId(undefined);
                            }}
                            options={(orgData.branches || []).map((b) => ({
                                value: b.id,
                                label: b.name,
                            }))}
                            style={{ width: "100%" }}
                        />
                    </Col>
                    <Col xs={24} md={6}>
                        <label
                            style={{
                                display: "block",
                                marginBottom: 8,
                                fontSize: "16px",
                                fontWeight: "600",
                            }}
                        >
                            Phòng ban
                        </label>
                        <Select
                            placeholder="-- Chọn phòng ban --"
                            value={departmentId}
                            onChange={(v) => {
                                setDepartmentId(v);
                                setPositionId(undefined);
                            }}
                            options={departments.map((d) => ({
                                value: d.id,
                                label: d.name,
                            }))}
                            disabled={!branchId}
                            style={{ width: "100%" }}
                        />
                    </Col>
                    <Col xs={24} md={6}>
                        <label
                            style={{
                                display: "block",
                                marginBottom: 8,
                                fontSize: "16px",
                                fontWeight: "600",
                            }}
                        >
                            Chức vụ
                        </label>
                        <Select
                            placeholder="-- Chọn chức vụ --"
                            value={positionId}
                            onChange={(v) => setPositionId(v)}
                            options={positions.map((p) => ({
                                value: p.id,
                                label: p.name,
                            }))}
                            disabled={!departmentId}
                            style={{ width: "100%" }}
                        />
                    </Col>
                    <Col xs={24} md={6}>
                        <label
                            style={{
                                display: "block",
                                marginBottom: 8,
                                fontSize: "16px",
                                fontWeight: "600",
                            }}
                        >
                            Thêm
                        </label>
                        <Button
                            icon={<PlusOutlined />}
                            onClick={addGroup}
                            disabled={!branchId || !departmentId || !positionId}
                        >
                            Add group
                        </Button>
                    </Col>
                </Row>

                {groups.length > 0 && (
                    <Card size="small" title="Selected groups">
                        <List
                            dataSource={groups}
                            renderItem={(g, idx) => (
                                <List.Item
                                    actions={[
                                        <Button
                                            key="remove"
                                            size="small"
                                            danger
                                            icon={<DeleteOutlined />}
                                            onClick={() => removeGroup(idx)}
                                        >
                                            Remove
                                        </Button>,
                                    ]}
                                >
                                    <Space wrap>
                                        <Tag color="blue">
                                            {findNameById(
                                                orgData.branches,
                                                g.branchId
                                            )}
                                        </Tag>
                                        <Tag color="green">
                                            {findNameById(
                                                orgData.departments[g.branchId],
                                                g.departmentId
                                            )}
                                        </Tag>
                                        <Tag color="purple">
                                            {findNameById(
                                                orgData.positions[
                                                    g.departmentId
                                                ],
                                                g.positionId
                                            )}
                                        </Tag>
                                    </Space>
                                </List.Item>
                            )}
                        />
                    </Card>
                )}

                <Dragger {...props} style={{ padding: 16 }}>
                    <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">
                        Click or drag file to this area to upload
                    </p>
                    <p className="ant-upload-hint">
                        Supports CSV and Excel files.
                    </p>
                </Dragger>
                <Button
                    type="primary"
                    onClick={handleImport}
                    loading={loading || checkingDuplicates}
                    icon={<UploadOutlined />}
                    disabled={groups.length === 0}
                >
                    {checkingDuplicates ? "Kiểm tra trùng lặp..." : "Import"}
                </Button>
                {result?.formTemplate && (
                    <Descriptions
                        title="Imported Template"
                        bordered
                        size="small"
                        column={1}
                    >
                        <Descriptions.Item label="ID">
                            {result.formTemplate.id}
                        </Descriptions.Item>
                        <Descriptions.Item label="Name">
                            {result.formTemplate.name}
                        </Descriptions.Item>
                        {(assignedGroups?.length > 0 || assigned) && (
                            <Descriptions.Item label="Assigned to">
                                <Space
                                    direction="vertical"
                                    size={4}
                                    style={{ width: "100%" }}
                                >
                                    {assignedGroups?.length > 0 ? (
                                        assignedGroups.map((g, i) => (
                                            <Space key={i} wrap>
                                                <Tag color="blue">
                                                    {findNameById(
                                                        orgData.branches,
                                                        g.branchId
                                                    )}
                                                </Tag>
                                                <Tag color="green">
                                                    {findNameById(
                                                        orgData.departments[
                                                            g.branchId
                                                        ],
                                                        g.departmentId
                                                    )}
                                                </Tag>
                                                <Tag color="purple">
                                                    {findNameById(
                                                        orgData.positions[
                                                            g.departmentId
                                                        ],
                                                        g.positionId
                                                    )}
                                                </Tag>
                                            </Space>
                                        ))
                                    ) : (
                                        <Space wrap>
                                            <Tag color="blue">
                                                {findNameById(
                                                    orgData.branches,
                                                    assigned.branchId
                                                )}
                                            </Tag>
                                            <Tag color="green">
                                                {findNameById(
                                                    orgData.departments[
                                                        assigned.branchId
                                                    ],
                                                    assigned.departmentId
                                                )}
                                            </Tag>
                                            <Tag color="purple">
                                                {findNameById(
                                                    orgData.positions[
                                                        assigned.departmentId
                                                    ],
                                                    assigned.positionId
                                                )}
                                            </Tag>
                                        </Space>
                                    )}
                                </Space>
                            </Descriptions.Item>
                        )}
                    </Descriptions>
                )}

                {/* Duplicate Warning Modal */}
                <Modal
                    title={
                        <Space>
                            <ExclamationCircleOutlined
                                style={{ color: "#faad14" }}
                            />
                            <span>Phát hiện form trùng lặp</span>
                        </Space>
                    }
                    open={duplicateWarningVisible}
                    onOk={handleConfirmImport}
                    onCancel={handleCancelImport}
                    okText="Tiếp tục Import"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                    width={700}
                >
                    <div style={{ marginBottom: 16 }}>
                        <Typography.Text type="warning">
                            Hệ thống đã tìm thấy{" "}
                            <strong>{duplicateForms.length}</strong> form có thể
                            trùng lặp với form bạn muốn import:
                        </Typography.Text>
                    </div>

                    <List
                        dataSource={duplicateForms}
                        renderItem={(form) => (
                            <List.Item>
                                <div style={{ width: "100%" }}>
                                    <div
                                        style={{
                                            fontWeight: "bold",
                                            marginBottom: 4,
                                        }}
                                    >
                                        {form.name || "Unnamed Form"} (ID:{" "}
                                        {form.id})
                                    </div>
                                    <div
                                        style={{
                                            fontSize: "12px",
                                            color: "#666",
                                        }}
                                    >
                                        Được tạo:{" "}
                                        {new Date(
                                            form.createdAt
                                        ).toLocaleString("vi-VN")}
                                    </div>
                                    {(form.assignedGroups?.length > 0 ||
                                        form.assignedGroup) && (
                                        <div style={{ marginTop: 8 }}>
                                            <Typography.Text type="secondary">
                                                Phân công cho:
                                            </Typography.Text>
                                            <div style={{ marginTop: 4 }}>
                                                {form.assignedGroups?.length >
                                                0 ? (
                                                    form.assignedGroups.map(
                                                        (g, i) => (
                                                            <div
                                                                key={i}
                                                                style={{
                                                                    marginBottom: 4,
                                                                }}
                                                            >
                                                                <Tag
                                                                    color="blue"
                                                                    size="small"
                                                                >
                                                                    {findNameById(
                                                                        orgData.branches,
                                                                        g.branchId
                                                                    )}
                                                                </Tag>
                                                                <Tag
                                                                    color="green"
                                                                    size="small"
                                                                >
                                                                    {findNameById(
                                                                        orgData
                                                                            .departments[
                                                                            g
                                                                                .branchId
                                                                        ],
                                                                        g.departmentId
                                                                    )}
                                                                </Tag>
                                                                <Tag
                                                                    color="purple"
                                                                    size="small"
                                                                >
                                                                    {findNameById(
                                                                        orgData
                                                                            .positions[
                                                                            g
                                                                                .departmentId
                                                                        ],
                                                                        g.positionId
                                                                    )}
                                                                </Tag>
                                                            </div>
                                                        )
                                                    )
                                                ) : form.assignedGroup ? (
                                                    <div>
                                                        <Tag
                                                            color="blue"
                                                            size="small"
                                                        >
                                                            {findNameById(
                                                                orgData.branches,
                                                                form
                                                                    .assignedGroup
                                                                    .branchId
                                                            )}
                                                        </Tag>
                                                        <Tag
                                                            color="green"
                                                            size="small"
                                                        >
                                                            {findNameById(
                                                                orgData
                                                                    .departments[
                                                                    form
                                                                        .assignedGroup
                                                                        .branchId
                                                                ],
                                                                form
                                                                    .assignedGroup
                                                                    .departmentId
                                                            )}
                                                        </Tag>
                                                        <Tag
                                                            color="purple"
                                                            size="small"
                                                        >
                                                            {findNameById(
                                                                orgData
                                                                    .positions[
                                                                    form
                                                                        .assignedGroup
                                                                        .departmentId
                                                                ],
                                                                form
                                                                    .assignedGroup
                                                                    .positionId
                                                            )}
                                                        </Tag>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </List.Item>
                        )}
                    />

                    <div
                        style={{
                            marginTop: 16,
                            padding: 12,
                            background: "#fff7e6",
                            border: "1px solid #ffd591",
                            borderRadius: 4,
                        }}
                    >
                        <Typography.Text type="warning">
                            <strong>Lưu ý:</strong> Nếu bạn tiếp tục import,
                            form mới sẽ được tạo bên cạnh các form hiện có. Điều
                            này có thể gây nhầm lẫn cho người dùng. Bạn có chắc
                            chắn muốn tiếp tục?
                        </Typography.Text>
                    </div>
                </Modal>
            </Space>
        </Card>
    );
}
