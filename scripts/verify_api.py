import requests
import sys
import json

BASE_URL = "https://api.manhquy.id.vn" # Default to broadcast
# BASE_URL = "http://localhost:3001" # Local option

def login(email, password):
    print(f"🔑 Logging in as {email}...")
    try:
        res = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
        if res.status_code == 200:
            token = res.json().get("token")
            print("✅ Login successful")
            return token
        else:
            print(f"❌ Login failed: {res.text}")
            return None
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return None

def check_notifications(token):
    print("\n🔔 Checking User Notifications...")
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get(f"{BASE_URL}/notifications", headers=headers)
    if res.status_code == 200:
        data = res.json()
        print(f"✅ Notifications fetched. Count: {len(data.get('notifications', []))}")
        return True
    else:
        print(f"❌ Failed to fetch notifications: {res.text}")
        return False

def send_admin_notification(token):
    print("\n📢 Testing Admin Broadcast (Send to All)...")
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "title": "[TEST] Automated Broadcast",
        "message": "This is a test notification from the verification script.",
        "type": "INFO",
        "sendToAll": True
    }
    
    res = requests.post(f"{BASE_URL}/notifications/admin/send", json=payload, headers=headers)
    if res.status_code == 200:
        print(f"✅ Broadcast successful: {res.json()}")
        return True
    elif res.status_code == 400:
        print(f"❌ Bad Request (400) - Likely schema/validation error: {res.text}")
        return False
    else:
        print(f"❌ Broadcast failed ({res.status_code}): {res.text}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python verify_api.py <email> <password> [url]")
        sys.exit(1)
        
    email = sys.argv[1]
    password = sys.argv[2]
    if len(sys.argv) > 3:
        BASE_URL = sys.argv[3]
        
    print(f"🌍 Target: {BASE_URL}")
    
    token = login(email, password)
    if token:
        check_notifications(token)
        # Attempt admin send - strictly for admin users
        send_admin_notification(token)
