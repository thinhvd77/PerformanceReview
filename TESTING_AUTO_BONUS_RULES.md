# Testing Guide: AUTO_BONUS_RULES Feature

## Mục tiêu
Kiểm tra tính năng điểm thưởng năm (AUTO_BONUS_RULES) trong Section V của Performance Review Form.

## Yêu cầu
- ✅ Backend đang chạy (port 5000)
- ✅ Frontend đang chạy (port 5173)
- ✅ User đã đăng nhập

## Test Case 1: Test AUTO_BONUS_RULES với data Q1-Q3
**Mục đích**: Verify rằng bonus row tự động xuất hiện khi cumulative actual >= annual plan

### Bước 1: Chuẩn bị dữ liệu Q1
1. Mở form Performance Review
2. Chọn **Quý 1 / Năm 2025**
3. Tại dòng **"Tăng trưởng nguồn vốn"**:
   - Kế hoạch năm: `1000000` (1 triệu)
   - Kế hoạch quý này: `250000` (250k)
   - Thực hiện quý này: `300000` (300k - vượt 20%)
4. Tại dòng **"Tăng trưởng dư nợ"**:
   - Kế hoạch năm: `2000000` (2 triệu)
   - Kế hoạch quý này: `500000` (500k)
   - Thực hiện quý này: `450000` (450k - đạt 90%)
5. Nhấn **Export** để lưu dữ liệu Q1

### Bước 2: Nhập dữ liệu Q2
1. Chọn **Quý 2 / Năm 2025**
2. Tại dòng **"Tăng trưởng nguồn vốn"**:
   - Kế hoạch quý này: `250000`
   - Thực hiện quý này: `280000` (280k)
3. Tại dòng **"Tăng trưởng dư nợ"**:
   - Kế hoạch quý này: `500000`
   - Thực hiện quý này: `520000` (520k)
4. Nhấn **Export** để lưu dữ liệu Q2

### Bước 3: Nhập dữ liệu Q3 và kiểm tra bonus
1. Chọn **Quý 3 / Năm 2025**
2. Tại dòng **"Tăng trưởng nguồn vốn"**:
   - Kế hoạch quý này: `250000`
   - Thực hiện quý này: `450000` (450k - cao để đạt target năm)
3. **Kiểm tra Section V**:
   - ✅ Phải xuất hiện dòng: **"Chỉ tiêu nguồn vốn hoàn thành KH năm được giao"**
   - ✅ Điểm: `3` (fixedPoints)
   - ✅ Ghi chú: **"Hoàn thành KH năm"**
   - ✅ Cumulative: 300k + 280k + 450k = 1,030k >= 1,000k ✓

4. Tại dòng **"Tăng trưởng dư nợ"**:
   - Kế hoạch quý này: `500000`
   - Thực hiện quý này: `600000` (600k)
5. **Kiểm tra Section V**:
   - ✅ Phải xuất hiện dòng: **"Chỉ tiêu dư nợ hoàn thành KH năm được giao"**
   - ✅ Điểm: `3` (fixedPoints)
   - ✅ Ghi chú: **"Hoàn thành KH năm"**
   - ✅ Cumulative: 450k + 520k + 600k = 1,570k < 2,000k ✗ → **KHÔNG HIỆN**

### Bước 4: Nhập dữ liệu Q4 để đạt cả 2 targets
1. Chọn **Quý 4 / Năm 2025**
2. Tại dòng **"Tăng trưởng dư nợ"**:
   - Thực hiện quý này: `500000` (500k)
3. **Kiểm tra Section V**:
   - ✅ Bây giờ phải xuất hiện: **"Chỉ tiêu dư nợ hoàn thành KH năm được giao"**
   - ✅ Cumulative: 450k + 520k + 600k + 500k = 2,070k >= 2,000k ✓

---

## Test Case 2: Test array growthLabel matching (service-bonus)
**Mục đích**: Verify rằng service-bonus rule với array growthLabel hoạt động đúng

### Kịch bản
Service-bonus rule có `growthLabel: ["Thu dịch vụ", "Thu hồi nợ đã XLRR", "Tài chính"]`
→ Nếu **BẤT KỲ** chỉ tiêu nào đạt annual plan thì cộng 5 điểm

### Bước test
1. Chọn **Quý 1 / Năm 2025**
2. Nhập dữ liệu cho **"Thu dịch vụ"**:
   - Kế hoạch năm: `500000`
   - Thực hiện Q1: `400000`
3. Nhập dữ liệu cho **"Thu hồi nợ đã XLRR"**:
   - Kế hoạch năm: `300000`
   - Thực hiện Q1: `100000`
4. Nhập dữ liệu cho **"Tài chính"** (nếu có dòng này):
   - Kế hoạch năm: `200000`
   - Thực hiện Q1: `80000`

5. Chuyển sang **Quý 2**, nhập:
   - Thu dịch vụ Q2: `150000` → Cumulative = 550k >= 500k ✓
   
6. **Kiểm tra Section V**:
   - ✅ Phải xuất hiện: **"Một trong các chỉ tiêu thu dịch vụ, thu hồi nợ đã XLRR, tài chính hoàn thành KH năm được giao"**
   - ✅ Điểm: `5` (fixedPoints - cao hơn capital/loan bonus)
   - ✅ Ghi chú: **"Hoàn thành KH năm"**

---

## Test Case 3: Test noteText và fixedPoints
**Mục đích**: Verify điểm thưởng và ghi chú chính xác

### Expected values
| Rule | Key | bonusLabel | fixedPoints | noteText |
|------|-----|------------|-------------|----------|
| Capital | capital-bonus | "Chỉ tiêu nguồn vốn hoàn thành KH năm được giao" | 3 | "Hoàn thành KH năm" |
| Loan | loan-bonus | "Chỉ tiêu dư nợ hoàn thành KH năm được giao" | 3 | "Hoàn thành KH năm" |
| Service | service-bonus | "Một trong các chỉ tiêu thu dịch vụ..." | 5 | "Hoàn thành KH năm" |

### Bước test
1. Đạt điều kiện cho một trong các bonus rules
2. Kiểm tra Section V:
   - ✅ Điểm hiển thị đúng (3 hoặc 5)
   - ✅ Ghi chú = "Hoàn thành KH năm"
   - ✅ Label chính xác theo rule

---

## Test Case 4: Test Section V max 5 điểm constraint
**Mục đích**: Verify công thức Section V parent row: `=MIN(SUM(...), 5)`

### Kịch bản
Nếu có nhiều bonus rows (ví dụ: capital-bonus 3đ + loan-bonus 3đ + service-bonus 5đ = 11đ)
→ Tổng điểm Section V phải **tối đa 5 điểm**

### Bước test
1. Tạo scenario đạt cả 3 bonus rules trong cùng 1 quarter:
   - Capital cumulative >= annual plan
   - Loan cumulative >= annual plan
   - Service cumulative >= annual plan
   
2. **Kiểm tra Section V parent row (dòng V)**:
   - ✅ Công thức phải là: `=MIN(SUM(G1001, G1002, G1003), 5)` (hoặc tương tự với các addr cụ thể)
   - ✅ Giá trị hiển thị: **5 điểm** (không phải 11)

---

## Test Case 5: Test remove bonus row khi không đạt
**Mục đích**: Verify bonus row tự động biến mất khi không còn đạt điều kiện

### Kịch bản
1. Q1-Q3 đạt annual plan → bonus row xuất hiện
2. Sửa lại Q3 để cumulative < annual plan → bonus row phải biến mất

### Bước test
1. Tạo scenario đạt capital-bonus tại Q3:
   - Q1: 300k
   - Q2: 300k
   - Q3: 450k
   - Cumulative: 1,050k >= 1,000k ✓
   
2. **Verify bonus row xuất hiện** trong Section V

3. **Sửa Q3**:
   - Giảm Q3 xuống: `200k`
   - Cumulative mới: 800k < 1,000k ✗
   
4. **Verify bonus row biến mất**:
   - ✅ Dòng "Chỉ tiêu nguồn vốn hoàn thành KH năm" phải tự động xóa
   - ✅ Công thức Section V parent row cập nhật (không còn addr của bonus row)

---

## Test Case 6: Integration testing
**Mục đích**: Test toàn bộ flow end-to-end

### Flow hoàn chỉnh
1. **Login** → Chọn form
2. **Q1**: Nhập data → Export → Verify API call `/api/quarterly-metrics` (POST) thành công
3. **Q2**: Nhập data → Verify "Thực hiện quý trước" tự động điền từ Q1
4. **Q2**: Export → Verify data Q2 saved
5. **Q3**: Nhập data để cumulative đạt annual plan
6. **Q3**: Verify bonus row tự động xuất hiện
7. **Q3**: Export → Verify metrics saved correctly
8. **Q4**: Reload form → Verify tất cả data persist (không mất data cũ)
9. **Q4**: Verify bonus row vẫn còn nếu cumulative >= annual plan

### Debugging steps
Nếu bonus row không xuất hiện:

1. **Kiểm tra Browser Console**:
   ```
   Failed to fetch cumulative metrics
   ```
   → Backend API có lỗi

2. **Kiểm tra Network tab**:
   ```
   GET /api/quarterly-metrics?quarter=1&year=2025
   Response: 404 Not Found
   ```
   → Chưa có data Q1, Q2

3. **Kiểm tra Backend Logs**:
   ```
   Error fetching quarterly metrics: ...
   ```
   → Database connection issue

4. **Verify data in database**:
   ```sql
   SELECT * FROM quarterly_metrics 
   WHERE employee_code = 'your_username' 
   AND year = 2025 
   ORDER BY quarter;
   ```

---

## Expected Behavior Summary

### ✅ Bonus row xuất hiện khi:
- Cumulative actual (Q1 + Q2 + ... + current Q) >= Annual plan
- API `/api/quarterly-metrics` trả về đúng data
- AUTO_BONUS_RULES useEffect được trigger (dependencies change)

### ✅ Bonus row biến mất khi:
- Cumulative actual < Annual plan
- User sửa data của quarter trước đó

### ✅ Điểm thưởng:
- Capital bonus: 3 điểm
- Loan bonus: 3 điểm
- Service bonus: 5 điểm (cao hơn vì quan trọng hơn)
- **Tổng Section V**: Tối đa 5 điểm (constraint)

### ✅ API Endpoints sử dụng:
1. `GET /api/quarterly-metrics?quarter=X&year=Y` - Fetch metrics của 1 quarter
2. `POST /api/quarterly-metrics` - Save metrics sau khi export
3. `GET /api/quarterly-metrics/previous?quarter=X&year=Y` - Auto-fill "Thực hiện quý trước"

---

## Troubleshooting

### Issue 1: Bonus row không xuất hiện
**Nguyên nhân có thể:**
- Backend chưa chạy
- Chưa có dữ liệu các quarter trước
- API endpoint trả về sai format
- annualPlanColIdx = null (không tìm thấy cột "Kế hoạch năm")

**Giải pháp:**
```bash
# 1. Kiểm tra backend
curl http://localhost:5000/health

# 2. Test API endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5000/api/quarterly-metrics?quarter=1&year=2025"

# 3. Kiểm tra browser console
# Xem có error message không
```

### Issue 2: Cumulative calculation sai
**Nguyên nhân:**
- Metric type mapping sai
- Label không match (normalizeText issue)

**Giải pháp:**
- Kiểm tra `findGrowthRowByLabels` function
- Verify metric_type trong database

### Issue 3: Section V constraint không hoạt động
**Nguyên nhân:**
- `buildParentFormula` không có logic MIN(..., 5)

**Giải pháp:**
- Kiểm tra line ~1100 trong FormViewer.jsx
- Verify công thức có `=MIN(SUM(...), 5)` không

---

## Success Criteria

✅ **Test Case 1**: PASS - Bonus rows xuất hiện đúng lúc  
✅ **Test Case 2**: PASS - Array growthLabel matching hoạt động  
✅ **Test Case 3**: PASS - noteText và fixedPoints chính xác  
✅ **Test Case 4**: PASS - Section V max 5 điểm  
✅ **Test Case 5**: PASS - Bonus row tự động xóa khi không đạt  
✅ **Test Case 6**: PASS - Integration flow hoàn chỉnh

**Khi tất cả test cases PASS** → Feature AUTO_BONUS_RULES hoàn chỉnh! 🎉
