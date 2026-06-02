import paramiko
from _ssh_config import HOST, USERNAME, PASSWORD

def check_connectivity():
    print("🔗 Connecting...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("✅ Connected!\n")
        
        print("📋 Docker Containers & Ports:")
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml ps"
        )
        print(stdout.read().decode())
        
        print("\n🧪 Testing Local API Access (curl localhost:3001/health):")
        stdin, stdout, stderr = client.exec_command("curl -v http://localhost:3001/health")
        print(stdout.read().decode())
        print(stderr.read().decode())

        print("\n🧪 Testing Local Web Access (curl localhost:3000):")
        stdin, stdout, stderr = client.exec_command("curl -I http://localhost:3000")
        print(stdout.read().decode())
        print(stderr.read().decode())
        
        print("\n🚦 Checking Caddy/Webserver Status:")
        # Check systemd caddy
        stdin, stdout, stderr = client.exec_command("systemctl status caddy || echo 'Caddy not found in systemd'")
        print(stdout.read().decode())
        
        # Check if any process listens on 80/443
        print("\n🔌 Socket Statistics (TCP 80/443):")
        stdin, stdout, stderr = client.exec_command("ss -tulpn | grep -E ':80|:443'")
        print(stdout.read().decode())

        client.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    check_connectivity()
