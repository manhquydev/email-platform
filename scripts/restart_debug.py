import paramiko

HOST = "165.22.48.193"
USERNAME = "root"
PASSWORD = "Manhquy203@"

def force_restart():
    print("🔗 Connecting...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("✅ Connected!\n")
        
        print("🔄 Restarting API container...")
        client.exec_command("cd /root/email-platform. && docker compose -f docker-compose.prod.yml restart api")
        
        print("⏳ Waiting 5s...")
        import time
        time.sleep(5)
        
        print("📋 Fetching FRESH logs...")
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml logs --tail=50 api"
        )
        print(stdout.read().decode())
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    force_restart()
