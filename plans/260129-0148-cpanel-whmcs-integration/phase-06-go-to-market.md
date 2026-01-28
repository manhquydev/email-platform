---
phase: "06"
title: "Go-to-Market Strategy"
status: completed
priority: P1
effort: Ongoing
---

# Phase 06: Go-to-Market Strategy

## Context Links
- [Plan Overview](plan.md)
- [Strategic Analysis](../../reports/brainstorm-260129-0143-enterprise-webmail-strategic-roadmap.md)

## Overview

Chiến lược launch và partner acquisition để đạt 10,000 domains trong 6 tháng đầu.

## Target Market

### Primary Segments
| Segment | Size | Priority | Approach |
|---------|------|----------|----------|
| cPanel Hosting Providers | 50,000+ | P1 | Plugin + WHMCS |
| DirectAdmin Providers | 10,000+ | P2 | Plugin |
| Plesk Providers | 20,000+ | P2 | Extension |
| Managed WordPress Hosts | 5,000+ | P3 | API Integration |

### Ideal Customer Profile (ICP)
- 500-10,000 hosting accounts
- Currently using native cPanel email (limited features)
- Looking for differentiation from competitors
- Pain point: email deliverability issues

## Pricing Strategy

### Provider Pricing (Wholesale)
| Tier | Domains | Price/domain | Discount |
|------|---------|--------------|----------|
| Starter | 1-100 | $1.00 | 0% |
| Growth | 101-500 | $0.80 | 20% |
| Scale | 501-2000 | $0.60 | 40% |
| Enterprise | 2000+ | Custom | 50%+ |

### End-User Pricing (Suggested Retail)
| Plan | Provider Cost | Suggested Retail | Margin |
|------|---------------|------------------|--------|
| Lite | $1/domain | $3-5/domain | 200-400% |
| Pro | $3/domain | $8-12/domain | 166-300% |
| Business | $5/domain | $15-25/domain | 200-400% |

## Launch Timeline

### Week 1-2: Soft Launch
- [ ] Setup provider registration portal
- [ ] Create 5 beta partner accounts
- [ ] Daily standups with beta partners
- [ ] Collect feedback, fix issues

### Week 3-4: Public Beta
- [ ] Announce on WebHostingTalk forum
- [ ] Submit to cPanel Applications Catalog
- [ ] Create ProductHunt launch page
- [ ] Start content marketing

### Month 2: Full Launch
- [ ] Press release
- [ ] Partner webinar
- [ ] Affiliate program launch
- [ ] Case studies from beta partners

### Month 3-6: Scale
- [ ] Hire partner success manager
- [ ] Expand to DirectAdmin/Plesk
- [ ] Enterprise sales outreach
- [ ] Conference presence (HostingCon, CloudFest)

## Marketing Channels

### 1. Community Marketing (Free)
- WebHostingTalk forum presence
- r/webhosting, r/sysadmin Reddit
- cPanel/WHM Facebook groups
- Discord hosting communities

### 2. Content Marketing
- Blog posts: "Why native cPanel email is killing your customers"
- Comparison guides: Ephemera vs Zoho vs Gmail
- Video tutorials on YouTube
- SEO-optimized landing pages

### 3. Partner Marketing
- Co-branded materials for partners
- Partner success stories
- Referral bonuses ($50 per qualified partner)

### 4. Paid Advertising (Month 3+)
- Google Ads: "email hosting for resellers"
- LinkedIn: Hosting company CTOs
- Retargeting for portal visitors

## Sales Process

### Inbound Flow
```
Landing Page → Free Trial → Onboarding Call → Paid Conversion
              (14 days)    (Week 1)           (Week 2-3)
```

### Partner Onboarding Checklist
1. [ ] Account creation + API key
2. [ ] Plugin/module installation
3. [ ] Test tenant creation
4. [ ] DNS template setup
5. [ ] First 10 domains provisioned
6. [ ] Billing integration verified
7. [ ] Support handoff

## Success Metrics

### Month 1
- [ ] 5 active partners
- [ ] 100 domains provisioned
- [ ] $100 MRR

### Month 3
- [ ] 20 active partners
- [ ] 1,000 domains
- [ ] $1,000 MRR

### Month 6
- [ ] 50 active partners
- [ ] 10,000 domains
- [ ] $10,000 MRR

## Competitive Positioning

### vs Native cPanel Email
| Feature | cPanel Native | Ephemera |
|---------|---------------|----------|
| Deliverability | Poor (shared IP) | Excellent (dedicated) |
| Webmail | Roundcube/Horde | Modern SPA |
| CalDAV/CardDAV | ❌ | ✅ |
| LDAP/SSO | ❌ | ✅ |
| Spam filtering | Basic | Advanced AI |

### vs Zoho/Google Workspace
| Feature | Zoho/Google | Ephemera |
|---------|-------------|----------|
| White-label | ❌ | ✅ |
| Self-hosted option | ❌ | ✅ |
| Reseller margin | 10-20% | 200-400% |
| cPanel integration | Limited | Native |

## Partner Support

### Tier 1: Self-Service
- Documentation portal
- Video tutorials
- Community forum
- Knowledge base

### Tier 2: Partner Success
- Dedicated Slack channel
- Monthly check-in calls
- Feature request priority

### Tier 3: Enterprise
- Dedicated account manager
- Custom SLA
- On-site training

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Slow partner adoption | Aggressive free trial, guaranteed ROI |
| Technical issues at scale | Extensive load testing, gradual rollout |
| Competitor response | Focus on niche, build switching costs |
| Churn | Long-term contracts, sticky features |

## Budget Allocation (Month 1-6)

| Category | Budget | Allocation |
|----------|--------|------------|
| Development | $0 | Internal |
| Marketing | $2,000 | Content, ads |
| Sales | $1,000 | Outreach tools |
| Support | $500 | Helpdesk software |
| **Total** | **$3,500** | |

## Action Items

### Immediate (This Week)
1. [ ] Create provider registration page
2. [ ] Setup Stripe billing for providers
3. [ ] Write WebHostingTalk announcement post
4. [ ] Identify 10 potential beta partners

### Short-term (Month 1)
1. [ ] Launch beta program
2. [ ] Create partner onboarding materials
3. [ ] Setup partner support Slack
4. [ ] Submit cPanel marketplace application

### Medium-term (Month 2-3)
1. [ ] Launch affiliate program
2. [ ] Host partner webinar
3. [ ] Publish 3 case studies
4. [ ] Attend HostingCon (if timing works)

---

## Summary

Plan này cung cấp roadmap hoàn chỉnh từ **API foundation** → **Panel plugins** → **WHMCS module** → **Testing** → **Go-to-market**.

Với 8 tuần focused execution, Ephemera có thể:
- ✅ Launch với cPanel + WHMCS integration
- ✅ Onboard 5+ beta partners
- ✅ Provision 100+ domains
- ✅ Generate first MRR

**Next Step**: Bắt đầu Phase 01 - Hosting Provider API Foundation
