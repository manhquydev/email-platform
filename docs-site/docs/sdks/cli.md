---
sidebar_position: 7
---

# CLI

Official command-line interface for Ephemera.

## Installation

```bash
npm install -g @ephemera/cli
```

## Configuration

```bash
ephemera config set api-key YOUR_API_KEY
```

## Commands

### Inbox Management

```bash
# Create inbox
ephemera inbox create

# List inboxes
ephemera inbox list

# Delete inbox
ephemera inbox delete inb_abc123
```

### Messages

```bash
# List messages
ephemera messages list inb_abc123

# Wait for email
ephemera messages wait inb_abc123 --subject "Verify" --timeout 60

# Extract code from last message
ephemera messages extract inb_abc123
```

### Domains

```bash
# List domains
ephemera domains list

# Add domain
ephemera domains add mail.example.com
```

## Options

| Flag | Description |
|------|-------------|
| `--api-key` | Override configured API key |
| `--json` | Output as JSON |
| `--quiet` | Minimal output |
| `--verbose` | Debug output |

## Examples

```bash
# Full workflow
INBOX=$(ephemera inbox create --json | jq -r '.id')
ephemera messages wait $INBOX --subject "Verify" --timeout 60
CODE=$(ephemera messages extract $INBOX)
echo "OTP: $CODE"
ephemera inbox delete $INBOX
```
