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

def quick_rebuild():
    print("🔗 Connecting...")
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("✅ Connected!\n")
        
        # Pull and rebuild
        print("📥 Pulling latest code...")
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && git pull https://manhquydev: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@github.com/manhquydev/email-platform.git main 2>&1",
            timeout=60
        )
        print(stdout.read().decode())
        
        print("🐳 Rebuilding API container...")
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml up -d --build api 2>&1 | tail -15",
            timeout=300
        )
        print(stdout.read().decode())
        
        print("⏳ Waiting 10 seconds...")
        import time
        time.sleep(10)
        
        # Check status
        print("\n📋 Container status:")
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml ps api",
            timeout=30
        )
        print(stdout.read().decode())
        
        client.close()
        print("✅ Done! Test /start in Telegram now")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    quick_rebuild()
