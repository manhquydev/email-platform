import paramiko

HOST = "165.22.48.193"
USERNAME = "root"
PASSWORD = "Manhquy203@"

def debug_net():
    print("🔗 Connecting...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("✅ Connected!\n")
        
        print("📋 Web Container Logs (Last 50):")
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml logs --tail=50 web"
        )
        print(stdout.read().decode())
        
        print("\n🧪 Testing Network from CADDY container:")
        # Check if Caddy can resolve and ping API
        cmd = "cd /root/email-platform. && docker compose -f docker-compose.prod.yml exec caddy ping -c 2 api"
        print(f"Running: {cmd}")
        stdin, stdout, stderr = client.exec_command(cmd)
        print(stdout.read().decode())
        err = stderr.read().decode()
        if err: print(f"Error/Inf: {err}")

        # Check if Caddy can resolve and ping WEB
        cmd = "cd /root/email-platform. && docker compose -f docker-compose.prod.yml exec caddy ping -c 2 web"
        print(f"Running: {cmd}")
        stdin, stdout, stderr = client.exec_command(cmd)
        print(stdout.read().decode())
        err = stderr.read().decode()
        if err: print(f"Error/Info: {err}")

        client.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    debug_net()
