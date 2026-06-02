import os
import sys
import paramiko

from _ssh_config import HOST, USERNAME, PASSWORD

_pat = os.environ.get("GITHUB_PAT")
if not _pat:
    print("Error: required environment variable 'GITHUB_PAT' is not set.", file=sys.stderr)
    sys.exit(1)

KEY_PATH = r"d:\project\Clone\email-platform\.ssh\id_ed25519"

def deploy():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        print(f"Connecting to {HOST} using key...")
        pkey = paramiko.Ed25519Key.from_private_key_file(KEY_PATH)
        client.connect(HOST, username=USERNAME, pkey=pkey, allow_agent=False, look_for_keys=False)
        print("Connected!")

        commands = [
            f"cd /root/email-platform. && git pull https://manhquydev:{_pat}@github.com/manhquydev/email-platform.git main",
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml up -d --build web api",
            "cd /root/email-platform. && docker compose -f docker-compose.prod.yml ps",
            "curl -s http://localhost:3001/health"
        ]

        for cmd in commands:
            print(f"Executing: {cmd}")
            stdin, stdout, stderr = client.exec_command(cmd)
            print(stdout.read().decode())
            err = stderr.read().decode()
            if err: print(f"Error: {err}")

        print("Deployment finished!")
        client.close()
    except Exception as e:
        print(f"Failed: {e}")
        if 'client' in locals(): client.close()

if __name__ == "__main__":
    deploy()
