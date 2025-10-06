// Shared organizational data for branches, departments, and positions
export const orgData = {
    branches: [
        { id: 'hs', name: 'Hội sở' },
        { id: 'cn6', name: 'Chi nhánh 6' },
        { id: 'nh', name: 'Chi nhánh Nam Hoa' },
    ],
    departments: {
        'hs': [
            { id: 'hs-gd', name: 'Ban giám đốc' },
            { id: 'hs-kt', name: 'Kế toán & ngân quỹ' },
            { id: 'hs-pgd', name: 'Phòng giao dịch Bình Tây' },
            { id: 'hs-cn', name: 'Phòng Khách hàng cá nhân' },
            { id: 'hs-dn', name: 'Phòng Khách hàng doanh nghiệp' },
            { id: 'hs-th', name: 'Phòng Tổng hợp' },
            { id: 'hs-ktgs', name: 'Phòng Kiểm tra giám sát nội bộ' },
            { id: 'hs-qlrr', name: 'Phòng Kế hoạch & quản lý rủi ro' },
        ],
        'cn6': [
            { id: 'cn6-gd', name: 'Ban giám đốc' },
            { id: 'cn6-kt', name: 'Kế toán & ngân quỹ' },
            { id: 'cn6-kh', name: 'Phòng Khách hàng' },
        ],
        'nh': [
            { id: 'nh-gd', name: 'Ban giám đốc' },
            { id: 'nh-kt', name: 'Kế toán & ngân quỹ' },
            { id: 'nh-kh', name: 'Phòng Khách hàng' },
        ],
    },
    positions: {
        'hs-gd': [
            { id: 'hs-gd-gd', name: 'Giám đốc chi nhánh' },
            { id: 'hs-gd-pgd-kt', name: 'Phó Giám đốc chi nhánh - Kế toán' },
            { id: 'hs-gd-pgd-td', name: 'Phó Giám đốc chi nhánh - Tín dụng' },
        ],
        'hs-kt': [
            { id: 'hs-kt-tp', name: 'Trưởng phòng KT&NQ Hội sở' },
            { id: 'hs-kt-pp', name: 'Phó phòng KT&NQ Hội sở' },
            { id: 'hs-kt-nv-i', name: 'Nhân viên phòng KT&NQ Hội sở - Nhóm I' },
            { id: 'hs-kt-nv-ii', name: 'Nhân viên phòng KT&NQ Hội sở - Nhóm II' },
        ],
        'hs-cn': [
            { id: 'hs-cn-tp', name: 'Trưởng phòng KHCN' },
            { id: 'hs-cn-pp-cv', name: 'Phó phòng KHCN - Cho vay' },
            { id: 'hs-cn-pp-dv', name: 'Phó phòng KHCN - Dịch vụ' },
            { id: 'hs-cn-cv', name: 'Nhân viên phát triển cho vay P.KHCN' },
            { id: 'hs-cn-cv-dv', name: 'Nhân viên phát triển cho vay và dịch vụ P.KHCN' }
        ],
        'hs-pgd': [
            { id: 'hs-pgd-tp', name: 'Giám đốc phòng giao dịch' },
            { id: 'hs-pgd-pp', name: 'Phó Giám đốc phòng giao dịch' },
            { id: 'hs-pgd-cv', name: 'Nhân viên phát triển cho vay tại PGD' },
            { id: 'hs-pgd-kt', name: 'Nhân viên phòng KT&NQ Phòng giao dịch' },
        ],
        'hs-dn': [
            { id: 'hs-dn-tp', name: 'Trưởng phòng KHDN' },
            { id: 'hs-dn-pp-td', name: 'Phó phòng KHDN - Thẩm định' },
            { id: 'hs-dn-pp-tt', name: 'Phó phòng KHDN - Thanh toán quốc tế' },
            { id: 'hs-dn-pp', name: 'Phó phòng KHDN - Khác' },
            { id: 'hs-dn-hts', name: 'Nhân viên phòng KHDN - HTS' },
            { id: 'hs-dn-tnd', name: 'Nhân viên phòng KHDN - TND' },
            { id: 'hs-dn-cv', name: 'Nhân viên phát triển cho vay P.KHDN' },
            { id: 'hs-dn-cv-xln', name: 'Nhân viên phát triển cho vay và xử lý nợ P.KHDN' },
            { id: 'hs-dn-tt', name: 'Nhân viên thanh toán quốc tế P.KHDN' }
        ],
        'hs-th': [
            { id: 'hs-th-tp', name: 'Trưởng phòng Tổng hợp' },
            { id: 'hs-th-pp', name: 'Phó phòng Tổng hợp' },
            { id: 'hs-th-nv', name: 'Nhân viên phòng Tổng hợp' }
        ],
        'hs-ktgs': [
            { id: 'hs-ktgs-tp', name: 'Trưởng phòng KTGSNB' },
            { id: 'hs-ktgs-pp', name: 'Phó phòng KTGSNB' },
            { id: 'hs-ktgs-nv', name: 'Nhân viên phòng KTGSNB' }
        ],
        'hs-qlrr': [
            { id: 'hs-qlrr-tp', name: 'Trưởng phòng KH&QLRR' },
            { id: 'hs-qlrr-pp', name: 'Phó phòng KH&QLRR' },
            { id: 'hs-qlrr-nv', name: 'Nhân viên phòng KH&QLRR' }
        ],
        // Chi nhánh 6
        'cn6-gd': [
            { id: 'cn6-gd-gd', name: 'Giám đốc chi nhánh loại II' },
            { id: 'cn6-gd-pgd', name: 'Phó Giám đốc chi nhánh loại II' }
        ],
        'cn6-kt': [
            { id: 'cn6-kt-tp', name: 'Trưởng phòng KT&NQ Chi nhánh loại II' },
            { id: 'cn6-kt-pp', name: 'Phó phòng KT&NQ Chi nhánh loại II' },
            { id: 'cn6-kt-nv-i', name: 'Nhân viên phòng KT&NQ Chi nhánh loại II - Nhóm I' },
            { id: 'cn6-kt-nv-ii', name: 'Nhân viên phòng KT&NQ Chi nhánh loại II - Nhóm II' }
        ],
        'cn6-kh': [
            { id: 'cn6-kh-tp', name: 'Trưởng phòng KH Chi nhánh loại II' },
            { id: 'cn6-kh-pp', name: 'Phó phòng KH Chi nhánh loại II' },
            { id: 'cn6-kh-cv', name: 'Nhân viên phòng Khách hàng chi nhánh Loại II - NV phát triển CV ' },
            { id: 'cn6-kh-xln', name: 'Nhân viên phòng Khách hàng chi nhánh Loại II NV chuyên trách XLN' },
            { id: 'cn6-kh-cv-xln', name: 'Nhân viên phòng Khách hàng chi nhánh Loại II - NV phát triển CV + XLN' }
        ],
        // Chi nhánh Nam Hoa
        'nh-gd': [
            { id: 'nh-gd-gd', name: 'Giám đốc Chi nhánh loại II' },
            { id: 'nh-gd-pgd', name: 'Phó Giám đốc Chi nhánh loại II' }
        ],
        'nh-kt': [
            { id: 'nh-kt-tp', name: 'Trưởng phòng KT&NQ Chi nhánh loại II' },
            { id: 'nh-kt-pp', name: 'Phó phòng KT&NQ Chi nhánh loại II' },
            { id: 'nh-kt-nv-i', name: 'Nhân viên phòng KT&NQ Chi nhánh loại II - Nhóm I' },
            { id: 'nh-kt-nv-ii', name: 'Nhân viên phòng KT&NQ Chi nhánh loại II - Nhóm II' }
        ],
        'nh-kh': [
            { id: 'nh-kh-tp', name: 'Trưởng phòng KH Chi nhánh loại II' },
            { id: 'nh-kh-pp', name: 'Phó phòng KH Chi nhánh loại II' },
            { id: 'nh-kh-cv', name: 'Nhân viên phòng Khách hàng chi nhánh Loại II - NV phát triển CV' },
            { id: 'nh-kh-xln', name: 'Nhân viên phòng Khách hàng chi nhánh Loại II NV chuyên trách XLN' },
            { id: 'nh-kh-cv-xln', name: 'Nhân viên phòng Khách hàng chi nhánh Loại II - NV phát triển CV + XLN' }
        ],
    }
};

export function findNameById(list, id) {
    return (list || []).find(x => x.id === id)?.name || '';
}