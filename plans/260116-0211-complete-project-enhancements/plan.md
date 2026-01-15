---
title: "Project Enhancement: Collaboration vs Security"
description: "Implementation strategy for Teams, Shared Inboxes, and Outbound Deliverability."
status: pending
priority: P1
effort: 120h
branch: main
tags: [teams, dkim, push, rbac]
created: 2026-01-16
---

# Overview
This plan outlines two strategic paths for evolving the Ephemera platform:
1. **The Collaborative Growth Path**: Prioritizes multi-user utility.
2. **The Security Fortress Path**: Prioritizes platform trust and deliverability.

## Path 1: Collaborative Growth
*Focus: Teams and Shared Inboxes first.*
- **Phase 1**: [Team Infrastructure](./phase-01-teams-infrastructure.md) (RBAC foundation)
- **Phase 2**: [Shared Inbox Logic](./phase-02-shared-inbox-logic.md) (Access & Real-time)
- **Phase 3**: [Outbound Security](./phase-03-outbound-security.md) (DKIM/SPF)
- **Phase 4**: [Push Reliability](./phase-04-push-reliability.md) (Service Worker hardening)

**Pros**: Immediate increase in "stickiness" for business users; enables shared workflows.
**Cons**: Higher risk of deliverability issues if outbound volume scales before DKIM is ready.

## Path 2: Security Fortress
*Focus: Deliverability and Reliability first.*
- **Phase 1**: [Outbound Security](./phase-03-outbound-security.md) (DKIM foundation)
- **Phase 2**: [Push Reliability](./phase-04-push-reliability.md) (Notification trust)
- **Phase 3**: [Team Infrastructure](./phase-01-teams-infrastructure.md) (Collaborative foundation)
- **Phase 4**: [Shared Inbox Logic](./phase-02-shared-inbox-logic.md) (Multi-user features)

**Pros**: Ensures rock-solid delivery from day one; avoids "Spam" folder issues.
**Cons**: Delays core multi-user features that differentiate the platform.

## Recommendation: The Collaborative Growth Path
For **Ephemera**, which is privacy-focused and ephemeral, the **Collaborative Growth** path is recommended.
- **Why**: The value of "disposable teams" (sharing an inbox for a temporary project) is a stronger USP than standard email deliverability.
- **Mitigation**: Implement DKIM for the system's own domains (welcome emails, etc.) early, then roll out custom domain DKIM in Phase 3.

## Trade-offs Summary
| Feature | Growth Path | Fortress Path |
| :--- | :--- | :--- |
| **Market Speed** | High (Features ship fast) | Moderate (Security first) |
| **User Trust** | Building (Utility focus) | High (Foundation focus) |
| **Complexity** | Front-loaded UI/RBAC | Front-loaded Crypto/DNS |

## Unresolved Questions
1. Should `Team` ownership be transferable to an Organization level?
2. Do we need an internal "Mail Transfer Agent" (MTA) or stick with Nodemailer for DKIM?
