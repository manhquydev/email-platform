import os
import subprocess
import sys

try:
    import paramiko
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "paramiko", "-q"])
    import paramiko

from _ssh_config import HOST, USERNAME, PASSWORD

_pat = os.environ.get("GITHUB_PAT")
if not _pat:
    print("Error: required environment variable 'GITHUB_PAT' is not set.", file=sys.stderr)
    sys.exit(1)

def full_rebuild_and_test():
    print("🔗 Connecting...")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("✅ Connected!\n")

        # First, pull latest code
        print("📥 1. Pulling latest code...")
        stdin, stdout, stderr = client.exec_command(
            f"cd /root/email-platform. && git pull https://manhquydev:{_pat}@github.com/manhquydev/email-platform.git main 2>&1",
            timeout=120
        )
        print(stdout.read().decode()[:500])

        # Rebuild API container
        print("\n🐳 2. Rebuilding API container...")
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml up -d --build api web 2>&1 | tail -20",
            timeout=600
        )
        print(stdout.read().decode())

        # Wait for container to start
        print("\n⏳ 3. Waiting 15 seconds for API to start...")
        import time
        time.sleep(15)

        # Check if telegram route is accessible
        print("\n📋 4. Testing telegram webhook endpoint (internal):")
        stdin, stdout, stderr = client.exec_command(
            '''cd /root/email-platform. && \
            SECRET=$(grep TELEGRAM_WEBHOOK_SECRET services/api/.env | cut -d'=' -f2 | tr -d '"' | tr -d "'") && \
            curl -s -X POST "http://api:3001/telegram/webhook" \
                -H "Content-Type: application/json" \
                -H "x-telegram-bot-api-secret-token: $SECRET" \
                -d '{"update_id":99999,"message":{"message_id":1,"from":{"id":123456,"is_bot":false,"first_name":"Test"},"chat":{"id":123456,"type":"private"},"text":"/start","date":1703350000}}' 2>&1 || \
            curl -s -X POST "http://localhost:3001/telegram/webhook" \
                -H "Content-Type: application/json" \
                -H "x-telegram-bot-api-secret-token: $SECRET" \
                -d '{"update_id":99999,"message":{"message_id":1,"from":{"id":123456,"is_bot":false,"first_name":"Test"},"chat":{"id":123456,"type":"private"},"text":"/start","date":1703350000}}'
            ''',
            timeout=30
        )
        print(f"Response: {stdout.read().decode()}")

        # Check API logs after test
        print("\n📋 5. API logs after test:")
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml logs api --tail=20 2>&1",
            timeout=60
        )
        logs = stdout.read().decode()
        print(logs[-2000:] if len(logs) > 2000 else logs)

        # Reset webhook with correct secret
        print("\n🔧 6. Re-setting webhook...")
        stdin, stdout, stderr = client.exec_command(
            '''cd /root/email-platform. && \
            BOT_TOKEN=$(grep TELEGRAM_BOT_TOKEN services/api/.env | cut -d'=' -f2 | tr -d '"' | tr -d "'") && \
            SECRET=$(grep TELEGRAM_WEBHOOK_SECRET services/api/.env | cut -d'=' -f2 | tr -d '"' | tr -d "'") && \
            curl -s "https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook" && \
            echo "" && \
            curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
                -H "Content-Type: application/json" \
                -d "{\\\"url\\\": \\\"https://api.manhquy.click/telegram/webhook\\\", \\\"allowed_updates\\\": [\\\"message\\\", \\\"callback_query\\\"], \\\"secret_token\\\": \\\"$SECRET\\\"}"
            ''',
            timeout=30
        )
        print(stdout.read().decode())

        client.close()
        print("\n✅ Done! Now test /start in Telegram")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    full_rebuild_and_test()
