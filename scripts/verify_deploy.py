import subprocess
import sys

try:
    import paramiko
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "paramiko", "-q"])
    import paramiko

from _ssh_config import HOST, USERNAME, PASSWORD

def verify_deployment():
    print("🔗 Connecting to production server...")
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("✅ Connected!\n")
        
        # Check git status
        print("📋 1. Git Status:")
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && git log --oneline -3",
            timeout=30
        )
        print(stdout.read().decode().strip())
        print()
        
        # Check container status
        print("📋 2. Container Status:")
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml ps --format 'table {{.Name}}\t{{.Status}}'",
            timeout=30
        )
        print(stdout.read().decode().strip())
        print()
        
        # Check API health
        print("📋 3. API Health (internal):")
        stdin, stdout, stderr = client.exec_command(
            "curl -s http://localhost:3001/health",
            timeout=15
        )
        print(stdout.read().decode().strip())
        print()
        
        # Check domains endpoint
        print("📋 4. Domains Endpoint (external):")
        stdin, stdout, stderr = client.exec_command(
            "curl -s -o /dev/null -w '%{http_code}' https://api.manhquy.id.vn/domains",
            timeout=15
        )
        status = stdout.read().decode().strip()
        print(f"   Status: {status} {'✅ (401 = needs auth, correct!)' if status == '401' else ''}")
        print()
        
        # Check recent API logs for errors
        print("📋 5. Recent API Logs (last 10 lines):")
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml logs api --tail=10 2>&1 | grep -v 'metric\\|trace'",
            timeout=30
        )
        logs = stdout.read().decode()
        print(logs[:1500] if logs else "No logs")
        
        print("\n✅ Deployment verification complete!")
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    verify_deployment()
