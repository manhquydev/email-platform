# Prompt Template: New API Feature

## Usage
Use when implementing a new backend API feature from requirements.

---

## Template

```
# Task: Implement [Feature Name]

## Requirements
[Paste or describe the feature requirements]

## Context
- This is for Ephemera email platform (Node.js + Fastify + Prisma)
- Follow existing patterns in `services/api/src/`
- Use Zod for request validation
- Add `preHandler: app.authenticate` for protected routes

## Expected Deliverables
1. Prisma schema changes (if any)
2. Service class in `services/api/src/services/`
3. Route handler in `services/api/src/routes/`
4. Tests in `services/api/src/test/`
5. Config updates if new env vars needed

## Constraints
- Max 200 lines per file
- All endpoints need auth unless public
- Use existing patterns from similar features
- Include error handling and logging
- No breaking changes to existing endpoints

## Reference Files
- Similar feature: [path/to/similar/feature]
- Schema: services/api/prisma/schema.prisma
- Config: services/api/src/config.ts
```

---

## Example Usage

```
# Task: Implement Inbox Labels CRUD

## Requirements
- Users can create, read, update, delete labels for their inboxes
- Labels have name and optional color
- Messages can be assigned multiple labels
- Labels are scoped to inbox (not global)

## Context
- This is for Ephemera email platform (Node.js + Fastify + Prisma)
- Follow existing patterns in `services/api/src/`
- Use Zod for request validation
- Add `preHandler: app.authenticate` for protected routes

## Expected Deliverables
1. Label model already exists in Prisma schema
2. LabelService class in `services/api/src/services/labels.service.ts`
3. Route handler in `services/api/src/routes/labels.ts`
4. Tests in `services/api/src/test/labels.test.ts`

## Constraints
- Max 200 lines per file
- All endpoints need auth
- User must own inbox to manage labels
- Include error handling and logging

## Reference Files
- Similar feature: services/api/src/routes/filters.ts
- Schema: services/api/prisma/schema.prisma (Label model)
```
