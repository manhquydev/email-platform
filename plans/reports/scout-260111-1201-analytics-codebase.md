# Analytics Functionality Codebase Scout Report

**Date:** 2026-01-11
**Project:** Ephemera Email Platform
**Status:** Completed

## 1. Relevant Files and Folders

### Frontend (services/web/src)

| File Path | Description |
|-----------|-------------|
| `pages/admin/AnalyticsPage.tsx` | Specialized page for tracking public inbox viewer activity. Includes session tracking, top inboxes, and activity logs. |
| `components/admin/AdminDashboard.tsx` | Main admin dashboard featuring multiple `recharts` visualizations: activity trends, multi-dimensional analysis, and system health. |
| `components/admin/AdminSystem.tsx` | Monitoring dashboard for server resources (CPU/Memory usage) using `recharts` AreaCharts. |
| `pages/Admin.tsx` | Main admin routing entry point that coordinates access to dashboard and analytics pages. |
| `main.tsx` | Entry point where Microsoft Clarity analytics is initialized. |

### Backend (services/api/src)

| File Path | Description |
|-----------|-------------|
| `routes/admin/analytics.ts` | API endpoints for public viewer analytics, session data, and CSV export. Uses raw SQL queries on `AuditLog` for performance. |
| `routes/admin/stats.ts` | Core statistics endpoints: general counts, week-over-week trends, and timeseries data for charts. |
| `routes/admin/system.ts` | Endpoint for real-time system resource metrics (CPU, Memory, Disk) using `systeminformation` library. |
| `routes/api-usage.ts` | Developer-facing analytics for API key usage, rate limit status, and webhook delivery statistics. |
| `server.ts` | Integration of `prom-client` for Prometheus metrics (HTTP request duration, default process metrics). |

## 2. Current Analytics Capabilities

- **Admin Dashboard**: Real-time overview of users, domains, inboxes, and message volume.
- **Activity Tracking**: Week-over-week trend comparisons for growth metrics.
- **Public Viewer Analytics**: Detailed tracking of public inbox searches, message views, and attachment downloads.
- **Session Analysis**: Identifying unique IPs and sessions accessing the platform.
- **System Monitoring**: Live tracking of CPU load, memory usage, and disk availability.
- **API Usage**: User-specific analytics for API request volume and webhook performance.
- **Data Export**: CSV export functionality for audit logs and analytics data.

## 3. Infrastructure and Libraries

- **Charting**: `recharts` is the primary library for data visualization in the React frontend.
- **Client-side Tracking**: Microsoft Clarity is used for session recording and heatmaps.
- **Server Metrics**: `prom-client` exposes a `/metrics` endpoint in Prometheus format.
- **Audit Logging**: A robust `AuditLog` table in PostgreSQL serves as the primary data source for activity-based analytics.
- **System Info**: `systeminformation` Node.js package is used to fetch hardware-level metrics.

## 4. Unresolved Questions / Observations

- **Grafana Integration**: While the README mentions a Grafana demo, the codebase mainly implements custom dashboards via `recharts`. The Prometheus metrics are exposed but the repository doesn't contain Grafana dashboard definitions.
- **Privacy**: Public viewer tracking logs IP addresses and User Agents into the `AuditLog`.
- **Scaling**: Many analytics queries use raw SQL `$queryRaw` on the `AuditLog` table, which may need indexing or aggregation tables as the volume grows.
