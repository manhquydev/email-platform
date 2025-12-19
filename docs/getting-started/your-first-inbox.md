# Your First Inbox

This guide will walk you through creating and using your first disposable inbox with TempMail Pro. You'll learn how to create an inbox, receive emails, and manage your temporary email addresses.

## Prerequisites

- TempMail Pro installed and running ([Quick Start](quick-start.md))
- Logged into the web interface

## Step 1: Access the Dashboard

1. Open your browser and navigate to TempMail Pro
2. Log in with your admin credentials
3. You'll land on the main dashboard showing:
   - Your domains
   - Recent inboxes
   - Quick actions

## Step 2: Create Your First Inbox

There are two ways to create an inbox:

### Method 1: Using the Web UI

1. Click the "Create Inbox" button in the dashboard
2. Select your domain (or use a default domain)
3. Optionally customize the inbox name
4. Click "Create Inbox"

### Method 2: Via API

```bash
# First, get your JWT token
curl -X POST "http://localhost:3001/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "changeme"
  }'

# Save the token response
# {"token":"eyJhbGciOi..."}

# Create an inbox
curl -X POST "http://localhost:3001/inboxes" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "example.com",
    "name": "test-inbox"
  }'
```

## Step 3: View Your Inbox

1. After creation, you'll be redirected to your inbox page
2. Your inbox address will be displayed (e.g., `test-inbox@example.com`)
3. Copy this address - it's your temporary email address!

### Inbox Features

Your inbox page includes:
- **Email Address**: Your temporary email address
- **Copy Address**: Quick copy button
- **Refresh**: Check for new emails manually
- **Messages List**: All received emails
- **Delete**: Remove the inbox (and all emails)

## Step 4: Send Email to Your Inbox

Now let's test receiving emails:

### Using Command Line (Python)

```python
import smtplib
from email.message import EmailMessage

# Configure email
msg = EmailMessage()
msg['From'] = 'sender@example.com'
msg['To'] = 'your-temp-inbox@example.com'
msg['Subject'] = 'Hello from TempMail Pro!'
msg.set_content('This is a test email sent to TempMail Pro.')

# Send via SMTP
with smtplib.SMTP('localhost', 2525) as server:
    # Note: No authentication needed for local testing
    server.send_message(msg)
    print("Email sent successfully!")
```

### Using curl (Raw SMTP)

```bash
# Connect to SMTP server and send email
(
  echo "HELO localhost"
  echo "MAIL FROM:<sender@example.com>"
  echo "RCPT TO:<your-temp-inbox@example.com>"
  echo "DATA"
  echo "Subject: Test via curl"
  echo ""
  echo "This email was sent using curl."
  echo "."
  echo "QUIT"
) | nc localhost 2525
```

### Using Web Form

Use any website form that sends emails (newsletter signup, contact form, etc.) and enter your temporary address.

## Step 5: Check for Incoming Emails

1. **Automatic Refresh**: The web interface automatically checks for new emails
2. **Manual Refresh**: Click the refresh button to check immediately
3. **API Polling**: Use the API to check programmatically

```bash
# Check for messages in your inbox
# First get inbox ID from creation response
curl -X GET "http://localhost:3001/inboxes/YOUR_INBOX_ID/messages" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Step 6: View and Manage Emails

### Email List Features

Each email in your list shows:
- **Sender**: Who sent the email
- **Subject**: Email subject
- **Preview**: First 50 characters of content
- **Time**: When received
- **Attachment Icon**: If email has attachments

### View Email Details

Click any email to view:
- **Complete message body**
- **HTML content** (if applicable)
- **Attachments** (downloadable)
- **Headers** (raw email headers)
- **Time received**

### Handling Attachments

TempMail Pro automatically saves attachments. You can:
- **View** inline images and PDFs
- **Download** any attachment file
- **Preview** common file types

## Step 7: Delete Your Inbox

When you're done with your inbox:

1. Go back to the inbox list
2. Click "Delete" next to your inbox
3. Confirm the deletion

**Important**: Deleting an inbox:
- Permanently removes all emails
- Cannot be undone
- Frees up the address for reuse

## Step 8: Advanced Inbox Management

### Batch Operations

The web interface allows you to:
- **Delete multiple emails** at once
- **Search through all messages**
- **Filter by date or sender**

### API Automation

Programmatically manage inboxes:

```bash
# List all inboxes
curl -X GET "http://localhost:3001/inboxes" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get specific inbox details
curl -X GET "http://localhost:3001/inboxes/YOUR_INBOX_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Delete an inbox
curl -X DELETE "http://localhost:3001/inboxes/YOUR_INBOX_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Public Inboxes

For public use (with CAPTCHA):

```bash
# Create public inbox without authentication
curl -X POST "http://localhost:3001/public/inboxes" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "example.com",
    "captcha": "user-captcha-response"
  }'
```

## Best Practices

1. **Use descriptive names** for your test inboxes
2. **Check regularly** for emails if expecting messages
3. **Delete inboxes when done** to free resources
4. **Use public inboxes** for untrusted forms
5. **Set retention policies** for production use

## Troubleshooting

### Not receiving emails?

**Check SMTP settings**:
- Confirm SMTP server is running: `docker compose logs smtp`
- Verify port 2525 is accessible
- Check firewall settings

**Check inbox status**:
- Inbox created successfully?
- Domain properly configured?
- No error messages in logs?

### Emails not appearing?

**Try manual refresh**:
- Click refresh button in web UI
- Check API directly
- Verify no filtering rules blocking emails

**Clear browser cache**:
- Hard refresh (Ctrl+F5)
- Try incognito mode

## Next Steps

Now that you've mastered basic inbox usage:

- [Add custom domains](../guides/custom-domains.md)
- [Learn about email forwarding](../guides/email-forwarding.md)
- [Explore the full API](../api/)
- [Set up advanced configurations](../guides/using-the-api.md)

Need more help? Check our [FAQ](../faq/) or browse our other guides.