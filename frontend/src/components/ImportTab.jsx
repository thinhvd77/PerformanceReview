import React, {useMemo, useState} from 'react';
import {Upload, Button, Space, message, Typography, Card, Descriptions, Select, Row, Col, Tag, List} from 'antd';
import {InboxOutlined, UploadOutlined, PlusOutlined, DeleteOutlined} from '@ant-design/icons';
import api from '../services/api.js';
import {orgData, findNameById} from '../data/orgData.js';

const {Dragger} = Upload;
const {Paragraph} = Typography;

export default function ImportTab() {
    const [fileList, setFileList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const [branchId, setBranchId] = useState();
    const departments = useMemo(() => (branchId ? orgData.departments[branchId] || [] : []), [branchId]);
    const [departmentId, setDepartmentId] = useState();
    const positions = useMemo(() => (departmentId ? orgData.positions[departmentId] || [] : []), [departmentId]);
    const [positionId, setPositionId] = useState();

    // Multiple groups state
    const [groups, setGroups] = useState([]);

    const addGroup = () => {
        if (!branchId || !departmentId || !positionId) {
            message.warning('Vui lòng chọn Chi nhánh, Phòng ban, Chức vụ trước.').then();
            return;
        }
        const newGroup = {branchId, departmentId, positionId};
        const exists = groups.some(g => g.branchId === branchId && g.departmentId === departmentId && g.positionId === positionId);
        if (exists) {
            message.info('Nhóm đã được thêm').then();
            return;
        }
        setGroups(prev => [...prev, newGroup]);
    };

    const removeGroup = (idx) => {
        setGroups(prev => prev.filter((_, i) => i !== idx));
    };

    const props = {
        multiple: false,
        accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel',
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
            message.warning('Vui lòng chọn file để import.');
            return;
        }
        if (groups.length === 0) {
            message.warning('Vui lòng thêm ít nhất một nhóm trước khi import.');
            return;
        }
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', fileList[0]);
            formData.append('assignedGroups', JSON.stringify(groups));
            // Backward compatibility: also include the first triplet
            const first = groups[0];
            formData.append('branchId', first.branchId);
            formData.append('departmentId', first.departmentId);
            formData.append('positionId', first.positionId);
            const res = await api.post('/files/upload', formData, {
                headers: {'Content-Type': 'multipart/form-data'},
            });
            const data = res.data;
            setResult(data);
            message.success(data?.message || `Imported: ${fileList[0].name}`);
            setFileList([]);
            setGroups([]);
        } catch (e) {
            const msg = e?.response?.data?.message || e.message || 'Import không thành công.';
            message.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const assignedGroups = result?.formTemplate?.assignedGroups;
    const assigned = result?.formTemplate?.assignedGroup;

    return (
        <Card>
            <Space direction="vertical" size="large" style={{width: '100%'}}>
                <Paragraph type="primary" style={{margin: 0}}>
                    Chọn Chi nhánh, Phòng ban, Chức vụ → bấm Thêm nhóm cho từng phân công → tải lên tệp CSV hoặc Excel.
                </Paragraph>

                <Row gutter={[12, 6]} style={{padding: 0, margin: 0}}>
                    <Col xs={24} md={6}>
                        <label style={{display: 'block', marginBottom: 8, fontSize: '16px', fontWeight:'600'}}>Chi nhánh</label>
                        <Select
                            placeholder="-- Chọn chi nhánh --"
                            value={branchId}
                            onChange={(v) => {
                                setBranchId(v);
                                setDepartmentId(undefined);
                                setPositionId(undefined);
                            }}
                            options={(orgData.branches || []).map(b => ({value: b.id, label: b.name}))}
                            style={{width: '100%'}}
                        />
                    </Col>
                    <Col xs={24} md={6}>
                        <label style={{display: 'block', marginBottom: 8, fontSize: '16px', fontWeight:'600'}}>Phòng ban</label>
                        <Select
                            placeholder="-- Chọn phòng ban --"
                            value={departmentId}
                            onChange={(v) => {
                                setDepartmentId(v);
                                setPositionId(undefined);
                            }}
                            options={departments.map(d => ({value: d.id, label: d.name}))}
                            disabled={!branchId}
                            style={{width: '100%'}}
                        />
                    </Col>
                    <Col xs={24} md={6}>
                        <label style={{display: 'block', marginBottom: 8, fontSize: '16px', fontWeight:'600'}}>Chức vụ</label>
                        <Select
                            placeholder="-- Chọn chức vụ --"
                            value={positionId}
                            onChange={(v) => setPositionId(v)}
                            options={positions.map(p => ({value: p.id, label: p.name}))}
                            disabled={!departmentId}
                            style={{width: '100%'}}
                        />
                    </Col>
                    <Col xs={24} md={6}>
                        <label style={{display: 'block', marginBottom: 8, fontSize: '16px', fontWeight:'600'}}>Thêm</label>
                        <Button icon={<PlusOutlined/>} onClick={addGroup}
                                disabled={!branchId || !departmentId || !positionId}>
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
                                    actions={[<Button key="remove" size="small" danger icon={<DeleteOutlined/>}
                                                      onClick={() => removeGroup(idx)}>Remove</Button>]}
                                >
                                    <Space wrap>
                                        <Tag color="blue">{findNameById(orgData.branches, g.branchId)}</Tag>
                                        <Tag
                                            color="green">{findNameById(orgData.departments[g.branchId], g.departmentId)}</Tag>
                                        <Tag
                                            color="purple">{findNameById(orgData.positions[g.departmentId], g.positionId)}</Tag>
                                    </Space>
                                </List.Item>
                            )}
                        />
                    </Card>
                )}

                <Dragger {...props} style={{padding: 16}}>
                    <p className="ant-upload-drag-icon">
                        <InboxOutlined/>
                    </p>
                    <p className="ant-upload-text">Click or drag file to this area to upload</p>
                    <p className="ant-upload-hint">Supports CSV and Excel files.</p>
                </Dragger>
                <Button type="primary" onClick={handleImport} loading={loading} icon={<UploadOutlined/>}
                        disabled={groups.length === 0}>Import</Button>
                {result?.formTemplate && (
                    <Descriptions title="Imported Template" bordered size="small" column={1}>
                        <Descriptions.Item label="ID">{result.formTemplate.id}</Descriptions.Item>
                        <Descriptions.Item label="Name">{result.formTemplate.name}</Descriptions.Item>
                        {(assignedGroups?.length > 0 || assigned) && (
                            <Descriptions.Item label="Assigned to">
                                <Space direction="vertical" size={4} style={{width: '100%'}}>
                                    {assignedGroups?.length > 0 ? (
                                        assignedGroups.map((g, i) => (
                                            <Space key={i} wrap>
                                                <Tag color="blue">{findNameById(orgData.branches, g.branchId)}</Tag>
                                                <Tag
                                                    color="green">{findNameById(orgData.departments[g.branchId], g.departmentId)}</Tag>
                                                <Tag
                                                    color="purple">{findNameById(orgData.positions[g.departmentId], g.positionId)}</Tag>
                                            </Space>
                                        ))
                                    ) : (
                                        <Space wrap>
                                            <Tag color="blue">{findNameById(orgData.branches, assigned.branchId)}</Tag>
                                            <Tag
                                                color="green">{findNameById(orgData.departments[assigned.branchId], assigned.departmentId)}</Tag>
                                            <Tag
                                                color="purple">{findNameById(orgData.positions[assigned.departmentId], assigned.positionId)}</Tag>
                                        </Space>
                                    )}
                                </Space>
                            </Descriptions.Item>
                        )}
                    </Descriptions>
                )}
            </Space>
        </Card>
    );
}
