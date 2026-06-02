import paramiko
import sys

from _ssh_config import HOST, USERNAME, PASSWORD

PROJECT_DIR = "/root/email-platform."

def setup():
    print("--- Ephemera Google API Setup Helper ---")
    client_id = input("Enter GOOGLE_CLIENT_ID: ").strip()
    client_secret = input("Enter GOOGLE_CLIENT_SECRET: ").strip()
    refresh_token = input("Enter GOOGLE_REFRESH_TOKEN: ").strip()

    if not client_id or not client_secret or not refresh_token:
        print("Error: All fields are required.")
        return

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(HOST, username=USERNAME, password=PASSWORD)
        
        # Update .env using a more robust pattern: check if exists, then replace or append
        vars_to_update = {
            "OUTBOUND_PROVIDER": "google",
            "GOOGLE_CLIENT_ID": client_id,
            "GOOGLE_CLIENT_SECRET": client_secret,
            "GOOGLE_REFRESH_TOKEN": refresh_token
        }
        
        commands = []
        env_path = f"{PROJECT_DIR}/services/api/.env"
        
        for var, val in vars_to_update.items():
            # Escape value for sed
            escaped_val = val.replace("'", "'\\''")
            cmd = f"grep -q '^{var}=' {env_path} && sed -i 's|^{var}=.*|{var}={escaped_val}|' {env_path} || echo '{var}={escaped_val}' >> {env_path}"
            commands.append(cmd)
            
        # Restart service
        commands.append(f"cd {PROJECT_DIR} && docker compose -f docker-compose.prod.yml restart api")
        
        for cmd in commands:
            # Mask sensitive values in print
            print(f"Executing update for {cmd.split('=')[0].split()[-1]}...")
            client.exec_command(cmd)
            
        print("\nSuccess! Google API credentials updated and API service restarted.")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    setup()
