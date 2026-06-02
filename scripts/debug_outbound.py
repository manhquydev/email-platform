import subprocess
import sys
import json

try:
    import paramiko
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "paramiko", "-q"])
    import paramiko

from _ssh_config import HOST, USERNAME, PASSWORD

def debug_outbound():
    print("=" * 70)
    print("🔍 OUTBOUND SMTP DEBUGGING")
    print("=" * 70)
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("✅ Connected to server!\n")
        
        # 1. Get OUTBOUND config from .env
        print("=" * 70)
        print("📋 1. OUTBOUND ENVIRONMENT VARIABLES (from server)")
        print("=" * 70)
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && cat services/api/.env | grep -E 'OUTBOUND_|MAIL_DOMAIN|MAIL_FROM' || echo 'No OUTBOUND config found'",
            timeout=30
        )
        env_output = stdout.read().decode()
        print(env_output)
        
        # 2. Check API logs for SMTP errors
        print("\n" + "=" * 70)
        print("📋 2. RECENT API LOGS (filtered for SMTP/outbound errors)")
        print("=" * 70)
        # Look for "SMTP", "outbound", "Failed to send", "verifyConnection"
        stdin, stdout, stderr = client.exec_command(
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml logs api --tail=500 2>&1 | grep -iE '(smtp|outbound|sendmail|verification|forward|error|failed)' | tail -50 || echo 'No relevant logs'",
            timeout=60
        )
        logs = stdout.read().decode()
        print(logs if logs.strip() else "No relevant logs found")
        
        # 3. Check if the API container can reach the SMTP host
        print("\n" + "=" * 70)
        print("📋 3. NETWORK CONNECTIVITY TEST (from inside API container)")
        print("=" * 70)
        # Extract SMTP Host from env_output if possible
        smtp_host = ""
        for line in env_output.split('\n'):
            if 'OUTBOUND_SMTP_HOST=' in line:
                smtp_host = line.split('=', 1)[1].strip().strip('"').strip("'")
        
        if smtp_host:
            print(f"Testing connectivity to {smtp_host}...")
            # Try to nc or ping (nc is better for port check)
            stdin, stdout, stderr = client.exec_command(
                f"docker exec email-platform-api-1 sh -c 'nc -zv {smtp_host} 587' 2>&1 || docker exec email-platform-api-1 sh -c 'ping -c 1 {smtp_host}' 2>&1",
                timeout=30
            )
            print(stdout.read().decode())
        else:
            print("❌ SMTP Host not configured in .env")

        client.close()
        print("\n" + "=" * 70)
        print("✅ DEBUG COMPLETE")
        print("=" * 70)
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    debug_outbound()
