#!/bin/bash

# Test script for AUTO_BONUS_RULES API endpoints

BASE_URL="http://localhost:5000"
TOKEN=""  # Replace with your JWT token

echo "================================================"
echo "Testing AUTO_BONUS_RULES Backend API"
echo "================================================"

# Test 1: Health check
echo -e "\n[Test 1] Health Check"
curl -s "$BASE_URL/health" | jq .

# Test 2: Get quarterly metrics (will return 404 if no data)
echo -e "\n[Test 2] GET /api/quarterly-metrics?quarter=1&year=2025"
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/quarterly-metrics?quarter=1&year=2025" | jq .

# Test 3: Save sample quarterly metrics
echo -e "\n[Test 3] POST /api/quarterly-metrics (Save sample data)"
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quarter": 1,
    "year": 2025,
    "metrics": [
      {
        "metric_type": "capital_growth",
        "plan_value": 250000,
        "actual_value": 300000,
        "prev_actual_value": 0
      },
      {
        "metric_type": "loan_growth",
        "plan_value": 500000,
        "actual_value": 450000,
        "prev_actual_value": 0
      }
    ]
  }' \
  "$BASE_URL/api/quarterly-metrics" | jq .

# Test 4: Get quarterly metrics again
echo -e "\n[Test 4] GET /api/quarterly-metrics?quarter=1&year=2025 (after save)"
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/quarterly-metrics?quarter=1&year=2025" | jq .

echo -e "\n================================================"
echo "Testing completed!"
echo "================================================"
echo ""
echo "To get your JWT token:"
echo "1. Login to frontend: http://localhost:3001"
echo "2. Open browser DevTools > Application > Local Storage"
echo "3. Copy the 'token' value"
echo "4. Replace TOKEN variable in this script"
echo ""
