import paramiko
from _ssh_config import HOST, USERNAME, PASSWORD

def check_logs():
    print("🔗 Connecting...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("✅ Connected!\n")
        
        print("📋 Checking container status...")
        client.exec_command("cd /root/email-platform. && docker compose -f docker-compose.prod.yml ps")
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml ps"
        )
        print(stdout.read().decode())

        print("📋 Fetching last 50 lines of API logs...")
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml logs --tail=50 api"
        )
        print(stdout.read().decode())
        print(stderr.read().decode())
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    check_logs()
