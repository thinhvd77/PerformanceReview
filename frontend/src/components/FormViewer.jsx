// FormViewer.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api.js";
import { Button, Spin, Alert, Typography, Empty, message } from "antd";
import SchemaTable from "./SchemaTable.jsx";
import {
    buildInitialInputs,
    buildCellMap,
    computeComputedByAddr,
} from "../utils/formulaEngine.js";
import exportFormExcel from "../utils/exportFormExcel.js";
import { useAuth } from "../contexts/authContext.jsx";
import { orgData, findNameById } from "../data/orgData.js";
import { saveAs } from "file-saver";

const { Title } = Typography;

// Tuỳ bạn thay bằng dữ liệu backend sau này:
const SECTION_OPTIONS = {
    II: [
        { label: "Chỉ tiêu định tính", value: "II-1" },
        { label: "Chức năng tham mưu điều hành", value: "II-2" },
        {
            label: "Chấp hành quy trình, chế độ nghiệp vụ, chế độ thông tin báo cáo",
            value: "II-3",
        },
        {
            label: "Sai sót do chủ quan trong quá trình thực hiện công việc",
            value: "II-4",
        },
        {
            label: "Các công việc khác theo chức năng, nhiệm vụ được cấp trên phân công",
            value: "II-5",
        },
    ],
    III: [
        { label: "Điểm cộng (tối đa 10 điểm)", value: "III-1" },
        { label: "Chỉ tiêu nguồn vốn vượt KH Quý được giao", value: "III-2" }, // Cứ vượt 5% +1 điểm, Max 05 điểm
        { label: "Chỉ tiêu dư nợ vượt KH Quý được giao", value: "III-3" }, // Cứ vượt 5% +1 điểm, Max 05 điểm
        { label: "Chỉ tiêu thu dịch vụ vượt KH Quý được giao", value: "III-4" }, // Cứ vượt 3% +1 điểm, Max 05 điểm
        { label: "Thu hồi nợ đã XLRR đạt từ 110% KH Quý", value: "III-5" }, // Cộng 3 điểm
        {
            label: "Số tuyệt đối nợ nhóm 2 giảm so với Quý trước",
            value: "III-6",
        }, // Cộng 1 điểm
        { label: "Số tuyệt đối nợ xấu giảm so với Quý trước", value: "III-7" }, // Cộng 2 điểm
        {
            label: "Phát triển được 01 đơn vị trả lương qua tài khoản",
            value: "III-8",
        }, // Cộng 3 điểm/1 đơn vị
        {
            label: "Tỷ lệ CASA BQ trong Quý tăng từ 1% trở lên so với thực hiện Quý trước",
            value: "III-9",
        }, // Cộng 2 điểm
        {
            label: "Phát triển được 01 đơn vị mới sử dụng dịch vụ TTQT (không bao gồm KH của đơn vị/phòng nghiệp vụ khác chuyển lên)",
            value: "III-10",
        }, // Cộng 2 điểm/1 đơn vị
        {
            label: "Phát triển được 01 đơn vị mới sử dụng dịch vụ bảo lãnh (không bao gồm KH của đơn vị/phòng nghiệp vụ khác chuyển lên)",
            value: "III-11",
        }, // Cộng 1 điểm/đơn vị
        {
            label: "Thu ròng từ kinh doanh ngoại tệ đạt từ 150% so với Quý trước liền kề",
            value: "III-12",
        }, // Cộng 2 điểm
        {
            label: "Chỉ tiêu tiếp thị tín dụng (chỉ tiêu cá nhân) vượt kế hoạch Quý được giao",
            value: "III-13",
        }, // Cứ vượt 10% + 1 điểm, Max 5 điểm
    ],
    IV: [
        { label: "Điểm trừ (tối đa 10 điểm)", value: "IV-1" },
        {
            label: "Khoản cho vay có liên quan phát sinh trích lập DPCT trong Quý",
            value: "IV-2",
        },
        { label: "Tỷ lệ nợ nhóm 2 tăng trong Quý", value: "IV-3" }, // Trừ 1 điểm
        { label: "Tỷ lệ nợ xấu tăng trong Quý", value: "IV-4" }, // Trừ 2 điểm
        {
            label: "Nguồn vốn giảm so với số thực hiện Quý trước (không nằm trong kế hoạch)",
            value: "IV-5",
        }, //Cứ giảm 5% -1 điểm, Max 5 điểm
        {
            label: "Dư nợ giảm so với số thực hiện Quý trước (loại trừ giảm do XLRR)",
            value: "IV-6",
        }, // Cứ giảm 5% -1 điểm, Max 5 điểm
        {
            label: "Tồn tại, sai sót qua thanh tra, kiểm tra, kiểm toán phát sinh trong Quý",
            value: "IV-7",
        }, // -2 điểm/mỗi biên bản kết luận có tồn tại sai sót
        {
            label: "Kết quả kiểm tra kiến thức: Kết quả thi dưới TB/không đạt yêu cầu",
            value: "IV-8",
        }, // -5 điểm
    ],
    V: [
        { label: "Điểm thưởng (tối đa 05 điểm)", value: "V-1" },
        {
            label: "Một trong số các chỉ tiêu: Dư nợ, nguồn vốn hoàn thành KH năm được giao",
            value: "V-2",
        }, // Thưởng 03 điểm/mỗi chỉ tiêu tại Quý hoàn thành
        {
            label: "Một trong số các chỉ tiêu: thu dịch vụ, thu hồi nợ đã XLRR, tài chính hoàn thành KH năm được giao",
            value: "V-3",
        }, // Thưởng 05 điểm tại Quý hoàn thành
        {
            label: "Có sáng kiến, giải pháp, cách làm hay đem lại hiệu quả công việc, nâng cao năng suất lao động tại đơn vị được Hội đồng thi đua tại Chi nhánh công nhận",
            value: "V-4",
        }, // Thưởng 03 điểm/mỗi sáng kiến
        {
            label: "Đạt thành tích trong các cuộc thi nghiệp vụ do Agribank hoặc chi nhánh tổ chức",
            value: "V-5",
        }, // Nhất: 5 điểm; Nhì: 4 điểm; Ba: 3 điểm
    ],
};

export default function FormViewer({ formId }) {
    const { id: routeId } = useParams();
    const { user } = useAuth();
    const id = formId ?? routeId;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [template, setTemplate] = useState(null);
    const [criteriaSelectValueByRow, setCriteriaSelectValueByRow] = useState(
        {}
    );

    const formTitle = useMemo(
        () => template?.schema?.title || template?.name || "Form",
        [template]
    );
    const fields = useMemo(
        () =>
            (template?.schema?.fields || []).sort(
                (a, b) => (a.order || 0) - (b.order || 0)
            ),
        [template]
    );

    // Bảng "sống" để chèn/xoá hàng runtime không làm vỡ addr của bảng gốc
    const baseTable = useMemo(() => template?.schema?.table, [template]);
    const [table, setTable] = useState(baseTable);
    useEffect(() => setTable(baseTable), [baseTable]);

    // Khởi tạo giá trị mặc định cho các dòng II/III/IV/V = option đầu tiên
    // LƯU Ý: key theo ký hiệu La Mã (II/III/IV/V) để không bị lệch khi chèn/xoá hàng
    useEffect(() => {
        if (!baseTable?.rows) return;
        const next = {};
        baseTable.rows.forEach((row) => {
            const roman = String(row?.cells?.[0]?.value || "").trim();
            if (/^(II|III|IV|V)$/.test(roman)) {
                const opts = SECTION_OPTIONS[roman] || [];
                if (opts[0]) next[roman] = opts[0].value; // value của option đầu
            }
        });
        setCriteriaSelectValueByRow(next);
    }, [baseTable]);

    // State cho cell input (theo địa chỉ Excel)
    const [cellInputs, setCellInputs] = useState({});

    // Build cell map & tính công thức dựa trên bảng "sống"
    const cellMap = useMemo(() => buildCellMap(table), [table]);

    // ⚠️ Giữ dữ liệu cũ, chỉ thêm default cho addr mới khi bảng thay đổi
    useEffect(() => {
        setCellInputs((prev) => ({ ...buildInitialInputs(table), ...prev }));
    }, [table]);

    const computedByAddr = useMemo(
        () => computeComputedByAddr({ table, cellInputs, cellMap }),
        [table, cellInputs, cellMap]
    );

    const handleCellChange = (addr, v) => {
        setCellInputs((prev) => ({ ...prev, [addr]: v }));
    };

    // ==== Thiết lập cột "Điểm theo mức độ hoàn thành" ====
    const SCORE_LABEL = "điểm theo mức độ hoàn thành";
    const scoreColIdx = useMemo(() => {
        const cols = template?.schema?.table?.columns || [];
        const i = cols.findIndex((c) =>
            String(c.label || "")
                .toLowerCase()
                .includes(SCORE_LABEL)
        );
        return i >= 0 ? i : 6; // fallback: col_7 (index 6)
    }, [template]);

    // A = I + II + III - IV + V (ở cột "Điểm theo mức độ hoàn thành")
    useEffect(() => {
        if (!table?.rows || scoreColIdx == null) return;

        const getRowBySTT = (stt) =>
            (table.rows || []).find(
                (r) => String(r?.cells?.[0]?.value || "").trim() === stt
            );

        const getScoreAddrOf = (stt) =>
            getRowBySTT(stt)?.cells?.[scoreColIdx]?.addr || null;

        const addrI = getScoreAddrOf("I");
        const addrII = getScoreAddrOf("II");
        const addrIII = getScoreAddrOf("III");
        const addrIV = getScoreAddrOf("IV");
        const addrV = getScoreAddrOf("V");

        const plusAddrs = [addrI, addrII, addrIII, addrV].filter(Boolean);
        const hasPlus = plusAddrs.length > 0;
        const hasIV = !!addrIV;

        const rowA = getRowBySTT("A");
        if (!rowA || !rowA.cells?.[scoreColIdx]) return;

        // Xây công thức theo đủ trường hợp
        let desiredFormula = "";
        if (hasPlus && hasIV) {
            desiredFormula = `=SUM(${plusAddrs.join(",")})-${addrIV}`;
        } else if (hasPlus) {
            desiredFormula = `=SUM(${plusAddrs.join(",")})`;
        } else if (hasIV) {
            desiredFormula = `=0-${addrIV}`;
        } else {
            // Không có dữ liệu để lập công thức
            return;
        }

        const current = rowA.cells[scoreColIdx].formula || "";

        // Tránh loop: chỉ set khi khác công thức hiện tại
        if (current !== desiredFormula) {
            setTable((prev) => {
                if (!prev?.rows) return prev;
                const nextRows = prev.rows.map((r) => {
                    const stt = String(r?.cells?.[0]?.value || "").trim();
                    if (stt !== "A") return r;
                    const cells = r.cells.slice();
                    cells[scoreColIdx] = {
                        ...cells[scoreColIdx],
                        formula: desiredFormula,
                    };
                    return { ...r, cells };
                });
                return { ...prev, rows: nextRows };
            });
        }
    }, [table, scoreColIdx]);

    // Convert số thứ tự cột -> chữ cột Excel (A, B, ... G)
    const numToCol = (num) => {
        let s = "",
            n = num;
        while (n > 0) {
            const m = (n - 1) % 26;
            s = String.fromCharCode(65 + m) + s;
            n = Math.floor((n - 1) / 26);
        }
        return s;
    };

    // Đếm "dòng ảo" để tạo địa chỉ ô input cho các dòng con (tránh trùng Excel gốc)
    const [virtualRowNo, setVirtualRowNo] = useState(1000);
    // Lưu các địa chỉ ô-điểm (G*) của các dòng con theo từng dòng La Mã
    const [childrenScoreAddrs, setChildrenScoreAddrs] = useState({}); // { [sectionRowIndex]: string[] }
    // Bản đồ ngược: addr điểm con -> index dòng cha (II/III/IV/V)
    const childAddrToParentRow = useMemo(() => {
        const m = {};
        Object.entries(childrenScoreAddrs || {}).forEach(([pIdx, list]) => {
            (list || []).forEach((a) => {
                m[a] = Number(pIdx);
            });
        });
        return m;
    }, [childrenScoreAddrs]);

    // Khi người dùng chọn tiêu chí tại dòng II/III/IV/V
    const handleSectionChoose = (rowIndex, roman, label) => {
        const scoreColLetter = numToCol(scoreColIdx + 1); // ví dụ 7 -> 'G'
        const childScoreAddr = `${scoreColLetter}${virtualRowNo}`;
        const existingAddrs = childrenScoreAddrs[rowIndex] || [];
        const nextAddrs = [...existingAddrs, childScoreAddr];

        setTable((prev) => {
            if (!prev) return prev;
            const cols = prev.columns?.length || 0;

            // 1) Tạo dòng con mới
            const newRow = {
                cells: Array.from({ length: cols }, (_, cIdx) => ({
                    addr: null,
                    value: cIdx === 1 ? label : "", // cột "Tiêu chí" = label đã chọn (cột B)
                    rowSpan: 1,
                    colSpan: 1,
                    hidden: false,
                    input: false,
                })),
            };
            // ô "Điểm theo mức độ hoàn thành" của dòng con là input có addr ảo
            newRow.cells[scoreColIdx] = {
                ...newRow.cells[scoreColIdx],
                addr: childScoreAddr,
                input: true,
                value: "",
            };

            const nextRows = [...(prev.rows || [])];

            // 2) Cập nhật công thức SUM(...) cho ô điểm của dòng La Mã
            const parentRow = nextRows[rowIndex];
            const parentCells = [...(parentRow?.cells || [])];
            parentCells[scoreColIdx] = {
                ...parentCells[scoreColIdx],
                formula: `=SUM(${nextAddrs.join(",")})`,
            };
            nextRows[rowIndex] = { ...parentRow, cells: parentCells };

            // 3) Chèn dòng con ngay dưới dòng La Mã
            nextRows.splice(rowIndex + 1, 0, newRow);

            return { ...prev, rows: nextRows };
        });

        // 4) Lưu lại danh sách addr con & tăng bộ đếm addr ảo
        setChildrenScoreAddrs((prev) => ({ ...prev, [rowIndex]: nextAddrs }));
        setVirtualRowNo((n) => n + 1);

        // 5) Reset riêng ô Select của dòng này về option đầu tiên theo yêu cầu trước đó (key theo La Mã)
        const first = (SECTION_OPTIONS[roman] || [])[0];
        if (first)
            setCriteriaSelectValueByRow((m) => ({
                ...m,
                [roman]: first.value,
            }));
    };

    // Xoá dòng con đã tạo từ Select và cập nhật công thức của dòng cha
    const handleRemoveChild = (rowIndex, childScoreAddr) => {
        const parentRowIndex = childAddrToParentRow[childScoreAddr];
        if (parentRowIndex === undefined) return;

        setTable((prev) => {
            if (!prev) return prev;
            const nextRows = [...(prev.rows || [])];

            // 1) Xoá dòng con tại vị trí hiện tại
            nextRows.splice(rowIndex, 1);

            // 2) Cập nhật công thức SUM(...) cho ô điểm của dòng La Mã (cha)
            const remainingAddrs = (
                childrenScoreAddrs[parentRowIndex] || []
            ).filter((a) => a !== childScoreAddr);
            const parentRow = nextRows[parentRowIndex];
            if (parentRow && parentRow.cells) {
                const parentCells = [...parentRow.cells];
                parentCells[scoreColIdx] = {
                    ...parentCells[scoreColIdx],
                    formula: remainingAddrs.length
                        ? `=SUM(${remainingAddrs.join(",")})`
                        : "=0",
                };
                nextRows[parentRowIndex] = { ...parentRow, cells: parentCells };
            }

            return { ...prev, rows: nextRows };
        });

        // 3) Cập nhật danh sách addr con
        setChildrenScoreAddrs((prev) => {
            const arr = (prev[parentRowIndex] || []).filter(
                (a) => a !== childScoreAddr
            );
            return { ...prev, [parentRowIndex]: arr };
        });

        // 4) Xoá input đã nhập cho addr con (nếu có)
        setCellInputs((prev) => {
            if (!(childScoreAddr in prev)) return prev;
            const { [childScoreAddr]: _drop, ...rest } = prev;
            return rest;
        });
    };

    const handleExport = async () => {
        try {
            // Map user fullname -> employee_name and selected position -> role
            const current = user;
            const employee_name = current?.fullname || current?.username || "";

            let role = "";
            let branchId = "",
                departmentId = "",
                positionId = "";
            try {
                branchId = localStorage.getItem("ufp.branchId") || "";
                departmentId = localStorage.getItem("ufp.departmentId") || "";
                positionId = localStorage.getItem("ufp.positionId") || "";
                if (departmentId && positionId) {
                    const positions = orgData.positions?.[departmentId] || [];
                    role = findNameById(positions, positionId) || "";
                }
            } catch {}

            const fileName = `Phieu_tu_danh_gia_${user.username}_${new Date()
                .toISOString()
                .slice(0, 10)}.xlsx`;

            // 1) Build Excel buffer (no saving yet)
            const buffer = await exportFormExcel({
                table,
                cellInputs,
                computedByAddr,
                fileName,
                title: "BẢNG TỰ ĐÁNH GIÁ MỨC ĐỘ HOÀN THÀNH CÔNG VIỆC",
                employee_name,
                role,
                protectSheet: true,
                protectPassword: "Admin@6421",
                readOnly: true,
                allowResizeForPrint: true,
                returnBuffer: true,
            });

            // 2) Upload to backend for retrieval later
            try {
                const blob = new Blob([buffer], {
                    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                });
                const fd = new FormData();
                fd.append("file", blob, fileName);
                fd.append("fileName", fileName);
                fd.append("formId", id || template?.id || "");
                fd.append("table", JSON.stringify(table));
                console.log(table);
                
                const resp = await api.post("/exports", fd, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                const exportId = resp?.data?.id;
                if (exportId) {
                    message.success(`Đã lưu bản xuất (ID: ${exportId})`);
                } else {
                    message.success("Đã lưu bản xuất");
                }
            } catch (err) {
                // Non-fatal: still allow local download
                console.warn(
                    "Upload export failed:",
                    err?.response?.data || err.message
                );
            }

            // 3) Save locally for user
            const blob = new Blob([buffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            saveAs(blob, fileName);
        } catch (e) {
            console.error(e);
            message.error(e?.message || "Xuất Excel thất bại");
        }
    };

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setLoading(true);
            setError("");
            try {
                let tpl = null;
                if (id) {
                    const { data } = await api.get(`/forms/${id}`);
                    tpl = data;
                } else {
                    const { data: list } = await api.get("/forms");
                    if (Array.isArray(list) && list.length > 0) {
                        tpl = list[0];
                    }
                }
                if (!mounted) return;
                setTemplate(tpl || null);
            } catch (e) {
                if (!mounted) return;
                setError(
                    e?.response?.data?.message ||
                        e.message ||
                        "Failed to load form"
                );
            } finally {
                if (mounted) setLoading(false);
            }
        };
        load();
        return () => {
            mounted = false;
        };
    }, [id]);

    if (loading)
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
    if (error)
        return (
            <div style={{ maxWidth: 720, margin: "24px auto" }}>
                <Alert
                    type="error"
                    message="Failed to load form"
                    description={error}
                />
            </div>
        );
    if (!template)
        return (
            <div style={{ maxWidth: 720, margin: "24px auto" }}>
                <Empty description="No form templates found. Upload an Excel file to generate a form." />
            </div>
        );

    return (
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <Title level={3} style={{ marginBottom: 8 }}>
                {formTitle}
            </Title>

            <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
                <Button type="primary" onClick={handleExport}>
                    Xuất Excel
                </Button>
            </div>

            {table && table.columns?.length > 0 && table.rows?.length > 0 && (
                <SchemaTable
                    table={table}
                    cellInputs={cellInputs}
                    computedByAddr={computedByAddr}
                    onCellChange={handleCellChange}
                    sectionOptions={SECTION_OPTIONS}
                    onSectionChoose={handleSectionChoose}
                    selectValueByRow={criteriaSelectValueByRow}
                    scoreColIdx={scoreColIdx}
                    childAddrToParentRow={childAddrToParentRow}
                    onRemoveChild={handleRemoveChild}
                />
            )}
        </div>
    );
}
