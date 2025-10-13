import React, { useState } from "react";
import { Button, Drawer, Typography, Space, Divider } from "antd";
import { QuestionCircleOutlined, CloseOutlined } from "@ant-design/icons";
import { policyData } from "../data/policy";

const { Title, Paragraph, Text } = Typography;

export default function FloatingGuide() {
    const [visible, setVisible] = useState(false);

    const showDrawer = () => {
        setVisible(true);
    };

    const onClose = () => {
        setVisible(false);
    };

    return (
        <>
            {/* Floating Button */}
            <Button
                type="primary"
                shape="circle"
                size="large"
                icon={<QuestionCircleOutlined style={{ fontSize: "24px" }} />}
                onClick={showDrawer}
                style={{
                    position: "fixed",
                    right: "20px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "60px",
                    height: "60px",
                    zIndex: 999,
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                    background: "#1890ff",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
                aria-label="Hướng dẫn sử dụng"
            />

            {/* Drawer với nội dung hướng dẫn */}
            <Drawer
                title={
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}
                    >
                        <Title level={4} style={{ margin: 0 }}>
                            📖 Phụ lục
                        </Title>
                    </div>
                }
                placement="right"
                onClose={onClose}
                open={visible}
                width={400}
                closeIcon={<CloseOutlined />}
            >
                <Space
                    direction="vertical"
                    size="large"
                    style={{ width: "100%" }}
                >
                    {/* Bước 1 */}
                    <div>
                        <Title level={5} style={{ color: "#1890ff" }}>
                            Chỉ tiêu định tính
                        </Title>
                        <Paragraph>
                            <Text strong>
                                Chức năng tham mưu điều hành liên quan đến nhiệm
                                vụ của phòng:
                            </Text>{" "}
                            Cứ mỗi sai sót trong công tác tham mưu, điều hành
                            trừ 02 điểm.
                        </Paragraph>
                        <Paragraph>
                            <Text strong>
                                Chấp hành quy trình, chế độ nghiệp vụ, chế độ
                                thông tin báo cáo:
                            </Text>{" "}
                            Trừ 02 điểm/lần khi cá nhân/cán bộ trong phòng/cán
                            bộ trong phòng được giao phụ trách trực tiếp được
                            giao phụ trách trực tiếp vi phạm quy trình nghiệp
                            vụ, không thực hiện báo cáo hoặc báo cáo chậm trễ.
                        </Paragraph>
                        <Paragraph>
                            <Text strong>
                                Chấp hành đảm bảo an toàn CNTT, quản lý User,
                                password trên các ứng dụng CNTT:
                            </Text>{" "}
                            Trừ 02 điểm/lần khi cá nhân/cán bộ trong phòng/cán
                            bộ trong phòng được giao phụ trách trực tiếp được
                            giao phụ trách trực tiếp vi phạm chế độ bảo mật an
                            toàn thông tin, quản lý User, password.
                        </Paragraph>
                        <Paragraph>
                            <Text strong>
                                Sai sót do chủ quan trong quá trình thực hiện
                                công việc:
                            </Text>{" "}
                            Trừ 02 điểm/lần khi cá nhân/cán bộ trong phòng/cán
                            bộ trong phòng được giao phụ trách trực tiếp vi
                            phạm.
                        </Paragraph>
                        <Paragraph>
                            <Text strong>
                                Các công việc khác theo chức năng, nhiệm vụ của
                                phòng và phân công của Trưởng phòng/Ban Giám
                                đốc:
                            </Text>{" "}
                            Trừ 02 điểm/lần khi cá nhân/cán bộ trong phòng/cán
                            bộ trong phòng được giao phụ trách trực tiếp vi
                            phạm.
                        </Paragraph>
                    </div>

                    <Divider style={{ margin: "0" }} />

                    {/* Bước 2 */}
                    <div>
                        <Title level={5} style={{ color: "#52c41a" }}>
                            Điểm cộng
                        </Title>
                        <Paragraph>
                            <Text strong>
                                Chỉ tiêu nguồn vốn vượt KH Quý được giao:
                            </Text>{" "}
                            Cứ vượt 5% cộng 01 điểm, tối đa 05 điểm.
                        </Paragraph>
                        <Paragraph>
                            <Text strong>
                                Chỉ tiêu thu dịch vụ vượt KH Quý được giao:
                            </Text>{" "}
                            Cứ vượt 3% cộng 01 điểm, tối đa 05 điểm.
                        </Paragraph>
                        <Paragraph>
                            <Text strong>
                                Chỉ tiêu tiếp thị tín dụng vượt KH Quý được
                                giao:
                            </Text>{" "}
                            Cứ vượt 10% cộng 01 điểm, tối đa 05 điểm.
                        </Paragraph>
                        <Paragraph>
                            <Text strong>
                                Thu hồi nợ đã XLRR đạt từ 110% KH Quý:
                            </Text>{" "}
                            Cộng 03 điểm.
                        </Paragraph>
                        <Paragraph>
                            <Text strong>
                                Số tuyệt đối nợ nhóm 2 giảm so với Quý trước:
                            </Text>{" "}
                            Cộng 01 điểm.
                        </Paragraph>
                        <Paragraph>
                            <Text strong>
                                Số tuyệt đối nợ xấu giảm so với Quý trước:
                            </Text>{" "}
                            Cộng 02 điểm.
                        </Paragraph>
                        <Paragraph>
                            <Text strong>
                                Phát triển được một đơn vị trả lương qua tài
                                khoản:
                            </Text>{" "}
                            Cộng 03 điểm/đơn vị.
                        </Paragraph>
                        <Paragraph>
                            <Text strong>
                                Tỷ lệ CASA BQ trong Quý tăng từ 1% trở lên so
                                với thực hiện Quý trước:
                            </Text>{" "}
                            Cộng 02 điểm.
                        </Paragraph>
                        <Paragraph>
                            <Text strong>
                                Phát triển được 01 đơn vị mới sử dụng dịch vụ
                                TTQT (không bao gồm KH của đơn vị/phòng nghiệp
                                vụ khác chuyển lên):
                            </Text>{" "}
                            Cộng 02 điểm/đơn vị.
                        </Paragraph>
                        <Paragraph>
                            <Text strong>
                                Phát triển được 01 đơn vị mới sử dụng dịch vụ
                                bảo lãnh (không bao gồm KH của đơn vị/phòng
                                nghiệp vụ khác chuyển lên):
                            </Text>{" "}
                            Cộng 01 điểm/đơn vị.
                        </Paragraph>
                        <Paragraph>
                            <Text strong>
                                Thu ròng từ kinh doanh ngoại tệ đạt từ 150% so
                                với Quý trước liền kề:
                            </Text>{" "}
                            Cộng 02 điểm.
                        </Paragraph>
                        <Paragraph>
                            <Text strong>
                                Chỉ tiêu tiếp thị tín dụng (chỉ tiêu cá nhân)
                                vượt kế hoạch Quý được giao:
                            </Text>{" "}
                            Cứ vượt 10% cộng 01 điểm, tối đa 05 điểm.
                        </Paragraph>
                    </div>

                    <Divider style={{ margin: "0" }} />

                    {/* Bước 3 */}
                    <div>
                        <Title level={5} style={{ color: "#fa1414ff" }}>
                            Điểm trừ
                        </Title>
                        <Paragraph>
                            <Text strong>
                                Khoản cho vay có liên quan phát sinh trích lập
                                DPCT trong Quý :
                            </Text>
                            <br />- CN II: từ 50tr - 200tr trừ 01 điểm, trên
                            200tr trừ 02 điểm
                            <br />- PGD: từ 20tr - 80tr trừ 01 điểm, trên 80tr
                            trừ 02 điểm
                        </Paragraph>
                        <Paragraph>
                            <Text strong>Tỷ lệ nợ nhóm 2 tăng trong Quý:</Text>{" "}
                            Trừ 02 điểm
                        </Paragraph>
                        <Paragraph>
                            <Text strong>Tỷ lệ nợ xấu tăng trong Quý:</Text> Trừ
                            02 điểm
                        </Paragraph>
                        <Paragraph>
                            <Text strong>
                                Nguồn vốn giảm so với số thực hiện Quý trước
                                (không nằm trong kế hoạch):
                            </Text>{" "}
                            Cứ giảm 5% trừ 01 điểm, tối đa 05 điểm.
                        </Paragraph>
                        <Paragraph>
                            <Text strong>
                                Dư nợ giảm so với số thực hiện Quý trước (loại
                                trừ giảm do XLRR):
                            </Text>{" "}
                            Cứ giảm 5% trừ 01 điểm, tối đa 05 điểm.
                        </Paragraph>
                        <Paragraph>
                            <Text strong>
                                Tồn tại, sai sót qua thanh tra, kiểm tra, kiểm
                                toán phát sinh trong Quý:
                            </Text>{" "}
                            Trừ 02 điểm/mỗi biên bản kết luận có tồn tại sai
                            sót.
                        </Paragraph>
                        <Paragraph>
                            <Text strong>
                                Kết quả kiểm tra kiến thức: Kết quả thi dưới
                                TB/không đạt yêu cầu:
                            </Text>{" "}
                            Trừ 05 điểm.
                        </Paragraph>
                    </div>
                    <Divider style={{ margin: "0" }} />

                    <div>
                        <Title
                            level={5}
                            style={{ color: "#ff9b18ff", marginTop: 0 }}
                        >
                            Điểm thưởng
                        </Title>
                        <Paragraph>
                            <Text strong>
                                Một trong số các chỉ tiêu: Dư nợ, nguồn vốn hoàn
                                thành KH năm được giao:
                            </Text>{" "}
                            Thưởng 03 điểm/mỗi chỉ tiêu tại Quý hoàn thành.
                        </Paragraph>
                        <Paragraph>
                            <Text strong>
                                Một trong số các chỉ tiêu: thu dịch vụ, thu hồi
                                nợ đã XLRR, tài chính hoàn thành KH năm được
                                giao:
                            </Text>{" "}
                            Thưởng 05 điểm tại Quý hoàn thành.
                        </Paragraph>
                        <Paragraph>
                            <Text strong>
                                Có sáng kiến, giải pháp, cách làm hay đem lại
                                hiệu quả công việc, nâng cao năng suất lao động
                                tại đơn vị được Hội đồng thi đua tại Chi nhánh
                                công nhận:
                            </Text>{" "}
                            Thưởng 03 điểm/mỗi sáng kiến.
                        </Paragraph>
                        <Paragraph>
                            <Text strong>
                                Đạt thành tích trong các cuộc thi nghiệp vụ do
                                Agribank hoặc chi nhánh tổ chức (Trưởng đơn vị,
                                trưởng phòng là thành tích của cá nhân hoặc CB
                                trong đơn vị/phòng, các trường hợp còn lại là
                                thành tích cá nhân):
                            </Text>{" "}
                            Nhất: thưởng 5 điểm; Nhì: thưởng 4 điểm; Ba: thưởng
                            3 điểm.
                        </Paragraph>
                    </div>

                    <Divider style={{ margin: "0" }} />
                    {/* policy */}
                    <div>
                        <Title
                            level={5}
                            style={{ color: "#8f18ffff", marginTop: 0 }}
                        >
                            Nội quy lao động, văn hóa Agribank
                        </Title>
                        {Object.entries(policyData).map(([title, content]) => (
                            <Paragraph key={title}>
                                <Text strong>{title}:</Text> {content}
                            </Paragraph>
                        ))}
                    </div>
                </Space>
            </Drawer>
        </>
    );
}
