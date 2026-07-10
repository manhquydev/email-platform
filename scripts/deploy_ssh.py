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

def run_ssh_commands():
    print(f"🔗 Connecting to {HOST}...")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30, look_for_keys=False, allow_agent=False)
        print("✅ Connected successfully!")

        # Commands to run
        commands = [
            # Pull latest code
            f"cd /root/email-platform* && git pull https://manhquydev:{_pat}@github.com/manhquydev/email-platform.git main",

            # Backend: Install, Generate Usage, Migrate, Build
            "cd /root/email-platform*/services/api && npm install && npx prisma generate && npx prisma migrate deploy && npm run build",

            # Frontend: Install, Build (assuming served statically or via separate server needing build)
            "cd /root/email-platform*/services/web && npm install && npm run build",

            # Restart Application
            "pm2 restart all"
        ]

        bot_token = None
        webhook_secret = None

        for cmd in commands:
            print(f"\n📍 Running: {cmd[:50]}...")
            stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
            output = stdout.read().decode()
            error = stderr.read().decode()

            if output:
                print(output)
                # Extract token if found
                for line in output.split('\n'):
                    if 'TELEGRAM_BOT_TOKEN=' in line:
                        bot_token = line.split('=', 1)[1].strip().strip('"').strip("'")
                    if 'TELEGRAM_WEBHOOK_SECRET=' in line:
                        webhook_secret = line.split('=', 1)[1].strip().strip('"').strip("'")
            if error:
                print(f"stderr: {error}")

        # Setup webhook if token found
        if bot_token:
            print(f"\n📱 Found Bot Token: {bot_token[:20]}...")

            webhook_url = "https://api.manhquy.id.vn/telegram/webhook"

            # Build curl command for setWebhook
            if webhook_secret:
                curl_cmd = f'''curl -s -X POST "https://api.telegram.org/bot{bot_token}/setWebhook" -H "Content-Type: application/json" -d '{{"url": "{webhook_url}", "allowed_updates": ["message", "callback_query"], "secret_token": "{webhook_secret}"}}'
                '''
            else:
                curl_cmd = f'''curl -s -X POST "https://api.telegram.org/bot{bot_token}/setWebhook" -H "Content-Type: application/json" -d '{{"url": "{webhook_url}", "allowed_updates": ["message", "callback_query"]}}'
                '''

            print(f"\n🔧 Setting webhook to: {webhook_url}")
            stdin, stdout, stderr = client.exec_command(curl_cmd, timeout=30)
            print(stdout.read().decode())

            # Verify webhook
            print("\n📋 Verifying webhook...")
            stdin, stdout, stderr = client.exec_command(f'curl -s "https://api.telegram.org/bot{bot_token}/getWebhookInfo"', timeout=30)
            print(stdout.read().decode())
        else:
            print("\n❌ TELEGRAM_BOT_TOKEN not found in .env")

        client.close()
        print("\n✅ Done!")

    except Exception as e:
        print(f"❌ Error: {e}")
        client.close()

if __name__ == "__main__":
    run_ssh_commands()
