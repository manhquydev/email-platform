import subprocess
import sys
import json

try:
    import paramiko
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "paramiko", "-q"])
    import paramiko

HOST = "165.22.48.193"
USERNAME = "root"
PASSWORD = "Manhquy203@"

def comprehensive_debug():
    print("=" * 70)
    print("🔍 COMPREHENSIVE TELEGRAM BOT DEBUGGING")
    print("=" * 70)
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("✅ Connected to server!\n")
        
        # 1. Check Docker containers status
        print("=" * 70)
        print("📋 1. DOCKER CONTAINERS STATUS")
        print("=" * 70)
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml ps",
            timeout=30
        )
        print(stdout.read().decode())
        
        # 2. Get TELEGRAM config from .env
        print("=" * 70)
        print("📋 2. TELEGRAM ENVIRONMENT VARIABLES")
        print("=" * 70)
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && cat services/api/.env | grep -E '(TELEGRAM|BOT)' || echo 'No TELEGRAM config found'",
            timeout=30
        )
        env_output = stdout.read().decode()
        print(env_output)
        
        # Extract values
        bot_token = ""
        webhook_secret = ""
        for line in env_output.split('\n'):
            if 'TELEGRAM_BOT_TOKEN=' in line:
                bot_token = line.split('=', 1)[1].strip().strip('"').strip("'")
            if 'TELEGRAM_WEBHOOK_SECRET=' in line:
                webhook_secret = line.split('=', 1)[1].strip().strip('"').strip("'")
        
        if not bot_token:
            print("❌ BOT_TOKEN NOT FOUND! This is the problem!")
            client.close()
            return
        
        print(f"\n   Bot Token: {bot_token[:30]}...")
        print(f"   Webhook Secret: {webhook_secret[:20] if webhook_secret else 'NOT SET'}...")
        
        # 3. Check webhook info from Telegram
        print("\n" + "=" * 70)
        print("📋 3. TELEGRAM WEBHOOK INFO (from Telegram API)")
        print("=" * 70)
        stdin, stdout, stderr = client.exec_command(
            f'curl -s "https://api.telegram.org/bot{bot_token}/getWebhookInfo"',
            timeout=30
        )
        webhook_info = stdout.read().decode()
        try:
            info = json.loads(webhook_info)
            print(json.dumps(info, indent=2))
            
            if info.get("ok"):
                result = info.get("result", {})
                print(f"\n   🔗 URL: {result.get('url', 'NOT SET')}")
                print(f"   📬 Pending Updates: {result.get('pending_update_count', 0)}")
                print(f"   ⏰ Last Error Date: {result.get('last_error_date', 'None')}")
                print(f"   ❌ Last Error Message: {result.get('last_error_message', 'None')}")
                
                if result.get('last_error_message'):
                    print("\n   ⚠️ WEBHOOK HAS ERRORS! This is likely the issue!")
        except:
            print(webhook_info)
        
        # 4. Test sending a message via Telegram API directly
        print("\n" + "=" * 70)
        print("📋 4. TEST SENDING MESSAGE VIA TELEGRAM API")
        print("=" * 70)
        # First get bot info to confirm token works
        stdin, stdout, stderr = client.exec_command(
            f'curl -s "https://api.telegram.org/bot{bot_token}/getMe"',
            timeout=30
        )
        bot_info = stdout.read().decode()
        print("Bot Info:")
        try:
            info = json.loads(bot_info)
            print(json.dumps(info, indent=2))
            if not info.get("ok"):
                print("\n❌ BOT TOKEN IS INVALID!")
        except:
            print(bot_info)
        
        # 5. Check API logs for errors
        print("\n" + "=" * 70)
        print("📋 5. RECENT API LOGS (filtered for telegram/errors)")
        print("=" * 70)
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml logs api --tail=100 2>&1 | grep -iE '(telegram|webhook|error|failed|unauthorized)' | tail -30 || echo 'No relevant logs'",
            timeout=60
        )
        logs = stdout.read().decode()
        print(logs if logs.strip() else "No relevant logs found")
        
        # 6. Test webhook endpoint with curl (externally)
        print("\n" + "=" * 70)
        print("📋 6. TEST WEBHOOK ENDPOINT (external)")
        print("=" * 70)
        
        # Test without secret
        print("Testing without secret header:")
        stdin, stdout, stderr = client.exec_command(
            '''curl -s -X POST "https://api.manhquy.click/telegram/webhook" \
                -H "Content-Type: application/json" \
                -d '{"update_id":99999,"message":{"message_id":1,"from":{"id":123456,"is_bot":false,"first_name":"Test"},"chat":{"id":123456,"type":"private"},"text":"/start","date":1703350000}}'
            ''',
            timeout=30
        )
        print(f"   Response: {stdout.read().decode()}")
        
        # Test with secret
        if webhook_secret:
            print(f"\nTesting WITH secret header (x-telegram-bot-api-secret-token):")
            stdin, stdout, stderr = client.exec_command(
                f'''curl -s -X POST "https://api.manhquy.click/telegram/webhook" \
                    -H "Content-Type: application/json" \
                    -H "x-telegram-bot-api-secret-token: {webhook_secret}" \
                    -d '{{"update_id":99999,"message":{{"message_id":1,"from":{{"id":123456,"is_bot":false,"first_name":"Test"}},"chat":{{"id":123456,"type":"private"}},"text":"/start","date":1703350000}}}}'
                ''',
                timeout=30
            )
            print(f"   Response: {stdout.read().decode()}")
        
        # 7. Force delete and reset webhook
        print("\n" + "=" * 70)
        print("📋 7. FORCE RESET WEBHOOK")
        print("=" * 70)
        
        # Delete webhook
        stdin, stdout, stderr = client.exec_command(
            f'curl -s "https://api.telegram.org/bot{bot_token}/deleteWebhook?drop_pending_updates=true"',
            timeout=30
        )
        print(f"Delete: {stdout.read().decode()}")
        
        # Set webhook with secret
        webhook_url = "https://api.manhquy.click/telegram/webhook"
        if webhook_secret:
            set_cmd = f'''curl -s -X POST "https://api.telegram.org/bot{bot_token}/setWebhook" \
                -H "Content-Type: application/json" \
                -d '{{"url": "{webhook_url}", "allowed_updates": ["message", "callback_query"], "secret_token": "{webhook_secret}"}}'
            '''
        else:
            set_cmd = f'''curl -s -X POST "https://api.telegram.org/bot{bot_token}/setWebhook" \
                -H "Content-Type: application/json" \
                -d '{{"url": "{webhook_url}", "allowed_updates": ["message", "callback_query"]}}'
            '''
        
        stdin, stdout, stderr = client.exec_command(set_cmd, timeout=30)
        print(f"Set: {stdout.read().decode()}")
        
        # Verify
        stdin, stdout, stderr = client.exec_command(
            f'curl -s "https://api.telegram.org/bot{bot_token}/getWebhookInfo"',
            timeout=30
        )
        print(f"Verify: {stdout.read().decode()}")
        
        client.close()
        print("\n" + "=" * 70)
        print("✅ DEBUG COMPLETE")
        print("=" * 70)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    comprehensive_debug()
