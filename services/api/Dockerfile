FROM node:20-alpine

WORKDIR /app

# Install OpenSSL for Prisma, rclone for cloud backup, and bash
RUN apk add --no-cache openssl rclone bash docker-cli

COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma

RUN npm ci

COPY src ./src
COPY scripts ./scripts

RUN npm run prisma:generate
RUN npm run build

EXPOSE 3001 2525

CMD ["sh", "-c", "node dist/index.js"]
