# Pricing Tiers

## Overview
Ephemera Email offers 5 subscription tiers for different use cases.

## Source of Truth
**Config:** `services/api/src/config/unified-tier-limits.ts`
**API:** `GET /billing/tiers` - Returns all tier configurations

## Tier Comparison

| Feature | FREE | STARTER | PROFESSIONAL | BUSINESS | ENTERPRISE |
|---------|------|---------|--------------|----------|------------|
| **Giá** | 0đ | 49,000đ | 99,000đ | 199,000đ | 499,000đ |
| Tên miền | 1 | 3 | 10 | 25 | Unlimited |
| Hộp thư | 3 | 20 | 100 | 500 | Unlimited |
| Lưu trữ | 100MB | 1GB | 5GB | 20GB | 50GB |
| Email/ngày | 50 | 200 | 1,000 | 5,000 | Unlimited |
| Lưu trữ email | 7 ngày | 30 ngày | 90 ngày | 180 ngày | 365 ngày |
| Teams | 0 | 1 | 5 | 15 | Unlimited |
| Thành viên/team | 0 | 3 | 10 | 30 | Unlimited |
| Webhooks | 1 | 3 | 10 | 25 | Unlimited |
| API Access | ❌ | ✅ | ✅ | ✅ | ✅ |
| Hỗ trợ ưu tiên | ❌ | ❌ | ✅ | ✅ | ✅ |

## API Rate Limits

| Tier | Requests/phút | Inboxes/ngày | API Keys |
|------|---------------|--------------|----------|
| FREE | 60 | 100 | 1 |
| STARTER | 300 | 1,000 | 3 |
| PROFESSIONAL | 600 | 10,000 | 10 |
| BUSINESS | 1,200 | 50,000 | 25 |
| ENTERPRISE | Unlimited | Unlimited | Unlimited |

## Notes
- `-1` trong config = unlimited
- Actual limits có thể override qua Admin → Packages
- Frontend fetch từ `/billing/tiers` API (dynamic)
