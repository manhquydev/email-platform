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

def debug_domains():
    print("🔗 Connecting...")
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("✅ Connected!\n")
        
        # Get recent API logs for 500 errors
        print("📋 API Logs (searching for errors):")
        print("=" * 70)
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml logs api --tail=50 2>&1 | grep -i 'error\\|500\\|domains'",
            timeout=60
        )
        logs = stdout.read().decode()
        print(logs if logs else "No error logs found")
        
        print("\n" + "=" * 70)
        print("📋 Full Recent Logs:")
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml logs api --tail=20 2>&1",
            timeout=60
        )
        logs = stdout.read().decode()
        print(logs[:3000] if logs else "No logs")
        
        # Restart API container
        print("\n🔄 Restarting API container...")
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml restart api",
            timeout=120
        )
        print(stdout.read().decode())
        print(stderr.read().decode())
        
        print("⏳ Waiting 10 seconds for container to start...")
        import time
        time.sleep(10)
        
        # Test health
        print("📋 Testing API health:")
        stdin, stdout, stderr = client.exec_command(
            "curl -s http://localhost:3001/health",
            timeout=15
        )
        print(stdout.read().decode())
        
        print("\n✅ Done!")
        client.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    debug_domains()
