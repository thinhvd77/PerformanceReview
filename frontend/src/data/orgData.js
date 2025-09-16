// Shared organizational data for branches, departments, and positions
export const orgData = {
    branches: [
        { id: 'hs', name: 'Hội sở' },
        { id: 'cn6', name: 'Chi nhánh 6' },
        { id: 'nh', name: 'Chi nhánh Nam Hoa' },
    ],
    departments: {
        'hs': [
            { id: 'hs-kt', name: 'Kế toán & ngân quỹ' },
            { id: 'hs-pgd', name: 'Phòng giao dịch Bình Tây' },
            { id: 'hs-cn', name: 'Phòng Khách hàng cá nhân' },
            { id: 'hs-dn', name: 'Phòng Khách hàng doanh nghiệp' },
            { id: 'hs-th', name: 'Phòng Tổng hợp' },
            { id: 'hs-ktgs', name: 'Phòng Kiểm tra giám sát nội bộ' },
            { id: 'hs-qlrr', name: 'Phòng Kế hoạch & quản lý rủi ro' },
            { id: 'hs-gd', name: 'Ban giám đốc' }
        ],
        'cn6': [
            { id: 'cn6-kt', name: 'Kế toán & ngân quỹ' },
            { id: 'cn6-kh', name: 'Phòng Khách hàng' },
            { id: 'cn6-gd', name: 'Ban giám đốc' }
        ],
        'nh': [
            { id: 'nh-kt', name: 'Kế toán & ngân quỹ' },
            { id: 'nh-kh', name: 'Phòng Khách hàng' },
            { id: 'nh-gd', name: 'Ban giám đốc' }
        ],
    },
    positions: {
        'hs-kt': [
            { id: 'hs-kt-tp', name: 'Trưởng phòng' },
            { id: 'hs-kt-pp', name: 'Phó Trưởng phòng' },
            { id: 'hs-kt-nv-1', name: 'Nhân viên Nhóm I' },
            { id: 'hs-kt-nv-2', name: 'Nhân viên Nhóm II' }
        ],
        'hs-cn': [
            { id: 'hs-cn-tp', name: 'Trưởng phòng' },
            { id: 'hs-cn-pp-cv', name: 'Phó Trưởng phòng - Cho vay' },
            { id: 'hs-cn-pp-dv', name: 'Phó Trưởng phòng - Dịch vụ' },
            { id: 'hs-cn-cv', name: 'Nhân viên phát triển cho vay' },
            { id: 'hs-cn-cv-dv', name: 'Nhân viên phát triển cho vay và dịch vụ' }
        ],
        'hs-pgd': [
            { id: 'hs-pgd-tp', name: 'Giám đốc phòng giao dịch' },
            { id: 'hs-pgd-pp', name: 'Phó Giám đốc phòng giao dịch' },
            { id: 'hs-pgd-cv', name: 'Nhân viên phát triển cho vay' },
            { id: 'hs-pgd-kt', name: 'Nhân viên kế toán ngân quỹ' },
        ],
        'hs-dn': [
            { id: 'hs-dn-tp', name: 'Trưởng phòng' },
            { id: 'hs-dn-pp-td', name: 'Phó Trưởng phòng - Thẩm định' },
            { id: 'hs-dn-pp-tt', name: 'Phó Trưởng phòng - Thanh toán quốc thế' },
            { id: 'hs-dn-pp', name: 'Phó Trưởng phòng - Khác' },
            { id: 'hs-dn-ct', name: 'Cán bộ chuyên trách' },
            { id: 'hs-dn-cv', name: 'Nhân viên phát triển cho vay' },
            { id: 'hs-dn-cv-xln', name: 'Nhân viên phát triển cho vay và xử lý nợ' },
            { id: 'hs-dn-tt', name: 'Nhân viên thanh toán quốc tế' }
        ],
        'hs-th': [
            { id: 'hs-th-tp', name: 'Trưởng phòng' },
            { id: 'hs-th-nv', name: 'Nhân viên' }
        ],
        'hs-ktgs': [
            { id: 'hs-ktgs-tp', name: 'Trưởng phòng' },
            { id: 'hs-ktgs-nv', name: 'Nhân viên' }
        ],
        'hs-qlrr': [
            { id: 'hs-qlrr-tp', name: 'Trưởng phòng' },
            { id: 'hs-qlrr-nv', name: 'Nhân viên' }
        ],
        'hs-gd': [
            { id: 'hs-gd-gd', name: 'Giám đốc' },
            { id: 'hs-gd-pgd', name: 'Phó Giám đốc' }
        ],
        // Chi nhánh 6
        'cn6-kt': [
            { id: 'cn6-kt-tp', name: 'Trưởng phòng' },
            { id: 'cn6-kt-pp', name: 'Phó Trưởng phòng' },
            { id: 'cn6-kt-nv-1', name: 'Nhân viên' }
        ],
        'cn6-kh': [
            { id: 'cn6-kh-tp', name: 'Trưởng phòng' },
            { id: 'cn6-kh-pp', name: 'Phó phòng' },
            { id: 'cn6-kh-cv', name: 'Nhân viên phát triển cho vay' },
            { id: 'cn6-kh-xln', name: 'Nhân viên chuyên trách xử lý nợ' },
            { id: 'cn6-kh-cv-xln', name: 'Nhân viên phát triển cho vay và xử lý nợ' }
        ],
        'cn6-gd': [
            { id: 'cn6-gd-gd', name: 'Giám đốc' },
            { id: 'cn6-gd-pgd', name: 'Phó Giám đốc' }
        ],
        // Chi nhánh Nam Hoa
        'nh-kt': [
            { id: 'nh-kt-tp', name: 'Trưởng phòng' },
            { id: 'nh-kt-pp', name: 'Phó Trưởng phòng' },
            { id: 'nh-kt-nv-1', name: 'Nhân viên' }
        ],
        'nh-kh': [
            { id: 'nh-kh-tp', name: 'Trưởng phòng' },
            { id: 'nh-kh-pp', name: 'Phó phòng' },
            { id: 'nh-kh-cv', name: 'Nhân viên phát triển cho vay' },
            { id: 'nh-kh-xln', name: 'Nhân viên chuyên trách xử lý nợ' },
            { id: 'nh-kh-cv-xln', name: 'Nhân viên phát triển cho vay và xử lý nợ' }
        ],
        'nh-gd': [
            { id: 'nh-gd-gd', name: 'Giám đốc' },
            { id: 'nh-gd-pgd', name: 'Phó Giám đốc' }
        ],
    }
};

export function findNameById(list, id) {
    return (list || []).find(x => x.id === id)?.name || '';
}