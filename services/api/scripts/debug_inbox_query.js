const BASE_URL = "https://api.manhquy.click";
const EMAIL = "admin@example.com";
const PASSWORD = "changeme";

async function main() {
    console.log(`Logging in as ${EMAIL}...`);
    try {
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: EMAIL, password: PASSWORD })
        });

        if (!loginRes.ok) {
            console.error("Login failed:", await loginRes.text());
            return;
        }

        const { token } = await loginRes.json();
        console.log("Login successful. Token obtained.");
        const headers = { "Authorization": `Bearer ${token}` };

        // Case 1: All Inboxes
        console.log("\nQuerying /inboxes (No filter)...");
        const res1 = await fetch(`${BASE_URL}/inboxes`, { headers });
        const json1 = await res1.json();
        const data1 = json1.data || [];
        console.log(`Found ${data1.length} inboxes.`);

        if (data1.length > 0) {
            const first = data1[0];
            const domainName = first.domain?.name;
            console.log(`Sample: ${first.localPart}@${domainName}`);

            if (domainName) {
                // Case 2: Filter by domain
                console.log(`\nQuerying /inboxes?domain=${domainName}...`);
                const res2 = await fetch(`${BASE_URL}/inboxes?domain=${domainName}`, { headers });
                const json2 = await res2.json();
                const data2 = json2.data || [];
                console.log(`Found ${data2.length} inboxes.`);
            }
        } else {
            console.log("No inboxes found to test domain filter against.");
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

main();
