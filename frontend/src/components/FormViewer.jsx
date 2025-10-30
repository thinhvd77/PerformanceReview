/**
 * FormViewer Component
 *
 * Main component for displaying and editing performance review forms.
 * Supports dynamic form structure with Excel-like formula computation,
 * automatic scoring rules, and quarterly metrics tracking.
 *
 * @component
 * @param {Object} props - Component props
 * @param {string} [props.formId] - Optional form template ID to load (overrides route param)
 *
 * @description
 * Key Features:
 * - Dynamic table rendering with editable cells
 * - Excel-like formula evaluation (SUM, MAX, cell references)
 * - Automatic scoring rules for sections III, IV, V
 * - Quarterly metrics loading and persistence
 * - Section-based criteria selection with dynamic child rows
 * - Excel export with form data and metadata
 *
 * State Management:
 * - Template loading and caching
 * - Quarter/Year selection with localStorage persistence
 * - Dynamic table state (cloned from template, allows runtime modifications)
 * - Cell inputs (user-entered values by cell address)
 * - Children tracking (dynamically added rows for criteria)
 * - Column indices (computed from template columns)
 *
 * Major Effects:
 * 1. Form loading - Loads template from API on mount/ID change
 * 2. Quarter/Year persistence - Saves selection to localStorage
 * 3. Quarter plan data loading - Auto-populates quarter plan metrics
 * 4. Base score defaults - Applies default score values to score column
 * 5. Row A formula - Computes total score formula (A = I + II + III - IV + V)
 * 6. AUTO_GROWTH_RULES - Processes Section III scoring rules
 * 7. AUTO_MINUS_RULES - Processes Section IV scoring rules
 * 8. AUTO_BONUS_RULES - Processes Section V scoring rules (async)
 */

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api.js";
import { Button, Spin, Alert, Typography, Empty, Select, Space } from "antd";
import SchemaTable from "./SchemaTable.jsx";
import {
    buildInitialInputs,
    buildCellMap,
    computeComputedByAddr,
} from "../utils/formulaEngine.js";
import { useAuth } from "../contexts/authContext.jsx";
import { getCurrentQuarterYear } from "../utils/extractQuarterlyMetrics.js";

// Import constants
import {
    AUTO_GROWTH_RULES,
    AUTO_MINUS_RULES,
    AUTO_BONUS_RULES,
    AUTO_GROWTH_RULE_KEY_SET,
    AUTO_MINUS_RULE_KEY_SET,
    AUTO_BONUS_RULE_KEY_SET,
} from "./FormViewer/constants/autoRules.js";

import { SECTION_OPTIONS } from "./FormViewer/constants/sectionOptions.js";

// Import utilities
import { cloneTable } from "./FormViewer/utils/tableUtils.js";

import {
    QUALITATIVE_BASE_SCORE_DEFAULT,
    resolveCellNumericValue as resolveCellNumericValueUtil,
    getQualitativeBaseScoreFromTable,
    applyBaseScoreDefaults,
} from "./FormViewer/utils/formCalculations.js";

import { buildParentFormula as buildParentFormulaUtil } from "./FormViewer/utils/formulaUtils.js";

// Import processors
import { processGrowthRules } from "./FormViewer/processors/autoGrowthProcessor.js";
import { processMinusRules } from "./FormViewer/processors/autoMinusProcessor.js";
import { processBonusRules } from "./FormViewer/processors/autoBonusProcessor.js";

// Import handlers
import {
    handleSectionChooseLogic,
    handleRemoveChildLogic,
} from "./FormViewer/handlers/sectionHandlers.js";

import { handleExportWorkflow } from "./FormViewer/handlers/exportHandler.js";
import { loadQuarterPlanData } from "./FormViewer/handlers/quarterPlanHandler.js";

import { computeRowATotalFormula } from "./FormViewer/handlers/scoreTotalHandler.js";

import {
    computeDefaultCriteria,
    loadFormTemplate,
} from "./FormViewer/utils/formLoader.js";

// Import custom hooks
import { useColumnIndices } from "./FormViewer/hooks/useColumnIndices.js";
import { useChildrenTracking } from "./FormViewer/hooks/useChildrenTracking.js";

const { Title } = Typography;

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

    // Quarter/Year selection for form
    const defaultQuarterYear = useMemo(() => getCurrentQuarterYear(), []);
    const [selectedQuarter, setSelectedQuarter] = useState(() => {
        const saved = localStorage.getItem("formViewer.quarter");
        return saved ? parseInt(saved, 10) : defaultQuarterYear.quarter;
    });
    const [selectedYear, setSelectedYear] = useState(() => {
        const saved = localStorage.getItem("formViewer.year");
        return saved ? parseInt(saved, 10) : defaultQuarterYear.year;
    });

    // Save quarter/year selection to localStorage
    useEffect(() => {
        localStorage.setItem("formViewer.quarter", String(selectedQuarter));
    }, [selectedQuarter]);
    useEffect(() => {
        localStorage.setItem("formViewer.year", String(selectedYear));
    }, [selectedYear]);

    const formTitle = useMemo(
        () => template?.schema?.title || template?.name || "Form",
        [template]
    );

    // Dynamic table state - cloned from template to allow runtime modifications
    const baseTable = useMemo(() => template?.schema?.table, [template]);
    const [table, setTable] = useState(() => cloneTable(baseTable));
    useEffect(() => setTable(cloneTable(baseTable)), [baseTable]);

    // Khởi tạo giá trị mặc định cho các dòng có tùy chọn
    useEffect(() => {
        setCriteriaSelectValueByRow(computeDefaultCriteria(baseTable));
    }, [baseTable]);

    // State cho cell input (theo địa chỉ Excel)
    const [cellInputs, setCellInputs] = useState({});

    // State to track table initialization (triggers quarterly metrics load)
    const [tableReady, setTableReady] = useState(false);

    // Build cell map & tính công thức dựa trên bảng "sống"
    const cellMap = useMemo(() => buildCellMap(table), [table]);

    // ⚠️ Giữ dữ liệu cũ, chỉ thêm default cho addr mới khi bảng thay đổi
    useEffect(() => {
        const newInputs = buildInitialInputs(table);
        setCellInputs((prev) => {
            const result = { ...prev };
            // Chỉ thêm những addr chưa tồn tại, không ghi đè giá trị đã nhập
            Object.keys(newInputs).forEach((addr) => {
                if (!(addr in prev)) {
                    result[addr] = newInputs[addr];
                }
            });
            return result;
        });
    }, [table]);

    const computedByAddr = useMemo(
        () => computeComputedByAddr({ table, cellInputs, cellMap }),
        [table, cellInputs, cellMap]
    );

    const {
        scoreColIdx,
        planColIdx,
        actualColIdx,
        noteColIdx,
        prevActualColIdx,
        prevPlanColIdx,
        annualPlanColIdx,
    } = useColumnIndices(template);

    const manualEditedAddrsRef = useRef(new Set());
    const quarterPlanLoadedRef = useRef("");
    const previousQuarterYearRef = useRef({
        quarter: selectedQuarter,
        year: selectedYear,
    });

    useEffect(() => {
        manualEditedAddrsRef.current = new Set();
        quarterPlanLoadedRef.current = "";
    }, [baseTable]);

    useEffect(() => {
        const prev = previousQuarterYearRef.current;
        if (prev.quarter === selectedQuarter && prev.year === selectedYear) {
            return;
        }

        previousQuarterYearRef.current = {
            quarter: selectedQuarter,
            year: selectedYear,
        };

        if (!table?.rows || table.rows.length === 0) {
            manualEditedAddrsRef.current = new Set();
            return;
        }

        const manualAddrs = manualEditedAddrsRef.current;
        if (manualAddrs.size > 0) {
            setCellInputs((prevInputs) => {
                if (!prevInputs) return prevInputs;
                const next = { ...prevInputs };
                manualAddrs.forEach((addr) => {
                    if (
                        addr &&
                        Object.prototype.hasOwnProperty.call(next, addr)
                    ) {
                        delete next[addr];
                    }
                });
                return next;
            });
        }

        manualEditedAddrsRef.current = new Set();
        setCriteriaSelectValueByRow(computeDefaultCriteria(baseTable));
        quarterPlanLoadedRef.current = "";
    }, [selectedQuarter, selectedYear, baseTable, table]);

    const handleCellChange = useCallback((addr, v) => {
        if (!addr) return;
        manualEditedAddrsRef.current.add(addr);
        setCellInputs((prev) => ({ ...prev, [addr]: v }));
    }, []);

    /**
     * Load saved quarter plan ("Kế hoạch quý") values for the active quarter/year.
     * Reloads whenever the quarter or year changes or manual values are cleared.
     */
    useEffect(() => {
        if (
            !tableReady ||
            !table ||
            !table.rows ||
            planColIdx == null ||
            planColIdx < 0 ||
            !user?.username
        ) {
            return;
        }

        const loadKey = `${user.username}-Q${selectedQuarter}-${selectedYear}`;
        if (quarterPlanLoadedRef.current === loadKey) {
            return;
        }

        let cancelled = false;
        const loadQuarterPlan = async () => {
            try {
                const result = await loadQuarterPlanData({
                    table,
                    planColIdx,
                    selectedQuarter,
                    selectedYear,
                    username: user.username,
                    api,
                });

                if (!result || cancelled) return;

                if (
                    result.cellInputsToDelete &&
                    result.cellInputsToDelete.length > 0
                ) {
                    setCellInputs((prev) => {
                        if (!prev) return prev;
                        const next = { ...prev };
                        result.cellInputsToDelete.forEach((addr) => {
                            delete next[addr];
                        });
                        return next;
                    });
                }

                if (
                    result.cellInputsToUpdate &&
                    Object.keys(result.cellInputsToUpdate).length > 0
                ) {
                    setCellInputs((prev) => ({
                        ...prev,
                        ...result.cellInputsToUpdate,
                    }));
                }
            } finally {
                if (!cancelled) {
                    quarterPlanLoadedRef.current = loadKey;
                }
            }
        };

        loadQuarterPlan().catch((err) => {
            console.warn("Quarter plan load failed:", err);
            if (!cancelled) {
                quarterPlanLoadedRef.current = loadKey;
            }
        });

        return () => {
            cancelled = true;
        };
    }, [
        table,
        tableReady,
        planColIdx,
        selectedQuarter,
        selectedYear,
        user?.username,
    ]);

    useEffect(() => {
        if (scoreColIdx == null) return;
        setTable((prev) => {
            if (!prev) return prev;
            return applyBaseScoreDefaults(prev, scoreColIdx);
        });
    }, [scoreColIdx, baseTable]);

    // A = I + II + III - IV + V (ở cột "Điểm theo mức độ hoàn thành")
    useEffect(() => {
        const updatedTable = computeRowATotalFormula({ table, scoreColIdx });
        if (updatedTable) {
            setTable(updatedTable);
        }
    }, [table, scoreColIdx]);

    // ==== Children tracking state ====
    const {
        virtualRowNo,
        setVirtualRowNo,
        childrenScoreAddrs,
        setChildrenScoreAddrs,
        childAddrToParentRow,
    } = useChildrenTracking();

    // Ref để ngăn AUTO_BONUS_RULES useEffect chạy lại trong khi đang xử lý
    const bonusRulesProcessingRef = useRef(false);

    // Detect when table is first loaded and ready
    useEffect(() => {
        if (table && table.rows && table.rows.length > 0 && !tableReady) {
            setTableReady(true);
        }
    }, [table, tableReady]);

    const qualitativeBaseScore = useMemo(() => {
        const fromActive = getQualitativeBaseScoreFromTable(table);
        if (fromActive != null) return fromActive;
        const fromTemplate = getQualitativeBaseScoreFromTable(baseTable);
        if (fromTemplate != null) return fromTemplate;
        return QUALITATIVE_BASE_SCORE_DEFAULT;
    }, [table, baseTable]);

    // Wrapper for buildParentFormula that includes qualitativeBaseScore from state
    const buildParentFormula = useCallback(
        (criteriaLabel, childAddresses) => {
            return buildParentFormulaUtil(
                criteriaLabel,
                childAddresses,
                qualitativeBaseScore
            );
        },
        [qualitativeBaseScore]
    );

    const handleSectionChoose = (rowIndex, rowKey, label) => {
        const result = handleSectionChooseLogic({
            rowIndex,
            rowKey,
            label,
            table,
            childrenScoreAddrs,
            virtualRowNo,
            scoreColIdx,
            planColIdx,
            actualColIdx,
            noteColIdx,
            qualitativeBaseScore,
        });

        if (!result) return;

        // Apply state updates
        if (result.table) setTable(result.table);
        if (result.childrenScoreAddrs)
            setChildrenScoreAddrs(result.childrenScoreAddrs);
        if (result.virtualRowNo) setVirtualRowNo(result.virtualRowNo);
        if (result.criteriaSelectValue) {
            setCriteriaSelectValueByRow((m) => ({
                ...m,
                [result.criteriaSelectValue.key]:
                    result.criteriaSelectValue.value,
            }));
        }
    };

    // Xoá dòng con đã tạo từ Select và cập nhật công thức của dòng cha
    const handleRemoveChild = (rowIndex, childScoreAddr) => {
        const result = handleRemoveChildLogic({
            rowIndex,
            childScoreAddr,
            table,
            childrenScoreAddrs,
            childAddrToParentRow,
            scoreColIdx,
            qualitativeBaseScore,
        });

        if (!result) return;

        // Apply state updates
        if (result.table) setTable(result.table);
        if (result.childrenScoreAddrs)
            setChildrenScoreAddrs(result.childrenScoreAddrs);
        if (result.cellInputsToDelete && result.cellInputsToDelete.length > 0) {
            setCellInputs((prev) => {
                const next = { ...prev };
                result.cellInputsToDelete.forEach((addr) => {
                    delete next[addr];
                });
                return next;
            });
        }
    };

    /**
     * Wrapper for resolveCellNumericValue that uses the imported utility
     * Memoized to prevent re-creating on every render (prevents infinite loops in useEffects)
     */
    const resolveCellNumericValue = useCallback(
        (cell) => {
            return resolveCellNumericValueUtil(
                cell,
                cellInputs,
                computedByAddr
            );
        },
        [cellInputs, computedByAddr]
    );

    // AUTO_GROWTH_RULES useEffect - Section III (Điểm cộng)
    useEffect(() => {
        const result = processGrowthRules({
            table,
            rules: AUTO_GROWTH_RULES,
            ruleKeySet: AUTO_GROWTH_RULE_KEY_SET,
            scoreColIdx,
            planColIdx,
            actualColIdx,
            noteColIdx,
            childrenScoreAddrs,
            cellInputs,
            computedByAddr,
            virtualRowNo,
            resolveCellNumericValue,
        });

        if (!result) return;

        // Apply state updates returned from processor
        if (result.table) setTable(result.table);
        if (result.cellInputs) setCellInputs(result.cellInputs);
        if (result.virtualRowNo) setVirtualRowNo(result.virtualRowNo);
        if (result.childrenScoreAddrs)
            setChildrenScoreAddrs(result.childrenScoreAddrs);
    }, [
        table,
        scoreColIdx,
        planColIdx,
        actualColIdx,
        noteColIdx,
        childrenScoreAddrs,
        cellInputs,
        computedByAddr,
        virtualRowNo,
        resolveCellNumericValue,
    ]);

    // AUTO_MINUS_RULES useEffect - Section IV (Điểm trừ)
    useEffect(() => {
        const result = processMinusRules({
            table,
            rules: AUTO_MINUS_RULES,
            ruleKeySet: AUTO_MINUS_RULE_KEY_SET,
            scoreColIdx,
            planColIdx,
            actualColIdx,
            prevActualColIdx,
            prevPlanColIdx,
            noteColIdx,
            childrenScoreAddrs,
            cellInputs,
            computedByAddr,
            virtualRowNo,
            resolveCellNumericValue,
        });

        if (!result) return;

        // Apply state updates returned from processor
        if (result.table) setTable(result.table);
        if (result.cellInputs) setCellInputs(result.cellInputs);
        if (result.virtualRowNo) setVirtualRowNo(result.virtualRowNo);
        if (result.childrenScoreAddrs)
            setChildrenScoreAddrs(result.childrenScoreAddrs);
    }, [
        table,
        scoreColIdx,
        planColIdx,
        actualColIdx,
        prevActualColIdx,
        prevPlanColIdx,
        noteColIdx,
        childrenScoreAddrs,
        cellInputs,
        computedByAddr,
        virtualRowNo,
        resolveCellNumericValue,
    ]);

    // AUTO_BONUS_RULES useEffect - Section V (Điểm thưởng)
    useEffect(() => {
        // Prevent re-entry while processing
        if (bonusRulesProcessingRef.current) {
            return;
        }
        bonusRulesProcessingRef.current = true;

        (async () => {
            try {
                const result = await processBonusRules({
                    table,
                    rules: AUTO_BONUS_RULES,
                    ruleKeySet: AUTO_BONUS_RULE_KEY_SET,
                    scoreColIdx,
                    actualColIdx,
                    noteColIdx,
                    childrenScoreAddrs,
                    cellInputs,
                    computedByAddr,
                    virtualRowNo,
                    selectedQuarter,
                    selectedYear,
                    api,
                    resolveCellNumericValue,
                    currentUsername: user?.username,
                });

                if (!result) return;

                // Apply state updates returned from processor
                if (result.table) setTable(result.table);
                if (result.cellInputs) setCellInputs(result.cellInputs);
                if (result.virtualRowNo) setVirtualRowNo(result.virtualRowNo);
                if (result.childrenScoreAddrs)
                    setChildrenScoreAddrs(result.childrenScoreAddrs);
            } finally {
                bonusRulesProcessingRef.current = false;
            }
        })();
    }, [
        table,
        scoreColIdx,
        actualColIdx,
        noteColIdx,
        childrenScoreAddrs,
        cellInputs,
        computedByAddr,
        selectedQuarter,
        selectedYear,
        virtualRowNo,
        resolveCellNumericValue,
        user?.username,
    ]);

    const handleExport = async () => {
        const resetState = await handleExportWorkflow({
            user,
            table,
            cellInputs,
            computedByAddr,
            selectedQuarter,
            selectedYear,
            formId: id,
            template,
            baseTable,
            scoreColIdx,
            api,
        });

        if (!resetState) return;

        // Apply state resets
        setChildrenScoreAddrs(resetState.childrenScoreAddrs);
        setVirtualRowNo(resetState.virtualRowNo);
        setCriteriaSelectValueByRow(resetState.criteriaSelectValueByRow);
        setCellInputs(resetState.cellInputs);
        setTable(resetState.table);
        manualEditedAddrsRef.current = new Set();
    };

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setLoading(true);
            setError("");
            try {
                const tpl = await loadFormTemplate(api, id);
                if (!mounted) return;
                setTemplate(tpl);
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

            <div
                style={{
                    marginBottom: 16,
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    flexWrap: "wrap",
                }}
            >
                <Space>
                    <span style={{ fontWeight: 500 }}>Quý:</span>
                    <Select
                        value={selectedQuarter}
                        onChange={setSelectedQuarter}
                        style={{ width: 100 }}
                        options={[
                            { value: 1, label: "Quý 1" },
                            { value: 2, label: "Quý 2" },
                            { value: 3, label: "Quý 3" },
                            { value: 4, label: "Quý 4" },
                        ]}
                    />
                </Space>
                <Space>
                    <span style={{ fontWeight: 500 }}>Năm:</span>
                    <Select
                        value={selectedYear}
                        onChange={setSelectedYear}
                        style={{ width: 100 }}
                        options={[
                            { value: 2024, label: "2024" },
                            { value: 2025, label: "2025" },
                            { value: 2026, label: "2026" },
                        ]}
                    />
                </Space>
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
