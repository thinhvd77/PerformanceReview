# File Naming & Organization Update - Implementation Summary

## 📝 Thay đổi đã thực hiện

### 1. Frontend - FormViewer.jsx

**Tên file export**:
```javascript
// TRƯỚC:
const fileName = `Phieu_tu_danh_gia_${user.username}_${date}.xlsx`;

// SAU:
const fileName = `Phieu_tu_danh_gia_Q${selectedQuarter}_${selectedYear}_${user.username}_${date}.xlsx`;
```

**Ví dụ**:
- User chọn Quý 2, Năm 2025
- Username: `nv001`
- Ngày export: 2025-10-20
- **Tên file**: `Phieu_tu_danh_gia_Q2_2025_nv001_2025-10-20.xlsx`

### 2. Backend - export.controller.js

#### A. Hàm `generateExportFileName()` - Tên file lưu trên server

**Cập nhật signature**:
```javascript
// TRƯỚC:
const generateExportFileName = (originalFileName, employeeCode, employeeName)

// SAU:
const generateExportFileName = (originalFileName, employeeCode, employeeName, quarter, year)
```

**Logic tạo tên**:
```javascript
const quarterYear = quarter && year ? `Q${quarter}_${year}_` : '';
return `${quarterYear}${employeeCode}_${cleanEmployeeName}_${timestamp}.xlsx`;
```

**Ví dụ**:
- Input: quarter=2, year=2025, employeeCode='nv001', employeeName='Nguyen Van A'
- Output: `Q2_2025_nv001_Nguyen_Van_A_2025-10-20_14-30-45.xlsx`

#### B. Hàm `createExport()` - Gọi với quarter và year

**Cập nhật**:
```javascript
const organizedFileName = generateExportFileName(
    originalFileName, 
    employee_code, 
    employeeName, 
    quarter,  // ← Thêm
    year      // ← Thêm
);
```

#### C. Cấu trúc thư mục lưu file

**Đường dẫn**:
```
uploads/
  exports/
    2025/           ← Năm
      Q1/           ← Quý
        Q1_2025_nv001_Nguyen_Van_A_2025-04-15_10-30-00.xlsx
        Q1_2025_nv002_Tran_Thi_B_2025-04-16_11-45-30.xlsx
      Q2/
        Q2_2025_nv001_Nguyen_Van_A_2025-07-20_14-30-45.xlsx
        Q2_2025_nv003_Le_Van_C_2025-07-21_09-15-20.xlsx
      Q3/
      Q4/
    2026/
      Q1/
      ...
```

#### D. Hàm `exportDepartmentSummary()` - Tổng hợp phòng ban

**Tên file xuất tổng hợp**:
```javascript
// TRƯỚC:
Tong_ket_xep_loai_${branch}_${department}_${timestamp}.xlsx

// SAU:
Tong_ket_xep_loai_Q${quarter}_${year}_${branch}_${department}_${timestamp}.xlsx
```

**Logic**:
- Lấy quarter/year từ record đầu tiên trong danh sách
- Nếu không có → fallback về timestamp bình thường

**Tiêu đề Excel**:
- Cập nhật hiển thị quý/năm từ dữ liệu records thay vì tính toán từ ngày hiện tại
- Đảm bảo consistency giữa dữ liệu và tiêu đề

**Ví dụ**:
```
Tong_ket_xep_loai_Q2_2025_Chi_nhanh_Bac_TPHCM_Phong_KHCN_20251020.xlsx
```

## 📊 Cấu trúc file hoàn chỉnh

### File cá nhân (user export):
```
Format: Phieu_tu_danh_gia_Q{quarter}_{year}_{username}_{date}.xlsx
Saved as: Q{quarter}_{year}_{employeeCode}_{employeeName}_{timestamp}.xlsx
Location: uploads/exports/{year}/Q{quarter}/

Example:
- Download name: Phieu_tu_danh_gia_Q2_2025_nv001_2025-10-20.xlsx
- Server path: uploads/exports/2025/Q2/Q2_2025_nv001_Nguyen_Van_A_2025-10-20_14-30-45.xlsx
```

### File tổng hợp (department summary):
```
Format: Tong_ket_xep_loai_Q{quarter}_{year}_{branch}_{department}_{timestamp}.xlsx
Streamed: Không lưu trên server, stream trực tiếp về client

Example:
- Download name: Tong_ket_xep_loai_Q2_2025_Chi_nhanh_Bac_TPHCM_Phong_KHCN_20251020.xlsx
```

## 🔍 Chi tiết kỹ thuật

### Quarter/Year Flow:

```
User selects Q2, Year 2025 on UI
    ↓
Frontend export: Phieu_tu_danh_gia_Q2_2025_nv001_2025-10-20.xlsx
    ↓
Backend receives: quarter=2, year=2025 (from getCurrentQuarterYear())
    ↓
Backend creates directory: uploads/exports/2025/Q2/
    ↓
Backend saves as: Q2_2025_nv001_Nguyen_Van_A_2025-10-20_14-30-45.xlsx
    ↓
Database record: quarter=2, year=2025, filePath=uploads/exports/2025/Q2/...
```

### Department Summary Flow:

```
Manager requests department export
    ↓
Backend queries latest records for department
    ↓
Gets quarter/year from first record: Q2, 2025
    ↓
Excel header: "QUÝ II NĂM 2025"
    ↓
Filename: Tong_ket_xep_loai_Q2_2025_...xlsx
    ↓
Stream directly to client (không lưu file)
```

## ✅ Lợi ích

### 1. Tổ chức file tốt hơn:
- ✅ Dễ dàng tìm file theo quý/năm
- ✅ Tự động phân loại vào thư mục đúng
- ✅ Tránh conflict tên file giữa các quý

### 2. Truy vấn nhanh hơn:
- ✅ Không cần scan toàn bộ thư mục
- ✅ Truy cập trực tiếp: `uploads/exports/{year}/Q{quarter}/`
- ✅ Hỗ trợ backup/archive theo quý

### 3. Thông tin rõ ràng:
- ✅ Tên file cho biết ngay quý/năm
- ✅ Dễ identify file mà không cần mở
- ✅ Consistency giữa UI, file name, và dữ liệu

### 4. Audit trail tốt hơn:
- ✅ Timestamp chính xác trong tên file
- ✅ Track được lịch sử submission theo quý
- ✅ Hỗ trợ compliance và reporting

## 🧪 Testing Checklist

### Frontend Export:
- [ ] Chọn Q1 2025 → Export → Tên file bắt đầu với `Phieu_tu_danh_gia_Q1_2025_`
- [ ] Chọn Q2 2025 → Export → Tên file bắt đầu với `Phieu_tu_danh_gia_Q2_2025_`
- [ ] Chọn Q3 2024 → Export → Tên file bắt đầu với `Phieu_tu_danh_gia_Q3_2024_`

### Backend Storage:
- [ ] File được lưu vào: `uploads/exports/{year}/Q{quarter}/`
- [ ] Tên file trên server: `Q{quarter}_{year}_{employeeCode}_{employeeName}_{timestamp}.xlsx`
- [ ] Database record có đúng quarter và year

### Department Summary:
- [ ] Export tổng hợp Q1 2025 → Filename: `Tong_ket_xep_loai_Q1_2025_...xlsx`
- [ ] Excel header hiển thị: "QUÝ I NĂM 2025"
- [ ] File name và header khớp với dữ liệu records

### Edge Cases:
- [ ] User submit Q1, sau đó submit Q2 → 2 file riêng biệt trong 2 thư mục khác nhau
- [ ] User submit lại cùng quý → File cũ bị xóa, file mới thay thế (trong cùng thư mục)
- [ ] Records không có quarter/year → Fallback về tính toán tự động

## 📦 Files Modified

1. **frontend/src/components/FormViewer.jsx**
   - Updated filename generation to include `Q{quarter}_{year}_`

2. **backend/src/controllers/export.controller.js**
   - Updated `generateExportFileName()` signature and logic
   - Updated `createExport()` to pass quarter/year
   - Updated `exportDepartmentSummary()` filename and Excel header

## 🚀 Deployment Notes

- ✅ Backwards compatible: Existing files không bị ảnh hưởng
- ✅ Automatic migration: File mới sẽ tự động dùng structure mới
- ⚠️ Cần restart backend server để áp dụng thay đổi
- 📁 Thư mục `uploads/exports/` sẽ tự động tạo structure mới khi có upload

## 📊 Example Scenarios

### Scenario 1: Nhân viên nộp form Q2 2025
```
UI: Chọn Quý 2, Năm 2025, điền form
Export filename: Phieu_tu_danh_gia_Q2_2025_nv001_2025-10-20.xlsx
Server creates: uploads/exports/2025/Q2/
Server saves: Q2_2025_nv001_Nguyen_Van_A_2025-10-20_14-30-45.xlsx
Database: quarter=2, year=2025
```

### Scenario 2: Manager xuất tổng hợp Q2 2025 của Phòng KHCN
```
Manager: Click "Xuất tổng hợp" → Select Phòng KHCN
Backend: Query all Q2 2025 records for KHCN
Excel header: "QUÝ II NĂM 2025"
Filename: Tong_ket_xep_loai_Q2_2025_Chi_nhanh_Bac_TPHCM_Phong_KHCN_20251020.xlsx
```

### Scenario 3: Nhân viên submit Q3 sau khi đã submit Q2
```
Q2 file: uploads/exports/2025/Q2/Q2_2025_nv001_...xlsx
Q3 file: uploads/exports/2025/Q3/Q3_2025_nv001_...xlsx
Both exist: ✓ (riêng biệt, không conflict)
```
