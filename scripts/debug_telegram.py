import subprocess
import sys

try:
    import paramiko
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "paramiko", "-q"])
    import paramiko

from _ssh_config import HOST, USERNAME, PASSWORD

def debug_telegram():
    print("🔗 Connecting...")
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("✅ Connected!\n")
        
        # Check webhook info with last error
        print("📋 Webhook Info:")
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && BOT_TOKEN=$(grep TELEGRAM_BOT_TOKEN services/api/.env | cut -d'=' -f2 | tr -d '\"' | tr -d \"'\") && curl -s \"https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo\" | python3 -m json.tool 2>/dev/null || curl -s \"https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo\"",
            timeout=30
        )
        webhook_info = stdout.read().decode()
        print(webhook_info)
        
        # Check for last_error_message in webhook info
        if "last_error" in webhook_info:
            print("\n⚠️ WEBHOOK HAS ERRORS! See above.")
        
        # Check API logs for telegram errors
        print("\n📋 API Logs (filtering for telegram/webhook):")
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml logs api --tail=100 2>&1 | grep -i telegram || echo 'No telegram logs found'",
            timeout=60
        )
        print(stdout.read().decode()[:2000])
        
        # Check if API is receiving webhook calls
        print("\n📋 Testing webhook endpoint with sample data:")
        stdin, stdout, stderr = client.exec_command(
            '''curl -s -X POST "https://api.manhquy.click/telegram/webhook" \
            -H "Content-Type: application/json" \
            -d '{"update_id":1,"message":{"message_id":1,"chat":{"id":123,"type":"private"},"text":"/start","date":1703350000}}'
            ''',
            timeout=30
        )
        print(stdout.read().decode())
        
        # Check TELEGRAM_WEBHOOK_SECRET
        print("\n📋 Checking TELEGRAM_WEBHOOK_SECRET config:")
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && grep TELEGRAM_WEBHOOK_SECRET services/api/.env || echo 'TELEGRAM_WEBHOOK_SECRET not set'",
            timeout=30
        )
        secret_line = stdout.read().decode().strip()
        print(secret_line)
        
        if "TELEGRAM_WEBHOOK_SECRET" in secret_line and "=" in secret_line:
            secret = secret_line.split("=", 1)[1].strip().strip('"').strip("'")
            if secret:
                print(f"   ⚠️ Secret is SET: {secret[:10]}...")
                print("   This means Telegram must send matching secret in header!")
                
                # Check if webhook was set WITH the secret
                print("\n📋 Re-setting webhook WITH secret_token...")
                stdin, stdout, stderr = client.exec_command(
                    f'''cd /root/email-platform. && BOT_TOKEN=$(grep TELEGRAM_BOT_TOKEN services/api/.env | cut -d'=' -f2 | tr -d '"' | tr -d "'") && curl -s -X POST "https://api.telegram.org/bot${{BOT_TOKEN}}/setWebhook" -H "Content-Type: application/json" -d '{{"url": "https://api.manhquy.click/telegram/webhook", "allowed_updates": ["message", "callback_query"], "secret_token": "{secret}"}}'
                    ''',
                    timeout=30
                )
                print(stdout.read().decode())
        
        client.close()
        print("\n✅ Done!")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    debug_telegram()
