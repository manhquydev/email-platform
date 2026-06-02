import os
import sys
import paramiko
import time

from _ssh_config import HOST, USERNAME, PASSWORD

_pat = os.environ.get("GITHUB_PAT")
if not _pat:
    print("Error: required environment variable 'GITHUB_PAT' is not set.", file=sys.stderr)
    sys.exit(1)

def deploy():
    print("🔗 Connecting...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("✅ Connected!\n")

        commands = [
            f"cd /root/email-platform. && git reset --hard && git pull https://manhquydev:{_pat}@github.com/manhquydev/email-platform.git main",
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
