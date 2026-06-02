import subprocess
import sys
import json

try:
    import paramiko
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "paramiko", "-q"])
    import paramiko

from _ssh_config import HOST, USERNAME, PASSWORD

def check_send_error():
    print("🔗 Connecting...")
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("✅ Connected!\n")
        
        # Get full logs with Send message failed
        print("📋 API Logs with 'Send message failed' (full context):")
        print("=" * 70)
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml logs api 2>&1 | grep -A5 'Send message failed' | tail -30",
            timeout=60
        )
        print(stdout.read().decode())
        
        # Get all recent logs
        print("\n📋 Last 50 API logs:")
        print("=" * 70)
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml logs api --tail=50 2>&1",
            timeout=60
        )
        logs = stdout.read().decode()
        print(logs)
        
        # Test bot can send message
        print("\n📋 Test sending message directly via API:")
        print("=" * 70)
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && BOT_TOKEN=$(grep TELEGRAM_BOT_TOKEN services/api/.env | cut -d'=' -f2 | tr -d '\"' | tr -d \"'\") && curl -s -X POST \"https://api.telegram.org/bot${BOT_TOKEN}/sendMessage\" -H \"Content-Type: application/json\" -d '{\"chat_id\": 123456, \"text\": \"Test message\"}'",
            timeout=30
        )
        result = stdout.read().decode()
        print(f"Result: {result}")
        
        # Check webhook info for errors
        print("\n📋 Webhook last error:")
        print("=" * 70)
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && BOT_TOKEN=$(grep TELEGRAM_BOT_TOKEN services/api/.env | cut -d'=' -f2 | tr -d '\"' | tr -d \"'\") && curl -s \"https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo\" | python3 -m json.tool 2>/dev/null",
            timeout=30
        )
        print(stdout.read().decode())
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    check_send_error()
