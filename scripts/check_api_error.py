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

def check_api_error():
    print("🔗 Connecting...")
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("✅ Connected!\n")
        
        # Check API container status
        print("📋 1. API Container Status:")
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml ps",
            timeout=30
        )
        print(stdout.read().decode())
        
        # Check recent API logs for errors
        print("\n📋 2. Recent API Logs (last 50):")
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml logs api --tail=50 2>&1 | grep -iE '(error|500|domains)' || docker compose -f docker-compose.prod.yml logs api --tail=30 2>&1",
            timeout=60
        )
        logs = stdout.read().decode()
        print(logs[:3000] if len(logs) > 3000 else logs)
        
        # Test domains endpoint directly
        print("\n📋 3. Test /domains endpoint:")
        stdin, stdout, stderr = client.exec_command(
            "curl -s -o /dev/null -w '%{http_code}' https://api.manhquy.click/domains?limit=100 -H 'Authorization: Bearer test'",
            timeout=30
        )
        print(f"   Status: {stdout.read().decode()}")
        
        # Check if there's a database connection issue
        print("\n📋 4. Database connection check:")
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml exec -T api sh -c 'echo \"SELECT 1\" | npx prisma db execute --stdin' 2>&1 || echo 'Could not run prisma'",
            timeout=30
        )
        print(stdout.read().decode())
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    check_api_error()
