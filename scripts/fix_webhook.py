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

def fix_webhook():
    print("🔗 Connecting...")
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("✅ Connected!\n")
        
        # Get bot token and secret
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && grep TELEGRAM_BOT_TOKEN services/api/.env | cut -d'=' -f2 | tr -d '\"' | tr -d \"'\"",
            timeout=30
        )
        bot_token = stdout.read().decode().strip()
        
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && grep TELEGRAM_WEBHOOK_SECRET services/api/.env | cut -d'=' -f2 | tr -d '\"' | tr -d \"'\"",
            timeout=30
        )
        secret = stdout.read().decode().strip()
        
        print(f"📱 Bot Token: {bot_token[:25]}...")
        print(f"🔒 Secret: {secret[:15]}...")
        
        # Delete webhook first
        print("\n🗑️ Deleting current webhook...")
        stdin, stdout, stderr = client.exec_command(
            f'curl -s "https://api.telegram.org/bot{bot_token}/deleteWebhook"',
            timeout=30
        )
        print(stdout.read().decode())
        
        # Set webhook WITH secret_token
        print("\n🔧 Setting webhook WITH secret_token...")
        webhook_url = "https://api.manhquy.click/telegram/webhook"
        
        curl_cmd = f'''curl -s -X POST "https://api.telegram.org/bot{bot_token}/setWebhook" \
            -H "Content-Type: application/json" \
            -d '{{"url": "{webhook_url}", "allowed_updates": ["message", "callback_query"], "secret_token": "{secret}"}}'
        '''
        
        stdin, stdout, stderr = client.exec_command(curl_cmd, timeout=30)
        print(stdout.read().decode())
        
        # Verify
        print("\n📋 Verifying webhook info...")
        stdin, stdout, stderr = client.exec_command(
            f'curl -s "https://api.telegram.org/bot{bot_token}/getWebhookInfo" | python3 -m json.tool 2>/dev/null || curl -s "https://api.telegram.org/bot{bot_token}/getWebhookInfo"',
            timeout=30
        )
        print(stdout.read().decode())
        
        client.close()
        print("\n✅ Done! Now test /start in Telegram")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    fix_webhook()
