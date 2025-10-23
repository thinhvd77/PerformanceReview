/**
 * Auto-calculation rules for performance review forms
 * These rules define how bonus/penalty rows are automatically generated
 * based on performance metrics
 */

/**
 * AUTO_GROWTH_RULES - Section III: Điểm cộng (tối đa 10 điểm)
 * Rules for automatic bonus points when exceeding quarterly targets
 */
export const AUTO_GROWTH_RULES = [
    {
        growthLabel: "Tăng trưởng nguồn vốn",
        bonusLabel: "Chỉ tiêu nguồn vốn vượt KH Quý được giao",
        key: "capital-growth-bonus",
        step: 0.05, // +1 point per 5% exceeded
    },
    {
        growthLabel: "Tăng trưởng dư nợ",
        bonusLabel: "Chỉ tiêu dư nợ vượt KH Quý được giao",
        key: "loan-growth-bonus",
        step: 0.05, // +1 point per 5% exceeded
    },
    {
        growthLabel: "Thu dịch vụ",
        bonusLabel: "Chỉ tiêu thu dịch vụ vượt KH Quý được giao",
        key: "service-growth-bonus",
        step: 0.03, // +1 point per 3% exceeded
    },
    {
        growthLabel: "Thu hồi nợ đã XLRR",
        bonusLabel: "Thu hồi nợ đã XLRR đạt từ 110% KH Quý",
        key: "recovery-growth-bonus",
        threshold: 1.1, // 110%
        fixedPoints: 3, // Fixed +3 points when threshold met
    },
];

/**
 * AUTO_MINUS_RULES - Section IV: Điểm trừ (tối đa 10 điểm)
 * Rules for automatic penalty points for underperformance or issues
 */
export const AUTO_MINUS_RULES = [
    {
        growthLabel: "Nợ nhóm 2",
        bonusLabel: "Tỷ lệ nợ nhóm 2 tăng trong Quý",
        key: "loan-group-2-minus",
        fixedPoints: -2, // Fixed -2 points if increased
    },
    {
        growthLabel: "Nợ xấu",
        bonusLabel: "Tỷ lệ nợ xấu tăng trong Quý",
        key: "bad-loan-minus",
        fixedPoints: -2, // Fixed -2 points if increased
    },
    {
        growthLabel: "Tăng trưởng nguồn vốn",
        bonusLabel:
            "Nguồn vốn giảm so với số thực hiện Quý trước (không nằm trong kế hoạch)",
        key: "capital-minus",
        step: -0.05, // -1 point per 5% decrease
        maxPoints: -5, // Maximum -5 points
    },
    {
        growthLabel: "Tăng trưởng dư nợ",
        bonusLabel:
            "Dư nợ giảm so với số thực hiện Quý trước (loại trừ giảm do XLRR)",
        key: "loan-minus",
        step: -0.05, // -1 point per 5% decrease
        maxPoints: -5, // Maximum -5 points
    },
];

/**
 * AUTO_BONUS_RULES - Section V: Điểm thưởng (tối đa 05 điểm)
 * Rules for annual plan completion bonuses
 * Each bonus can only be awarded once per year per user
 */
export const AUTO_BONUS_RULES = [
    {
        growthLabel: "Tăng trưởng nguồn vốn",
        bonusLabel: "Chỉ tiêu nguồn vốn hoàn thành KH năm được giao",
        key: "capital-bonus",
        fixedPoints: 3, // +3 points when annual target met
    },
    {
        growthLabel: "Tăng trưởng dư nợ",
        bonusLabel: "Chỉ tiêu dư nợ hoàn thành KH năm được giao",
        key: "loan-bonus",
        fixedPoints: 3, // +3 points when annual target met
    },
    {
        growthLabel: "Thu dịch vụ",
        bonusLabel: "Chỉ tiêu thu dịch vụ hoàn thành KH năm được giao",
        key: "service-revenue-bonus",
        fixedPoints: 5, // +5 points when service revenue target met
    },
    {
        growthLabel: "Thu hồi nợ đã XLRR",
        bonusLabel: "Chỉ tiêu thu hồi nợ đã XLRR hoàn thành KH năm được giao",
        key: "debt-recovery-bonus",
        fixedPoints: 5, // +5 points when debt recovery target met
    },
    {
        growthLabel: "Tài chính",
        bonusLabel: "Chỉ tiêu tài chính hoàn thành KH năm được giao",
        key: "finance-bonus",
        fixedPoints: 5, // +5 points when finance target met
    },
];

/**
 * Key sets for efficient lookup of auto-generated row types
 */
export const AUTO_GROWTH_RULE_KEY_SET = new Set(
    AUTO_GROWTH_RULES.map((rule) => rule.key)
);

export const AUTO_MINUS_RULE_KEY_SET = new Set(
    AUTO_MINUS_RULES.map((rule) => rule.key)
);

export const AUTO_BONUS_RULE_KEY_SET = new Set(
    AUTO_BONUS_RULES.map((rule) => rule.key)
);
