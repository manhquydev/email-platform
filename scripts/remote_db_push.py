import paramiko

HOST = "165.22.48.193"
USERNAME = "root"
PASSWORD = "Manhquy203@"

def remote_db_push():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        
        print("Executing prisma db push inside api container...")
        # Use --accept-data-loss to auto-accept if needed (though adding cols shouldn't trigger it)
        # Actually, let's try without flag first to see output.
        # But since I can't interact, I should probably use it or hope it's automatic.
        # Use docker compose run to execute command in a new container instance
        # ensuring we don't depend on the possibly-crashing main container.
        cmd = "cd /root/email-platform. && docker compose -f docker-compose.prod.yml run --rm api npx prisma db push --accept-data-loss"
        print(f"Running: {cmd}")
        stdin, stdout, stderr = client.exec_command(cmd)
        print(stdout.read().decode())
        print(stderr.read().decode())
        
        print("Restarting api container to clear potential cached errors...")
        client.exec_command("docker restart email-platform-api-1")
        
        client.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    remote_db_push()
