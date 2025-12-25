import paramiko

HOST = "165.22.48.193"
USERNAME = "root"
PASSWORD = "Manhquy203@"

def check_logs():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        
        print("Checking API logs...")
        stdin, stdout, stderr = client.exec_command("docker logs email-platform-api-1 --tail 50")
        print(stdout.read().decode())
        print(stderr.read().decode())
        
        client.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_logs()
