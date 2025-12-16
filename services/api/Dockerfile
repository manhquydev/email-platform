FROM node:20-alpine

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma

RUN npm ci

COPY src ./src

RUN npm run prisma:generate
RUN npm run build

EXPOSE 3001 2525

CMD ["sh", "-c", "npm run prisma:deploy && node dist/index.js"]
