# Quarterly Metrics - Testing Guide

## 🎯 Overview
Hệ thống tự động lưu và load dữ liệu 4 chỉ số theo quý:
- Tăng trưởng nguồn vốn
- Tăng trưởng dư nợ
- Thu dịch vụ
- Thu hồi nợ đã XLRR

## ✅ Features Implemented

### 1. Quarter/Year Selector UI
- **Location**: FormViewer.jsx - Top of the form
- **Components**: 
  - Select dropdown cho Quý (1-4)
  - Select dropdown cho Năm (2024-2026)
- **Persistence**: Lựa chọn được lưu vào localStorage
- **Integration**: Quý/năm được chọn sẽ hiển thị trên file Excel export (dòng "Quý X Năm YYYY")

### 2. Auto-Save on Export
- Khi user click "Xuất Excel", hệ thống tự động:
  - Trích xuất 4 chỉ số từ cột "Thực hiện quý này"
  - Gọi `POST /api/quarterly-metrics` với quarter/year đã chọn
  - Lưu vào database table `quarterly_metrics`

### 3. Auto-Load Previous Quarter
- Khi mở form, hệ thống tự động:
  - Gọi `GET /api/quarterly-metrics/previous?quarter=X&year=Y`
  - Điền dữ liệu quý trước vào cột "Thực hiện quý trước"
  - Hiển thị message thành công

## 🧪 Testing Steps

### Test 1: Save Metrics for Q1 2025

1. **Start servers**:
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

2. **Open application**: http://localhost:5173

3. **Login** with your credentials

4. **Navigate to User Form Page**

5. **Select Quarter/Year**:
   - Chọn "Quý 1" 
   - Chọn "2025"

6. **Fill the form** - Tìm 4 dòng sau và nhập giá trị vào cột "Thực hiện quý này":
   - **Tăng trưởng nguồn vốn**: Nhập 1000000 (1 triệu)
   - **Tăng trưởng dư nợ**: Nhập 2000000 (2 triệu)
   - **Thu dịch vụ**: Nhập 150000 (150 nghìn)
   - **Thu hồi nợ đã XLRR**: Nhập 50000 (50 nghìn)

7. **Click "Xuất Excel"**

8. **Check console logs**:
   ```
   Saved 4 quarterly metrics for Q1 2025
   ```

9. **Verify database**:
   ```sql
   SELECT * FROM quarterly_metrics 
   WHERE employee_code = 'YOUR_USERNAME' 
   AND quarter = 1 
   AND year = 2025;
   ```
   
   Expected: 4 rows với metric_type: capital_growth, loan_growth, service_revenue, debt_recovery

### Test 2: Auto-Load Previous Quarter (Q2 2025)

1. **Still on User Form Page**

2. **Change Quarter/Year**:
   - Chọn "Quý 2"
   - Giữ nguyên "2025"

3. **Wait for auto-load** (vài giây)

4. **Check success message**:
   ```
   Đã tự động điền 4 chỉ số từ Quý 1/2025
   ```

5. **Verify form data** - Cột "Thực hiện quý trước" của 4 dòng metrics đã tự động điền:
   - Tăng trưởng nguồn vốn: 1000000
   - Tăng trưởng dư nợ: 2000000
   - Thu dịch vụ: 150000
   - Thu hồi nợ đã XLRR: 50000

6. **Fill new data for Q2** vào cột "Thực hiện quý này":
   - Tăng trưởng nguồn vốn: 1200000
   - Tăng trưởng dư nợ: 2300000
   - Thu dịch vụ: 180000
   - Thu hồi nợ đã XLRR: 60000

7. **Click "Xuất Excel"**

8. **Verify Q2 data saved**:
   ```sql
   SELECT * FROM quarterly_metrics 
   WHERE employee_code = 'YOUR_USERNAME' 
   AND quarter = 2 
   AND year = 2025;
   ```

### Test 3: Quarter Boundary (Q1 2025 → Q4 2024)

1. **Change to Q1 2025**

2. **Should auto-load Q4 2024 data** (if exists)

3. **Check console** - If Q4 2024 doesn't exist:
   ```
   Failed to load previous quarter metrics: (404 or similar)
   ```
   This is expected and silent - no error shown to user.

### Test 4: API Direct Testing

**Save metrics**:
```bash
curl -X POST http://localhost:5000/api/quarterly-metrics \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quarter": 1,
    "year": 2025,
    "metrics": [
      {
        "metric_type": "capital_growth",
        "plan_value": 900000,
        "actual_value": 1000000
      },
      {
        "metric_type": "loan_growth",
        "plan_value": 1800000,
        "actual_value": 2000000
      }
    ]
  }'
```

**Get previous quarter**:
```bash
curl -X GET "http://localhost:5000/api/quarterly-metrics/previous?quarter=2&year=2025" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected response:
```json
{
  "previous_quarter": 1,
  "previous_year": 2025,
  "metrics": {
    "capital_growth": 1000000,
    "loan_growth": 2000000,
    "service_revenue": 150000,
    "debt_recovery": 50000
  },
  "raw": [...]
}
```

## 🐛 Troubleshooting

### Problem: "Thực hiện quý trước" not auto-filled

**Possible causes**:
1. Previous quarter data doesn't exist → Expected, no error
2. Column "Thực hiện quý trước" not found → Check console for warning
3. Metric label mismatch → Check console logs

**Solution**: Check browser console for warnings

### Problem: Metrics not saved on export

**Check**:
1. Console log: `Saved X quarterly metrics for Q...`
2. If not shown, check browser Network tab for `/quarterly-metrics` POST request
3. Check response for errors

### Problem: Database table not created

**Solution**:
```bash
cd backend
# Check if TypeORM synchronize is enabled in config/database.js
# If not, create migration:
npm run typeorm migration:generate -- -n CreateQuarterlyMetrics
npm run typeorm migration:run
```

## 📊 Database Schema Verification

```sql
-- Check table structure
\d quarterly_metrics

-- Expected columns:
-- id, employee_code, quarter, year, metric_type, 
-- plan_value, actual_value, prev_actual_value,
-- createdAt, updatedAt

-- Check all saved metrics
SELECT 
  employee_code,
  quarter,
  year,
  metric_type,
  actual_value,
  createdAt
FROM quarterly_metrics
ORDER BY year DESC, quarter DESC, employee_code, metric_type;
```

## ✨ Success Criteria

✅ Quarter/Year selector visible and functional  
✅ Can save metrics for Q1 2025  
✅ Can switch to Q2 2025 and see Q1 data auto-filled  
✅ 4 rows in database for each quarter  
✅ Console logs show correct quarter/year  
✅ Success message appears on auto-load  
✅ LocalStorage persists quarter/year selection  

## 🎓 User Guide

**For End Users**:

1. **Chọn quý và năm** bạn đang điền form (góc trên bên trái)
2. **Điền thông tin** vào các ô "Thực hiện quý này"
3. Hệ thống **tự động điền** dữ liệu quý trước vào cột "Thực hiện quý trước"
4. **Click "Xuất Excel"** để lưu và tải file
5. Dữ liệu sẽ được **tự động lưu** vào hệ thống

**Lưu ý**:
- Mỗi lần xuất Excel cho cùng một quý sẽ **ghi đè** dữ liệu cũ
- Dữ liệu quý trước chỉ hiển thị khi **đã có dữ liệu** của quý đó
