import paramiko
import time

HOST = "165.22.48.193"
USERNAME = "root"
PASSWORD = "Manhquy203@"

def fix_db():
    print("🔗 Connecting...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("✅ Connected!\n")
        
        # Resolve the failed migration as rolled back
        print("🔧 Resolving failed migration as rolled-back...")
        cmd = "cd /root/email-platform. && docker compose -f docker-compose.prod.yml run --rm api npx prisma migrate resolve --rolled-back 20251227095500_add_message_pinned_snooze"
        
        stdin, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode()
        err = stderr.read().decode()
        
        print(f"Output: {out}")
        if err:
            print(f"Error: {err}")
            
        client.close()
        print("\n✅ Done!")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    fix_db()
