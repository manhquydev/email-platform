import subprocess
import sys

try:
    import paramiko
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "paramiko", "-q"])
    import paramiko

HOST = "165.22.48.193"
USERNAME = "root"
PASSWORD = "Manhquy203@"

def deep_debug():
    print("🔗 Connecting...")
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("✅ Connected!\n")
        
        # Check API container is running
        print("📋 1. API Container Status:")
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml ps api",
            timeout=30
        )
        print(stdout.read().decode())
        
        # Get recent API logs
        print("\n📋 2. Recent API Logs (last 30 lines):")
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml logs api --tail=30 2>&1",
            timeout=60
        )
        logs = stdout.read().decode()
        print(logs[-3000:] if len(logs) > 3000 else logs)
        
        # Check if telegram route is registered
        print("\n📋 3. Check API routes (telegram in index.ts):")
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && grep -r 'telegram' services/api/src/index.ts 2>/dev/null || echo 'Not found in index.ts'",
            timeout=30
        )
        print(stdout.read().decode())
        
        # Check if telegramRoutes is imported
        print("\n📋 4. Check telegram routes import:")
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && head -50 services/api/src/index.ts | grep -i telegram || echo 'telegram not imported'",
            timeout=30
        )
        print(stdout.read().decode())
        
        # Test webhook with correct secret header
        print("\n📋 5. Test webhook WITH secret header locally on server:")
        stdin, stdout, stderr = client.exec_command(
            '''cd /root/email-platform. && \
            SECRET=$(grep TELEGRAM_WEBHOOK_SECRET services/api/.env | cut -d'=' -f2 | tr -d '"' | tr -d "'") && \
            curl -s -X POST "http://localhost:3001/telegram/webhook" \
                -H "Content-Type: application/json" \
                -H "x-telegram-bot-api-secret-token: $SECRET" \
                -d '{"update_id":99999,"message":{"message_id":1,"from":{"id":123,"is_bot":false,"first_name":"Test"},"chat":{"id":123,"type":"private"},"text":"/start","date":1703350000}}'
            ''',
            timeout=30
        )
        result = stdout.read().decode()
        print(f"Result: {result}")
        
        # Check getWebhookInfo for last_error
        print("\n📋 6. Webhook Info (check for last_error):")
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && BOT_TOKEN=$(grep TELEGRAM_BOT_TOKEN services/api/.env | cut -d'=' -f2 | tr -d '\"' | tr -d \"'\") && curl -s \"https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo\"",
            timeout=30
        )
        webhook_info = stdout.read().decode()
        print(webhook_info)
        
        if "last_error" in webhook_info:
            print("\n⚠️ WEBHOOK HAS ERRORS!")
        
        client.close()
        print("\n✅ Debug done!")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    deep_debug()
