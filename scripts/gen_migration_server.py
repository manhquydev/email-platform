import paramiko
import sys
import time

# SSH connection details from workflow
HOST = "165.22.48.193"
USERNAME = "root"
PASSWORD = "Manhquy203@"
PROJECT_DIR = "/root/email-platform."

def generate_migration():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print(f"Connecting to {HOST}...")
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("Connected successfully!")
        
        # We need to run migrate dev but it requires a shadow database or it might fail in prod.
        # Alternatively, we just use db push and manually create the migration folder if we want to be safe.
        # But let's try to generate it assuming shadow db is not needed if we use --create-only.
        # Wait, --create-only still needs a shadow db or its equivalent.
        
        cmd = f"cd {PROJECT_DIR} && docker compose -f docker-compose.prod.yml exec -T api npx prisma migrate dev --name add_system_settings --create-only"
        print(f"\nRunning: {cmd}")
        stdin, stdout, stderr = client.exec_command(cmd)
        
        for line in stdout:
            print(f"out: {line.strip()}")
        for line in stderr:
            print(f"err: {line.strip()}")
            
        # Find the new migration folder
        find_cmd = f"cd {PROJECT_DIR} && docker compose -f docker-compose.prod.yml exec -T api ls -d prisma/migrations/*_add_system_settings"
        print(f"\nRunning: {find_cmd}")
        stdin, stdout, stderr = client.exec_command(find_cmd)
        
        migration_path = ""
        for line in stdout:
            migration_path = line.strip()
            print(f"Found migration at: {migration_path}")
            
        if migration_path:
            cat_cmd = f"cd {PROJECT_DIR} && docker compose -f docker-compose.prod.yml exec -T api cat {migration_path}/migration.sql"
            print(f"\nRunning: {cat_cmd}")
            stdin, stdout, stderr = client.exec_command(cat_cmd)
            sql_content = "".join(stdout.readlines())
            print(f"SQL Content:\n{sql_content}")
            
            # Save SQL content locally
            with open("temp_migration.sql", "w") as f:
                f.write(sql_content)
            print(f"Saved to temp_migration.sql")
            print(f"Migration folder name: {migration_path.split('/')[-1]}")
            
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    generate_migration()
