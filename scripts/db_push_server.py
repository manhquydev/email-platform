import paramiko
import sys

from _ssh_config import HOST, USERNAME, PASSWORD

PROJECT_DIR = "/root/email-platform."

def db_push():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print(f"Connecting to {HOST}...")
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("Connected successfully!")
        
        cmd = f"cd {PROJECT_DIR} && docker compose -f docker-compose.prod.yml exec -T api npx prisma db push --accept-data-loss"
        print(f"\nRunning: {cmd}")
        stdin, stdout, stderr = client.exec_command(cmd)
        
        for line in stdout:
            print(f"out: {line.strip()}")
        for line in stderr:
            print(f"err: {line.strip()}")
            
        print("\nDB Push finished successfully!")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    db_push()
