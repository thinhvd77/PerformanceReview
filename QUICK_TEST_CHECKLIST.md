# ✅ Quick Testing Checklist - AUTO_BONUS_RULES

## 🎯 Mục tiêu
Test nhanh tính năng điểm thưởng năm trong 15 phút

---

## ⚙️ Chuẩn bị (2 phút)

- [x] Backend running: http://localhost:5000 ✅
- [x] Frontend running: http://localhost:3001 ✅
- [ ] Login vào hệ thống
- [ ] Mở form Performance Review

---

## 📝 Test Scenario: Capital Bonus (5 phút)

### Kế hoạch năm: 1,000,000 (1 triệu)

### Quý 1 (Q1/2025)
- [ ] Nhập "Tăng trưởng nguồn vốn":
  - Kế hoạch năm: `1000000`
  - Kế hoạch quý này: `250000`
  - Thực hiện quý này: `300000` (vượt 20%)
- [ ] Export → Lưu Q1 ✅

### Quý 2 (Q2/2025)
- [ ] Nhập "Tăng trưởng nguồn vốn":
  - Thực hiện quý này: `280000`
- [ ] Cumulative: 300k + 280k = 580k < 1M ❌
- [ ] Check Section V: **Chưa có bonus row** ✅
- [ ] Export → Lưu Q2 ✅

### Quý 3 (Q3/2025)
- [ ] Nhập "Tăng trưởng nguồn vốn":
  - Thực hiện quý này: `450000`
- [ ] Cumulative: 300k + 280k + 450k = **1,030k >= 1M** ✅
- [ ] **CHECK SECTION V**:
  - [ ] ✅ Có dòng mới: "Chỉ tiêu nguồn vốn hoàn thành KH năm được giao"
  - [ ] ✅ Điểm: `3`
  - [ ] ✅ Ghi chú: "Hoàn thành KH năm"
- [ ] Export → Lưu Q3 ✅

### Test Remove Bonus (2 phút)
- [ ] Quay lại Q3
- [ ] Sửa "Thực hiện quý này" xuống: `200000`
- [ ] Cumulative mới: 300k + 280k + 200k = 780k < 1M ❌
- [ ] **CHECK SECTION V**:
  - [ ] ✅ Bonus row biến mất (tự động xóa)

---

## 🎨 Test Service Bonus (Array Label) (3 phút)

### Kế hoạch năm: 500,000

### Quý 1
- [ ] Nhập "Thu dịch vụ":
  - Kế hoạch năm: `500000`
  - Thực hiện Q1: `400000`
- [ ] Export Q1

### Quý 2
- [ ] Nhập "Thu dịch vụ":
  - Thực hiện Q2: `150000`
- [ ] Cumulative: 400k + 150k = **550k >= 500k** ✅
- [ ] **CHECK SECTION V**:
  - [ ] ✅ Có dòng: "Một trong các chỉ tiêu thu dịch vụ..."
  - [ ] ✅ Điểm: `5` (cao hơn capital/loan bonus)
  - [ ] ✅ Ghi chú: "Hoàn thành KH năm"

---

## 🏆 Test Section V Max Constraint (3 phút)

### Scenario: Đạt cả 3 bonus rules

- [ ] Tạo data để đạt:
  - Capital: cumulative >= 1M → +3đ
  - Loan: cumulative >= 2M → +3đ
  - Service: cumulative >= 500k → +5đ
  - **Tổng**: 3 + 3 + 5 = 11đ

- [ ] **CHECK SECTION V parent row (dòng V)**:
  - [ ] ✅ Công thức: `=MIN(SUM(...), 5)`
  - [ ] ✅ Giá trị hiển thị: **5 điểm** (không phải 11)

---

## 🔍 Debugging Checklist

### Nếu bonus row không xuất hiện:

1. **Check Browser Console**:
   ```
   - Có error "Failed to fetch cumulative metrics"?
   - Có error từ API call?
   ```

2. **Check Network Tab**:
   ```
   - GET /api/quarterly-metrics có trả về data?
   - Response format đúng: {quarter, year, metrics: {...}}?
   ```

3. **Check Backend Logs**:
   ```bash
   # Terminal where backend is running
   # Có error logs không?
   ```

4. **Verify Data Saved**:
   ```
   - Đã click Export cho mỗi quarter?
   - API POST /quarterly-metrics thành công?
   ```

---

## ✅ Success Criteria

### PASS nếu:
- [x] Bonus row xuất hiện khi cumulative >= annual plan
- [x] Bonus row biến mất khi cumulative < annual plan
- [x] Điểm chính xác (3đ cho capital/loan, 5đ cho service)
- [x] Ghi chú = "Hoàn thành KH năm"
- [x] Section V max 5 điểm (với nhiều bonus)

### FAIL nếu:
- [ ] Bonus row không xuất hiện khi đạt target
- [ ] Data không persist sau reload
- [ ] Console có errors
- [ ] API calls fail

---

## 📊 Quick Test Results

| Test Case | Status | Notes |
|-----------|--------|-------|
| Capital bonus (Q1-Q3) | ⏳ | |
| Remove bonus when not met | ⏳ | |
| Service bonus (array label) | ⏳ | |
| Section V max constraint | ⏳ | |

**Total time**: ~15 phút  
**Date tested**: ___________  
**Tester**: ___________

---

## 🚀 Next Steps After Testing

### If all PASS ✅:
1. Mark Tasks 5-10 as completed
2. Commit code to git
3. Create pull request
4. Deploy to staging

### If any FAIL ❌:
1. Note which test case failed
2. Check debugging checklist
3. Review error logs
4. Fix bugs and re-test

---

**For detailed testing instructions, see**: `TESTING_AUTO_BONUS_RULES.md`
