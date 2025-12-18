# Multi-Region Deployment Architecture

This document describes the multi-region architecture for TempMail Pro.

## Architecture Overview

```
                                   ┌─────────────────┐
                                   │   Global DNS    │
                                   │  (Route53/CF)   │
                                   └────────┬────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
           ┌────────▼────────┐     ┌────────▼────────┐     ┌────────▼────────┐
           │   Region: US    │     │  Region: EU     │     │  Region: Asia   │
           │   (us-east-1)   │     │  (eu-west-1)    │     │  (ap-northeast) │
           └────────┬────────┘     └────────┬────────┘     └────────┬────────┘
                    │                       │                       │
           ┌────────▼────────┐     ┌────────▼────────┐     ┌────────▼────────┐
           │   K8s Cluster   │     │   K8s Cluster   │     │   K8s Cluster   │
           ├─────────────────┤     ├─────────────────┤     ├─────────────────┤
           │ • API (x3)      │     │ • API (x3)      │     │ • API (x3)      │
           │ • Web (x2)      │     │ • Web (x2)      │     │ • Web (x2)      │
           │ • Redis         │     │ • Redis         │     │ • Redis         │
           │ • Dovecot       │     │ • Dovecot       │     │ • Dovecot       │
           └────────┬────────┘     └────────┬────────┘     └────────┬────────┘
                    │                       │                       │
           ┌────────▼────────┐     ┌────────▼────────┐     ┌────────▼────────┐
           │   PostgreSQL    │     │   PostgreSQL    │     │   PostgreSQL    │
           │   (Primary)     │◄────│    (Replica)    │────►│    (Replica)    │
           └─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Components

### DNS Layer
- **Route53** / **Cloudflare**: GeoDNS for latency-based routing
- Health checks for automatic failover
- TTL: 60 seconds for fast failover

### Kubernetes Clusters
Each region runs identical K8s clusters with:
- **API**: 3+ replicas with HPA
- **Web**: 2+ replicas with HPA
- **Redis**: Single replica (session cache)
- **Dovecot**: IMAP server with shared Maildir

### Database Layer
- **Primary (US)**: PostgreSQL with write operations
- **Replicas (EU, Asia)**: Read-only replicas for local reads
- Cross-region replication lag: < 1 second

## Deployment Strategy

### Option 1: Active-Passive
```
US (Primary) ←── Writes
     │
     └── Async Replication ──► EU (Read-Only)
                              │
                              └──► Asia (Read-Only)
```

### Option 2: Active-Active (Future)
- Requires conflict resolution strategy
- Consider CockroachDB or Spanner for multi-master

## Environment Variables

### Per-Region Configuration
```yaml
# US Region (Primary)
DATABASE_URL: postgresql://...@us-primary:5432/email
DATABASE_READ_URL: postgresql://...@us-primary:5432/email

# EU Region
DATABASE_URL: postgresql://...@us-primary:5432/email  # Write to primary
DATABASE_READ_URL: postgresql://...@eu-replica:5432/email  # Read local

# Asia Region
DATABASE_URL: postgresql://...@us-primary:5432/email  # Write to primary
DATABASE_READ_URL: postgresql://...@asia-replica:5432/email  # Read local
```

## Managed Services Recommendations

### AWS
- **EKS**: Kubernetes
- **RDS PostgreSQL**: Multi-AZ + Read Replicas
- **ElastiCache**: Redis
- **S3**: Attachment storage
- **Route53**: GeoDNS

### GCP
- **GKE**: Kubernetes
- **Cloud SQL**: PostgreSQL with replicas
- **Memorystore**: Redis
- **Cloud Storage**: Attachments
- **Cloud DNS**: GeoDNS

### Azure
- **AKS**: Kubernetes
- **Azure Database for PostgreSQL**: Flexible Server
- **Azure Cache for Redis**
- **Blob Storage**: Attachments
- **Traffic Manager**: GeoDNS

## Deployment Commands

```bash
# Deploy to all regions
for region in us-east-1 eu-west-1 ap-northeast-1; do
  kubectl config use-context $region
  kubectl apply -k k8s/
done

# Verify deployments
kubectl get pods -n tempmail
kubectl get hpa -n tempmail
kubectl get ingress -n tempmail
```

## Monitoring

### Key Metrics
- Request latency by region
- Database replication lag
- Error rates per region
- Pod health and scaling events

### Tools
- **Prometheus + Grafana**: Metrics
- **Jaeger**: Distributed tracing
- **Loki**: Log aggregation
