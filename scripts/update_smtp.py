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

def update_smtp_config():
    print("=" * 70)
    print("🚀 UPDATING SMTP CONFIGURATION")
    print("=" * 70)
    
    # Check if arguments are provided
    if len(sys.argv) < 5:
        print("Usage: python scripts/update_smtp.py <HOST> <PORT> <USER> <PASS> [SECURE=true|false]")
        return

    smtp_host = sys.argv[1]
    smtp_port = sys.argv[2]
    smtp_user = sys.argv[3]
    smtp_pass = sys.argv[4]
    smtp_secure = sys.argv[5] if len(sys.argv) > 5 else "false"

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("✅ Connected to server!\n")
        
        env_file = "/root/email-platform/services/api/.env"
        
        # Update .env using sed
        commands = [
            f"sed -i 's/^OUTBOUND_SMTP_HOST=.*/OUTBOUND_SMTP_HOST=\"{smtp_host}\"/' {env_file}",
            f"sed -i 's/^OUTBOUND_SMTP_PORT=.*/OUTBOUND_SMTP_PORT={smtp_port}/' {env_file}",
            f"sed -i 's/^OUTBOUND_SMTP_USER=.*/OUTBOUND_SMTP_USER=\"{smtp_user}\"/' {env_file}",
            f"sed -i 's/^OUTBOUND_SMTP_PASS=.*/OUTBOUND_SMTP_PASS=\"{smtp_pass}\"/' {env_file}",
            f"sed -i 's/^OUTBOUND_SMTP_SECURE=.*/OUTBOUND_SMTP_SECURE={smtp_secure}/' {env_file}",
            f"sed -i 's/^OUTBOUND_ENABLED=.*/OUTBOUND_ENABLED=true/' {env_file}"
        ]

        for cmd in commands:
            client.exec_command(cmd)
        
        print("✅ Updated .env configuration.")
        
        # Restart API container
        print("🔄 Restarting API container to apply changes...")
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml up -d --build api",
            timeout=120
        )
        print(stdout.read().decode())
        
        print("✅ API restarted.")
        
        client.close()
        print("\n" + "=" * 70)
        print("🏁 UPDATE COMPLETE")
        print("=" * 70)
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    update_smtp_config()
