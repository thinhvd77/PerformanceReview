import React, { useEffect, useState } from "react";
import { Modal, Typography, Space, Card, Spin, Alert } from "antd";
import api from "../services/api.js";
import SchemaTable from "./SchemaTable.jsx";
import { parseExcelForViewer } from "../utils/parseExcelForViewer.js";

const { Title, Text } = Typography;

export default function SavedExportModal({ open, exportId, onClose }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [record, setRecord] = useState(null);
    const [parsedTable, setParsedTable] = useState(null);
    const [parsing, setParsing] = useState(false);

    const meta = record?.meta || {};
    const fallbackTable = meta?.table || null;
    const cellInputs = meta?.cellInputs || {};
    const computedByAddr = meta?.computedByAddr || {};

    const title = meta?.title || record?.fileName || "Saved Form";
    const employeeName = meta?.employee_name || "-";
    const role = meta?.role || "-";

    useEffect(() => {
        if (!open || !exportId) {
            setRecord(null);
            setParsedTable(null);
            setError("");
            return;
        }

        let mounted = true;
        const load = async () => {
            setLoading(true);
            setError("");
            try {
                const { data } = await api.get(`/exports/${exportId}`);
                if (!mounted) return;
                setRecord(data);
            } catch (e) {
                if (!mounted) return;
                const msg =
                    e?.response?.data?.message ||
                    e.message ||
                    "Tải dữ liệu thất bại";
                setError(msg);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        load();
        return () => {
            mounted = false;
        };
    }, [open, exportId]);

    // Download and parse the actual exported Excel file
    useEffect(() => {
        if (!record?.id) return;

        let mounted = true;
        const run = async () => {
            setParsing(true);
            try {
                const res = await api.get(`/exports/${record.id}/download`, {
                    responseType: "arraybuffer",
                });
                const arr = res?.data;
                if (!mounted) return;
                try {
                    const { table } = await parseExcelForViewer(arr);
                    if (!mounted) return;
                    setParsedTable(table);
                } catch (e) {
                    console.warn(
                        "Parse Excel failed, fallback to saved meta.table:",
                        e
                    );
                    setParsedTable(null);
                }
            } catch (e) {
                console.warn(
                    "Download Excel failed, fallback to saved meta.table:",
                    e?.response?.data || e.message
                );
                setParsedTable(null);
            } finally {
                if (mounted) setParsing(false);
            }
        };
        run();
        return () => {
            mounted = false;
        };
    }, [record?.id]);

    return (
        <Modal
            title={
                <Title level={4} style={{ margin: 0 }}>
                    {title}
                </Title>
            }
            open={open}
            onCancel={onClose}
            width="90%"
            style={{ top: 20 }}
            footer={null}
            destroyOnHidden={true}
        >
            {loading ? (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        padding: 40,
                    }}
                >
                    <Spin size="large" />
                </div>
            ) : error ? (
                <Alert type="error" message="Lỗi" description={error} />
            ) : !record ? (
                <Alert type="warning" message="Không tìm thấy bản lưu" />
            ) : (
                <div>
                    <Card style={{ marginBottom: 16 }}>
                        <Space size={24} wrap>
                            <div>
                                <Text type="secondary">Nhân viên:</Text>{" "}
                                <Text strong>{employeeName}</Text>
                            </div>
                            <div>
                                <Text type="secondary">Chức vụ:</Text>{" "}
                                <Text strong>{role}</Text>
                            </div>
                            <div>
                                <Text type="secondary">Export ID:</Text>{" "}
                                <Text strong>{record?.id}</Text>
                            </div>
                            <div>
                                <Text type="secondary">Tạo lúc:</Text>{" "}
                                <Text strong>{record?.createdAt}</Text>
                            </div>
                        </Space>
                    </Card>

                    {(parsedTable || fallbackTable) &&
                    (parsedTable || fallbackTable)?.columns?.length > 0 &&
                    (parsedTable || fallbackTable)?.rows?.length > 0 ? (
                        <>
                            {parsing && (
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "flex-start",
                                        alignItems: "center",
                                        gap: 8,
                                        marginBottom: 8,
                                    }}
                                >
                                    <Spin size="small" />
                                    <span>Đang tải từ file Excel...</span>
                                </div>
                            )}
                            <SchemaTable
                                table={parsedTable || fallbackTable}
                                cellInputs={cellInputs}
                                computedByAddr={computedByAddr}
                                readOnly
                            />
                        </>
                    ) : (
                        <Alert
                            type="info"
                            message="Bản lưu không có dữ liệu bảng để hiển thị"
                        />
                    )}
                </div>
            )}
        </Modal>
    );
}
