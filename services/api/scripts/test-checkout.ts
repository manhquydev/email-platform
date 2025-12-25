import { StripeService } from "../src/services/stripe.service";

async function main() {
    const userId = "e0434d9d-b4d8-4121-ae6e-b2d523fa6077"; // tester274@example.com
    const packageId = "8f29d29e-c38a-428e-867f-0c633d27c6a4"; // Professional Plan (Test)

    try {
        const session = await StripeService.createCheckoutSession(userId, packageId);
        console.log("Checkout URL:", session.url);
    } catch (error) {
        console.error("Error creating checkout session:", error);
    }
}

main();
