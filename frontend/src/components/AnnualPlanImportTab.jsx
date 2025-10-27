import React, { useState } from "react";
import {
    Upload,
    Button,
    Card,
    Alert,
    Table,
    Space,
    Typography,
    message,
    Spin,
} from "antd";
import { UploadOutlined, InboxOutlined } from "@ant-design/icons";
import api from "../services/api";

const { Dragger } = Upload;
const { Title, Text } = Typography;

export default function AnnualPlanImportTab() {
    const [fileList, setFileList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [importResult, setImportResult] = useState(null);

    const handleUpload = async () => {
        if (fileList.length === 0) {
            message.warning("Vui lòng chọn file Excel để import");
            return;
        }

        const formData = new FormData();
        formData.append("file", fileList[0]);

        setLoading(true);
        setImportResult(null);

        try {
            const response = await api.post("/annual-plans/import", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            const { saved, errors } = response.data;

            setImportResult({
                success: true,
                saved,
                errors: errors || [],
            });

            if (errors && errors.length > 0) {
                message.warning(
                    `Import hoàn thành với ${saved} dòng thành công và ${errors.length} lỗi`
                );
            } else {
                message.success(`Import thành công ${saved} kế hoạch năm`);
            }

            setFileList([]);
        } catch (error) {
            console.error("Error importing annual plan:", error);
            message.error(
                error.response?.data?.message ||
                    "Có lỗi xảy ra khi import file Excel"
            );
            setImportResult({
                success: false,
                error: error.response?.data?.message || error.message,
            });
        } finally {
            setLoading(false);
        }
    };

    const uploadProps = {
        fileList,
        beforeUpload: (file) => {
            const isExcel =
                file.type ===
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            if (!isExcel) {
                message.error("Chỉ chấp nhận file Excel (.xlsx)!");
                return Upload.LIST_IGNORE;
            }
            setFileList([file]);
            return false; // Prevent auto upload
        },
        onRemove: () => {
            setFileList([]);
        },
        maxCount: 1,
    };

    const errorColumns = [
        {
            title: "Dòng",
            dataIndex: "row",
            key: "row",
            width: 80,
        },
        {
            title: "Lỗi",
            dataIndex: "message",
            key: "message",
        },
        {
            title: "Dữ liệu",
            dataIndex: "data",
            key: "data",
            render: (data) => <pre>{JSON.stringify(data, null, 2)}</pre>,
        },
    ];

    return (
        <div style={{ padding: "24px" }}>
            <Card>
                <Space
                    direction="vertical"
                    size="large"
                    style={{ width: "100%" }}
                >
                    <div>
                        <Title level={4}>Import Kế Hoạch Năm từ Excel</Title>
                        <Text type="secondary">
                            File Excel cần có cấu trúc các cột như sau:
                        </Text>
                        <ul>
                            <li>
                                <Text strong>Cột A:</Text> Năm (ví dụ: 2025)
                            </li>
                            <li>
                                <Text strong>Cột B:</Text> Mã CBNV (ví dụ:
                                123456)
                            </li>
                            <li>
                                <Text strong>Cột C:</Text> Tăng trưởng nguồn vốn
                            </li>
                            <li>
                                <Text strong>Cột D:</Text> Tăng trưởng dư nợ
                            </li>
                            <li>
                                <Text strong>Cột E:</Text> Thu dịch vụ
                            </li>
                            <li>
                                <Text strong>Cột F:</Text> Thu hồi nợ đã xử lý
                                rủi ro
                            </li>
                            <li>
                                <Text strong>Cột G:</Text> Tài chính
                            </li>
                        </ul>
                        <Alert
                            message="Lưu ý"
                            description="Dòng đầu tiên là tiêu đề và sẽ bị bỏ qua. Dữ liệu bắt đầu từ dòng thứ 2."
                            type="info"
                            showIcon
                            style={{ marginTop: 16 }}
                        />
                    </div>

                    <Dragger {...uploadProps}>
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined />
                        </p>
                        <p className="ant-upload-text">
                            Nhấp hoặc kéo file Excel vào đây để upload
                        </p>
                        <p className="ant-upload-hint">
                            Chỉ chấp nhận file .xlsx
                        </p>
                    </Dragger>

                    <Button
                        type="primary"
                        onClick={handleUpload}
                        loading={loading}
                        disabled={fileList.length === 0}
                        icon={<UploadOutlined />}
                        size="large"
                    >
                        Import Kế Hoạch Năm
                    </Button>

                    {loading && (
                        <div style={{ textAlign: "center", padding: 20 }}>
                            <Spin size="large" />
                            <div style={{ marginTop: 16 }}>
                                <Text>Đang xử lý file Excel...</Text>
                            </div>
                        </div>
                    )}

                    {importResult && importResult.success && (
                        <Alert
                            message="Import thành công"
                            description={
                                <div>
                                    <p>
                                        <strong>Số dòng thành công:</strong>{" "}
                                        {importResult.saved}
                                    </p>
                                    {importResult.errors.length > 0 && (
                                        <p>
                                            <strong>Số dòng lỗi:</strong>{" "}
                                            {importResult.errors.length}
                                        </p>
                                    )}
                                </div>
                            }
                            type={
                                importResult.errors.length > 0
                                    ? "warning"
                                    : "success"
                            }
                            showIcon
                        />
                    )}

                    {importResult &&
                        importResult.errors &&
                        importResult.errors.length > 0 && (
                            <div>
                                <Title level={5}>Chi tiết lỗi:</Title>
                                <Table
                                    columns={errorColumns}
                                    dataSource={importResult.errors}
                                    rowKey="row"
                                    pagination={{ pageSize: 10 }}
                                    size="small"
                                />
                            </div>
                        )}

                    {importResult && !importResult.success && (
                        <Alert
                            message="Import thất bại"
                            description={importResult.error}
                            type="error"
                            showIcon
                        />
                    )}
                </Space>
            </Card>
        </div>
    );
}
