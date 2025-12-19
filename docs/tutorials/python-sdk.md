# Python SDK Tutorial

Learn how to use the TempMail Pro Python SDK to integrate TempMail Pro into your Python applications. This tutorial covers installation, authentication, and common use cases.

## Prerequisites

- Python 3.8+ installed
- pip package manager
- TempMail Pro instance running
- JWT token for authentication

## Installation

### Install the SDK

```bash
pip install tempmailpro-sdk
# or for development
pip install git+https://github.com/tempmailpro/python-sdk.git
```

### Install Dependencies

```bash
pip install requests aiohttp python-dotenv
```

## Basic Setup

### Initialize the Client

```python
from tempmailpro import TempMailClient

# Create client instance
client = TempMailClient(
    base_url='http://localhost:3001',
    email='admin@example.com',
    password='changeme'
)

# Or use environment variables
import os
from dotenv import load_dotenv

load_dotenv()

client = TempMailClient(
    base_url=os.getenv('TEMPMAIL_API_URL', 'http://localhost:3001'),
    email=os.getenv('TEMPMAIL_EMAIL'),
    password=os.getenv('TEMPMAIL_PASSWORD')
)
```

### Basic Usage

```python
import asyncio
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def main():
    try:
        # Login
        await client.login()
        logger.info("Logged in successfully!")

        # Use the client
        domains = await client.domains.list()
        logger.info(f"Found {len(domains)} domains")

    except Exception as error:
        logger.error(f"Error: {error}")

if __name__ == "__main__":
    asyncio.run(main())
```

## Authentication

### Login

```python
import asyncio

async def login():
    client = TempMailClient(
        base_url='http://localhost:3001',
        email='admin@example.com',
        password='changeme'
    )

    try:
        await client.login()
        print(f"Token: {client.token}")
        return True
    except Exception as error:
        print(f"Login failed: {error}")
        return False

# Run the async function
asyncio.run(login())
```

### Using Custom Tokens

```python
client = TempMailClient(
    base_url='http://localhost:3001',
    token='your-jwt-token-here'
)

# Client is already authenticated
```

### Token Management

```python
import jwt
import os
from cryptography.fernet import Fernet

class SecureTokenManager:
    def __init__(self):
        self.key = Fernet.generate_key()
        self.cipher = Fernet(self.key)
        self.token_file = os.path.expanduser('~/.tempmail_token')

    def encrypt_token(self, token):
        return self.cipher.encrypt(token.encode())

    def decrypt_token(self, encrypted_token):
        return self.cipher.decrypt(encrypted_token).decode()

    def save_token(self, token):
        encrypted = self.encrypt_token(token)
        with open(self.token_file, 'wb') as f:
            f.write(encrypted)

    def load_token(self):
        if os.path.exists(self.token_file):
            with open(self.token_file, 'rb') as f:
                encrypted = f.read()
                return self.decrypt_token(encrypted)
        return None

async def secure_login():
    manager = SecureTokenManager()
    client = TempMailClient(base_url='http://localhost:3001')

    # Try to get existing token
    token = manager.load_token()
    if token:
        client.set_token(token)
    else:
        # Login and store token
        await client.login()
        manager.save_token(client.token)

    return client
```

## Domain Management

### List Domains

```python
async def list_domains():
    client = await secure_login()

    result = await client.domains.list(
        page=1,
        limit=10,
        status='verified'
    )

    print(f"Total domains: {result.pagination.total}")
    for domain in result.data:
        print(f"- {domain.domain} ({domain.status})")

    return result.data
```

### Create Domain

```python
async def create_domain(domain_name, description=''):
    client = await secure_login()

    domain = await client.domains.create(
        domain=domain_name,
        description=description,
        auto_create_inboxes=False
    )

    print(f"Created domain: {domain.domain}")
    return domain
```

### Verify Domain

```python
async def verify_domain(domain_id):
    client = await secure_login()

    verification = await client.domains.verify(domain_id, {
        'spf_record': 'v=spf1 mx include:_spf.tempmailpro.com ~all',
        'dkim_record': 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...',
        'dmarc_record': 'v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@yourdomain.com'
    })

    print(f"Verification status: {verification.status}")
    return verification
```

## Inbox Management

### Create Inbox

```python
async def create_inbox(domain_name, inbox_name=None):
    client = await secure_login()

    inbox = await client.inboxes.create(
        domain=domain_name,
        name=inbox_name,
        description='Test inbox'
    )

    print(f"Created inbox: {inbox.email}")
    return inbox
```

### List Inboxes

```python
async def list_inboxes(domain=None):
    client = await secure_login()

    options = {
        'page': 1,
        'limit': 20
    }

    if domain:
        options['domain'] = domain

    result = await client.inboxes.list(**options)

    print(f"Found {result.pagination.total} inboxes")
    for inbox in result.data:
        print(f"- {inbox.email} ({inbox.message_count} messages)")

    return result.data
```

### Delete Inbox

```python
async def delete_inbox(inbox_id):
    client = await secure_login()

    await client.inboxes.delete(inbox_id)
    print(f"Deleted inbox {inbox_id}")
```

## Message Operations

### Get Messages

```python
async def get_messages(inbox_id, **options):
    client = await secure_login()

    default_options = {
        'limit': 50,
        'sort': 'created_at',
        'order': 'desc'
    }

    search_options = {**default_options, **options}

    result = await client.messages.list(inbox_id, **search_options)

    print(f"Found {result.pagination.total} messages")
    for message in result.data:
        print(f"- {message.subject} from {message.from}")

    return result.data
```

### Search Messages

```python
async def search_messages(query, **filters):
    client = await secure_login()

    result = await client.messages.search(
        query,
        page=1,
        limit=20,
        **filters
    )

    print(f"Search results for '{query}': {result.pagination.total} messages")
    return result.data
```

### Get Message Details

```python
async def get_message_details(message_id):
    client = await secure_login()

    message = await client.messages.get(message_id)

    print("Message details:")
    print(f"From: {message.from}")
    print(f"Subject: {message.subject}")
    print(f"Date: {message.created_at}")
    print(f"Attachments: {len(message.attachments or [])}")

    if message.text:
        preview = message.text[:100] + '...' if len(message.text) > 100 else message.text
        print(f"Text preview: {preview}")

    return message
```

### Download Attachment

```python
import os

async def download_attachment(attachment_id, filename=None):
    client = await secure_login()

    attachment = await client.messages.download_attachment(attachment_id)

    # Save to file
    output_path = filename or f"attachment-{attachment_id}"

    with open(output_path, 'wb') as f:
        f.write(attachment)

    print(f"Downloaded attachment to {output_path}")
    return output_path
```

## Advanced Usage

### Pagination Helper

```python
async def get_all_pages(endpoint, **params):
    client = await secure_login()
    all_data = []
    page = 1
    has_more = True

    while has_more:
        result = await endpoint(
            page=page,
            limit=100,
            **params
        )

        all_data.extend(result.data)

        has_more = page < result.pagination.total_pages
        page += 1

    return all_data

# Usage: Get all messages
async def get_all_messages(inbox_id):
    client = await secure_login()

    all_messages = await get_all_pages(
        lambda **kwargs: client.messages.list(inbox_id, **kwargs)
    )

    print(f"Total messages: {len(all_messages)}")
    return all_messages
```

### Rate Limiting

```python
import asyncio
from functools import wraps

def rate_limit(calls_per_second=1):
    def decorator(func):
        last_call_time = 0

        @wraps(func)
        async def wrapper(*args, **kwargs):
            nonlocal last_call_time
            now = asyncio.get_event_loop().time()
            time_since_last_call = now - last_call_time

            if time_since_last_call < 1.0 / calls_per_second:
                await asyncio.sleep(1.0 / calls_per_second - time_since_last_call)

            last_call_time = asyncio.get_event_loop().time()
            return await func(*args, **kwargs)

        return wrapper
    return decorator

# Usage
@rate_limit(calls_per_second=5)
async def limited_api_call(*args, **kwargs):
    client = await secure_login()
    return await client.domains.list(*args, **kwargs)
```

### Event Handling

```python
import asyncio
from dataclasses import dataclass

@dataclass
class MessageEvent:
    inbox_id: str
    message: dict

class TempMailMonitor:
    def __init__(self, client):
        self.client = client
        self.running = False

    async def start_monitoring(self, check_interval=30):
        self.running = True
        print("📧 Starting inbox monitoring...")

        while self.running:
            try:
                await self.check_messages()
                await asyncio.sleep(check_interval)
            except Exception as error:
                print(f"Monitoring error: {error}")
                await asyncio.sleep(5)

    async def check_messages(self):
        try:
            domains = await self.client.domains.list()

            for domain in domains.data:
                inboxes = await self.client.inboxes.list(
                    domain=domain.domain,
                    limit=50
                )

                for inbox in inboxes.data:
                    messages = await self.client.messages.list(
                        inbox.id,
                        limit=1,
                        sort='created_at',
                        order='desc'
                    )

                    # Process new messages
                    for message in messages.data:
                        await self.process_message(message, inbox)

        except Exception as error:
            print(f"Error checking messages: {error}")

    async def process_message(self, message, inbox):
        print(f"📨 New message: {message.subject}")

        # Emit event
        event = MessageEvent(inbox.id, message)
        await self.on_message_received(event)

    async def on_message_received(self, event):
        # Override this method in subclass
        pass

    def stop(self):
        self.running = False
        print("Stopping monitoring...")
```

### Custom Event Handler

```python
class EmailMonitor(TempMailMonitor):
    def __init__(self, client, save_directory='messages'):
        super().__init__(client)
        self.save_directory = save_directory

    async def on_message_received(self, event):
        await self.save_message(event.message)

    async def save_message(self, message):
        import json
        from pathlib import Path

        # Create directory if it doesn't exist
        Path(self.save_directory).mkdir(exist_ok=True)

        # Save message
        filename = f"{self.save_directory}/message-{message.id}.json"
        with open(filename, 'w') as f:
            json.dump(message, f, indent=2, default=str)

        print(f"💾 Saved message to {filename}")

        # Handle attachments
        if message.attachments:
            for attachment in message.attachments:
                await self.save_attachment(attachment, message.id)

    async def save_attachment(self, attachment, message_id):
        import aiofiles

        try:
            # Download attachment
            attachment_data = await self.client.messages.download_attachment(attachment.id)

            # Save to file
            filename = f"{self.save_directory}/attachment-{attachment.id}-{attachment.filename}"

            async with aiofiles.open(filename, 'wb') as f:
                await f.write(attachment_data)

            print(f"📎 Downloaded attachment: {filename}")

        except Exception as error:
            print(f"Failed to save attachment {attachment.id}: {error}")
```

## Error Handling

### Basic Error Handling

```python
async def safe_operation():
    client = await secure_login()

    try:
        result = await client.inboxes.create({
            'domain': 'example.com',
            'name': 'test-inbox'
        })
        return result

    except Exception as error:
        print(f"Operation failed: {error}")

        # Handle specific error types
        if 'UNAUTHORIZED' in str(error):
            # Re-authenticate
            await client.login()
            return await client.inboxes.create({
                'domain': 'example.com',
                'name': 'test-inbox'
            })

        raise
```

### Comprehensive Error Handling

```python
from typing import Dict, Any

class TempMailError(Exception):
    def __init__(self, response: Dict[str, Any]):
        self.code = response.get('code', 'UNKNOWN_ERROR')
        self.message = response.get('error', 'Unknown error')
        self.details = response.get('details', {})
        self.status_code = response.get('status', 500)

        super().__init__(self.message)

async def handle_api_call():
    client = await secure_login()

    try:
        domains = await client.domains.create('test.com')
        return domains

    except TempMailError as error:
        print(f"API Error [{error.code}]: {error.message}")

        if error.code == 'UNAUTHORIZED':
            print("Authentication required")
        elif error.code == 'RATE_LIMIT_EXCEEDED':
            print("Rate limit exceeded - waiting...")
            await asyncio.sleep(60)
        elif error.code == 'NOT_FOUND':
            print("Resource not found")

    except Exception as error:
        print(f"Network Error: {error}")

    return None
```

## Webhook Integration

### Simple Webhook Server

```python
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import asyncio
from urllib.parse import urlparse, parse_qs

async def create_webhook_server(port=3000):
    class WebhookHandler(BaseHTTPRequestHandler):
        def do_POST(self):
            try:
                # Parse URL and path
                parsed_path = urlparse(self.path)
                if parsed_path.path != '/webhook':
                    self.send_error(404, "Not Found")
                    return

                # Read body
                content_length = int(self.headers['Content-Length'])
                body = self.rfile.read(content_length)

                # Parse JSON
                event = json.loads(body.decode('utf-8'))

                # Handle event
                await handle_webhook_event(event)

                # Send response
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"status": "ok"}')

            except Exception as error:
                print(f"Webhook error: {error}")
                self.send_error(500, str(error))

        # Disable logging
        def log_message(self, format, *args):
            pass

    # Create server
    server = HTTPServer(('localhost', port), WebhookHandler)
    print(f"Webhook server listening on port {port}")
    server.serve_forever()

async def handle_webhook_event(event):
    print(f"Received event: {event['type']}")

    if event['type'] == 'message.created':
        await handle_new_message(event['data'])
    elif event['type'] == 'inbox.created':
        await handle_new_inbox(event['data'])

async def handle_new_message(message):
    print(f"New message: {message['subject']}")

    # Process the message
    client = await secure_login()
    full_message = await client.messages.get(message['id'])

    # Send notification
    send_notification('New Email', full_message['subject'])

async def handle_new_inbox(inbox):
    print(f"New inbox: {inbox['email']}")

def send_notification(title, message):
    # Implement notification (email, Slack, etc.)
    print(f"🔔 {title}: {message}")

# Run the server
async def main():
    # Start webhook server
    webhook_task = asyncio.create_task(create_webhook_server(3000))

    # Keep running
    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        print("Shutting down...")
        webhook_task.cancel()
```

## File Attachment Handling

### Advanced Attachment Management

```python
import aiofiles
import mimetypes
from pathlib import Path

class AttachmentManager:
    def __init__(self, storage_directory='attachments'):
        self.storage_directory = Path(storage_directory)
        self.storage_directory.mkdir(exist_ok=True)

    def get_file_path(self, attachment_id, filename):
        # Create safe filename
        safe_name = self.sanitize_filename(filename)
        return self.storage_directory / f"{attachment_id}_{safe_name}"

    def sanitize_filename(self, filename):
        # Remove or replace unsafe characters
        import re
        return re.sub(r'[<>:"/\\|?*]', '_', filename)

    async def save_attachment(self, attachment_id, attachment_data, filename=None):
        if filename is None:
            filename = attachment.get('filename', f'attachment-{attachment_id}')

        file_path = self.get_file_path(attachment_id, filename)

        try:
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(attachment_data)

            # Set proper MIME type
            mime_type, _ = mimetypes.guess_type(str(file_path))
            if mime_type:
                file_path.with_suffix(f'.{mime_type.split("/")[1]}').touch()

            return str(file_path)

        except Exception as error:
            print(f"Failed to save attachment: {error}")
            raise

    async def batch_download(self, message_id):
        client = await secure_login()
        message = await client.messages.get(message_id)

        if not message.attachments:
            return []

        tasks = []
        for attachment in message.attachments:
            task = self.download_attachment(client, attachment)
            tasks.append(task)

        return await asyncio.gather(*tasks, return_exceptions=True)

    async def download_attachment(self, client, attachment):
        try:
            # Download attachment
            data = await client.messages.download_attachment(attachment.id)

            # Save file
            file_path = await self.save_attachment(
                attachment.id,
                data,
                attachment.filename
            )

            print(f"📎 Downloaded: {file_path}")
            return {
                'id': attachment.id,
                'filename': attachment.filename,
                'path': file_path,
                'size': len(data)
            }

        except Exception as error:
            print(f"Failed to download {attachment.filename}: {error}")
            return None
```

## Testing

### Unit Tests

```python
import pytest
import asyncio
from unittest.mock import Mock, patch
from tempmailpro import TempMailClient

@pytest.fixture
def mock_client():
    client = TempMailClient(
        base_url='http://localhost:3001',
        email='test@example.com',
        password='test123'
    )

    # Mock the HTTP client
    client.http_client = Mock()

    return client

@pytest.mark.asyncio
async def test_login(mock_client):
    # Mock successful login response
    mock_client.http_client.post.return_value = {
        'ok': True,
        'json': lambda: {'token': 'mock-token'}
    }

    await mock_client.login()

    assert mock_client.token == 'mock-token'

@pytest.mark.asyncio
async def test_list_domains(mock_client):
    # Mock domains response
    mock_client.http_client.get.return_value = {
        'ok': True,
        'json': lambda: {
            'data': [{'id': '1', 'domain': 'test.com'}],
            'pagination': {'total': 1}
        }
    }

    # Set token for authentication
    mock_client.token = 'mock-token'

    domains = await mock_client.domains.list()

    assert len(domains) == 1
    assert domains[0]['domain'] == 'test.com'

@pytest.mark.asyncio
async def test_create_inbox(mock_client):
    # Mock inbox creation response
    mock_client.http_client.post.return_value = {
        'ok': True,
        'json': lambda: {
            'id': '1',
            'email': 'test@test.com',
            'domain': 'test.com'
        }
    }

    mock_client.token = 'mock-token'

    inbox = await mock_client.inboxes.create({
        'domain': 'test.com',
        'name': 'test-inbox'
    })

    assert inbox['domain'] == 'test.com'
    assert 'test@test.com' in inbox['email']
```

### Integration Tests

```python
import pytest
import asyncio
from tempmailpro import TempMailClient
from test_utils import setup_test_env, cleanup_test_env

@pytest.fixture(scope='module')
async def test_env():
    env = await setup_test_env()
    yield env
    await cleanup_test_env(env)

@pytest.mark.asyncio
async def test_domain_lifecycle(test_env):
    client = TempMailClient(
        base_url=test_env['api_url'],
        email=test_env['admin_email'],
        password=test_env['admin_password']
    )

    # Login
    await client.login()

    # Create domain
    domain = await client.domains.create('test.example.com')
    assert domain['domain'] == 'test.example.com'

    # List domains
    domains = await client.domains.list()
    assert len(domains) > 0

    # Domain verification would require DNS setup
    # This would be mocked in real tests

@pytest.mark.asyncio
async def test_inbox_and_messages(test_env):
    client = TempMailClient(
        base_url=test_env['api_url'],
        email=test_env['admin_email'],
        password=test_env['admin_password']
    )

    await client.login()

    # Create inbox
    domain = (await client.domains.list())[0]
    inbox = await client.inboxes.create({
        'domain': domain['domain'],
        'name': 'test-inbox'
    })

    assert inbox['email'].endswith(domain['domain'])

    # Check messages (initially empty)
    messages = await client.messages.list(inbox['id'])
    assert len(messages) == 0
```

## Best Practices

### 1. Connection Pooling

```python
import aiohttp
from typing import List

class ConnectionPool:
    def __init__(self, max_connections: int = 10):
        self.max_connections = max_connections
        self.connections: List[aiohttp.ClientSession] = []
        self.waiting = []
        self.semaphore = asyncio.Semaphore(max_connections)

    async def get_connection(self):
        async with self.semaphore:
            if self.connections:
                return self.connections.pop()

            # Create new connection
            return aiohttp.ClientSession()

    async def release_connection(self, session: aiohttp.ClientSession):
        if len(self.connections) < self.max_connections:
            self.connections.append(session)
        else:
            await session.close()

    async def close_all(self):
        for session in self.connections:
            await session.close()
        await asyncio.gather(*[
            session.close() for session in self.connections
        ], return_exceptions=True)
```

### 2. Caching

```python
import time
from functools import wraps
from typing import Callable, Any

class APICache:
    def __init__(self, ttl: int = 300):
        self.cache = {}
        self.ttl = ttl

    def get(self, key: str) -> Any:
        if key in self.cache:
            value, timestamp = self.cache[key]
            if time.time() - timestamp < self.ttl:
                return value
        return None

    def set(self, key: str, value: Any):
        self.cache[key] = (value, time.time())

    def invalidate(self, pattern: str):
        keys_to_remove = [k for k in self.cache.keys() if pattern in k]
        for key in keys_to_remove:
            del self.cache[key]

# Usage
cache = APICache(ttl=300)

def cached(ttl: int = None):
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Create cache key
            key = f"{func.__name__}:{str(args)}:{str(kwargs)}"

            # Try cache
            cached_result = cache.get(key)
            if cached_result is not None:
                return cached_result

            # Call function
            result = await func(*args, **kwargs)

            # Cache result
            cache.set(key, result)
            return result

        return wrapper
    return decorator

# Usage example
@cached(ttl=60)
async def get_domains_cached(client):
    return await client.domains.list()
```

### 3. Monitoring and Metrics

```python
import time
from collections import defaultdict
from typing import Dict, Any

class APIMonitor:
    def __init__(self):
        self.metrics = defaultdict(list)
        self.total_calls = 0
        self.errors = 0

    async def track_call(self, endpoint: str, duration: float, success: bool):
        self.total_calls += 1

        if not success:
            self.errors += 1

        self.metrics[endpoint].append({
            'duration': duration,
            'success': success,
            'timestamp': time.time()
        })

    def get_stats(self) -> Dict[str, Any]:
        stats = {
            'total_calls': self.total_calls,
            'errors': self.errors,
            'error_rate': self.errors / self.total_calls if self.total_calls > 0 else 0,
            'endpoints': {}
        }

        for endpoint, calls in self.metrics.items():
            durations = [c['duration'] for c in calls if c['success']]
            stats['endpoints'][endpoint] = {
                'call_count': len(calls),
                'success_rate': sum(1 for c in calls if c['success']) / len(calls) if calls else 0,
                'avg_duration': sum(durations) / len(durations) if durations else 0,
                'min_duration': min(durations) if durations else 0,
                'max_duration': max(durations) if durations else 0
            }

        return stats

# Usage
monitor = APIMonitor()

class MonitoredClient:
    def __init__(self, client: TempMailClient, monitor: APIMonitor):
        self.client = client
        self.monitor = monitor

    async def _track_api_call(self, endpoint: str, func, *args, **kwargs):
        start_time = time.time()

        try:
            result = await func(*args, **kwargs)
            duration = time.time() - start_time
            await self.monitor.track_call(endpoint, duration, True)
            return result
        except Exception as error:
            duration = time.time() - start_time
            await self.monitor.track_call(endpoint, duration, False)
            raise

    async def domains(self):
        return MonitoredDomains(self.client, self.monitor)
```

## Complete Example

Here's a complete example that demonstrates all the features:

```python
import asyncio
import json
import logging
from pathlib import Path
from tempmailpro import TempMailClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TempMailApplication:
    def __init__(self, config):
        self.client = TempMailClient(config)
        self.running = False
        self.message_dir = Path('messages')
        self.message_dir.mkdir(exist_ok=True)

    async def start(self):
        logger.info("Starting TempMail application...")

        # Login
        await self.client.login()
        logger.info("✓ Logged in successfully")

        # Create or get domain
        domain = await self.ensure_domain('app.example.com')
        logger.info(f"✓ Using domain: {domain.domain}")

        # Create inbox
        inbox = await self.client.inboxes.create({
            'domain': domain.domain,
            'name': 'app-inbox',
            'description': 'Application inbox'
        })

        logger.info(f"✓ Created inbox: {inbox.email}")

        # Start monitoring
        self.running = True
        await self.monitor_inbox(inbox.id)

        return inbox

    async def ensure_domain(self, domain_name):
        domains = await self.client.domains.list()

        domain = next((d for d in domains.data if d.domain == domain_name), None)

        if not domain:
            domain = await self.client.domains.create(
                domain_name,
                'Application domain'
            )
            logger.info("✓ Created domain")

        return domain

    async def monitor_inbox(self, inbox_id):
        logger.info("📧 Monitoring inbox for messages...")

        while self.running:
            try:
                # Get latest messages
                messages = await self.client.messages.list(
                    inbox_id,
                    limit=10,
                    sort='created_at',
                    order='desc'
                )

                # Process new messages
                for message in messages.data:
                    await self.process_message(message)

                # Wait before next check
                await asyncio.sleep(30)

            except Exception as error:
                logger.error(f"Monitoring error: {error}")
                await asyncio.sleep(5)

    async def process_message(self, message):
        logger.info(f"📨 New message: {message.subject}")

        # Save message
        await self.save_message(message)

        # Handle attachments
        if message.attachments:
            logger.info(f"📎 Found {len(message.attachments)} attachments")

            for attachment in message.attachments:
                try:
                    await self.save_attachment(attachment, message.id)
                except Exception as error:
                    logger.error(f"Failed to save attachment {attachment.id}: {error}")

        # Mark as read
        await self.client.messages.update(message.id, {'read': True})

    async def save_message(self, message):
        # Convert message to dict if needed
        if hasattr(message, '__dict__'):
            message_dict = message.__dict__
        else:
            message_dict = message

        filename = f"message-{message.id}.json"
        filepath = self.message_dir / filename

        with open(filepath, 'w') as f:
            json.dump(message_dict, f, indent=2, default=str)

        logger.info(f"💾 Saved message to {filepath}")

    async def save_attachment(self, attachment, message_id):
        # Download attachment
        data = await self.client.messages.download_attachment(attachment.id)

        # Create safe filename
        from urllib.parse import unquote
        filename = unquote(attachment.filename)
        safe_filename = self.sanitize_filename(filename)

        filepath = self.message_dir / f"attachment-{attachment.id}-{safe_filename}"

        # Save attachment
        with open(filepath, 'wb') as f:
            f.write(data)

        logger.info(f"📎 Downloaded: {filepath}")

    def sanitize_filename(self, filename):
        import re
        # Remove or replace unsafe characters
        filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
        # Remove leading/trailing dots and spaces
        filename = filename.strip('. ')
        return filename

    async def stop(self):
        self.running = False
        logger.info("Stopping TempMail application...")

async def main():
    app = TempMailApplication({
        'base_url': 'http://localhost:3001',
        'email': 'admin@example.com',
        'password': 'changeme'
    })

    try:
        inbox = await app.start()
        logger.info('Application running. Press Ctrl+C to stop.')

        # Keep process alive
        while True:
            await asyncio.sleep(1)

    except KeyboardInterrupt:
        logger.info("Shutting down...")
        await app.stop()

if __name__ == "__main__":
    asyncio.run(main())
```

## Next Steps

Now that you've mastered the Python SDK:

- [Learn about the Node.js SDK](nodejs-sdk.md)
- [Explore the API documentation](../api/)
- [Set up custom domains](../guides/custom-domains.md)
- [Configure email forwarding](../guides/email-forwarding.md)

For more advanced usage, check out:
- [API documentation](../api/)
- [Source code on GitHub](https://github.com/tempmailpro/python-sdk)
- [Community discussions](https://github.com/tempmailpro/tempmailpro/discussions)

Need help? Join our Discord or open an issue on GitHub.