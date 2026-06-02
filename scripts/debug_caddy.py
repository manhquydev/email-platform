import paramiko
from _ssh_config import HOST, USERNAME, PASSWORD

def check_caddy():
    print("🔗 Connecting...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("✅ Connected!\n")
        
        print("📋 Caddy Container Status:")
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml ps caddy"
        )
        print(stdout.read().decode())
        
        print("\n📜 Caddy Error Logs (Last 50):")
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml logs --tail=50 caddy"
        )
        print(stdout.read().decode())
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    check_caddy()
