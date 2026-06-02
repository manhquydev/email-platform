import os
import sys
import paramiko

from _ssh_config import HOST, USERNAME, PASSWORD

_pat = os.environ.get("GITHUB_PAT")
if not _pat:
    print("Error: required environment variable 'GITHUB_PAT' is not set.", file=sys.stderr)
    sys.exit(1)

PROJECT_DIR = "/root/email-platform."
GIT_URL = f"https://manhquydev:{_pat}@github.com/manhquydev/email-platform.git"

def deploy():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        print(f"Connecting to {HOST}...")
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("Connected successfully!")

        commands = [
            f"cd {PROJECT_DIR} && git pull {GIT_URL} main",
            f"cd {PROJECT_DIR} && docker compose -f docker-compose.prod.yml up -d --build web"
        ]

        for cmd in commands:
            print(f"\nRunning: {cmd}")
            stdin, stdout, stderr = client.exec_command(cmd)

            # Print output in real-time
            for line in stdout:
                print(f"out: {line.strip()}")
            for line in stderr:
                print(f"err: {line.strip()}")

        print("\nDeployment finished successfully!")

    except Exception as e:
        print(f"Error during deployment: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    deploy()
