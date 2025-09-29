// FormViewer.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
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

const cloneTable = (source) => (source ? JSON.parse(JSON.stringify(source)) : source);

const normalizeText = (value) =>
    String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

const parseNumberAnyLocale = (value) => {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    let s = String(value).trim();
    if (!s) return null;
    const hasPercent = s.includes("%");
    s = s.replace(/%/g, "");
    if (s.includes(",") && !s.includes(".")) {
        s = s.replace(/\./g, "").replace(",", ".");
    } else {
        s = s.replace(/,/g, "");
    }
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    return hasPercent ? n / 100 : n;
};

const formatPercentVi = (ratio) => {
    if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) return "";
    const nf = new Intl.NumberFormat("vi-VN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
    return `${nf.format(ratio * 100)}%`;
};

const AUTO_GROWTH_RULES = [
    {
        growthLabel: "Tăng trưởng nguồn vốn",
        bonusLabel: "Chỉ tiêu nguồn vốn vượt KH Quý được giao",
        key: "capital-growth-bonus",
        step: 0.05,
    },
    {
        growthLabel: "Tăng trưởng dư nợ",
        bonusLabel: "Chỉ tiêu dư nợ vượt KH Quý được giao",
        key: "loan-growth-bonus",
        step: 0.05,
    },
    {
        growthLabel: "Thu dịch vụ",
        bonusLabel: "Chỉ tiêu thu dịch vụ vượt KH Quý được giao",
        key: "service-growth-bonus",
        step: 0.03,
    },
];
const AUTO_GROWTH_RULE_KEY_SET = new Set(
    AUTO_GROWTH_RULES.map((rule) => rule.key)
);

const mergeAddresses = (list = [], extras = []) => {
    const result = [];
    const seen = new Set();
    const base = Array.isArray(list) ? list : [];
    base.forEach((addr) => {
        const trimmed = String(addr || "").trim();
        if (trimmed && !seen.has(trimmed)) {
            seen.add(trimmed);
            result.push(trimmed);
        }
    });
    const extraList = Array.isArray(extras) ? extras : [extras];
    extraList.forEach((addr) => {
        const trimmed = String(addr || "").trim();
        if (trimmed && !seen.has(trimmed)) {
            seen.add(trimmed);
            result.push(trimmed);
        }
    });
    return result;
};

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
    D: [
        {
            label: "Điểm chấp hành nội quy lao động, văn hoá Agribank",
            value: "D-1",
        },
        {
            label: "Vi phạm chủ trương, chính sách của Đảng, pháp luật của nhà nước, chế độ của ngành nhưng chưa dẫn đến mức phải thi hành kỷ luật.",
            value: "D-2",
        },
        {
            label: "Đến cơ quan trong tình trạng say rượu, bia, các chất kích thích hoặc say rượu, bia bỏ vị trí làm việc",
            value: "D-3",
        },
        {
            label: "Đồng phục không đúng quy định",
            value: "D-4",
        },
        {
            label: "Chơi cờ, bài, chơi trò chơi điện tử, nói chuyện phiếm gây ồn ào  trong giờ làm việc",
            value: "D-5",
        },
        {
            label: "Có hành vi thiếu văn hoá tại nơi làm việc (nói tục, chửi bậy, xúc phạm danh dự người khác, quấy rối tình dục nơi làm việc...) hoặc gây rối làm mất trật tự cơ quan, gây mất đoàn kết nội bộ, không giữ gìn vệ sinh chung làm ảnh hưởng đến hoạt động kinh doanh của đơn vị",
            value: "D-6",
        },
        {
            label: "Có tác phong, thái độ làm việc không đúng đắn thiếu tinh thần trách nhiệm, bị khách hàng phản ánh làm ảnh hưởng đến uy tín của đơn vị nhưng chưa đến mức gây thiệt hại cho khách hàng và ngân hàng",
            value: "D-7",
        },
        {
            label: "Chấp hành không nghiêm chỉnh, triệt để những quy định về an toàn lao động và vệ sinh lao động nơi làm việc.",
            value: "D-8",
        },
        {
            label: "Ý thức trách nhiệm kém trong việc bảo quản, giữ gìn tài sản chung của cơ quan và tài sản được cơ quan giao cho cá nhân sử dụng, quản lý dẫn đến hư hỏng, mất mát. Sử dụng tài sản của cơ quan, đơn vị phục vụ cho lợi ích cá nhân mình và cá nhân người khác.",
            value: "D-9",
        },
        {
            label: "Vi phạm quy định về bảo vệ, giữ gìn bí mật về hoạt động kinh doanh của đơn vị như: trong phát ngôn, cung cấp số liệu tài liệu chưa được cho phép, bất cẩn để lộ thông tin… nhưng chưa gây ảnh hưởng đến hoạt động của đơn vị.",
            value: "D-10",
        },
        {
            label: "Thiếu tuân thủ các quy định về an toàn phòng chống cháy nổ, an toàn kho quỹ, quy trình vận hành máy móc, thiết bị kỹ thuật được trang bị dẫn đến gây hậu quả.",
            value: "D-11",
        },
        {
            label: "Thiếu tuân thủ các quy định về an toàn phòng chống cháy nổ, an toàn kho quỹ, quy trình vận hành máy móc, thiết bị kỹ thuật được trang bị dẫn đến gây hậu quả.",
            value: "D-12",
        },
        {
            label: "Cán bộ bị KH phản ánh qua đường dây nóng hoặc hòm thư góp ý mà phản ánh đó được xác định có lỗi của cán bộ",
            value: "D-13",
        },
        {
            label: "Vi phạm các chuẩn mực khác về Văn hóa Agribank.",
            value: "D-14",
        },
        {
            label: "Thực hiện giờ công lao động: Đi muộn, về sớm mà không có lý do chính đáng.",
            value: "D-15",
        },
        {
            label: "Nghỉ không phép",
            value: "D-16",
        },
        {
            label: "Các trường hợp khác quy định tại văn bản 429/NQLĐ-HĐTV-TCNS ngày 25/7/2022 về Nội quy lao động của Agribank hoặc các văn bản quy định khác theo từng thời kỳ (nếu có)",
            value: "D-17",
        },
    ],
};

const D_SECTION_LABEL = "Điểm chấp hành nội quy lao động, văn hoá Agribank";
SECTION_OPTIONS[D_SECTION_LABEL] = SECTION_OPTIONS.D;
SECTION_OPTIONS["Chỉ tiêu định tính"] = SECTION_OPTIONS.II;
SECTION_OPTIONS[normalizeText("Chỉ tiêu định tính")] = SECTION_OPTIONS.II;
SECTION_OPTIONS["Điểm cộng (tối đa 10 điểm)"] = SECTION_OPTIONS.III;
SECTION_OPTIONS[normalizeText("Điểm cộng (tối đa 10 điểm)")] = SECTION_OPTIONS.III;
SECTION_OPTIONS["Điểm trừ (tối đa 10 điểm)"] = SECTION_OPTIONS.IV;
SECTION_OPTIONS[normalizeText("Điểm trừ (tối đa 10 điểm)")] = SECTION_OPTIONS.IV;
SECTION_OPTIONS["Điểm thưởng (tối đa 05 điểm)"] = SECTION_OPTIONS.V;
SECTION_OPTIONS[normalizeText("Điểm thưởng (tối đa 05 điểm)")] = SECTION_OPTIONS.V;
SECTION_OPTIONS[normalizeText(D_SECTION_LABEL)] = SECTION_OPTIONS.D;
const D_SECTION_LABEL_ALT = "Điểm chấp hành nội quy lao động, văn hóa Agribank";
SECTION_OPTIONS[D_SECTION_LABEL_ALT] = SECTION_OPTIONS.D;
SECTION_OPTIONS[normalizeText(D_SECTION_LABEL_ALT)] = SECTION_OPTIONS.D;
const QUALITATIVE_LABEL = "Chỉ tiêu định tính";
const QUALITATIVE_LABEL_NORMALIZED = normalizeText(QUALITATIVE_LABEL);
const QUALITATIVE_BASE_SCORE = 20;
const DISCIPLINE_BASE_SCORE = 10;
const DISCIPLINE_LABEL_NORMALIZED = normalizeText(D_SECTION_LABEL);
const DISCIPLINE_LABEL_ALT_NORMALIZED = normalizeText(D_SECTION_LABEL_ALT);

const isQualitativeLabel = (value) =>
    normalizeText(value) === QUALITATIVE_LABEL_NORMALIZED;

const isDisciplineLabel = (value) => {
    const normalized = normalizeText(value);
    return (
        normalized === DISCIPLINE_LABEL_NORMALIZED ||
        normalized === DISCIPLINE_LABEL_ALT_NORMALIZED
    );
};

const resolveSectionOptions = (labelKey) => {
    const trimmed = String(labelKey || '').trim();
    if (!trimmed) return [];
    if (SECTION_OPTIONS[trimmed]) return SECTION_OPTIONS[trimmed];
    const normalized = normalizeText(trimmed);
    if (SECTION_OPTIONS[normalized]) return SECTION_OPTIONS[normalized];
    const match = Object.entries(SECTION_OPTIONS).find(
        ([k]) => normalizeText(k) === normalized
    );
    return match ? match[1] : [];
};

const applyBaseScoreDefaults = (tableData, scoreColIdx) => {
    if (!tableData?.rows || scoreColIdx == null) return tableData;
    let changed = false;
    const nextRows = tableData.rows.map((row) => {
        if (!row?.cells) return row;
        const criteria = String(row.cells?.[1]?.value || '').trim();
        const targetCell = row.cells?.[scoreColIdx];
        if (!targetCell) return row;

        let desiredFormula = null;
        if (isQualitativeLabel(criteria)) {
            desiredFormula = `=${QUALITATIVE_BASE_SCORE}`;
        } else if (isDisciplineLabel(criteria)) {
            desiredFormula = `=${DISCIPLINE_BASE_SCORE}`;
        }

        if (!desiredFormula || targetCell.formula === desiredFormula) return row;

        changed = true;
        const nextCells = row.cells.map((cell, idx) =>
            idx === scoreColIdx ? { ...cell, formula: desiredFormula } : cell
        );
        return { ...row, cells: nextCells };
    });

    return changed ? { ...tableData, rows: nextRows } : tableData;
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
    const [table, setTable] = useState(() => cloneTable(baseTable));
    useEffect(() => setTable(cloneTable(baseTable)), [baseTable]);

    const computeDefaultCriteria = useCallback(() => {
        if (!baseTable?.rows) return {};
        const next = {};
        baseTable.rows.forEach((row, index) => {
            const criteria = String(row?.cells?.[1]?.value || "").trim();
            const rowKey = criteria || `row-${index}`;
            const options = resolveSectionOptions(criteria);
            if (options[0]) next[rowKey] = options[0].value;
        });
        return next;
    }, [baseTable]);

    // Khởi tạo giá trị mặc định cho các dòng có tùy chọn
    useEffect(() => {
        setCriteriaSelectValueByRow(computeDefaultCriteria());
    }, [computeDefaultCriteria]);


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

    useEffect(() => {
        if (scoreColIdx == null) return;
        setTable((prev) => {
            if (!prev) return prev;
            return applyBaseScoreDefaults(prev, scoreColIdx);
        });
    }, [scoreColIdx, baseTable]);

    const planColIdx = useMemo(() => {
        const cols = template?.schema?.table?.columns || [];
        const idx = cols.findIndex((c) =>
            normalizeText(c?.label).includes("ke hoach")
        );
        return idx >= 0 ? idx : null;
    }, [template]);

    const actualColIdx = useMemo(() => {
        const cols = template?.schema?.table?.columns || [];
        const idx = cols.findIndex((c) =>
            normalizeText(c?.label).includes("thuc hien")
        );
        return idx >= 0 ? idx : null;
    }, [template]);

    const noteColIdx = useMemo(() => {
        const cols = template?.schema?.table?.columns || [];
        const idx = cols.findIndex((c) =>
            normalizeText(c?.label).includes("ghi chu")
        );
        return idx >= 0 ? idx : null;
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
    const buildParentFormula = (criteriaLabel, childAddresses) => {
        const addrs = (childAddresses || []).filter(Boolean);
        if (isQualitativeLabel(criteriaLabel)) {
            if (!addrs.length) return `=${QUALITATIVE_BASE_SCORE}`;
            return `=${QUALITATIVE_BASE_SCORE}-SUM(${addrs.join(",")})`;
        }
        if (isDisciplineLabel(criteriaLabel)) {
            if (!addrs.length) return `=${DISCIPLINE_BASE_SCORE}`;
            const sumExpr = addrs.length === 1 ? addrs[0] : `SUM(${addrs.join(",")})`;
            const baseMinusExpr = `${DISCIPLINE_BASE_SCORE}-${sumExpr}`;
            return `=IF(${baseMinusExpr}<0,0,${baseMinusExpr})`;
        }
        if (!addrs.length) return "=0";
        return `=SUM(${addrs.join(",")})`;
    };

    const handleSectionChoose = (rowIndex, rowKey, label) => {
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
            const criteria = String(parentRow?.cells?.[1]?.value || "").trim();
            parentCells[scoreColIdx] = {
                ...parentCells[scoreColIdx],
                formula: buildParentFormula(criteria, nextAddrs),
            };
            nextRows[rowIndex] = { ...parentRow, cells: parentCells };

            // 3) Chèn dòng con ngay dưới dòng La Mã
            nextRows.splice(rowIndex + 1, 0, newRow);

            return { ...prev, rows: nextRows };
        });

        // 4) Lưu lại danh sách addr con & tăng bộ đếm addr ảo
        setChildrenScoreAddrs((prev) => ({ ...prev, [rowIndex]: nextAddrs }));
        setVirtualRowNo((n) => n + 1);

        // 5) Reset lựa chọn của dòng về option đầu tiên dựa trên tiêu chí (ưu tiên label)
        const parentRow = table?.rows?.[rowIndex];
        const criteria = String(parentRow?.cells?.[1]?.value || "").trim();
        const key = criteria || `row-${rowIndex}`;
        const defaultOption = resolveSectionOptions(criteria)[0];
        if (defaultOption) {
            setCriteriaSelectValueByRow((m) => ({
                ...m,
                [key]: defaultOption.value,
            }));
        }
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
                const criteria = String(parentRow?.cells?.[1]?.value || "").trim();
                parentCells[scoreColIdx] = {
                    ...parentCells[scoreColIdx],
                    formula: buildParentFormula(criteria, remainingAddrs),
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

    const resolveCellNumericValue = (cell) => {
        if (!cell) return null;
        let raw = null;
        if (cell.addr) {
            if (cell.formula) {
                if (
                    computedByAddr &&
                    Object.prototype.hasOwnProperty.call(computedByAddr, cell.addr)
                ) {
                    raw = computedByAddr[cell.addr];
                } else {
                    raw = cell.value;
                }
            } else if (cell.input) {
                raw = cellInputs?.[cell.addr];
                if (raw === undefined || raw === null || raw === "") raw = cell.value;
            } else {
                raw = cellInputs?.[cell.addr];
                if (raw === undefined || raw === null || raw === "") raw = cell.value;
            }
        } else {
            raw = cell.value;
        }
        return parseNumberAnyLocale(raw);
    };

    useEffect(() => {
        if (
            !table?.rows ||
            scoreColIdx == null ||
            planColIdx == null ||
            actualColIdx == null
        )
            return;

        const rows = table.rows;
        const findParentIndex = (rowsList) =>
            rowsList.findIndex(
                (row) => normalizeText(row?.cells?.[0]?.value) === "iii"
            );

        const parentRowIdx = findParentIndex(rows);
        if (parentRowIdx === -1) return;

        const autoRowsByKey = new Map();
        const autoAddrsSet = new Set();
        rows.forEach((row, idx) => {
            const key = row?.autoGeneratedKey;
            if (key && AUTO_GROWTH_RULE_KEY_SET.has(key)) {
                autoRowsByKey.set(key, { row, idx });
                const addr = row?.cells?.[scoreColIdx]?.addr;
                if (addr) autoAddrsSet.add(addr);
            }
        });

        const currentManualAddrs = childrenScoreAddrs[parentRowIdx] || [];
        const manualAddrs = currentManualAddrs.filter(
            (addr) => addr && !autoAddrsSet.has(addr)
        );
        if (manualAddrs.length !== currentManualAddrs.length) {
            setChildrenScoreAddrs((prev) => ({
                ...prev,
                [parentRowIdx]: manualAddrs,
            }));
            return;
        }

        const otherAutoAddrsFor = (excludeKey) =>
            Array.from(autoRowsByKey.entries())
                .filter(([key]) => key !== excludeKey)
                .map(([, info]) => info.row?.cells?.[scoreColIdx]?.addr)
                .filter(Boolean);

        const parentFormulaFor = (autoAddrs) => {
            const allAddrs = mergeAddresses(manualAddrs, autoAddrs);
            return allAddrs.length ? `=SUM(${allAddrs.join(',')})` : "=0";
        };

        const findInsertIndex = (rowsList, parentIdx) => {
            let insertIdx = parentIdx + 1;
            while (insertIdx < rowsList.length) {
                const roman = String(rowsList[insertIdx]?.cells?.[0]?.value || "").trim();
                if (/^(II|III|IV|V)$/i.test(roman)) break;
                insertIdx += 1;
            }
            return insertIdx;
        };

        const processRule = (rule) => {
            const { growthLabel, bonusLabel, key } = rule;
            const autoInfo = autoRowsByKey.get(key) || null;
            const autoRowIdx = autoInfo?.idx ?? -1;
            const autoAddr = autoInfo?.row?.cells?.[scoreColIdx]?.addr || null;
            const otherAutoAddrs = otherAutoAddrsFor(key);

            const growthRowIdx = rows.findIndex(
                (row) =>
                    normalizeText(row?.cells?.[1]?.value) ===
                    normalizeText(growthLabel)
            );

            const planCell =
                growthRowIdx !== -1 ? rows[growthRowIdx]?.cells?.[planColIdx] : null;
            const actualCell =
                growthRowIdx !== -1 ? rows[growthRowIdx]?.cells?.[actualColIdx] : null;

            const planValue = resolveCellNumericValue(planCell);
            const actualValue = resolveCellNumericValue(actualCell);
            const valid =
                planValue !== null &&
                actualValue !== null &&
                Number.isFinite(planValue) &&
                planValue !== 0 &&
                Number.isFinite(actualValue);

            const positiveRatio = valid
                ? Math.max(0, (actualValue - planValue) / Math.abs(planValue))
                : 0;

            const step = typeof rule.step === 'number' && rule.step > 0 ? rule.step : 0.05;
            const rawPoints =
                positiveRatio > 0 ? Math.floor((positiveRatio + 1e-9) / step) : 0;
            const bonusPoints = Math.min(5, rawPoints);
            const noteText = positiveRatio > 0 ? `Vượt ${formatPercentVi(positiveRatio)}` : "";

            const removeAutoRow = () => {
                if (!autoInfo) return false;
                const desiredFormula = parentFormulaFor(otherAutoAddrs);
                setTable((prev) => {
                    if (!prev?.rows) return prev;
                    const nextRows = prev.rows.filter(
                        (row) => row?.autoGeneratedKey !== key
                    );
                    const parentIdxNext = findParentIndex(nextRows);
                    if (parentIdxNext !== -1) {
                        const parentRow = nextRows[parentIdxNext];
                        if (parentRow?.cells) {
                            const parentCells = parentRow.cells.map((cell, idx) =>
                                idx === scoreColIdx
                                    ? { ...cell, formula: desiredFormula }
                                    : cell
                            );
                            nextRows[parentIdxNext] = { ...parentRow, cells: parentCells };
                        }
                    }
                    return { ...prev, rows: nextRows };
                });
                if (autoAddr) {
                    setCellInputs((prev) => {
                        if (!prev || !(autoAddr in prev)) return prev;
                        const { [autoAddr]: _omit, ...rest } = prev;
                        return rest;
                    });
                }
                return true;
            };

            if (bonusPoints <= 0) {
                return removeAutoRow();
            }

            if (!autoInfo) {
                if (!valid) return false;
                const scoreColLetter = numToCol(scoreColIdx + 1);
                const newAddr = `${scoreColLetter}${virtualRowNo}`;
                const desiredFormula = parentFormulaFor(
                    mergeAddresses(otherAutoAddrs, newAddr)
                );
                setTable((prev) => {
                    if (!prev?.rows) return prev;
                    const nextRows = [...prev.rows];
                    const parentIdxNext = findParentIndex(nextRows);
                    if (parentIdxNext === -1) return prev;
                    const columnCount =
                        nextRows[parentIdxNext]?.cells?.length ||
                        prev.columns?.length ||
                        table?.columns?.length ||
                        0;
                    if (!columnCount) return prev;
                    const insertIdx = findInsertIndex(nextRows, parentIdxNext);
                    const newCells = Array.from({ length: columnCount }, (_, cIdx) => ({
                        addr: null,
                        value: "",
                        rowSpan: 1,
                        colSpan: 1,
                        hidden: false,
                        input: false,
                    }));
                    if (newCells[1]) newCells[1] = { ...newCells[1], value: bonusLabel };
                    if (noteColIdx != null && newCells[noteColIdx]) {
                        newCells[noteColIdx] = { ...newCells[noteColIdx], value: noteText };
                    }
                    newCells[scoreColIdx] = {
                        ...newCells[scoreColIdx],
                        addr: newAddr,
                        value: bonusPoints,
                        input: false,
                    };
                    nextRows.splice(insertIdx, 0, {
                        autoGenerated: true,
                        autoGeneratedKey: key,
                        cells: newCells,
                    });
                    const parentRow = nextRows[parentIdxNext];
                    if (parentRow?.cells) {
                        const parentCells = parentRow.cells.map((cell, idx) =>
                            idx === scoreColIdx
                                ? { ...cell, formula: desiredFormula }
                                : cell
                        );
                        nextRows[parentIdxNext] = { ...parentRow, cells: parentCells };
                    }
                    return { ...prev, rows: nextRows };
                });
                setVirtualRowNo((n) => n + 1);
                return true;
            }

            if (!valid) {
                return removeAutoRow();
            }

            const combinedAutoAddrs = mergeAddresses(
                otherAutoAddrs,
                autoAddr ? [autoAddr] : []
            );
            const desiredFormula = parentFormulaFor(combinedAutoAddrs);
            const currentFormula =
                rows[parentRowIdx]?.cells?.[scoreColIdx]?.formula || "";
            const currentScore = autoInfo.row?.cells?.[scoreColIdx]?.value;
            const currentNote =
                noteColIdx != null
                    ? autoInfo.row?.cells?.[noteColIdx]?.value || ""
                    : "";
            const needRowUpdate =
                String(currentScore ?? "") !== String(bonusPoints) ||
                currentNote !== noteText;
            const needParentUpdate = currentFormula !== desiredFormula;

            if (!needRowUpdate && !needParentUpdate) return false;

            setTable((prev) => {
                if (!prev?.rows) return prev;
                const nextRows = prev.rows.map((row, idx) => {
                    if (idx === autoRowIdx && row?.cells) {
                        const cells = row.cells.map((cell, cIdx) => {
                            if (cIdx === scoreColIdx) {
                                return { ...cell, value: bonusPoints };
                            }
                            if (noteColIdx != null && cIdx === noteColIdx) {
                                return { ...cell, value: noteText };
                            }
                            return cell;
                        });
                        return { ...row, cells };
                    }
                    if (normalizeText(row?.cells?.[0]?.value) === "iii" && row?.cells) {
                        const cells = row.cells.map((cell, cIdx) => {
                            if (cIdx === scoreColIdx) {
                                return { ...cell, formula: desiredFormula };
                            }
                            return cell;
                        });
                        return { ...row, cells };
                    }
                    return row;
                });
                return { ...prev, rows: nextRows };
            });
            return true;
        };

        for (const rule of AUTO_GROWTH_RULES) {
            if (processRule(rule)) return;
        }
    }, [
        table,
        scoreColIdx,
        planColIdx,
        actualColIdx,
        noteColIdx,
        childrenScoreAddrs,
        cellInputs,
        computedByAddr,
    ,
        virtualRowNo
    ]);

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
                    if (role.includes("-")) {
                        role = role.split("-")[0].trim();
                    }
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
                branch: branchId,
                department: departmentId.split("-")[1],
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

            const restoredTable = cloneTable(baseTable);
            const resetTable = applyBaseScoreDefaults(restoredTable, scoreColIdx);
            const initialInputs = resetTable ? buildInitialInputs(resetTable) : {};
            const defaultCriteria = computeDefaultCriteria();

            setChildrenScoreAddrs({});
            setVirtualRowNo(1000);
            setCriteriaSelectValueByRow(defaultCriteria);
            setCellInputs(initialInputs);
            setTable(resetTable ?? null);
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
