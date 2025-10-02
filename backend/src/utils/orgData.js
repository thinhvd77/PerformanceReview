// Shared organizational data for branches, departments, and positions
export const orgData = {
    branches: [
        { id: 'hs', name: 'Hội sở' },
        { id: 'cn6', name: 'Chi nhánh 6' },
        { id: 'nh', name: 'Chi nhánh Nam Hoa' },
    ],
    departments: {
        'hs': [
            { id: 'kt', name: 'Phòng Kế toán & ngân quỹ' },
            { id: 'pgd', name: 'Phòng giao dịch Bình Tây' },
            { id: 'cn', name: 'Phòng Khách hàng cá nhân' },
            { id: 'dn', name: 'Phòng Khách hàng doanh nghiệp' },
            { id: 'th', name: 'Phòng Tổng hợp' },
            { id: 'ktgs', name: 'Phòng Kiểm tra giám sát nội bộ' },
            { id: 'qlrr', name: 'Phòng Kế hoạch & quản lý rủi ro' },
            { id: 'gd', name: 'Ban giám đốc' },
            { id: 'kh', name: 'Phòng Khách hàng' }
        ],
        'cn6': [
            { id: 'cn6-kt', name: 'Phòng Kế toán & ngân quỹ' },
            { id: 'cn6-kh', name: 'Phòng Khách hàng' },
            { id: 'cn6-gd', name: 'Ban giám đốc' }
        ],
        'nh': [
            { id: 'nh-kt', name: 'Phòng Kế toán & ngân quỹ' },
            { id: 'nh-kh', name: 'Phòng Khách hàng' },
            { id: 'nh-gd', name: 'Ban giám đốc' }
        ],
    },
    positions: {
        'hs-kt': [
            { id: 'hs-kt-tp', name: 'TP' },
            { id: 'hs-kt-pp', name: 'PP' },
            { id: 'hs-kt-nv', name: 'NV' }
        ],
        'hs-cn': [
            { id: 'hs-cn-tp', name: 'TP' },
            { id: 'hs-cn-pp-cv', name: 'PP' },
            { id: 'hs-cn-pp-dv', name: 'PP' },
            { id: 'hs-cn-cv', name: 'NV' },
            { id: 'hs-cn-cv-dv', name: 'NV' }
        ],
        'hs-pgd': [
            { id: 'hs-pgd-tp', name: 'GĐ PGD' },
            { id: 'hs-pgd-pp', name: 'PGĐ PGD' },
            { id: 'hs-pgd-cv', name: 'NV' },
            { id: 'hs-pgd-kt', name: 'NV' },
        ],
        'hs-dn': [
            { id: 'hs-dn-tp', name: 'TP' },
            { id: 'hs-dn-pp-td', name: 'PP' },
            { id: 'hs-dn-pp-tt', name: 'PP' },
            { id: 'hs-dn-pp', name: 'PP' },
            { id: 'hs-dn-ct', name: 'NV' },
            { id: 'hs-dn-cv', name: 'NV' },
            { id: 'hs-dn-cv-xln', name: 'NV' },
            { id: 'hs-dn-tt', name: 'NV' }
        ],
        'hs-th': [
            { id: 'hs-th-tp', name: 'TP' },
            { id: 'hs-th-nv', name: 'NV' }
        ],
        'hs-ktgs': [
            { id: 'hs-ktgs-tp', name: 'TP' },
            { id: 'hs-ktgs-nv', name: 'NV' }
        ],
        'hs-qlrr': [
            { id: 'hs-qlrr-tp', name: 'TP' },
            { id: 'hs-qlrr-nv', name: 'NV' }
        ],
        'hs-gd': [
            { id: 'hs-gd-gd', name: 'GĐ' },
            { id: 'hs-gd-pgd', name: 'PGĐ' }
        ],
        // Chi nhánh 6
        'cn6-kt': [
            { id: 'cn6-kt-tp', name: 'TP' },
            { id: 'cn6-kt-pp', name: 'PP' },
            { id: 'cn6-kt-nv', name: 'NV' }
        ],
        'cn6-kh': [
            { id: 'cn6-kh-tp', name: 'TP' },
            { id: 'cn6-kh-pp', name: 'PP' },
            { id: 'cn6-kh-cv', name: 'NV' },
            { id: 'cn6-kh-xln', name: 'NV' },
            { id: 'cn6-kh-cv-xln', name: 'NV' }
        ],
        'cn6-gd': [
            { id: 'cn6-gd-gd', name: 'GĐ' },
            { id: 'cn6-gd-pgd', name: 'PGĐ' }
        ],
        // Chi nhánh Nam Hoa
        'nh-kt': [
            { id: 'nh-kt-tp', name: 'TP' },
            { id: 'nh-kt-pp', name: 'PP' },
            { id: 'nh-kt-nv', name: 'NV' }
        ],
        'nh-kh': [
            { id: 'nh-kh-tp', name: 'TP' },
            { id: 'nh-kh-pp', name: 'PP' },
            { id: 'nh-kh-cv', name: 'NV' },
            { id: 'nh-kh-xln', name: 'NV' },
            { id: 'nh-kh-cv-xln', name: 'NV' }
        ],
        'nh-gd': [
            { id: 'nh-gd-gd', name: 'GĐ' },
            { id: 'nh-gd-pgd', name: 'PGĐ' }
        ],
    }
};

export function findNameById(list, id) {
    return (list || []).find(x => x.id === id)?.name || '';
}