
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    const args = process.argv.slice(2);
    const email = args[0];
    const password = args[1];

    if (!email || !password) {
        console.error("Usage: npm run create-admin <email> <password>");
        process.exit(1);
    }

    console.log(`Creating admin user: ${email}...`);

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            passwordHash,
            role: "ADMIN",
            isDisabled: false,
        },
        create: {
            email,
            passwordHash,
            role: "ADMIN",
            emailVerified: new Date(),
        },
    });

    console.log(`✅ Admin user created/updated successfully: ${user.id}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
