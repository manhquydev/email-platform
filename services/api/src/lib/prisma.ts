import { PrismaClient } from "@prisma/client";


export const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
});

export const prismaWithTenant = (tenantId: string) => {
  return prisma.$extends({
    query: {
      domain: {
        async findMany({ args, query }) {
          args.where = { ...args.where, organizationId: tenantId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, organizationId: tenantId };
          return query(args);
        },
        async count({ args, query }) {
          args.where = { ...args.where, organizationId: tenantId };
          return query(args);
        }
      },
      inbox: {
        async findMany({ args, query }) {
          args.where = { ...args.where, organizationId: tenantId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, organizationId: tenantId };
          return query(args);
        },
        async count({ args, query }) {
          args.where = { ...args.where, organizationId: tenantId };
          return query(args);
        }
      },
      user: {
        async findMany({ args, query }) {
          args.where = { ...args.where, organizationId: tenantId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, organizationId: tenantId };
          return query(args);
        },
        async count({ args, query }) {
          args.where = { ...args.where, organizationId: tenantId };
          return query(args);
        }
      }
    }
  });
};
