# Backend API Development Workflow

## When to Use
- Adding new API endpoints
- Creating new services
- Modifying database schema
- Adding queue workers

## Step-by-Step Process

### 1. Schema First (if needed)
```prisma
// Add to services/api/prisma/schema.prisma
model NewFeature {
  id        String   @id @default(uuid())
  userId    String
  data      Json
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id])

  @@index([userId])
}
```

Run migration:
```bash
cd services/api && npx prisma migrate dev --name add-new-feature
```

### 2. Create Service
```typescript
// services/api/src/services/new-feature.service.ts
import { prisma } from "../lib/prisma";

export class NewFeatureService {
  async create(userId: string, data: any) {
    return prisma.newFeature.create({
      data: { userId, data },
    });
  }

  async getByUser(userId: string) {
    return prisma.newFeature.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }
}

export const newFeatureService = new NewFeatureService();
```

### 3. Add Routes
```typescript
// services/api/src/routes/new-feature.ts
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { newFeatureService } from "../services/new-feature.service";

export async function newFeatureRoutes(app: FastifyInstance) {
  const createSchema = z.object({
    data: z.record(z.unknown()),
  });

  app.post("/features", { preHandler: app.authenticate }, async (req, reply) => {
    const userId = (req.user as any).userId;
    const parsed = createSchema.safeParse(req.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid payload" });
    }

    const feature = await newFeatureService.create(userId, parsed.data.data);
    return { ok: true, feature };
  });

  app.get("/features", { preHandler: app.authenticate }, async (req, reply) => {
    const userId = (req.user as any).userId;
    const features = await newFeatureService.getByUser(userId);
    return { features };
  });
}
```

### 4. Register Routes
```typescript
// Add to services/api/src/index.ts
import { newFeatureRoutes } from "./routes/new-feature";
// ...
app.register(newFeatureRoutes, { prefix: "/api" });
```

### 5. Write Tests
```typescript
// services/api/src/test/new-feature.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "../server";
import { prisma } from "../lib/prisma";

describe("New Feature API", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = buildServer();
    await app.ready();
    // Login and get token
  });

  afterAll(async () => {
    await prisma.newFeature.deleteMany({});
    await app.close();
  });

  it("POST /features - creates feature", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/features",
      headers: { authorization: `Bearer ${authToken}` },
      payload: { data: { key: "value" } },
    });
    expect(res.statusCode).toBe(200);
  });
});
```

## Checklist
- [ ] Schema updated and migrated
- [ ] Service layer created
- [ ] Routes registered with validation
- [ ] Authentication/authorization added
- [ ] Tests written and passing
- [ ] Error handling implemented
- [ ] Logging added for debugging
