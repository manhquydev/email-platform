import subprocess
import sys
import time

try:
    import paramiko
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "paramiko", "-q"])
    import paramiko

HOST = "165.22.48.193"
USERNAME = "root"
PASSWORD = "Manhquy203@"
PAT_TOKEN = "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"

def full_deploy():
    print("🚀 Full Deploy to Production")
    print("=" * 50)
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("✅ Connected!\n")
        
        # Step 1: Pull code with PAT token
        print("📥 Step 1: Pulling code with PAT token...")
        stdin, stdout, stderr = client.exec_command(
            f"cd /root/email-platform. && git pull https://manhquydev:{PAT_TOKEN}@github.com/manhquydev/email-platform.git main",
            timeout=120
        )
        print(stdout.read().decode())
        err = stderr.read().decode()
        if err and 'Already up to date' not in err:
            print(f"stderr: {err}")
        
        # Step 2: Rebuild all containers
        print("\n🐳 Step 2: Rebuilding API and Web containers...")
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml up -d --build api web",
            timeout=300
        )
        # Stream output
        while True:
            line = stdout.readline()
            if not line:
                break
            print(line.strip())
        err = stderr.read().decode()
        if err:
            print(err[-2000:])  # Last 2000 chars
            
        print("\n⏳ Waiting 15 seconds for containers to start...")
        time.sleep(15)
        
        # Step 3: Verify containers
        print("\n📋 Step 3: Verifying containers...")
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml ps api web",
            timeout=30
        )
        print(stdout.read().decode())
        
        # Step 4: Test health
        print("📋 Step 4: Testing API health...")
        stdin, stdout, stderr = client.exec_command(
            "curl -s http://localhost:3001/health",
            timeout=15
        )
        print(stdout.read().decode())
        
        # Step 5: Test domains endpoint
        print("\n📋 Step 5: Testing domains endpoint (should be 401)...")
        stdin, stdout, stderr = client.exec_command(
            "curl -s -o /dev/null -w '%{http_code}' https://api.manhquy.click/domains",
            timeout=15
        )
        status = stdout.read().decode().strip()
        print(f"   Status: {status}")
        
        print("\n" + "=" * 50)
        print("✅ Full deploy complete!")
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    full_deploy()
