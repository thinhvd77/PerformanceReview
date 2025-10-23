# Quarterly Metrics Storage Feature

## Tổng quan

Hệ thống tự động lưu trữ 4 chỉ số quan trọng theo từng quý:
1. **Tăng trưởng nguồn vốn** (capital_growth)
2. **Tăng trưởng dư nợ** (loan_growth)  
3. **Thu dịch vụ** (service_revenue)
4. **Thu hồi nợ đã XLRR** (debt_recovery)

## Cấu trúc Database

### QuarterlyMetric Entity
```javascript
{
    id: int,
    employee_code: varchar(100),
    quarter: int (1-4),
    year: int,
    metric_type: varchar(50), // 'capital_growth', 'loan_growth', 'service_revenue', 'debt_recovery'
    plan_value: decimal(15,2), // Kế hoạch quý này
    actual_value: decimal(15,2), // Thực hiện quý này
    prev_actual_value: decimal(15,2), // Thực hiện quý trước (nếu có)
    createdAt: timestamp,
    updatedAt: timestamp
}
```

## API Endpoints

### 1. Save Quarterly Metrics
```
POST /api/quarterly-metrics
Headers: Authorization: Bearer <token>
Body: {
    "quarter": 1,
    "year": 2025,
    "metrics": [
        {
            "metric_type": "capital_growth",
            "plan_value": 1000000,
            "actual_value": 1050000,
            "prev_actual_value": 980000
        },
        ...
    ]
}
```

**Response:**
```json
{
    "message": "Quarterly metrics saved successfully",
    "count": 4,
    "data": [...]
}
```

### 2. Get Quarterly Metrics
```
GET /api/quarterly-metrics?quarter=1&year=2025&employee_code=201100069
Headers: Authorization: Bearer <token>
```

**Response:**
```json
{
    "data": [...],
    "count": 4
}
```

### 3. Get Previous Quarter Metrics
```
GET /api/quarterly-metrics/previous?quarter=2&year=2025
Headers: Authorization: Bearer <token>
```

**Response:**
```json
{
    "previous_quarter": 1,
    "previous_year": 2025,
    "metrics": {
        "capital_growth": 1050000,
        "loan_growth": 2300000,
        "service_revenue": 150000,
        "debt_recovery": 50000
    },
    "raw": [...]
}
```

## Workflow

### 1. Form Export (Automatic Save)
Khi người dùng click "Xuất Excel":

```javascript
// In FormViewer.jsx handleExport()
const metrics = extractQuarterlyMetrics(table, cellInputs, computedByAddr);
const { quarter, year } = getCurrentQuarterYear();
await api.post("/quarterly-metrics", { quarter, year, metrics });
```

**Logic trích xuất:**
- Tìm các dòng có tiêu chí khớp: "Tăng trưởng nguồn vốn", "Tăng trưởng dư nợ", "Thu dịch vụ", "Thu hồi nợ đã XLRR"
- Lấy giá trị từ cột "Kế hoạch quý này", "Thực hiện quý này", "Thực hiện quý trước"
- Chuyển đổi sang số (xử lý format Việt Nam: 1.000.000,50 hoặc 1,000,000.50)

### 2. Form Load (Auto-populate Previous Quarter)
**TODO:** Cần implement trong FormViewer.jsx

```javascript
useEffect(() => {
    const loadPreviousQuarterData = async () => {
        const { quarter, year } = getCurrentQuarterYear();
        try {
            const { data } = await api.get('/quarterly-metrics/previous', {
                params: { quarter, year }
            });
            
            // Auto-fill "Thực hiện quý trước" column
            if (data.metrics && prevActualColIdx >= 0) {
                const updates = {};
                table.rows.forEach(row => {
                    const criteria = normalizeText(row.cells[1]?.value);
                    let metricType = null;
                    if (criteria.includes('tang truong nguon von')) metricType = 'capital_growth';
                    else if (criteria.includes('tang truong du no')) metricType = 'loan_growth';
                    else if (criteria.includes('thu dich vu')) metricType = 'service_revenue';
                    else if (criteria.includes('thu hoi no da xlrr')) metricType = 'debt_recovery';
                    
                    if (metricType && data.metrics[metricType] != null) {
                        const prevCell = row.cells[prevActualColIdx];
                        if (prevCell?.addr) {
                            updates[prevCell.addr] = data.metrics[metricType];
                        }
                    }
                });
                setCellInputs(prev => ({ ...prev, ...updates }));
            }
        } catch (err) {
            console.warn('Failed to load previous quarter metrics:', err);
        }
    };
    
    loadPreviousQuarterData();
}, [table, prevActualColIdx]);
```

## Testing

### 1. Save Metrics (Backend)
```bash
# Test save metrics
curl -X POST http://localhost:5000/api/quarterly-metrics \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "quarter": 1,
    "year": 2025,
    "metrics": [
      {
        "metric_type": "capital_growth",
        "plan_value": 1000000,
        "actual_value": 1050000
      }
    ]
  }'
```

### 2. Get Previous Quarter
```bash
curl -X GET "http://localhost:5000/api/quarterly-metrics/previous?quarter=2&year=2025" \
  -H "Authorization: Bearer <token>"
```

### 3. Frontend Test
1. Điền form cho Quý 1/2025
2. Nhập giá trị vào "Thực hiện quý này" cho 4 chỉ số
3. Click "Xuất Excel"
4. Kiểm tra console: `Saved 4 quarterly metrics for Q1 2025`
5. Kiểm tra database: `SELECT * FROM quarterly_metrics WHERE employee_code='xxx' AND quarter=1 AND year=2025`

## Database Migration

Khi khởi động lần đầu với TypeORM synchronize=true, bảng `quarterly_metrics` sẽ tự động được tạo.

Nếu cần tạo migration thủ công:
```bash
cd backend
npm run typeorm migration:generate -- -n CreateQuarterlyMetrics
npm run typeorm migration:run
```

## Notes

- Mỗi lần export, dữ liệu cũ cho cùng employee/quarter/year sẽ bị ghi đè (delete + insert mới)
- Hỗ trợ tự động xác định quý hiện tại dựa trên ngày hệ thống
- Các giá trị null được phép (ví dụ: chưa nhập kế hoạch nhưng có thực hiện)
- Chỉ lưu metrics có ít nhất 1 giá trị (actual hoặc plan)
