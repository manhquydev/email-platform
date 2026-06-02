import subprocess
import sys

try:
    import paramiko
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "paramiko", "-q"])
    import paramiko

from _ssh_config import HOST, USERNAME, PASSWORD

def verify_webhook():
    print("🔗 Connecting to server...")
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("✅ Connected!")
        
        # Get bot token
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && grep TELEGRAM_BOT_TOKEN services/api/.env | cut -d'=' -f2 | tr -d '\"' | tr -d \"'\"",
            timeout=30
        )
        bot_token = stdout.read().decode().strip()
        
        if bot_token:
            print(f"📱 Bot Token: {bot_token[:25]}...")
            
            # Get webhook info
            print("\n📋 Current Webhook Info:")
            stdin, stdout, stderr = client.exec_command(
                f'curl -s "https://api.telegram.org/bot{bot_token}/getWebhookInfo"',
                timeout=30
            )
            result = stdout.read().decode()
            print(result)
            
            # Check if webhook URL is set correctly
            if "api.manhquy.click/telegram/webhook" in result:
                print("\n✅ Webhook is configured correctly!")
            elif '"url":""' in result or '"url": ""' in result:
                print("\n❌ Webhook URL is empty! Setting it now...")
                stdin, stdout, stderr = client.exec_command(
                    f'''curl -s -X POST "https://api.telegram.org/bot{bot_token}/setWebhook" -H "Content-Type: application/json" -d '{{"url": "https://api.manhquy.click/telegram/webhook", "allowed_updates": ["message", "callback_query"]}}'
                    ''',
                    timeout=30
                )
                print(stdout.read().decode())
            else:
                print("\n⚠️ Check webhook configuration manually")
        else:
            print("❌ Bot token not found")
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    verify_webhook()
