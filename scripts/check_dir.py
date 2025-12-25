import paramiko

HOST = "165.22.48.193"
USERNAME = "root"
PASSWORD = "Manhquy203@"

def list_root():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        
        print("Listing /root directory...")
        stdin, stdout, stderr = client.exec_command("ls -F /root")
        print(stdout.read().decode())
        
        client.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_root()
