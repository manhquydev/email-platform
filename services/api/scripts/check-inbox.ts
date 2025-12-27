
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const localPart = process.argv[2];
    const domainName = process.argv[3];

    if (!localPart || !domainName) {
        console.error("Usage: npx tsx check-inbox.ts <localPart> <domainName>");
        process.exit(1);
    }

    console.log(`Checking for inbox: ${localPart}@${domainName}`);

    const domain = await prisma.domain.findUnique({
        where: { name: domainName },
    });

    if (!domain) {
        console.log("Domain not found.");
        return;
    }

    const inbox = await prisma.inbox.findFirst({
        where: {
            domainId: domain.id,
            localPart: localPart,
        },
        include: {
            owner: true,
        }
    });

    if (inbox) {
        console.log("Inbox found:", JSON.stringify(inbox, null, 2));
    } else {
        console.log("Inbox not found.");
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
