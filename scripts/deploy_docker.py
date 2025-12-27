import paramiko
import time

HOST = "165.22.48.193"
USERNAME = "root"
PASSWORD = "Manhquy203@"

def deploy():
    print("🔗 Connecting...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("✅ Connected!\n")
        
        commands = [
            "cd /root/email-platform. && git reset --hard && git pull https://manhquydev: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@github.com/manhquydev/email-platform.git main",
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml build api web",
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml up -d --remove-orphans",
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml exec caddy ping -c 1 api" # Quick validation
        ]

        for cmd in commands:
            print(f"Running: {cmd.split('&&')[-1].strip().split(' ', 1)[0]}...") # Print first command part for brevity
            stdin, stdout, stderr = client.exec_command(cmd)
            
            # Stream output
            while True:
                line = stdout.readline()
                if not line: break
                print(line.strip())
            
            err = stderr.read().decode()
            if err:
                print(f"STDERR: {err}")
                
        client.close()
        print("\n✅ Deployment Complete!")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    deploy()
