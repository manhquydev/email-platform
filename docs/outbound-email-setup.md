# Outbound Email Provider Setup

## Overview

This document provides comprehensive procedures for configuring outbound email capabilities in TempMail Pro. Phase 1 includes self-hosted SMTP through Postfix with support for external providers such as SendGrid, Mailgun, and SES.

## Outbound Email Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Outbound Email Flow                        │
│                                                                 │
│  ┌─────────┐     ┌──────────────┐     ┌────────────┐          │
│  │   API    │───▶│    Redis     │───▶│  Postfix   │          │
│  │ (WebApp)│     │   (Queue)    │     │ (SMTP)     │          │
│  └─────────┘     └──────────────┘     └────────────┘          │
│         │              │                   │                   │
│         ▼              ▼                   ▼                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                  External Providers                       │ │
│  │ • SendGrid (Recommended)                                   │ │
│  │ • Mailgun (Enterprise)                                     │ │
│  │ • AWS SES (Cloud)                                          │ │
│  │ • Custom SMTP (Self-hosted)                                │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Configuration Options

### 1. Self-Hosted (Postfix)

Default configuration for internal email delivery:

```yaml
# docker-compose.prod.yml
services:
  api:
    environment:
      OUTBOUND_ENABLED: "true"
      OUTBOUND_SMTP_HOST: "postfix"
      OUTBOUND_SMTP_PORT: "587"
      OUTBOUND_SMTP_SECURE: "false"
      OUTBOUND_SMTP_USER: ""
      OUTBOUND_SMTP_PASS: ""
```

### 2. External Providers

Choose one of the following providers based on your needs.

## SendGrid Setup

### 1. Create SendGrid Account

1. **Sign up** at [SendGrid](https://sendgrid.com)
2. **Verify domain** ownership
3. **Generate API key** with "Mail Send" permissions

### 2. Environment Configuration

```bash
# .env file
# SendGrid Configuration
OUTBOUND_ENABLED=true
OUTBOUND_SMTP_HOST=smtp.sendgrid.net
OUTBOUND_SMTP_PORT=587
OUTBOUND_SMTP_SECURE=false
OUTBOUND_SMTP_USER=apikey
OUTBOUND_SMTP_PASS=YOUR_SENDGRID_API_KEY

# Email Configuration
MAIL_DOMAIN=yourdomain.com
MAIL_FROM_NAME="TempMail Pro"
MAIL_FROM_ADDRESS=noreply@yourdomain.com
REQUIRE_EMAIL_VERIFICATION=true
```

### 3. Verify SPF/DKIM/DMARC

Follow the [SMTP_SETUP.md](./SMTP_SETUP.md) documentation to configure:
- SPF record for SendGrid IP addresses
- DKIM signing (SendGrid provides DKIM automatically)
- DMARC policy

## Mailgun Setup

### 1. Create Mailgun Account

1. **Sign up** at [Mailgun](https://mailgun.com)
2. **Add domain** and verify DNS
3. **Get API credentials** from dashboard

### 2. Environment Configuration

```bash
# .env file
# Mailgun Configuration
OUTBOUND_ENABLED=true
OUTBOUND_SMTP_HOST=smtp.mailgun.org
OUTBOUND_SMTP_PORT=587
OUTBOUND_SMTP_SECURE=false
OUTBOUND_SMTP_USER=your-username
OUTBOUND_SMTP_PASS=your-password

# Email Configuration
MAIL_DOMAIN=yourdomain.com
MAIL_FROM_NAME="TempMail Pro"
MAIL_FROM_ADDRESS=noreply@yourdomain.com
REQUIRE_EMAIL_VERIFICATION=true
```

### 3. Validate Domain

```bash
# Mailgun provides validation
# Check dashboard for domain status
curl -s --user 'api:YOUR_API_KEY' \
    https://api.mailgun.net/v3/domains/YOUR_DOMAIN_NAME
```

## AWS SES Setup

### 1. Configure AWS SES

1. **Enable SES** in AWS Console
2. **Verify domain** and email addresses
3. **Create SMTP credentials** in IAM
4. **Request production access** if needed

### 2. Environment Configuration

```bash
# .env file
# AWS SES Configuration
OUTBOUND_ENABLED=true
OUTBOUND_SMTP_HOST=email-smtp.us-east-1.amazonaws.com
OUTBOUND_SMTP_PORT=587
OUTBOUND_SMTP_SECURE=false
OUTBOUND_SMTP_USER=YOUR_SMTP_USERNAME
OUTBOUND_SMTP_PASS=YOUR_SMTP_PASSWORD

# Email Configuration
MAIL_DOMAIN=yourdomain.com
MAIL_FROM_NAME="TempMail Pro"
MAIL_FROM_ADDRESS=noreply@yourdomain.com
REQUIRE_EMAIL_VERIFICATION=true
```

### 3. SES Configuration Script

```bash
#!/bin/bash
# scripts/setup-ses.sh

# Install AWS CLI
apk add --no-cache aws-cli

# Verify domain
aws ses verify-domain-identity --domain yourdomain.com

# Verify email
aws ses verify-email-identity --email noreply@yourdomain.com

# Get identity verification status
aws ses list-identities --identity-type DOMAIN
```

## Outbound Email API

### 1. Send Email Endpoint

```bash
# Send outbound email
curl -X POST "http://localhost:3001/messages/outbound" \
    -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "from": "noreply@yourdomain.com",
        "to": "recipient@example.com",
        "subject": "Hello from TempMail Pro",
        "text": "This is a test email",
        "html": "<p>This is a <b>test email</b></p>"
    }'
```

### 2. Response Format

```json
{
    "id": "msg_123456789",
    "status": "queued",
    "messageId": "<20241218020000.1234567890@mail.yourdomain.com>",
    "queuedAt": "2024-12-18T02:00:00Z"
}
```

### 3. Status Tracking

```bash
# Get email status
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
    "http://localhost:3001/messages/msg_123456789/status"

# Response
{
    "id": "msg_123456789",
    "status": "delivered",
    "deliveredAt": "2024-12-18T02:00:15Z",
    "recipient": "recipient@example.com",
    "messageId": "<20241218020000.1234567890@mail.yourdomain.com>"
}
```

## Email Templates

### 1. Verification Email

```html
<!-- templates/verification.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Email Verification</title>
</head>
<body>
    <h2>Welcome to TempMail Pro!</h2>
    <p>Please verify your email address:</p>
    <p><a href="{{verificationUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Verify Email</a></p>
    <p>If you didn't create an account, you can safely ignore this email.</p>
</body>
</html>
```

### 2. Welcome Email

```html
<!-- templates/welcome.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Welcome to TempMail Pro</title>
</head>
<body>
    <h2>Welcome aboard!</h2>
    <p>Thank you for joining TempMail Pro. Here are some quick links to get you started:</p>
    <ul>
        <li><a href="https://app.yourdomain.com">Dashboard</a></li>
        <li><a href="https://app.yourdomain.com/inbox">Check your inbox</a></li>
        <li><a href="https://docs.yourdomain.com">Documentation</a></li>
    </ul>
</body>
</html>
```

## Testing Outbound Email

### 1. Test Sending

```bash
# Test email script
#!/bin/bash
TOKEN="your_admin_token"
RECIPIENT="test@example.com"

curl -X POST "http://localhost:3001/messages/outbound" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"from\": \"noreply@yourdomain.com\",
        \"to\": \"$RECIPIENT\",
        \"subject\": \"Test Email from TempMail Pro\",
        \"text\": \"This is a test email from TempMail Pro.\",
        \"html\": \"<p>This is a <strong>test email</strong> from TempMail Pro.</p>\"
    }"
```

### 2. Check Logs

```bash
# Check API logs
docker logs api | grep -i "outbound"

# Check Postfix logs
docker logs postfix | grep -i "sent"

# Check provider logs (if external)
docker logs api | grep -i "provider"
```

### 3. Verify Delivery

```bash
# Check message status
curl -H "Authorization: Bearer $TOKEN" \
    "http://localhost:3001/messages/last/status"

# Check email headers in recipient inbox
# Look for:
# - Delivered-To
# - Received-SPF
# - Authentication-Results
# - X-Mailer: TempMail Pro
```

## Monitoring & Alerting

### 1. Metrics

Configure Prometheus to track:

```yaml
# Email delivery metrics
- metric_name: email_outbound_total
  type: counter
  description: "Total outbound emails sent"

- metric_name: email_outbound_duration_seconds
  type: histogram
  description: "Time to send outbound email"

- metric_name: email_outbound_failed_total
  type: counter
  description: "Failed outbound emails"
```

### 2. Alerting Rules

```yaml
# High bounce rate
- alert: HighBounceRate
  expr: rate(email_bounce_total[1h]) > 5
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High bounce rate detected"
    description: "Bounce rate is {{ $value }} per hour"

# Send failures
- alert: SendFailures
  expr: rate(email_outbound_failed_total[1h]) > 10
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Email send failures"
    description: "{{ $value }} send failures in the last hour"

# Slow delivery
- alert: SlowDelivery
  expr: histogram_quantile(0.95, email_outbound_duration_seconds_bucket) > 30
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "Slow email delivery"
    description: "95th percentile delivery time is {{ $value }} seconds"
```

### 3. Log Aggregation

```bash
# Aggregate email delivery logs
docker logs api | grep "outbound.*sent" | tail -10

# Track provider errors
docker logs api | grep "provider.*error" | wc -l

# Monitor queue size
docker-compose exec redis redis-cli llen email:queue
```

## Troubleshooting

### 1. Common Issues

#### Emails Not Sending

```bash
# Check if outbound is enabled
docker-compose exec api sh -c "echo \$OUTBOUND_ENABLED"

# Check API logs for errors
docker logs api | grep -i "error.*outbound"

# Check Redis queue
docker-compose exec redis redis-cli llen email:queue
```

#### Authentication Errors

```bash
# Check SMTP credentials
echo "Testing SMTP connection..."
docker-compose exec api python3 -c "
import smtplib
try:
    smtp = smtplib.SMTP('${OUTBOUND_SMTP_HOST}', ${OUTBOUND_SMTP_PORT})
    smtp.login('${OUTBOUND_SMTP_USER}', '${OUTBOUND_SMTP_PASS}')
    print('Authentication successful')
except Exception as e:
    print(f'Error: {e}')
"
```

#### Provider-Specific Issues

##### SendGrid
```bash
# Check SendGrid API key
curl -s --user "apikey:YOUR_API_KEY" \
    https://api.sendgrid.com/v3/mail/send \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"to": ["test@example.com"], "from": "noreply@yourdomain.com", "subject": "Test", "text": "Test"}'
```

##### AWS SES
```bash
# Check SES status
aws ses get-send-quota

# Check domain verification
aws ses list-identities --identity-type DOMAIN
```

### 2. Performance Issues

#### Slow Sending

```bash
# Check Redis latency
docker-compose exec redis redis-cli --latency

# Check API performance
docker stats api

# Optimize queue processing
# Increase worker count or optimize SMTP client pool
```

#### High Memory Usage

```bash
# Check memory usage
docker stats postfix

# Adjust Postfix limits
echo "message_size_limit = 25600000" >> /etc/postfix/main.conf
echo "mailbox_size_limit = 0" >> /etc/postfix/main.conf
```

### 3. Testing Procedures

#### End-to-End Test

```bash
#!/bin/bash
# scripts/test-outbound.sh

# Test parameters
RECIPIENT="test@example.com"
API_URL="http://localhost:3001"
TOKEN="your_admin_token"

echo "Testing outbound email..."

# Send test email
RESPONSE=$(curl -s -X POST "$API_URL/messages/outbound" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"from\": \"noreply@yourdomain.com\",
        \"to\": \"$RECIPIENT\",
        \"subject\": \"Outbound Test - $(date)\",
        \"text\": \"This is a test email sent from TempMail Pro.\"
    }")

# Extract message ID
MESSAGE_ID=$(echo $RESPONSE | jq -r '.id')
echo "Message ID: $MESSAGE_ID"

# Wait for delivery
sleep 5

# Check status
STATUS=$(curl -s -H "Authorization: Bearer $TOKEN" \
    "$API_URL/messages/$MESSAGE_ID/status" | jq -r '.status')

echo "Delivery status: $STATUS"
```

## Security Considerations

### 1. Rate Limiting

```bash
# Configure rate limiting in API
# services/api/src/config.ts
rateLimits: {
  outbound: {
    max: 100,        // Max emails per minute
    duration: 60000, // 1 minute
    skipOnSuccess: false
  }
}
```

### 2. SPF/DKIM/DMARC

- **Always** configure SPF for your sending domain
- **DKIM** signing improves deliverability
- **DMARC** policy prevents email spoofing

### 3. Monitoring Reputations

```bash
# Check email reputation
- Monitor bounce rates
- Track spam complaints
- Maintain good sender scores
- Use dedicated IP for bulk sending
```

## Migration Guide

### From Self-Hosted to Provider

1. **Update environment**:
```bash
# Change provider settings
OUTBOUND_SMTP_HOST=smtp.sendgrid.net
OUTBOUND_SMTP_USER=apikey
OUTBOUND_SMTP_PASS=your-api-key
```

2. **Test with provider**:
```bash
# Test sending with new provider
./scripts/test-outbound.sh
```

3. **Switch production**:
```bash
# Restart services
docker-compose restart api
```

### Between Providers

1. **Test new provider** in staging environment
2. **Update credentials** in production
3. **Monitor** for delivery issues
4. **Rollback** if needed

## Contact Information

For outbound email issues:
- **Support Email**: support@tempmail.com
- **Slack Channel**: #email-ops
- **Provider Support**: SendGrid/Mailgun/SES support channels
- **On-call Engineer**: 24/7 rotation