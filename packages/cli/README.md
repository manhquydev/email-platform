# @ephemera/cli

Command-line interface for Ephemera Email Platform - Privacy-first temporary email service.

## Installation

```bash
npm install -g @ephemera/cli
```

## Quick Start

```bash
# Authenticate with your API key
ephemera auth login

# Generate a quick temporary email
ephemera generate

# Create an inbox with custom options
ephemera inbox create --local myemail --expires 60

# Watch for incoming messages
ephemera watch <inbox-id>
```

## Commands

### Authentication

```bash
# Login with API key
ephemera auth login
ephemera auth login --key ep_xxxxx

# Check authentication status
ephemera auth status

# Logout
ephemera auth logout
```

### Inbox Management

```bash
# Create a new inbox
ephemera inbox create
ephemera inbox create --local myemail --expires 60
ephemera inbox create --domain <domain-id>

# List your inboxes
ephemera inbox list
ephemera inbox list --limit 50

# Delete an inbox
ephemera inbox delete <inbox-id>
ephemera inbox delete <inbox-id> --force
```

### Message Management

```bash
# List messages in an inbox
ephemera messages list <inbox-id>
ephemera messages list <inbox-id> --unread
ephemera messages list <inbox-id> --limit 50

# Read a message
ephemera messages read <message-id>
ephemera messages read <message-id> --html
```

### Utilities

```bash
# Quick generate temporary email (outputs just the email address)
ephemera generate
ephemera gen --expires 30

# Watch inbox for new messages (real-time)
ephemera watch <inbox-id>
ephemera watch <inbox-id> --interval 10
```

## Configuration

The CLI stores configuration in:
- **Linux/macOS**: `~/.config/ephemera-cli/config.json`
- **Windows**: `%APPDATA%\ephemera-cli\config.json`

### Custom API URL

```bash
ephemera auth login --base-url https://your-instance.com/v1
```

## Examples

### CI/CD Integration

```bash
#!/bin/bash
# Generate temp email for test account
EMAIL=$(ephemera gen)
echo "Using email: $EMAIL"

# Run your tests
npm test

# Cleanup is automatic (emails expire)
```

### Scripting

```bash
# Create inbox and extract just the ID
INBOX_ID=$(ephemera inbox create --expires 10 | grep "ID:" | awk '{print $2}')

# Wait for email and get message ID
ephemera watch $INBOX_ID --interval 2

# Read latest message
ephemera messages list $INBOX_ID --limit 1
```

### Testing Workflow

```bash
# 1. Create temporary inbox
ephemera inbox create --expires 15

# 2. Use the email in your app signup

# 3. Watch for verification email
ephemera watch <inbox-id>

# 4. Read the verification email
ephemera messages read <message-id>

# 5. Extract code and verify
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `EPHEMERA_API_KEY` | API key (alternative to `auth login`) |
| `EPHEMERA_BASE_URL` | Custom API base URL |

## License

MIT
