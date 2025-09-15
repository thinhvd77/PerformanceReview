import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Card, Typography, Row, Col, Select, Button, Space, List, Tag, message, Empty, Spin, Badge} from 'antd';
import {SearchOutlined, ReloadOutlined, ArrowLeftOutlined} from '@ant-design/icons';
import {useNavigate} from 'react-router-dom';
import api from '../../services/api';
import {orgData, findNameById} from '../../data/orgData';
import LogoutButton from '../../components/LogoutButton';
import UserInfo from '../../components/UserInfo';
import bg from '../../components/lg_bg.jpg';
import FormViewer from '../FormViewer/FormViewer';

const {Title, Text} = Typography;

export default function UserFormPicker() {
    const navigate = useNavigate();
    const [branchId, setBranchId] = useState();
    const [departmentId, setDepartmentId] = useState();
    const [positionId, setPositionId] = useState();
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState([]);
    const [searched, setSearched] = useState(false);
    const [selectedFormId, setSelectedFormId] = useState(null);

    const deptRef = useRef(null);
    const posRef = useRef(null);

    const departments = useMemo(() => (branchId ? orgData.departments[branchId] || [] : []), [branchId]);
    const positions = useMemo(() => (departmentId ? orgData.positions[departmentId] || [] : []), [departmentId]);

    // Load last selection
    useEffect(() => {
        try {
            const b = localStorage.getItem('ufp.branchId') || undefined;
            const d = localStorage.getItem('ufp.departmentId') || undefined;
            const p = localStorage.getItem('ufp.positionId') || undefined;
            if (b && (orgData.branches || []).some(x => x.id === b)) {
                setBranchId(b);
                if (d && (orgData.departments[b] || []).some(x => x.id === d)) {
                    setDepartmentId(d);
                    if (p && (orgData.positions[d] || []).some(x => x.id === p)) {
                        setPositionId(p);
                    }
                }
            }
        } catch {
        }
    }, []);

    // Persist selection
    useEffect(() => {
        if (branchId) localStorage.setItem('ufp.branchId', branchId); else localStorage.removeItem('ufp.branchId');
    }, [branchId]);
    useEffect(() => {
        if (departmentId) localStorage.setItem('ufp.departmentId', departmentId); else localStorage.removeItem('ufp.departmentId');
    }, [departmentId]);
    useEffect(() => {
        if (positionId) localStorage.setItem('ufp.positionId', positionId); else localStorage.removeItem('ufp.positionId');
    }, [positionId]);

    // Search forms for current selection
    const fetchForms = async () => {
        if (!branchId || !departmentId || !positionId) return;
        setSearched(true);
        setLoading(true);
        setSelectedFormId(null);
        setResults([]);
        try {
            const res = await api.get('/forms', { params: { branchId, departmentId, positionId } });
            const items = res.data || [];
            if (items.length === 1) {
                setSelectedFormId(items[0].id);
                return;
            }
            setResults(items);
            if (items.length === 0) {
                message.info('No form found for the selected group.');
            }
        } catch (e) {
            const msg = e?.response?.data?.message || e.message || 'Failed to search forms';
            message.error(msg);
        } finally {
            setLoading(false);
        }
    };

    // Debounce auto-search when all three selections are made
    const autoSearchTimer = useRef(null);
    useEffect(() => {
        if (autoSearchTimer.current) {
            clearTimeout(autoSearchTimer.current);
            autoSearchTimer.current = null;
        }
        if (branchId && departmentId && positionId) {
            autoSearchTimer.current = setTimeout(() => {
                fetchForms();
            }, 300);
        }
        return () => {
            if (autoSearchTimer.current) {
                clearTimeout(autoSearchTimer.current);
                autoSearchTimer.current = null;
            }
        };
    }, [branchId, departmentId, positionId]);

    // Auto focus next select
    const handleBranchChange = (v) => {
        setBranchId(v);
        setDepartmentId(undefined);
        setPositionId(undefined);
        setResults([]);
        setSearched(false);
        setSelectedFormId(null);
        setTimeout(() => deptRef.current?.focus?.(), 0);
    };
    const handleDeptChange = (v) => {
        setDepartmentId(v);
        setPositionId(undefined);
        setResults([]);
        setSearched(false);
        setSelectedFormId(null);
        setTimeout(() => posRef.current?.focus?.(), 0);
    };
    const handlePosChange = (v) => {
        setPositionId(v);
        setResults([]);
        setSearched(false);
        setSelectedFormId(null);
    };

    const onReset = () => {
        setBranchId(undefined);
        setDepartmentId(undefined);
        setPositionId(undefined);
        setResults([]);
        setSearched(false);
        setSelectedFormId(null);
    };

    const selectCommonProps = {
        style: {width: '100%'},
        showSearch: true,
        allowClear: true,
        optionFilterProp: 'label',
        filterSort: (a, b) => (a?.label || '').localeCompare(b?.label || ''),
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                padding: 24,
                display: 'flex',
            }}
        >
            <Space direction="vertical" size="large" style={{width: '100%', maxWidth: 960, margin: '0 auto'}}>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    <div>
                        <Title level={2} style={{marginBottom: 0}}>Find Your Form</Title>
                        <Text type="secondary">Select your Branch, Department and Position to get the corresponding
                            form.</Text>
                    </div>
                    <Space size="large">
                        <UserInfo />
                        <LogoutButton size="small"/>
                    </Space>
                </div>

                <Card>
                    <Row gutter={[12, 12]}>
                        <Col xs={24} md={8}>
                            <Select
                                {...selectCommonProps}
                                placeholder="Branch"
                                aria-label="Select Branch"
                                value={branchId}
                                onChange={handleBranchChange}
                                options={(orgData.branches || []).map(b => ({value: b.id, label: b.name}))}
                            />
                        </Col>
                        <Col xs={24} md={8}>
                            <Select
                                {...selectCommonProps}
                                placeholder="Department"
                                aria-label="Select Department"
                                value={departmentId}
                                onChange={handleDeptChange}
                                options={departments.map(d => ({value: d.id, label: d.name}))}
                                disabled={!branchId}
                                ref={deptRef}
                            />
                        </Col>
                        <Col xs={24} md={8}>
                            <Select
                                {...selectCommonProps}
                                placeholder="Position"
                                aria-label="Select Position"
                                value={positionId}
                                onChange={handlePosChange}
                                options={positions.map(p => ({value: p.id, label: p.name}))}
                                disabled={!departmentId}
                                ref={posRef}
                            />
                        </Col>
                    </Row>

                    <Space style={{marginTop: 16}}>
                        <Button icon={<ReloadOutlined/>} onClick={onReset} disabled={loading}>Reset</Button>
                    </Space>
                </Card>

                <Card
                    title={
                        <Space>
                            <Title level={5} style={{margin: 0}}>Matching Forms</Title>
                            <Badge count={results.length} overflowCount={99} style={{backgroundColor: '#52c41a'}}/>
                        </Space>
                    }
                >
                    {selectedFormId ? (
                        <div>
                            <FormViewer formId={selectedFormId} />
                        </div>
                    ) : loading ? (
                        <div style={{display: 'flex', justifyContent: 'center', padding: '24px 0'}}>
                            <Spin/>
                        </div>
                    ) : results.length > 0 ? (
                        <List
                            bordered
                            dataSource={results}
                            renderItem={(it) => (
                                <List.Item
                                    actions={[
                                        <Button key="view" type="link"
                                                onClick={() => setSelectedFormId(it.id)}>Open</Button>
                                    ]}
                                >
                                    <Space direction="vertical" size={2}>
                                        <Text strong>{it.name}</Text>
                                        {(Array.isArray(it.assignedGroups) && it.assignedGroups.length > 0) ? (
                                            <Space wrap>
                                                {it.assignedGroups.map((g, i) => (
                                                    <Tag key={i}>
                                                        {findNameById(orgData.branches, g.branchId)} / {findNameById(orgData.departments[g.branchId], g.departmentId)} / {findNameById(orgData.positions[g.departmentId], g.positionId)}
                                                    </Tag>
                                                ))}
                                            </Space>
                                        ) : it.assignedGroup ? (
                                            <Tag>
                                                {findNameById(orgData.branches, it.assignedGroup.branchId)} / {findNameById(orgData.departments[it.assignedGroup.branchId], it.assignedGroup.departmentId)} / {findNameById(orgData.positions[it.assignedGroup.departmentId], it.assignedGroup.positionId)}
                                            </Tag>
                                        ) : (
                                            <Text type="secondary">Unassigned</Text>
                                        )}
                                    </Space>
                                </List.Item>
                            )}
                        />
                    ) : (
                        searched && (
                            <Empty description="No forms found for the selected group."/>
                        )
                    )}
                </Card>
            </Space>
        </div>
    );
}
