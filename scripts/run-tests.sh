#!/bin/bash

# TempMail Pro Test Suite Runner
# This script runs all test suites and generates a comprehensive report

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/services/api"
WEB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/services/web"
REPORT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/test-reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create report directory
mkdir -p "$REPORT_DIR/$TIMESTAMP"
REPORT_PATH="$REPORT_DIR/$TIMESTAMP"

# Header
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}TempMail Pro Test Suite Runner${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Test run started at: $(date)"
echo "Report directory: $REPORT_PATH"
echo ""

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
TEST_RESULTS=()

# Helper functions
log_success() {
    echo -e "${GREEN}✓ $1${NC}"
    ((PASSED_TESTS++))
}

log_error() {
    echo -e "${RED}✗ $1${NC}"
    ((FAILED_TESTS++))
}

log_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

log_section() {
    echo ""
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}----------------------------------------${NC}"
}

# Function to run a test suite
run_test_suite() {
    local suite_name=$1
    local test_command=$2
    local test_dir=$3
    local report_file="$REPORT_PATH/${suite_name,,}_results.txt"

    log_section "Running $suite_name Tests"

    cd "$test_dir"

    if eval "$test_command" > "$report_file" 2>&1; then
        log_success "$suite_name tests passed"
        TEST_RESULTS+=("$suite_name: PASSED")
    else
        log_error "$suite_name tests failed"
        TEST_RESULTS+=("$suite_name: FAILED")
        echo "Check $report_file for details"
    fi

    ((TOTAL_TESTS++))
}

# 1. Linting Tests
log_section "Code Linting"

# API linting
log_info "Running ESLint on API..."
cd "$API_DIR"
if npm run lint > "$REPORT_PATH/api_lint.txt" 2>&1; then
    log_success "API linting passed"
else
    log_error "API linting failed"
fi
((TOTAL_TESTS++))

# Web linting
log_info "Running ESLint on Web..."
cd "$WEB_DIR"
if npm run lint > "$REPORT_PATH/web_lint.txt" 2>&1; then
    log_success "Web linting passed"
else
    log_error "Web linting failed"
fi
((TOTAL_TESTS++))

# 2. Type Checking
log_section "Type Checking"

# TypeScript compilation for API
log_info "TypeScript check for API..."
cd "$API_DIR"
if npm run type-check > "$REPORT_PATH/api_types.txt" 2>&1; then
    log_success "API types passed"
else
    log_error "API types failed"
fi
((TOTAL_TESTS++))

# TypeScript compilation for Web
log_info "TypeScript check for Web..."
cd "$WEB_DIR"
if npm run type-check > "$REPORT_PATH/web_types.txt" 2>&1; then
    log_success "Web types passed"
else
    log_error "Web types failed"
fi
((TOTAL_TESTS++))

# 3. Unit Tests
log_section "Unit Tests"

# API unit tests
run_test_suite "API Unit" "npm run test:unit" "$API_DIR"

# Web unit tests
run_test_suite "Web Unit" "npm run test:unit" "$WEB_DIR"

# 4. Integration Tests
log_section "Integration Tests"

# API integration tests
run_test_suite "API Integration" "npm run test:integration" "$API_DIR"

# E2E tests (if Cypress is configured)
if [ -d "$WEB_DIR/cypress" ]; then
    run_test_suite "E2E" "npm run test:e2e" "$WEB_DIR"
fi

# 5. Performance Tests
log_section "Performance Tests"

# Check if k6 is installed
if command -v k6 &> /dev/null; then
    log_info "Running load tests with k6..."
    cd "$(dirname "${BASH_SOURCE[0]}")/../tests/performance"

    if k6 run load-test.js --out json="$REPORT_PATH/load_test_metrics.json" > "$REPORT_PATH/load_test.txt" 2>&1; then
        log_success "Load tests passed"
        TEST_RESULTS+=("Performance: PASSED")
    else
        log_error "Load tests failed"
        TEST_RESULTS+=("Performance: FAILED")
    fi
    ((TOTAL_TESTS++))
else
    log_info "k6 not installed, skipping load tests"
fi

# 6. Security Tests
log_section "Security Tests"

# Check if npm audit passes
log_info "Running npm audit on API..."
cd "$API_DIR"
if npm audit --audit-level moderate > "$REPORT_PATH/api_audit.txt" 2>&1; then
    log_success "API security audit passed"
else
    log_error "API security audit found vulnerabilities"
fi
((TOTAL_TESTS++))

log_info "Running npm audit on Web..."
cd "$WEB_DIR"
if npm audit --audit-level moderate > "$REPORT_PATH/web_audit.txt" 2>&1; then
    log_success "Web security audit passed"
else
    log_error "Web security audit found vulnerabilities"
fi
((TOTAL_TESTS++))

# 7. Database Tests
log_section "Database Tests"

# Check database migrations
log_info "Testing database migrations..."
cd "$API_DIR"
if npm run db:migrate:test > "$REPORT_PATH/db_migrate.txt" 2>&1; then
    log_success "Database migrations passed"
else
    log_error "Database migrations failed"
fi
((TOTAL_TESTS++))

# 8. Build Tests
log_section "Build Tests"

# API build
log_info "Building API..."
cd "$API_DIR"
if npm run build > "$REPORT_PATH/api_build.txt" 2>&1; then
    log_success "API build passed"
else
    log_error "API build failed"
fi
((TOTAL_TESTS++))

# Web build
log_info "Building Web..."
cd "$WEB_DIR"
if npm run build > "$REPORT_PATH/web_build.txt" 2>&1; then
    log_success "Web build passed"
else
    log_error "Web build failed"
fi
((TOTAL_TESTS++))

# 9. Coverage Report
log_section "Coverage Report"

# Generate coverage report for API
log_info "Generating coverage report for API..."
cd "$API_DIR"
if npm run test:coverage > "$REPORT_PATH/coverage.txt" 2>&1; then
    log_success "Coverage report generated"
    if [ -f "coverage/lcov-report/index.html" ]; then
        cp -r coverage "$REPORT_PATH/"
    fi
else
    log_error "Coverage report failed"
fi

# 10. Generate Summary Report
log_section "Test Summary"

# Create summary report
cat > "$REPORT_PATH/test_summary.txt" << EOF
TempMail Pro Test Suite Summary
================================
Date: $(date)
Total Test Suites: $TOTAL_TESTS
Passed: $PASSED_TESTS
Failed: $FAILED_TESTS
Success Rate: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%

Test Results:
$(printf '%s\n' "${TEST_RESULTS[@]}")

Detailed reports are available in the same directory.

EOF

# Print summary
cat "$REPORT_PATH/test_summary.txt"

# Generate HTML report
cat > "$REPORT_PATH/report.html" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>TempMail Pro Test Report</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            margin-bottom: 30px;
        }
        .summary {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        .test-suite {
            background: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .passed {
            border-left: 5px solid #4CAF50;
        }
        .failed {
            border-left: 5px solid #f44336;
        }
        .status {
            padding: 5px 15px;
            border-radius: 20px;
            color: white;
            font-weight: bold;
        }
        .status.passed {
            background-color: #4CAF50;
        }
        .status.failed {
            background-color: #f44336;
        }
        .metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .metric {
            background: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
        }
        .metric-label {
            color: #666;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>TempMail Pro Test Report</h1>
        <p>Generated on $(date)</p>
    </div>

    <div class="summary">
        <h2>Test Overview</h2>
        <div class="metrics">
            <div class="metric">
                <div class="metric-value">$TOTAL_TESTS</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric">
                <div class="metric-value">$PASSED_TESTS</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value">$FAILED_TESTS</div>
                <div class="metric-label">Failed</div>
            </div>
            <div class="metric">
                <div class="metric-value">$(( PASSED_TESTS * 100 / TOTAL_TESTS ))%</div>
                <div class="metric-label">Success Rate</div>
            </div>
        </div>
    </div>

    <div class="results">
        <h2>Test Results</h2>
EOF

# Add test results to HTML report
for result in "${TEST_RESULTS[@]}"; do
    suite_name=$(echo "$result" | cut -d: -f1)
    status=$(echo "$result" | cut -d: -f2)

    cat >> "$REPORT_PATH/report.html" << EOF
        <div class="test-suite $status">
            <span>$suite_name</span>
            <span class="status $status">$status</span>
        </div>
EOF
done

# Close HTML report
cat >> "$REPORT_PATH/report.html" << 'EOF'
    </div>
</body>
</html>
EOF

# Final status
echo ""
echo -e "${BLUE}========================================${NC}"
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}All tests passed! 🎉${NC}"
    echo -e "${GREEN}Report saved to: $REPORT_PATH${NC}"
    echo -e "${GREEN}View HTML report: file://$REPORT_PATH/report.html${NC}"
    exit 0
else
    echo -e "${RED}$FAILED_TESTS test(s) failed!${NC}"
    echo -e "${YELLOW}Report saved to: $REPORT_PATH${NC}"
    echo -e "${YELLOW}View HTML report: file://$REPORT_PATH/report.html${NC}"
    exit 1
fi