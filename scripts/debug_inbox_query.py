import requests
import json

BASE_URL = "http://localhost:3001"
EMAIL = "admin@example.com"
PASSWORD = "changeme"

def debug_inbox_query():
    print(f"Logging in as {EMAIL}...")
    try:
        res = requests.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD})
        if res.status_code != 200:
            print(f"Login failed: {res.text}")
            return
        
        token = res.json().get("token")
        print("Login successful. Token obtained.")
        headers = {"Authorization": f"Bearer {token}"}

        # Case 1: All Inboxes (No filter)
        print("\nQuerying /inboxes (No filter)...")
        res1 = requests.get(f"{BASE_URL}/inboxes", headers=headers)
        if res1.status_code == 200:
            data1 = res1.json().get("data", [])
            print(f"Found {len(data1)} inboxes.")
            if len(data1) > 0:
                first = data1[0]
                print(f"Sample: {first.get('localPart')}@{first.get('domain', {}).get('name')}")
                found_domain = first.get('domain', {}).get('name')
                
                # Case 2: Filter by domain
                if found_domain:
                    print(f"\nQuerying /inboxes?domain={found_domain}...")
                    res2 = requests.get(f"{BASE_URL}/inboxes?domain={found_domain}", headers=headers)
                    data2 = res2.json().get("data", [])
                    print(f"Found {len(data2)} inboxes.")
                else:
                    print("Skipping domain filter test (no domain found in sample)")
        else:
            print(f"Error querying inboxes: {res1.text}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_inbox_query()
