# Email Forwarding Guide

Configure email forwarding to automatically route messages from your TempMail Pro inboxes to your personal or business email accounts. This guide covers setup, configuration, and best practices.

## Overview

Email forwarding allows you to:
- Receive TempMail Pro emails in your regular inbox
- Maintain separate identities for different purposes
- Centralize email management
- Set up automated routing rules
- Archive TempMail Pro emails automatically

## Prerequisites

- TempMail Pro instance running
- Access to your destination email account
- SMTP server details for sending emails

## Setup Methods

### Method 1: Server-Side Forwarding (Recommended)

TempMail Pro can forward emails directly from the server.

#### 1. Configure SMTP Settings

Edit your `.env` file:
```env
# SMTP Configuration
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your-email@provider.com
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@yourdomain.com
SMTP_TLS=true
```

#### 2. Set Up Forwarding Rules

Via API:
```bash
curl -X POST "http://localhost:3001/inboxes/1/forwarding" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targetEmail": "your-personal@email.com",
    "enabled": true,
    "includeAttachments": true,
    "filterSubjects": ["invoice", "receipt"],
    "filterFrom": ["billing@company.com"]
  }'
```

#### 3. Enable Forwarding for All Messages

```bash
curl -X POST "http://localhost:3001/inboxes/1/forwarding" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targetEmail": "your-personal@email.com",
    "enabled": true,
    "forwardAll": true
  }'
```

### Method 2: Client-Side Forwarding (Advanced)

Use the TempMail Pro API to create a forwarding script.

#### Python Example

```python
import requests
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

class EmailForwarder:
    def __init__(self, api_base_url, token, smtp_config):
        self.api_base_url = api_base_url
        self.token = token
        self.smtp_config = smtp_config

    def get_unread_messages(self):
        """Get unread messages from all inboxes"""
        response = requests.get(
            f"{self.api_base_url}/messages",
            params={"read": "false"},
            headers={"Authorization": f"Bearer {self.token}"}
        )
        response.raise_for_status()
        return response.json()["data"]

    def forward_email(self, message):
        """Forward an email to target address"""
        msg = MIMEMultipart()
        msg['Subject'] = f"FW: {message['subject']}"
        msg['From'] = message['from']
        msg['To'] = self.smtp_config['target_email']

        # Add original message body
        if message['html']:
            msg.attach(MIMEText(message['html'], 'html'))
        else:
            msg.attach(MIMEText(message['text'], 'plain'))

        # Add attachments
        for attachment in message.get('attachments', []):
            # Download attachment
            response = requests.get(
                f"{self.api_base_url}/attachments/{attachment['id']}/download",
                headers={"Authorization": f"Bearer {self.token}"}
            )

            # Add attachment to message
            part = MIMEBase('application', 'octet-stream')
            part.set_payload(response.content)
            email.encoders.encode_base64(part)
            part.add_header(
                'Content-Disposition',
                f'attachment; filename="{attachment["filename"]}"'
            )
            msg.attach(part)

        # Send email
        with smtplib.SMTP(
            self.smtp_config['host'],
            self.smtp_config['port']
        ) as server:
            if self.smtp_config['tls']:
                server.starttls()
            if self.smtp_config.get('username'):
                server.login(
                    self.smtp_config['username'],
                    self.smtp_config['password']
                )
            server.send_message(msg)

    def process_messages(self):
        """Process and forward all unread messages"""
        messages = self.get_unread_messages()
        for message in messages:
            try:
                self.forward_email(message)
                # Mark as read
                requests.patch(
                    f"{self.api_base_url}/messages/{message['id']}",
                    json={"read": True},
                    headers={"Authorization": f"Bearer {self.token}"}
                )
            except Exception as e:
                print(f"Failed to forward message {message['id']}: {e}")

# Usage
if __name__ == "__main__":
    forwarder = EmailForwarder(
        api_base_url="http://localhost:3001",
        token="YOUR_JWT_TOKEN",
        smtp_config={
            "host": "smtp.gmail.com",
            "port": 587,
            "username": "your-email@gmail.com",
            "password": "your-app-password",
            "tls": True,
            "target_email": "your-personal@email.com"
        }
    )

    forwarder.process_messages()
```

### Method 3: Webhook Forwarding (Future Enhancement)

TempMail Pro will support webhook-based forwarding:

```json
{
  "url": "https://your-forwarding-service.com/hook",
  "secret": "webhook-secret",
  "events": ["message.created"]
}
```

## Configuration Options

### Basic Forwarding

```json
{
  "targetEmail": "destination@email.com",
  "enabled": true,
  "forwardAll": true
}
```

### Filtered Forwarding

```json
{
  "targetEmail": "billing@email.com",
  "enabled": true,
  "filterSubjects": ["invoice", "receipt", "payment"],
  "filterFrom": ["billing@company.com", "payments@service.com"],
  "excludeSubjects": ["newsletter", "spam"],
  "onlyAttachments": true
}
```

### Advanced Routing

```json
{
  "rules": [
    {
      "condition": {
        "subject": ["invoice"],
        "from": ["billing@company.com"]
      },
      "action": {
        "target": "accounting@email.com",
        "format": "forward"
      }
    },
    {
      "condition": {
        "hasAttachments": true
      },
      "action": {
        "target": "archive@email.com",
        "format": "archive"
      }
    }
  ]
}
```

## SMTP Configuration Examples

### Gmail

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_TLS=true
SMTP_FROM=noreply@yourdomain.com
```

### Outlook/Hotmail

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
SMTP_TLS=true
SMTP_FROM=noreply@yourdomain.com
```

### Yahoo Mail

```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-password
SMTP_TLS=true
SMTP_FROM=noreply@yourdomain.com
```

### Custom SMTP Server

```env
SMTP_HOST=mail.yourcompany.com
SMTP_PORT=587
SMTP_USER=your-email@yourcompany.com
SMTP_PASS=your-password
SMTP_TLS=true
SMTP_FROM=noreply@yourdomain.com
```

## Security Considerations

### Authentication

- Use app-specific passwords when available
- Enable 2-factor authentication
- Use OAuth2 for better security

### Data Privacy

- Consider encrypting forwarded emails
- Log forwarding activities for audit
- Set up proper retention policies

### SPF/DKIM Configuration

Ensure your forwarding domain is properly configured:
```
# SPF Record
v=spf1 include:_spf.gmail.com ~all

# DKIM Record (generate per domain)
v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...

# DMARC Record
v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@yourdomain.com
```

## Monitoring and Logging

### Forwarding Logs

```javascript
// Example logging for forwarder
function logForwarding(messageId, target, success, error = null) {
  const logEntry = {
    messageId,
    target,
    timestamp: new Date().toISOString(),
    success,
    error
  };

  // Save to database or file
  console.log('Forwarding Log:', logEntry);

  // Optional: Send to monitoring service
  if (!success) {
    // Alert on failure
    sendAlert(`Failed to forward message ${messageId} to ${target}`, error);
  }
}
```

### Monitoring Metrics

Track these metrics:
- Forwarding success rate
- Average forwarding time
- Failed forwards by target
- Attachment forwarding errors

### Health Checks

Set up periodic checks:
```bash
# Test SMTP connectivity
curl -X POST "http://localhost:3001/smtp/test" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@yourdomain.com",
    "subject": "SMTP Test",
    "body": "This is a test email"
  }'
```

## Troubleshooting

### Common Issues

**Emails Not Forwarding**

1. Check SMTP settings
2. Verify authentication credentials
3. Test SMTP connectivity manually
4. Check forwarding rules configuration

**Forwarding Delays**

1. Check server load
2. Monitor SMTP queue size
3. Review forwarding script scheduling
4. Check network connectivity

**Emails Marked as Spam**

1. Check SPF/DKIM/DMARC configuration
2. Ensure FROM header matches forwarding domain
3. Add proper email headers
4. Monitor blacklists

### Debug Commands

```bash
# Test SMTP connection
telnet smtp.gmail.com 587

# Check SPF alignment
spfquery -m envelope-from@test.com -h yourdomain.com

# Test email delivery
sendmail -v test@example.com <<EOF
Subject: Test Email
From: noreply@yourdomain.com

This is a test email.
EOF

# Check forwarding logs
tail -f /var/log/tempmail/forwarding.log
```

## Best Practices

### Security

1. **Use OAuth2** instead of passwords when possible
2. **Enable TLS** for all SMTP connections
3. **Rotate credentials** regularly
4. **Audit forwarding logs** periodically

### Performance

1. **Batch processing** for multiple messages
2. **Rate limiting** to avoid SMTP server overload
3. **Retry mechanisms** for failed forwards
4. **Queue management** for high volumes

### Reliability

1. **Health checks** for SMTP connectivity
2. **Fallback SMTP servers** for redundancy
3. **Monitoring and alerting** for failures
4. **Regular backups** of forwarding configurations

## Advanced Features

### Conditional Forwarding

Forward based on message content:
```python
def should_forward(message):
    # Forward if contains invoice
    if 'invoice' in message['subject'].lower():
        return True

    # Forward from specific sender
    if message['from'] in ['billing@company.com', 'payments@service.com']:
        return True

    # Forward has attachments over 1MB
    if any(att['sizeBytes'] > 1000000 for att in message.get('attachments', [])):
        return True

    return False
```

### Automated Responses

Send auto-replies for forwarded emails:
```json
{
  "autoReply": {
    "enabled": true,
    "template": "Thank you for your email. This inbox is monitored and we'll respond within 24 hours."
  }
}
```

### Archive Forwarding

Forward to archive service instead of email:
```json
{
  "archive": {
    "enabled": true,
    "service": "s3",
    "bucket": "email-archive",
    "path": "2024/01/inbox-1"
  }
}
```

## Next Steps

- [Learn about custom domains](custom-domains.md)
- [Explore the API documentation](../api/)
- [Set up advanced configurations](../guides/using-the-api.md)
- [Try our SDK tutorials](../tutorials/)

Need more help? Check our [FAQ](../faq/) or browse our other guides.