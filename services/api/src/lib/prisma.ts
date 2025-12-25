import { PrismaClient } from "@prisma/client";

console.log("PRISMA INIT. DATABASE_URL env:", process.env.DATABASE_URL);
export const prisma = new PrismaClient();
