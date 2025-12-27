import paramiko
import time

HOST = "165.22.48.193"
USERNAME = "root"
PASSWORD = "Manhquy203@"

def reset_network():
    print("🔗 Connecting...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("✅ Connected!\n")
        
        print("🛑 Bringing Docker Stack DOWN...")
        client.exec_command("cd /root/email-platform. && docker compose -f docker-compose.prod.yml down")
        time.sleep(10) # Wait for cleanup
        
        print("🚀 Bringing Docker Stack UP...")
        client.exec_command("cd /root/email-platform. && docker compose -f docker-compose.prod.yml up -d")
        time.sleep(15) # Wait for startup
        
        print("\n🧪 Retesting Network from CADDY:")
        cmd = "cd /root/email-platform. && docker compose -f docker-compose.prod.yml exec caddy ping -c 2 api"
        stdin, stdout, stderr = client.exec_command(cmd)
        print(stdout.read().decode())
        print(stderr.read().decode())
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    reset_network()
