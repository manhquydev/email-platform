import paramiko
import sys
import time

# SSH connection details from workflow
HOST = "165.22.48.193"
USERNAME = "root"
PASSWORD = "Manhquy203@"
PROJECT_DIR = "/root/email-platform."
GIT_URL = "https://manhquydev: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@github.com/manhquydev/email-platform.git"

def deploy():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print(f"Connecting to {HOST}...")
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("Connected successfully!")
        
        commands = [
            f"cd {PROJECT_DIR} && git pull {GIT_URL} main",
            f"cd {PROJECT_DIR} && docker compose -f docker-compose.prod.yml up -d --build api web",
            # Wait a few seconds for API to stabilize before migration
            "sleep 5",
            f"cd {PROJECT_DIR} && docker compose -f docker-compose.prod.yml exec -T api npx prisma migrate deploy"
        ]
        
        for cmd in commands:
            print(f"\nRunning: {cmd}")
            stdin, stdout, stderr = client.exec_command(cmd)
            
            # Print output in real-time
            for line in stdout:
                print(f"out: {line.strip()}")
            for line in stderr:
                print(f"err: {line.strip()}")
                
        print("\nFull Deployment finished successfully!")
        
    except Exception as e:
        print(f"Error during deployment: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    deploy()
