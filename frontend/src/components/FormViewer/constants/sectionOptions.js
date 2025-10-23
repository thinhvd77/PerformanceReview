/**
 * Section options for performance review form
 * These define the available criteria for each section (II, III, IV, V, D)
 */

import { normalizeText } from "../utils/formUtils.js";

/**
 * Section II: Chỉ tiêu định tính
 * Qualitative criteria options
 */
const SECTION_II_OPTIONS = [
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
];

/**
 * Section III: Điểm cộng (tối đa 10 điểm)
 * Bonus points criteria options
 */
const SECTION_III_OPTIONS = [
    { label: "Điểm cộng (tối đa 10 điểm)", value: "III-1" },
    { label: "Chỉ tiêu nguồn vốn vượt KH Quý được giao", value: "III-2" },
    { label: "Chỉ tiêu dư nợ vượt KH Quý được giao", value: "III-3" },
    { label: "Chỉ tiêu thu dịch vụ vượt KH Quý được giao", value: "III-4" },
    { label: "Thu hồi nợ đã XLRR đạt từ 110% KH Quý", value: "III-5" },
    {
        label: "Số tuyệt đối nợ nhóm 2 giảm so với Quý trước",
        value: "III-6",
    },
    { label: "Số tuyệt đối nợ xấu giảm so với Quý trước", value: "III-7" },
    {
        label: "Phát triển được 01 đơn vị trả lương qua tài khoản",
        value: "III-8",
    },
    {
        label: "Tỷ lệ CASA BQ trong Quý tăng từ 1% trở lên so với thực hiện Quý trước",
        value: "III-9",
    },
    {
        label: "Phát triển được 01 đơn vị mới sử dụng dịch vụ TTQT (không bao gồm KH của đơn vị/phòng nghiệp vụ khác chuyển lên)",
        value: "III-10",
    },
    {
        label: "Phát triển được 01 đơn vị mới sử dụng dịch vụ bảo lãnh (không bao gồm KH của đơn vị/phòng nghiệp vụ khác chuyển lên)",
        value: "III-11",
    },
    {
        label: "Thu ròng từ kinh doanh ngoại tệ đạt từ 150% so với Quý trước liền kề",
        value: "III-12",
    },
    {
        label: "Chỉ tiêu tiếp thị tín dụng (chỉ tiêu cá nhân) vượt kế hoạch Quý được giao",
        value: "III-13",
    },
];

/**
 * Section IV: Điểm trừ (tối đa 10 điểm)
 * Penalty points criteria options
 */
const SECTION_IV_OPTIONS = [
    { label: "Điểm trừ (tối đa 10 điểm)", value: "IV-1" },
    {
        label: "Khoản cho vay có liên quan phát sinh trích lập DPCT trong Quý",
        value: "IV-2",
    },
    { label: "Tỷ lệ nợ nhóm 2 tăng trong Quý", value: "IV-3" },
    { label: "Tỷ lệ nợ xấu tăng trong Quý", value: "IV-4" },
    {
        label: "Nguồn vốn giảm so với số thực hiện Quý trước (không nằm trong kế hoạch)",
        value: "IV-5",
    },
    {
        label: "Dư nợ giảm so với số thực hiện Quý trước (loại trừ giảm do XLRR)",
        value: "IV-6",
    },
    {
        label: "Tồn tại, sai sót qua thanh tra, kiểm tra, kiểm toán phát sinh trong Quý",
        value: "IV-7",
    },
    {
        label: "Kết quả kiểm tra kiến thức: Kết quả thi dưới TB/không đạt yêu cầu",
        value: "IV-8",
    },
    {
        label: "Thực hiện chỉ tiêu thu hồi nợ đã XLRR (nếu có)",
        value: "IV-9",
    },
];

/**
 * Section V: Điểm thưởng (tối đa 05 điểm)
 * Reward points criteria options
 */
const SECTION_V_OPTIONS = [
    { label: "Điểm thưởng (tối đa 05 điểm)", value: "V-1" },
    {
        label: "Một trong số các chỉ tiêu: Dư nợ, nguồn vốn hoàn thành KH năm được giao",
        value: "V-2",
    },
    {
        label: "Một trong số các chỉ tiêu: thu dịch vụ, thu hồi nợ đã XLRR, tài chính hoàn thành KH năm được giao",
        value: "V-3",
    },
    {
        label: "Có sáng kiến, giải pháp, cách làm hay đem lại hiệu quả công việc, nâng cao năng suất lao động tại đơn vị được Hội đồng thi đua tại Chi nhánh công nhận",
        value: "V-4",
    },
    {
        label: "Đạt thành tích trong các cuộc thi nghiệp vụ do Agribank hoặc chi nhánh tổ chức",
        value: "V-5",
    },
];

/**
 * Section D: Điểm chấp hành nội quy lao động, văn hoá Agribank
 * Labor discipline and culture compliance criteria options
 */
const SECTION_D_OPTIONS = [
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
];

/**
 * Main section options map
 * Supports multiple access patterns: by roman numeral, by label, by normalized label
 */
export const SECTION_OPTIONS = {
    II: SECTION_II_OPTIONS,
    III: SECTION_III_OPTIONS,
    IV: SECTION_IV_OPTIONS,
    V: SECTION_V_OPTIONS,
    D: SECTION_D_OPTIONS,
};

// Add alternate access patterns
const D_SECTION_LABEL = "Điểm chấp hành nội quy lao động, văn hoá Agribank";
const D_SECTION_LABEL_ALT = "Điểm chấp hành nội quy lao động, văn hóa Agribank";

SECTION_OPTIONS[D_SECTION_LABEL] = SECTION_D_OPTIONS;
SECTION_OPTIONS["Chỉ tiêu định tính"] = SECTION_II_OPTIONS;
SECTION_OPTIONS[normalizeText("Chỉ tiêu định tính")] = SECTION_II_OPTIONS;
SECTION_OPTIONS["Điểm cộng (tối đa 10 điểm)"] = SECTION_III_OPTIONS;
SECTION_OPTIONS[normalizeText("Điểm cộng (tối đa 10 điểm)")] = SECTION_III_OPTIONS;
SECTION_OPTIONS["Điểm trừ (tối đa 10 điểm)"] = SECTION_IV_OPTIONS;
SECTION_OPTIONS[normalizeText("Điểm trừ (tối đa 10 điểm)")] = SECTION_IV_OPTIONS;
SECTION_OPTIONS["Điểm thưởng (tối đa 05 điểm)"] = SECTION_V_OPTIONS;
SECTION_OPTIONS[normalizeText("Điểm thưởng (tối đa 05 điểm)")] = SECTION_V_OPTIONS;
SECTION_OPTIONS[normalizeText(D_SECTION_LABEL)] = SECTION_D_OPTIONS;
SECTION_OPTIONS[D_SECTION_LABEL_ALT] = SECTION_D_OPTIONS;
SECTION_OPTIONS[normalizeText(D_SECTION_LABEL_ALT)] = SECTION_D_OPTIONS;

/**
 * Section label constants
 */
export const QUALITATIVE_LABEL = "Chỉ tiêu định tính";
export const QUALITATIVE_LABEL_NORMALIZED = normalizeText(QUALITATIVE_LABEL);
export const DISCIPLINE_LABEL_NORMALIZED = normalizeText(D_SECTION_LABEL);
export const DISCIPLINE_LABEL_ALT_NORMALIZED = normalizeText(D_SECTION_LABEL_ALT);

/**
 * Resolve section options by label key
 * Supports multiple access patterns for flexibility
 * @param {string} labelKey - Section label to look up
 * @returns {Array} Array of option objects
 */
export const resolveSectionOptions = (labelKey) => {
    const trimmed = String(labelKey || "").trim();
    if (!trimmed) return [];
    if (SECTION_OPTIONS[trimmed]) return SECTION_OPTIONS[trimmed];
    const normalized = normalizeText(trimmed);
    if (SECTION_OPTIONS[normalized]) return SECTION_OPTIONS[normalized];
    const match = Object.entries(SECTION_OPTIONS).find(
        ([k]) => normalizeText(k) === normalized
    );
    return match ? match[1] : [];
};
