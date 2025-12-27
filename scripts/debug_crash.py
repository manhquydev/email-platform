import paramiko

HOST = "165.22.48.193"
USERNAME = "root"
PASSWORD = "Manhquy203@"

def debug():
    print("🔗 Connecting...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("✅ Connected!\n")
        
        print("📋 Container Status:")
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml ps"
        )
        print(stdout.read().decode())
        
        print("\n📋 Recent Error Logs:")
        # Try to find "Error" case insensitive in the last 200 lines
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml logs --tail=200 api | grep -i 'Error' || echo 'No error lines found with grep'"
        )
        print(stdout.read().decode())
        
        print("\n📋 Last 20 lines (context):")
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml logs --tail=20 api"
        )
        print(stdout.read().decode())
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    debug()
