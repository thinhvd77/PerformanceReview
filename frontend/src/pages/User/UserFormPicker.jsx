import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Card, Typography, Row, Col, Select, Button, Space, List, Tag, message, Empty, Spin, Layout} from 'antd';
import {useNavigate} from 'react-router-dom';
import api from '../../services/api';
import {orgData, findNameById} from '../../data/orgData';
import LogoutButton from '../../components/LogoutButton';
import UserInfo from '../../components/UserInfo';
import FormViewer from '../FormViewer/FormViewer';
import logo from "../../components/logo_png.png";

const {Content, Header} = Layout;
const {Title, Text} = Typography;

export default function UserFormPicker() {
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
    // useEffect(() => {
    //     try {
    //         const b = localStorage.getItem('ufp.branchId') || undefined;
    //         const d = localStorage.getItem('ufp.departmentId') || undefined;
    //         const p = localStorage.getItem('ufp.positionId') || undefined;
    //         if (b && (orgData.branches || []).some(x => x.id === b)) {
    //             setBranchId(b);
    //             if (d && (orgData.departments[b] || []).some(x => x.id === d)) {
    //                 setDepartmentId(d);
    //                 if (p && (orgData.positions[d] || []).some(x => x.id === p)) {
    //                     setPositionId(p);
    //                 }
    //             }
    //         }
    //     } catch {
    //     }
    // }, []);

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
            const res = await api.get('/forms', {params: {branchId, departmentId, positionId}});
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

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Header style={{
                background: 'rgb(174, 28, 63)',
                padding: '5px 24px',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                width: '100%',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxSizing: 'border-box',
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%'
                }}>
                    <div style={{width: '15%', height: '100%'}}>
                        <img src={logo} style={{height: '100%', width: 'auto'}} alt={'logo'}/>
                    </div>
                    <Title level={1} style={{margin: 0, marginLeft: 'auto', marginRight: 'auto', color: 'white', width:'75%', display: 'flex', alignItems: 'center', justifyContent:'center', fontSize: 'clamp(10px, 1vw, 22px)', lineHeight: 1.1}}>BẢNG TỰ ĐÁNH GIÁ MỨC ĐỘ HOÀN THÀNH CÔNG VIỆC</Title>
                    <Space size="large" style={{width: '15%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end'}}>
                        <UserInfo/>
                        <LogoutButton confirm size="small"/>
                    </Space>
                </div>
            </Header>
            <Space direction="vertical" size="large" style={{width: '100%', maxWidth: 1200, margin: '5px auto 0 auto'}}>
                <Title level={3} style={{margin: '5px 0 0 0'}}>Cán bộ chọn đúng Chi nhánh, Phòng ban, Chức vụ để lấy form đánh giá chính xác</Title>
                <Card>
                    <Row gutter={[12, 12]}>
                        <Col xs={24} md={8}>
                            <label style={{display: 'block', marginBottom: 8, fontSize: '16px', fontWeight:'600'}}>Chi nhánh</label>
                            <Select
                                style={{width: '100%'}}
                                size={'large'}
                                placeholder="-- Chọn chi nhánh --"
                                aria-label="Select Branch"
                                showSearch={false}
                                value={branchId}
                                onChange={handleBranchChange}
                                options={(orgData.branches || []).map(b => ({value: b.id, label: b.name}))}
                            />
                        </Col>
                        <Col xs={24} md={8}>
                            <label style={{display: 'block', marginBottom: 8, fontSize: '16px', fontWeight:'600'}}>Phòng ban</label>
                            <Select
                                style={{width: '100%'}}
                                size={'large'}
                                placeholder="-- Chọn phòng ban --"
                                aria-label="Select Department"
                                value={departmentId}
                                showSearch={false}
                                onChange={handleDeptChange}
                                options={departments.map(d => ({value: d.id, label: d.name}))}
                                disabled={!branchId}
                                ref={deptRef}
                            />
                        </Col>
                        <Col xs={24} md={8}>
                            <label style={{display: 'block', marginBottom: 8, fontSize: '16px', fontWeight:'600'}}>Chức vụ</label>
                            <Select
                                style={{width: '100%'}}
                                size={'large'}
                                placeholder="-- Chọn chức vụ --"
                                aria-label="Select Position"
                                value={positionId}
                                showSearch={false}
                                allowClear={false}
                                onChange={handlePosChange}
                                options={positions.map(p => ({value: p.id, label: p.name}))}
                                disabled={!departmentId}
                                ref={posRef}
                            />
                        </Col>
                    </Row>
                </Card>

                <Card style={{padding: 0}}
                >
                    {selectedFormId ? (
                        <div>
                            <FormViewer formId={selectedFormId}/>
                        </div>
                    ) : loading ? (
                        <div style={{display: 'flex', justifyContent: 'center', padding: '0'}}>
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
